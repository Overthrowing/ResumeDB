#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL =
  process.env.HYPERFRAMES_WHISPER_MODEL ??
  join(homedir(), ".cache/hyperframes/whisper/models/ggml-small.en.bin");
const VOICE_DIR = join(PROJECT, "assets/voice");
const OUTPUT_DIR = join(PROJECT, "transcripts/voice");

if (!existsSync(MODEL)) throw new Error(`Whisper model not found: ${MODEL}`);
mkdirSync(OUTPUT_DIR, { recursive: true });

for (let frame = 1; frame <= 11; frame += 1) {
  const filename = String(frame).padStart(2, "0");
  const input = join(VOICE_DIR, `${filename}.mp3`);
  const output = join(OUTPUT_DIR, filename);
  if (!existsSync(input)) throw new Error(`Narration clip not found: ${input}`);

  execFileSync(
    "whisper-cli",
    ["-m", MODEL, "-f", input, "-ojf", "-of", output, "-np", "-l", "en"],
    { stdio: "ignore" },
  );
  console.log(`Transcribed narration frame ${frame}`);
}
