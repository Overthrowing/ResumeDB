#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");
const SOURCE_AUDIO = join(PROJECT, "assets/audio/narration.mp3");
const SCRIPT = join(PROJECT, "SCRIPT.md");
const VOICE_DIR = join(PROJECT, "assets/voice");
const VOICE_TRANSCRIPT_DIR = join(PROJECT, "transcripts/voice");
const OUTPUT_META = join(PROJECT, "audio_meta.json");
const OUTPUT_TRANSCRIPT = join(PROJECT, "transcript.json");
const FILLERS = new Set(["uh", "um", "uhm", "erm", "hmm"]);

function parseScriptLines(markdown) {
  const lines = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^## .*\(Frame (\d+)\)/i);
    if (heading) {
      current = { frame: Number(heading[1]), text: "", captionText: "" };
      lines.push(current);
      continue;
    }
    const captionText = current && line.match(/^\*\*Caption text:\*\*\s*(.+)/i);
    if (captionText) {
      current.captionText = captionText[1].trim();
      continue;
    }
    const spoken = current && line.match(/^\s{4}(.+)/);
    if (spoken) current.text += `${current.text ? " " : ""}${spoken[1].trim()}`;
  }
  return lines;
}

function normalizedWord(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function whisperWords(payload) {
  const words = [];
  let current = null;
  for (const segment of payload.transcription || []) {
    for (const token of segment.tokens || []) {
      const text = String(token.text || "");
      if (/^\[_/.test(text)) continue;
      if (/^\s/.test(text)) {
        if (current) words.push(current);
        current = {
          text: text.trim(),
          start: token.offsets.from / 1000,
          end: token.offsets.to / 1000,
        };
      } else if (current) {
        current.text += text;
        current.end = token.offsets.to / 1000;
      }
    }
  }
  if (current) words.push(current);
  return words;
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

const scriptLines = parseScriptLines(readFileSync(SCRIPT, "utf8"));
const existingMeta = JSON.parse(readFileSync(OUTPUT_META, "utf8"));
const targetByFrame = new Map(existingMeta.voices.map((voice) => [voice.frame, voice.duration_s]));

let offset = 0;
const allWords = [];
const voices = scriptLines.map((line) => {
  const duration = Number(targetByFrame.get(line.frame));
  if (!duration) throw new Error(`Missing target duration for frame ${line.frame}`);
  const clipPath = join(VOICE_DIR, `${String(line.frame).padStart(2, "0")}.mp3`);
  if (!existsSync(clipPath)) throw new Error(`Missing narration clip: ${clipPath}`);
  const clipDuration = probeDuration(clipPath);
  if (Math.abs(clipDuration - duration) > 0.08) {
    throw new Error(
      `Frame ${line.frame} clip duration drifted: ${clipDuration.toFixed(3)}s, expected ${duration.toFixed(3)}s`,
    );
  }

  const transcriptPath = join(VOICE_TRANSCRIPT_DIR, `${String(line.frame).padStart(2, "0")}.json`);
  if (!existsSync(transcriptPath)) throw new Error(`Missing narration transcript: ${transcriptPath}`);
  const frameWords = whisperWords(JSON.parse(readFileSync(transcriptPath, "utf8")));
  const fillerWords = frameWords.filter((word) => FILLERS.has(normalizedWord(word.text)));
  if (fillerWords.length) {
    throw new Error(
      `Frame ${line.frame} contains filler speech: ${fillerWords.map((word) => `${word.text}@${word.start.toFixed(2)}s`).join(", ")}`,
    );
  }

  const start = offset;
  for (const word of frameWords) {
    allWords.push({
      text: word.text,
      start: Number((start + Math.max(0, word.start)).toFixed(3)),
      end: Number((start + Math.min(duration, word.end)).toFixed(3)),
    });
  }
  offset += duration;

  return {
    frame: line.frame,
    path: `assets/voice/${String(line.frame).padStart(2, "0")}.mp3`,
    duration_s: duration,
    words: frameWords.map((word, wordIndex) => ({
      id: `fish-${String(line.frame).padStart(2, "0")}-${wordIndex}`,
      text: word.text,
      start: Number(Math.max(0, word.start).toFixed(3)),
      end: Number(Math.min(duration, word.end).toFixed(3)),
    })),
  };
});

const timelineDuration = Number(offset.toFixed(3));
const sourceDuration = probeDuration(SOURCE_AUDIO);
writeFileSync(OUTPUT_META, `${JSON.stringify({ bgm: null, voices, sfx: [] }, null, 2)}\n`);
writeFileSync(
  OUTPUT_TRANSCRIPT,
  `${JSON.stringify(
    {
      provider: "fish-audio",
      model: "s2.1-pro-free",
      duration_s: timelineDuration,
      source_duration_s: Number(sourceDuration.toFixed(3)),
      words: allWords,
    },
    null,
    2,
  )}\n`,
);

console.log(`Built ${voices.length} Fish narration clips and ${allWords.length} word timings (${timelineDuration.toFixed(3)}s).`);
