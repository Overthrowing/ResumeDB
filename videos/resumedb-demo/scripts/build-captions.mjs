#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_META = join(PROJECT, "audio_meta.json");
const GROUPS_PATH = join(PROJECT, "caption_groups.json");
const CAPTIONS_PATH = join(PROJECT, "compositions/captions.html");

function cleanCaptionWord(text, frame) {
  const cleaned = String(text)
    .replace(/^[“”"]+/, "")
    .replace(/[“”"]+$/, "")
    .replace(/^SAM(?=\b|['’])/i, (match) => (match === "SAM" ? "Sam" : match))
    .replace(/^SAM'S$/i, "Sam's");
  return cleaned
    .replace(/^gpt(?=$|[.,!?;:])/i, "GPT")
    .replace(/^mcp(?=$|[.,!?;:])/i, "MCP")
    .replace(/^sdk(?=$|[.,!?;:])/i, "SDK")
    .replace(/^codex(?=$|[.,!?;:])/i, "Codex")
    .replace(/^resumedb(?=$|[.,!?;:])/i, "ResumeDB")
    .replace(frame === 14 ? /^resume(?=$|[.,!?;:])/i : /$^/, "Resume")
    .replace(frame === 14 ? /^db(?=$|[.,!?;:])/i : /$^/, "DB");
}

function endsPhrase(text) {
  return /[.!?:]$/.test(text);
}

function groupFrameWords(frame, words, offset, groupOffset) {
  const groups = [];
  let current = [];

  function flush() {
    if (!current.length) return;
    const groupIndex = groupOffset + groups.length;
    groups.push({
      id: `caption-group-${groupIndex}`,
      frame,
      start: Number((offset + current[0].start).toFixed(3)),
      end: Number((offset + current[current.length - 1].end).toFixed(3)),
      text: current.map((word) => word.text).join(" "),
      words: current.map((word, wordIndex) => ({
        id: `caption-word-${groupIndex}-${wordIndex}`,
        text: word.text,
        start: Number((offset + word.start).toFixed(3)),
        end: Number((offset + word.end).toFixed(3)),
      })),
    });
    current = [];
  }

  for (const sourceWord of words) {
    const word = { ...sourceWord, text: cleanCaptionWord(sourceWord.text, frame) };
    const candidate = [...current, word];
    const characterCount = candidate.map((item) => item.text).join(" ").length;
    const duration = candidate[candidate.length - 1].end - candidate[0].start;
    if (current.length && (current.length >= 3 || characterCount > 27 || duration > 1.65)) flush();
    current.push(word);
    if (endsPhrase(word.text)) flush();
  }
  flush();
  return groups;
}

const audioMeta = JSON.parse(readFileSync(AUDIO_META, "utf8"));
const groups = [];
let offset = 0;
for (const voice of audioMeta.voices) {
  groups.push(...groupFrameWords(voice.frame, voice.words, offset, groups.length));
  offset += voice.duration_s;
}

const totalDuration = Number(offset.toFixed(3));
writeFileSync(
  GROUPS_PATH,
  `${JSON.stringify({ total_duration_s: totalDuration, width: 1920, height: 1080, groups }, null, 2)}\n`,
);

const source = readFileSync(CAPTIONS_PATH, "utf8");
const replacement = `var GROUPS = ${JSON.stringify(groups)};\n  var DURATION = ${totalDuration};`;
const updated = source
  .replace(/data-duration="[0-9.]+"/, `data-duration="${totalDuration}"`)
  .replace(/var GROUPS = \[[\s\S]*?\];\n  var DURATION = [0-9.]+;/, replacement);

if (updated !== source) writeFileSync(CAPTIONS_PATH, updated);
console.log(`Built ${groups.length} caption groups across ${totalDuration.toFixed(3)}s.`);
