# ResumeDB Rewrite Plan

Agreed 2026-07-30 after a grilling interview. This is the working reference for
the rewrite on the `refactor` branch. `last_tested` @ ce58fad is the frozen
backup of the old working app; `feat/resumedb-app` advances to the finished
rewrite when done.

## Strategy

Rewrite the application layer. Preserve the contracts and harden their
implementations:

- data-repo format (db/ entries, profile, memory, applications/, proposals/)
- scaffold structure and skills
- Typst render command and 1-page contract
- git-as-undo semantics (scoped checkpoints)

The user's live resume-data (7+ real applications) must keep working unchanged.

## Scope

Keep:
- Career DB: entries/profile/memory, intake-interview -> proposals/ -> approve
- Applications: create-from-link (jd-from-link), status (manage-applications)
- Tailor: tailor-resume -> Typst render -> 1-page PDF + decisions.md
- ATS audit
- History/undo (git per scope)
- PDF import (currently broken; keep and fix)
- Templates + template-author as render infra
- Chat
- Settings and Onboarding

Cut entirely:
- Discovery (agent_search, discover-jobs skill, "Discover Roles" UI)
- Interview prep + mock interview (interview.py, InterviewPrep.tsx, interview_prep/)
- Cover letter (CoverTab, cover-letter skill)
- Readiness review (review.py, ReviewPanel)
- Autofill / Chrome extension (AutofillTab, extension/)

## Stack

FastAPI/Python backend + React 19/Vite/TypeScript frontend (kept; the rot is
architectural, not framework-level).

## Frontend

- shadcn/ui + Tailwind, components copied into the repo. ds.css mostly goes away.
- Identity: Cormorant Garamond for display/headings, clean sans-serif for dense
  UI. Orange-creamsicle accent (~#FF8C42) on cream surfaces (~#FFF8F0), themed
  via shadcn CSS variables.
- TanStack Query owns all server state (health, profile, apps, config). Deletes
  the blank-screen-on-fetch-fail, triple profile fetch, and swallowed-error bugs.
- react-router for real URLs and deep links into an application workspace.
- One "new application from link/paste" entry point (collapses Ingest screen and
  NewApplicationDialog).

## Provider seam

- One Agent protocol: stream(prompt, session, model, effort) -> AsyncIterator[Event]
  and oneshot(prompt, schema, ...) -> str.
- One get_agent(cfg) factory resolving provider + bin + model in one place.
  Every call site routes through it (chat, audit, jd fetch, importer). Deletes
  the 5 duplicated provider branches.
- ClaudeAgent: full and tested. CodexAgent: ported behind the same protocol,
  selectable, marked experimental/unverified (do not spend effort verifying).
- Provider-aware scaffold: seed AGENTS.md alongside CLAUDE.md (Codex reads
  AGENTS.md and does not auto-load .claude/skills).

## Chat durability (the number one problem)

- Server-side TurnManager: a turn runs to completion as its own task,
  independent of the WebSocket.
- Durable per-turn event log appended as it streams, stored machine-local under
  .resumedb/turns/, folded into the conversation JSONL as one assistant message
  on completion.
- WS is a subscriber: on load/reload it re-attaches to the active turn, replays
  the log, then streams live.
- Client chat state lives in a store above the router keyed by
  scope+conversation, so navigation never unmounts a running turn.
- Per-chat "working" indicator in the chat rail (no global cross-app badge).
- Backend-restart boundary (accepted): an in-flight turn is marked
  "interrupted", partial output preserved from the log, one-click retry.

## Onboarding (headline feature)

1. Environment check: detect claude/codex/typst, show install/auth commands for
   anything missing.
2. Provider menu: uninstalled/unauthed providers non-selectable (greyed with
   hint), Codex badged "experimental".
3. Data-repo folder: macOS osascript picker + manual path (macOS-only is fine).
4. Optional PDF import (the fixed importer) or "skip & start fresh".

Provider is chosen before repo init so the scaffold seeds the right rulebook.

## Persistence / failure-resistance baseline

- Keep the folder layout. Move machine-local session state out of the versioned
  applications/<id>/meta.yaml into .resumedb/. All agent artifacts go through
  the git-backed persistence layer.
- One atomic_write helper (temp + rename) for every ground-truth write.
- One canonical _yaml() factory; one shared ID validator. Kill the on-read
  _migrate_memory (do once at init).
- gitops: repo-level lock + subprocess timeout.
- Wrap typst/pypdf/subprocess failures into clean error results, never 500s.
- Config validated on load via pydantic; hand-edit typos give a clear message.
- Consistent HTTP error envelope ({error, detail} + real status codes) surfaced
  as UI toasts through TanStack Query error state.
- GET /api/health stops mutating the repo (no sync_new_skills side effect) and
  stops blocking on --version subprocesses.
- Fix main.py CORS (allow_origins=["*"] with allow_credentials=True is invalid).
- make dev fails loudly if :8000 is already taken (zombie-backend guard).

## Testing

pytest on pure logic, CI-runnable without claude:
- YAML round-trip comment preservation
- atomic_write
- gitops checkpoint/log/revert under the lock
- provider event parsing against recorded transcript fixtures
- config load/merge/validate

Plus one mock-agent E2E: fixture application -> tailor -> render -> assert
schema-valid resume.yaml + 1-page PDF.

## Cleanup

- Prune cut skills from existing data repos on first sync (cover-letter,
  discover-jobs, etc).
- Remove stale __pycache__ entries for deleted modules.

## Development notes

- Development uses a throwaway test data repo, not the user's live
  ~/Documents/resume-data.
- Keep last_tested untouched. Do not touch main (diverged agent-native line,
  out of scope).
