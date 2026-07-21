#!/usr/bin/env node

import { existsSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const project = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renderPath = resolve(process.argv[2] ?? join(project, "renders/video.mp4"));
const temporaryPath = join(dirname(renderPath), ".video-normalized.tmp.mp4");
const targetLufs = -18;
const encodingTruePeakTarget = -1.9;
const deliveryTruePeakCeiling = -1.5;
const targetRange = 7;

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed (${result.status}):\n${result.stderr}`);
  }
  return result.stderr;
}

if (!existsSync(renderPath)) {
  throw new Error(`Render not found: ${renderPath}`);
}

const measurementLog = runFfmpeg([
  "-hide_banner",
  "-nostats",
  "-i",
  renderPath,
  "-map",
  "0:a:0",
  "-af",
  `loudnorm=I=${targetLufs}:TP=${encodingTruePeakTarget}:LRA=${targetRange}:print_format=json`,
  "-f",
  "null",
  "-",
]);

const measurementMatch = measurementLog.match(/\{\s*"input_i"[\s\S]*?\}/m);
if (!measurementMatch) {
  throw new Error(`Could not parse loudness measurement:\n${measurementLog}`);
}

const measurement = JSON.parse(measurementMatch[0]);
const requiredMeasurements = [
  "input_i",
  "input_tp",
  "input_lra",
  "input_thresh",
  "target_offset",
];

for (const key of requiredMeasurements) {
  if (!Number.isFinite(Number(measurement[key]))) {
    throw new Error(`Invalid loudness measurement for ${key}: ${measurement[key]}`);
  }
}

rmSync(temporaryPath, { force: true });

runFfmpeg([
  "-hide_banner",
  "-nostats",
  "-y",
  "-i",
  renderPath,
  "-map",
  "0:v:0",
  "-map",
  "0:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-ar",
  "48000",
  "-af",
  [
    `loudnorm=I=${targetLufs}`,
    `TP=${encodingTruePeakTarget}`,
    `LRA=${targetRange}`,
    `measured_I=${measurement.input_i}`,
    `measured_TP=${measurement.input_tp}`,
    `measured_LRA=${measurement.input_lra}`,
    `measured_thresh=${measurement.input_thresh}`,
    `offset=${measurement.target_offset}`,
    "linear=true",
    "print_format=summary",
  ].join(":"),
  "-movflags",
  "+faststart",
  temporaryPath,
]);

renameSync(temporaryPath, renderPath);

const verificationLog = runFfmpeg([
  "-hide_banner",
  "-nostats",
  "-i",
  renderPath,
  "-map",
  "0:a:0",
  "-af",
  `loudnorm=I=${targetLufs}:TP=${deliveryTruePeakCeiling}:LRA=${targetRange}:print_format=json`,
  "-f",
  "null",
  "-",
]);
const verificationMatch = verificationLog.match(/\{\s*"input_i"[\s\S]*?\}/m);
if (!verificationMatch) throw new Error("Could not verify normalized render loudness");
const verification = JSON.parse(verificationMatch[0]);
const finalLufs = Number(verification.input_i);
const finalTruePeak = Number(verification.input_tp);
if (Math.abs(finalLufs - targetLufs) > 0.25 || finalTruePeak > deliveryTruePeakCeiling) {
  throw new Error(
    `Normalized render missed delivery limits: ${finalLufs.toFixed(2)} LUFS, ${finalTruePeak.toFixed(2)} dBTP`,
  );
}
console.log(
  `Normalized ${renderPath} to ${finalLufs.toFixed(2)} LUFS and ${finalTruePeak.toFixed(2)} dBTP.`,
);
