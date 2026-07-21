#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = readFileSync(join(project, "index.html"), "utf8");
const audioMeta = JSON.parse(readFileSync(join(project, "audio_meta.json"), "utf8"));

const frames = [
  ["01-job-hunt-hook", 8.81],
  ["02-career-memory", 8.26],
  ["03-two-role-discovery", 9.26],
  ["04-agent-timeline", 8.76],
  ["05-application-lifecycle", 10],
  ["06-evidence-tailoring", 7.87],
  ["07-two-role-resumes", 11.08],
  ["08-extension-autofill", 8.91],
  ["09-application-funnel", 9.72],
  ["10-own-agent-mcp", 9],
  ["11-future-roadmap", 10.965],
];

function fail(message) {
  throw new Error(message);
}

const expectedDuration = Number(frames.reduce((sum, [, duration]) => sum + duration, 0).toFixed(3));
const audioDuration = Number(audioMeta.voices.reduce((sum, voice) => sum + voice.duration_s, 0).toFixed(3));
if (expectedDuration !== 102.635 || audioDuration !== expectedDuration) {
  fail(`Timeline mismatch: expected ${expectedDuration}, audio ${audioDuration}`);
}

if (!index.includes(`data-duration="${expectedDuration}"`)) fail("Root duration is not locked to narration");

let start = 0;
for (const [frameId, duration] of frames) {
  const number = Number(frameId.slice(0, 2));
  const source = `compositions/frames/${frameId}.html`;
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
