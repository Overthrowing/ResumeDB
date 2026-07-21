#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const MODEL = "s2.1-pro-free";
const DEFAULT_VOICE = "933563129e564b19a115bedd57b7406a";
const TEMPERATURE = 0.45;
const TOP_P = 0.6;
const SPEED_BY_FRAME = new Map([
  [1, 1.02],
  [2, 1.08],
  [3, 1.06],
  [4, 1.08],
  [5, 1.08],
  [6, 1.05],
  [7, 1.02],
  [8, 1.08],
  [9, 1.02],
  [10, 1.1],
  [11, 1],
]);

function valueFor(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function parseNarrationLines(markdown) {
  const lines = [];
  let frame = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## .*\(Frame (\d+)\)/i);
    if (heading) {
      frame = Number(heading[1]);
      continue;
    }
    const spoken = frame && line.match(/^ {4}(\S.*)/);
    if (spoken) lines.push({ frame, text: spoken[1].trim() });
  }
  if (!lines.length) throw new Error("No indented narration lines found in SCRIPT.md");
  return lines;
}

function parseFrameSelection(value) {
  if (!value) return null;
  const frames = new Set(value.split(",").map(Number));
  if ([...frames].some((frame) => !Number.isInteger(frame) || frame < 1)) {
    throw new Error(`Invalid --frames selection: ${value}`);
  }
  return frames;
}

function probeDuration(path) {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
      { encoding: "utf8" },
    ).trim(),
  );
}

function hashFile(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function synthesize({ apiKey, referenceId, text, speed }) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        model: MODEL,
      },
      body: JSON.stringify({
        text,
        reference_id: referenceId,
        format: "mp3",
        mp3_bitrate: 192,
        sample_rate: 44100,
        normalize: true,
        latency: "normal",
        temperature: TEMPERATURE,
        top_p: TOP_P,
        repetition_penalty: 1.2,
        chunk_length: 300,
        condition_on_previous_chunks: false,
        early_stop_threshold: 1,
        prosody: { speed, volume: 0, normalize_loudness: true },
      }),
    });

    if (response.ok) return Buffer.from(await response.arrayBuffer());
    const detail = (await response.text()).slice(0, 600);
    lastError = new Error(`Fish Audio TTS failed (${response.status}): ${detail}`);
    if (response.status < 500 && response.status !== 429) break;
    await new Promise((accept) => setTimeout(accept, attempt * 1000));
  }
  throw lastError;
}

function conformClip(inputPath, outputPath, rawDuration, targetDuration) {
  if (rawDuration <= 0 || targetDuration <= 0) throw new Error("Narration durations must be positive");
  const filters = [];
  if (rawDuration > targetDuration) {
    const tempo = rawDuration / targetDuration;
    if (tempo > 1.08) {
      throw new Error(
        `Generated clip is too long to conform cleanly (${rawDuration.toFixed(3)}s -> ${targetDuration.toFixed(3)}s)`,
      );
    }
    filters.push(`atempo=${tempo.toFixed(6)}`);
  }
  filters.push(`apad=whole_dur=${targetDuration.toFixed(3)}`);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-i",
      inputPath,
      "-af",
      filters.join(","),
      "-t",
      targetDuration.toFixed(3),
      "-ar",
      "44100",
      "-ac",
      "1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outputPath,
    ],
    { stdio: "inherit" },
  );
}

function concatenateClips(clipPaths, outputPath) {
  const inputArgs = clipPaths.flatMap((path) => ["-i", path]);
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      ...inputArgs,
      "-filter_complex",
      `${clipPaths.map((_, index) => `[${index}:a]`).join("")}concat=n=${clipPaths.length}:v=0:a=1[outa]`,
      "-map",
      "[outa]",
      "-ar",
      "44100",
      "-ac",
      "1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outputPath,
    ],
    { stdio: "inherit" },
  );
}

const apiKey = process.env.FISH_API_KEY;
if (!apiKey) throw new Error("FISH_API_KEY is required in the environment");

