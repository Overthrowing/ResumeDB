# ResumeDB

A local, single-user web app that keeps your full career history in a plain-file
database and uses a coding-agent CLI to tailor a one-page resume per job
application.

You write down everything you have done once, with no length limits. For each
job you point the app at the posting; the agent selects and rewrites from the
database into that application's `resume.yaml`, Typst renders it to a one-page
PDF, and an ATS check proves a machine can read every word of it. The database
itself stays ground truth that only you approve changes to, and every change is
a git checkpoint you can inspect and undo from the UI.

Single user, no auth, no hosting. It runs on your machine against your files.

## Your data repo

Your career data lives in its own private git repository (default
`~/resume-data`), separate from this app repo. It is all plain YAML and
markdown, so it stays readable and editable without ResumeDB.

User-owned (the app and the agent never write these directly):

- `db/<entry-id>.yaml` - one file per experience, project, skill, course,
  education, achievement, or extra. Structured header plus bullets plus
  unlimited freeform prose.
- `db/profile.yaml` - name and contact details.
- `db/memory.md` - standing context (voice, constraints, emphasis) that every
  tailoring session reads.
- `proposals/*.yaml` - the only route into `db/`. The agent drafts a full entry
  here with a `target: db/<id>.yaml` key; you approve or reject it in the UI.

App and agent owned:

- `applications/<id>/` - one folder per application: `jd.md`, `notes.md`,
  `resume.yaml`, `resume.typ`, `decisions.md`, the rendered `resume.pdf`, and
  `chats/`. `meta.yaml` is app-owned (status, deadline, and the append-only
  status `history`); it changes through the API, never by hand.
- `templates/` - Typst templates plus `SCHEMA.md` (the data contract every
  template honors) and `sample.yaml` (test data every template must compile
  against).
- `CLAUDE.md`, `AGENTS.md`, `.claude/skills/` - the agent's rulebook and its
  skills. App-authored: `make sync` overwrites them, so keep your own notes in
  `db/memory.md` instead.
- `.resumedb/` - machine-local state (turn logs, session ids). Gitignored, and
  its presence is what marks a folder as a ResumeDB data repo.

Everything else is versioned. The app commits on your behalf in scoped
checkpoints, so undoing work on one application never touches your database.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) installed and authenticated
  (`claude auth login`). The agent runs on your existing subscription.
- [typst](https://typst.app) for rendering: `brew install typst`.
- [uv](https://docs.astral.sh/uv/) for the Python backend.
- Node 20+ with pnpm for the frontend.

The OpenAI Codex CLI is supported as an experimental alternative provider. It
needs the optional SDK (`uv pip install openai_codex`) and is not verified
against a live install; Claude is the tested path.

## Setup

```
pnpm -C frontend install
```

Backend dependencies need no separate install step: every `uv run` command
(which is all the Makefile targets use) provisions `.venv` from `uv.lock`.

Then start the app and let onboarding do the rest:

```
make dev
```

Open http://localhost:5173. On first run the app redirects to a four-step
onboarding: check the environment (claude, codex, typst, and auth state), pick a
provider, choose or create the data folder, and optionally import an existing
resume PDF to seed the database. The provider is chosen before the repo is
created so the scaffold seeds the right rulebook.

## Running

- `make dev` - backend on :8000 and the Vite dev server on :5173, together. Use
  :5173; in dev, :8000 serves only the API (its root page is just a pointer),
  and Vite proxies `/api` and the chat WebSocket to it. Fails loudly if :8000 is
  already taken by a stale backend.
- `make test` - the backend pytest suite.
- `make build` - production frontend bundle into `frontend/dist`. When a build
  exists and the backend is not running with `--reload`, :8000 serves the UI
  itself, same-origin.
- `make sync` - push app-authored boilerplate (skills, `CLAUDE.md`,
  `AGENTS.md`, the template contract) into your data repo and prune skills that
  have been retired from the product. `make dev` does this on every start.
  It never touches `db/`, `applications/`, or `proposals/`.

## Architecture

- **Provider seam.** One `get_agent(cfg)` factory resolves provider, binary, and
  model in a single place, and returns an agent with two operations:
  `start_turn` (streaming) and `oneshot`. Chat, ATS audit, job-description
  fetch, and PDF import all go through it, so adding or swapping a CLI touches
  one file. Backend calls shell out to the CLI headlessly and normalize its
  output into one event shape. See
  [context/CLAUDE_CLI_INTEGRATION.md](context/CLAUDE_CLI_INTEGRATION.md).
- **Durable turns.** A turn runs as its own server-side task, not as part of the
  WebSocket. Events are appended to a machine-local log as they stream, and
  folded into the conversation as one message when the turn ends. Closing the
  tab, navigating away, or reloading re-attaches and replays; a backend restart
  mid-turn preserves the partial answer, flagged as interrupted.
- **Git as undo.** Every write is atomic (temp file plus rename) and commits a
  scoped checkpoint: `db` covers everything outside `applications/`, `app:<id>`
  covers one application. Scopes never overlap, so the History panel's log and
  revert are exact.
- **Typst render.** Templates are self-contained `.typ` files that read
  `resume.yaml` through `sys.inputs`, so rendering is deterministic and has no
  agent in the loop. Drop a `.typ` into `templates/` to add one; the
  template-author skill can write them too, compile-checked against
  `templates/sample.yaml`. The ATS audit then extracts the text back out of the
  rendered PDF and diffs it against your YAML, proving nothing was lost to
  ligatures or icon fonts, before scoring keyword coverage against the posting.

Design decisions behind the current build are in
[context/refactor-plan.md](context/refactor-plan.md) and
[context/outcomes-plan.md](context/outcomes-plan.md).

## Application statuses and outcomes

An application has one status, drawn from twelve values in three phases:

- Before applying: `not_started`, `in_progress`, `awaiting_review`, `ready`
- In the pipeline: `applied`, `screen` (recruiter screen or online assessment),
  `interview` (all rounds), `offer`
- Closed: `accepted`, `rejected`, `ghosted`, `withdrawn`

Closed statuses are reachable from any stage and can carry a free-text
`outcome_note`. Each change appends to an append-only `history` list in
`meta.yaml` with the date, so the record is of flows rather than just the
current value.

The Outcomes page uses that history: tiles for applications sent, response rate,
interview rate, offer rate, and median days from applying to a first response,
above a Sankey diagram of every forward transition across all applications. With
too little movement to chart, the tiles stand alone and the diagram is replaced
by a note.

## Security note

Agent turns run with `--dangerously-skip-permissions`, scoped to the data repo,
with your global plugins and hooks excluded. Job descriptions and fetched web
pages are untrusted input, and the agent's rulebook tells it to treat them as
data rather than instructions. This trade-off was made consciously for a
personal tool that only ever runs locally.
