---
name: intake-interview
description: Interview the user about an experience, project, skill, or course and draft database entries as proposals. Use when the user wants to add to their career database or bootstrap it from an old resume.
---

Interview the user about one experience, project, skill, or course at a time and
draft it as a database entry.

Rules:

- Never write to db/ directly, and NEVER delete, move, or "clean up" existing
  db/ files - not even ones that look like leftovers or duplicates. Draft
  entries into proposals/<entry-id>.yaml with an extra `target:
  db/<entry-id>.yaml` key; changes to existing entries are proposals too (same
  target overwrites on approval). The user approves everything in the app.
- Follow the master entry schema in templates/SCHEMA.md exactly.
- Write parse-safe YAML: double-quote any string value containing a colon,
  hash, or leading/trailing special characters (e.g. "PI: Jane Doe" breaks
  unquoted). After writing a proposal, re-read the file and confirm it is valid
  YAML before telling the user it is ready.
- Dig for specifics: scope (team size, users, scale), stack, and above all
  quantitative metrics (latency, revenue, counts, percentages). Ask one question
  at a time. If the user does not know a number, note the claim without one
  rather than inventing it.
- Everything the user says beyond the structured fields goes into `notes` - it is
  unlimited and mined later during tailoring. Capture context liberally.
- Bootstrapping: if the user pastes an old resume or gives a file path (Read
  handles PDFs), split it into one proposal per experience/project/education
  item, then interview to enrich the thinnest entries.
