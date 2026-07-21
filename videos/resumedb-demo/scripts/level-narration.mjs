#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VOICE_DIR = join(PROJECT, "assets/voice");
const NARRATION_PATH = join(PROJECT, "assets/audio/narration.mp3");
const NARRATION_META_PATH = `${NARRATION_PATH}.json`;
const AUDIO_META_PATH = join(PROJECT, "audio_meta.json");
const TARGET_LUFS = -22.3;
const PEAK_CEILING_DBFS = -1;
const MAX_GAIN_CHANGE_DB = 2.5;

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ffmpeg failed (${result.status}):\n${result.stderr}`);
  return result.stderr;
}

function probeLoudness(path) {
  const output = runFfmpeg([
    "-hide_banner",
    "-nostats",
    "-i",
    path,
    "-map",
    "0:a:0",
    "-af",
    `loudnorm=I=${TARGET_LUFS}:TP=${PEAK_CEILING_DBFS}:LRA=7:print_format=json`,
    "-f",
    "null",
    "-",
  ]);
  const match = String(output ?? "").match(/\{\s*"input_i"[\s\S]*?\}/m);
  if (!match) throw new Error(`Could not measure loudness for ${path}`);
  const measurement = JSON.parse(match[0]);
  const integrated = Number(measurement.input_i);
  const truePeak = Number(measurement.input_tp);
  if (!Number.isFinite(integrated) || !Number.isFinite(truePeak)) {
    throw new Error(`Invalid loudness measurement for ${path}`);
  }
  return { integrated, truePeak };
}

function boundedGain({ integrated, truePeak }) {
  let gain = Math.max(-MAX_GAIN_CHANGE_DB, Math.min(MAX_GAIN_CHANGE_DB, TARGET_LUFS - integrated));
  if (truePeak + gain > PEAK_CEILING_DBFS) gain = PEAK_CEILING_DBFS - truePeak;
  return Number(gain.toFixed(3));
}

function levelClip(inputPath, outputPath, duration, gainDb) {
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-loglevel",
      "error",
      "-y",
      "-i",
      inputPath,
      "-af",
      `volume=${gainDb}dB,apad=whole_dur=${duration.toFixed(3)}`,
      "-t",
      duration.toFixed(3),
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

function concatenateClips(paths, outputPath) {
  const inputs = paths.flatMap((path) => ["-i", path]);
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-loglevel",
      "error",
      "-y",
      ...inputs,
      "-filter_complex",
      `${paths.map((_, index) => `[${index}:a]`).join("")}concat=n=${paths.length}:v=0:a=1[outa]`,
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

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

const audioMeta = JSON.parse(await readFile(AUDIO_META_PATH, "utf8"));
const narrationMeta = JSON.parse(await readFile(NARRATION_META_PATH, "utf8").catch(() => "{}"));
const previousLeveling = narrationMeta.leveling;
const previousClips = new Map((previousLeveling?.clips ?? []).map((clip) => [clip.frame, clip]));
const sameLevelingTarget =
  previousLeveling?.target_lufs === TARGET_LUFS &&
  previousLeveling?.peak_ceiling_dbfs === PEAK_CEILING_DBFS &&
  previousLeveling?.max_gain_change_db === MAX_GAIN_CHANGE_DB;
const temporaryDir = await mkdtemp(join(VOICE_DIR, ".level-staging-"));
const staged = [];
const measurements = [];

try {
  for (const voice of audioMeta.voices) {
    const name = `${String(voice.frame).padStart(2, "0")}.mp3`;
    const inputPath = join(VOICE_DIR, name);
    const outputPath = join(temporaryDir, name);
    const before = probeLoudness(inputPath);
    const previous = previousClips.get(voice.frame);
    const alreadyLeveled =
      sameLevelingTarget &&
      previous &&
      Math.abs(before.integrated - Number(previous.after_lufs)) <= 0.08 &&
      Math.abs(before.truePeak - Number(previous.after_true_peak_dbfs)) <= 0.15;
    const gainDb = alreadyLeveled ? 0 : boundedGain(before);
    if (alreadyLeveled) {
      await copyFile(inputPath, outputPath);
    } else {
      levelClip(inputPath, outputPath, Number(voice.duration_s), gainDb);
    }
    const after = probeLoudness(outputPath);
    const outputSha256 = sha256(await readFile(outputPath));
    staged.push({ frame: voice.frame, inputPath, outputPath });
    measurements.push({
      frame: voice.frame,
      before_lufs: Number(before.integrated.toFixed(2)),
      gain_db: gainDb,
      after_lufs: Number(after.integrated.toFixed(2)),
      after_true_peak_dbfs: Number(after.truePeak.toFixed(2)),
      reused: Boolean(alreadyLeveled),
      output_sha256: outputSha256,
    });
  }

  const temporaryNarrationPath = join(temporaryDir, "narration.mp3");
  const stagedClipPaths = staged
    .sort((a, b) => a.frame - b.frame)
    .map((clip) => clip.outputPath);
  concatenateClips(stagedClipPaths, temporaryNarrationPath);

  for (const clip of staged) await rename(clip.outputPath, clip.inputPath);
  await rename(temporaryNarrationPath, NARRATION_PATH);

  const narration = await readFile(NARRATION_PATH);
  await mkdir(dirname(NARRATION_META_PATH), { recursive: true });
  await writeFile(
    NARRATION_META_PATH,
    `${JSON.stringify(
      {
        ...narrationMeta,
        sha256: sha256(narration),
        leveling: {
          method: "ffmpeg EBU R128 scene matching",
          target_lufs: TARGET_LUFS,
          peak_ceiling_dbfs: PEAK_CEILING_DBFS,
          max_gain_change_db: MAX_GAIN_CHANGE_DB,
          clips: measurements,
        },
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(temporaryDir, { recursive: true, force: true });
}

for (const clip of measurements) {
  console.log(
    `Frame ${clip.frame}: ${clip.before_lufs.toFixed(2)} LUFS ${clip.gain_db >= 0 ? "+" : ""}${clip.gain_db.toFixed(2)} dB -> ${clip.after_lufs.toFixed(2)} LUFS`,
  );
}
console.log(`Leveled narration written to ${NARRATION_PATH}`);