const scriptPath = resolve(valueFor("--script", "SCRIPT.md"));
const outputPath = resolve(valueFor("--out", "assets/audio/narration.mp3"));
const voiceDir = resolve(valueFor("--voice-dir", "assets/voice"));
const targetMetaPath = resolve(valueFor("--target-meta", "audio_meta.json"));
const referenceId = valueFor("--voice", DEFAULT_VOICE);
const selectedFrames = parseFrameSelection(valueFor("--frames", ""));
const narrationLines = parseNarrationLines(await readFile(scriptPath, "utf8"));
const targetMeta = JSON.parse(await readFile(targetMetaPath, "utf8"));
const targetByFrame = new Map(targetMeta.voices.map((voice) => [voice.frame, voice.duration_s]));
const previousMetadata = selectedFrames
  ? JSON.parse(await readFile(`${outputPath}.json`, "utf8").catch(() => "{}"))
  : {};
const generated = [];
const stagedClips = new Map();

await mkdir(voiceDir, { recursive: true });
await mkdir(dirname(outputPath), { recursive: true });
const temporaryDir = await mkdtemp(join(voiceDir, ".fish-staging-"));

try {
  for (const line of narrationLines) {
    const targetDuration = Number(targetByFrame.get(line.frame));
    if (!targetDuration) throw new Error(`Missing target duration for frame ${line.frame}`);
    const filename = `${String(line.frame).padStart(2, "0")}.mp3`;

    if (!selectedFrames || selectedFrames.has(line.frame)) {
      let speed = SPEED_BY_FRAME.get(line.frame) ?? 1;
      let audio = null;
      let rawDuration = 0;
      const rawPath = join(temporaryDir, `raw-${filename}`);
      const stagedPath = join(temporaryDir, filename);

      for (let take = 1; take <= 3; take += 1) {
        audio = await synthesize({ apiKey, referenceId, text: line.text, speed });
        if (!audio.length) throw new Error(`Fish Audio returned empty audio for frame ${line.frame}`);
        await writeFile(rawPath, audio);
        rawDuration = probeDuration(rawPath);
        if (rawDuration / targetDuration <= 1.08) break;
        if (take === 3) break;
        speed = Number(Math.min(1.35, speed * (rawDuration / targetDuration) / 1.03).toFixed(3));
        console.log(`Retrying frame ${line.frame} at ${speed.toFixed(3)}x to preserve its visual timing`);
      }

      conformClip(rawPath, stagedPath, rawDuration, targetDuration);
      stagedClips.set(line.frame, stagedPath);
      generated.push({
        frame: line.frame,
        speed,
        raw_duration_s: Number(rawDuration.toFixed(3)),
        target_duration_s: targetDuration,
        source_sha256: hashFile(audio),
      });
      console.log(`Generated frame ${line.frame}: ${rawDuration.toFixed(3)}s -> ${targetDuration.toFixed(3)}s`);
    }
  }

  for (const [frame, stagedPath] of stagedClips) {
    const filename = `${String(frame).padStart(2, "0")}.mp3`;
    await rename(stagedPath, join(voiceDir, filename));
  }

  const clipPaths = narrationLines.map((line) => join(voiceDir, `${String(line.frame).padStart(2, "0")}.mp3`));
  concatenateClips(clipPaths, outputPath);
  const narrationAudio = await readFile(outputPath);
  const generatedByFrame = new Map(
    [...(previousMetadata.generated ?? []), ...generated].map((entry) => [entry.frame, entry]),
  );
  await writeFile(
    `${outputPath}.json`,
    `${JSON.stringify(
      {
        provider: "fish-audio",
        model: MODEL,
        reference_id: referenceId,
        format: "mp3",
        sample_rate: 44100,
        temperature: TEMPERATURE,
        top_p: TOP_P,
        condition_on_previous_chunks: false,
        scene_isolated: true,
        sha256: hashFile(narrationAudio),
        source_script: scriptPath,
        generated: [...generatedByFrame.values()].sort((a, b) => a.frame - b.frame),
        ...(selectedFrames && previousMetadata.leveling ? { leveling: previousMetadata.leveling } : {}),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}

console.log(`Narration written to ${outputPath}`);
