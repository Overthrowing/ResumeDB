#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = resolve(HERE, "..");
const SOURCE_AUDIO = join(PROJECT, "assets/audio/narration.mp3");
const WHISPER_JSON = join(PROJECT, "transcripts/narration.json");
const SCRIPT = join(PROJECT, "SCRIPT.md");
const VOICE_DIR = join(PROJECT, "assets/voice");
const OUTPUT_META = join(PROJECT, "audio_meta.json");
const OUTPUT_TRANSCRIPT = join(PROJECT, "transcript.json");

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

function lexicalWords(text) {
  return text.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
}

function normalizedWord(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function findBoundary(words, phrase, fromIndex) {
  const normalizedPhrase = phrase.map(normalizedWord).filter(Boolean);
  for (let index = fromIndex; index <= words.length - normalizedPhrase.length; index += 1) {
    const candidate = words.slice(index, index + normalizedPhrase.length).map((word) => normalizedWord(word.text));
    if (candidate.every((word, offset) => word === normalizedPhrase[offset])) return index;
  }
  throw new Error(`Could not locate narration boundary phrase: ${phrase.join(" ")}`);
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
const words = whisperWords(JSON.parse(readFileSync(WHISPER_JSON, "utf8")));
const sourceDuration = probeDuration(SOURCE_AUDIO);
const boundaries = [0];
let searchFrom = 1;
for (const line of scriptLines.slice(1)) {
  const phrase = lexicalWords(line.captionText || line.text).slice(0, 2);
  const boundary = findBoundary(words, phrase, searchFrom);
  boundaries.push(boundary);
  searchFrom = boundary + phrase.length;
}

mkdirSync(VOICE_DIR, { recursive: true });

const voices = scriptLines.map((line, index) => {
  const startIndex = boundaries[index];
  const endIndex = boundaries[index + 1] ?? words.length;
  const frameWords = words.slice(startIndex, endIndex);
  const start = index === 0 ? 0 : frameWords[0].start;
  const nextWord = words[endIndex];
  const end = nextWord ? nextWord.start : sourceDuration;
  const duration = Number((end - start).toFixed(3));
  const filename = `${String(line.frame).padStart(2, "0")}.mp3`;
  const outputPath = join(VOICE_DIR, filename);

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-v",
      "error",
      "-ss",
      start.toFixed(3),
      "-t",
      duration.toFixed(3),
      "-i",
      SOURCE_AUDIO,
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "2",
      outputPath,
    ],
    { stdio: "inherit" },
  );

  return {
    frame: line.frame,
    path: `assets/voice/${filename}`,
    duration_s: duration,
    words: frameWords.map((word, wordIndex) => ({
      id: `fish-${String(line.frame).padStart(2, "0")}-${wordIndex}`,
      text: word.text,
      start: Number((word.start - start).toFixed(3)),
      end: Number((word.end - start).toFixed(3)),
    })),
  };
});

writeFileSync(OUTPUT_META, `${JSON.stringify({ bgm: null, voices, sfx: [] }, null, 2)}\n`);
writeFileSync(
  OUTPUT_TRANSCRIPT,
  `${JSON.stringify({ provider: "fish-audio", model: "s2.1-pro-free", duration_s: sourceDuration, words }, null, 2)}\n`,
);

console.log(`Built ${voices.length} Fish narration clips and ${words.length} word timings (${sourceDuration.toFixed(3)}s).`);
