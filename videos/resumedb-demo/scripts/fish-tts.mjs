#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const MODEL = "s2.1-pro-free";
const DEFAULT_VOICE = "802e3bc2b27e49c2995d23ef70e6ac89";

function valueFor(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function extractNarration(markdown) {
  const lines = markdown
    .split(/\r?\n/)
    .filter((line) => /^ {4}\S/.test(line))
    .map((line) => line.trim());
  if (!lines.length) throw new Error("No indented narration lines found in SCRIPT.md");
  return `[confident] ${lines.join("\n\n")}`;
}

const apiKey = process.env.FISH_API_KEY;
if (!apiKey) throw new Error("FISH_API_KEY is required in the environment");

const scriptPath = resolve(valueFor("--script", "SCRIPT.md"));
const outputPath = resolve(valueFor("--out", "assets/audio/narration.mp3"));
const referenceId = valueFor("--voice", DEFAULT_VOICE);
const narration = extractNarration(await readFile(scriptPath, "utf8"));

const response = await fetch("https://api.fish.audio/v1/tts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    model: MODEL,
  },
  body: JSON.stringify({
    text: narration,
    reference_id: referenceId,
    format: "mp3",
    mp3_bitrate: 192,
    sample_rate: 44100,
    normalize: true,
    normalize_loudness: true,
    latency: "normal",
    temperature: 0.6,
    top_p: 0.7,
    repetition_penalty: 1.2,
    chunk_length: 300,
    condition_on_previous_chunks: true,
    prosody: { speed: 1.03, volume: 0 },
  }),
});

if (!response.ok) {
  const detail = (await response.text()).slice(0, 600);
  throw new Error(`Fish Audio TTS failed (${response.status}): ${detail}`);
}

const audio = Buffer.from(await response.arrayBuffer());
if (!audio.length) throw new Error("Fish Audio returned an empty audio response");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, audio);
await writeFile(
  `${outputPath}.json`,
  `${JSON.stringify(
    {
      provider: "fish-audio",
      model: MODEL,
      reference_id: referenceId,
      format: "mp3",
      sample_rate: 44100,
      sha256: createHash("sha256").update(audio).digest("hex"),
      source_script: scriptPath,
    },
    null,
    2,
  )}\n`,
);

console.log(`Narration written to ${outputPath}`);
