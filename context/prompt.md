# ResumeDB - Agreed Design

This is the shared understanding reached after a full design interview. It refines
@context/vision.md into concrete decisions. The UI to implement is the Resume
Studio design referenced in @context/design.md. The LLM integration pattern
follows @context/CLAUDE_CLI_INTEGRATION.md.

## What it is

A personal-first tool: a local web app run on the user's own machine, holding a
master database of their full career history, from which an agent tailors one-page
resumes per job application. Single user, no auth, no hosting.

## Architecture

- Stack: Python FastAPI backend (micromamba env) + React/Vite frontend implementing
  the Resume Studio design from @context/design.md. Backend jobs: spawn the
  `claude` CLI, stream JSONL to the browser, read/write YAML, run `typst compile`.
- LLM backend: headless `claude -p` with `stream-json` output, riding the user's
  Claude subscription. See @context/CLAUDE_CLI_INTEGRATION.md
  for invocation, parsing, and process-management details. Per-application sessions
  via `--resume`, with session ids stored in the application folder.
- Permissions: `--dangerously-skip-permissions` + `--strict-mcp-config`. The
  prompt-injection risk from untrusted job-description text was considered and
  accepted.
- Typesetting engine: Typst. ATS-safety is a template property (single column,
  real text, no icon fonts), verified by the audit feature below.

## Data

- Career data lives in a separate private data repo (e.g. `~/resume-data`), path
  configurable. This repo stays pure app code + built-in templates.
- Master DB: one YAML file per entry (experience/project/skill/course/education/
  extra). Schema: structured header (type, title, org, dates, tags) + achievement
  bullets with optional metrics + unlimited freeform prose. The agent mines the
  prose for role-relevant angles the bullets do not capture.
- db/memory.md (from the Resume Studio design): a standing-context doc in plain
  markdown (constraints, voice, emphasis, notes) every tailoring session reads,
  editable in the UI like the rest of the master DB.
- Master DB is ground truth: the agent never writes it directly. It proposes edits
  and new entries for user approval. Per-application copies are the agent's to
  rewrite freely.
- Applications: one folder each (e.g. `applications/2026-07-acme-swe/`) holding
  jd.md, notes.md, resume.yaml, resume.typ, resume.pdf, and session ids. Jobs enter
  manually or by pasting a link that an agent expands via WebFetch into the folder.
- Undo: the app auto-checkpoints the data repo (git under the hood) after
  meaningful events (entry saved, resume generated, agent turn finished), and the
  UI exposes diff and undo for any change, agent or manual.
- History: the data repo is a single git history covering the master DB and all
  applications. Interleaving is handled by path scoping: each checkpoint commit is
  scoped to exactly one event, and events never span areas (an agent turn writes
  only inside its application folder; an approved master-DB proposal is its own
  checkpoint). The UI therefore shows history via `git log -- <dir>` per
  application or per DB directory, and undo reverts a single scoped checkpoint.
  Commit messages carry a structured scope tag (e.g. `db:` or `app:<id>`) so the
  UI can filter without parsing diffs.

## Pipeline

- The agent's creative work lands in `resume.yaml`. Typst reads the YAML natively
  (`yaml(sys.inputs.data)`), so the render step is just `typst compile` with the
  data path passed via `--input`. Python never touches Typst syntax.
- Templates are hot-loadable data: self-contained `.typ` files that consume the
  documented data schema via `sys.inputs`. Adding a template = dropping a file in
  `templates/`. Agents may author and edit templates, validated by a compile check.
- The agent touches the `.typ` output only for space-constraint fixes. Overflow
  detection = page count of the compiled PDF.
- Truth policy: baseline is flag-and-suggest. The agent may propose embellishments,
  clearly marked for user approval. Aggressiveness is steerable per application
  chat.

## Features (v1 = vision items 1-10, item 11 dropped)

- Forms for direct DB editing, plus an intake interview chat implemented as a
  skill: the agent asks about a project, digs for metrics/scope/impact, and drafts
  YAML entries for approval. Can bootstrap entries from a pasted old resume.
- All agent behaviors (intake, tailor, template-author, audit) live as skills in
  the data repo, so behavior is editable prompt files, not hardcoded strings.
- Per-application chat panel next to a live PDF preview, with first-class manual
  editing of the same YAML in the UI.
- Cover letters and short-answer questions on request in chat. Metric nudges baked
  into the tailoring prompts.
- ATS audit (manual trigger, no auto-loop), two parts: a deterministic
  pdftotext-vs-YAML extraction diff proving machines can read every word, and an
  LLM keyword-coverage rubric scored against the JD.

## Explicitly out of v1

- Job-opening scanner/spreadsheet (vision item 11).
- Hosted or multi-user anything.
- Auto-optimization loops against audit scores.

## Open, non-blocking defaults

To be settled in the spec unless overridden:

- Model/effort defaults per task type (cheap/low effort for extraction, higher for
  tailoring).
- Exact YAML schema field names.
- The template data-schema document.
- Checkpoint granularity.
