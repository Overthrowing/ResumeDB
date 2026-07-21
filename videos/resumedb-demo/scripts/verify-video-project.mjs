#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = readFileSync(join(project, "index.html"), "utf8");
const audioMeta = JSON.parse(readFileSync(join(project, "audio_meta.json"), "utf8"));

function parseFrames(markdown) {
  return [...markdown.matchAll(/^## Frame (\d+) - .*\n([\s\S]*?)(?=^## Frame |(?![\s\S]))/gm)].map((match) => {
    const source = match[2].match(/^- src: `([^`]+)`/m)?.[1];
    const duration = Number(match[2].match(/^- duration:\s*([0-9.]+)s/m)?.[1]);
    if (!source || !duration) throw new Error(`Frame ${match[1]} is missing src or duration metadata`);
    return {
      number: Number(match[1]),
      id: source.split("/").at(-1).replace(/\.html$/, ""),
      source,
      duration,
    };
  });
}

const frames = parseFrames(readFileSync(join(project, "STORYBOARD.md"), "utf8"));

function fail(message) {
  throw new Error(message);
}

const expectedDuration = Number(frames.reduce((sum, frame) => sum + frame.duration, 0).toFixed(3));
const audioDuration = Number(audioMeta.voices.reduce((sum, voice) => sum + voice.duration_s, 0).toFixed(3));
if (!frames.length || expectedDuration >= 180 || audioDuration !== expectedDuration) {
  fail(`Timeline mismatch: expected ${expectedDuration}, audio ${audioDuration}`);
}

if (!index.includes(`data-duration="${expectedDuration}"`)) fail("Root duration is not locked to narration");

let start = 0;
for (const { number, id: frameId, source, duration } of frames) {
  const framePath = join(project, source);
  if (!existsSync(framePath)) fail(`Missing frame composition: ${source}`);
  const html = readFileSync(framePath, "utf8");
  if (!html.includes(`data-composition-id="${frameId}"`)) fail(`${source} has the wrong composition id`);
  if (!html.includes("window.__timelines")) fail(`${source} does not register a timeline`);
  if (!index.includes(`data-composition-src="${source}"`)) fail(`${source} is not mounted in index.html`);
  if (!index.includes(`src="assets/voice/${String(number).padStart(2, "0")}.mp3"`)) fail(`Frame ${number} voice is not mounted`);
  if (!index.includes(`data-start="${Number(start.toFixed(3))}"`)) fail(`Frame ${number} start is not present in index.html`);
  if (!index.includes(`data-duration="${duration}"`)) fail(`Frame ${number} duration is not present in index.html`);
  if (/Earnestine|manual submit|never clicks submit/i.test(html)) fail(`${source} contains superseded pitch copy`);
  start += duration;
}

const captions = readFileSync(join(project, "caption_groups.json"), "utf8");
if (!captions.includes(`"total_duration_s": ${expectedDuration}`)) fail("Caption duration does not match narration");

console.log(`Verified ${frames.length} frames across ${expectedDuration.toFixed(3)} seconds.`);
