# Application outcomes: richer statuses + Sankey

Planned 2026-07-30. Follows the rewrite in refactor-plan.md.

## Problem

`status` today is five pre-submission-ish values (not_started, in_progress,
awaiting_review, ready, applied) and stops at "applied". Everything that
actually matters - did they reply, did you interview, did you get an offer -
is untracked. And because only the current value is stored, there is no way to
see flow: how many applications made it from applied to interview.

## Design

### 1. Status set

One linear field, grouped into three phases:

Pre-submission: `not_started` -> `in_progress` -> `awaiting_review` -> `ready`
Submitted:      `applied` -> `screen` -> `interview` -> `offer`
Terminal:       `accepted` | `rejected` | `ghosted` | `withdrawn`

- `screen` covers recruiter screens and online assessments.
- `interview` covers all interview rounds (onsite included). Rounds are notes,
  not statuses - splitting them multiplies states for little gain.
- Terminal statuses are reachable from any stage; that is exactly what makes
  the Sankey interesting.
- Legacy values map on read: `draft` -> `not_started`.

### 2. Transition history (the thing that makes a Sankey possible)

A Sankey needs flows, not current values. So `applications/<id>/meta.yaml`
gains an append-only list:

```yaml
status: interview
history:
  - status: not_started
    date: 2026-07-19
  - status: applied
    date: 2026-07-21
  - status: interview
    date: 2026-07-28
```

- `set_app_meta` appends an entry whenever `status` actually changes.
- Migration: an application with no `history` gets one synthesized on first
  read from `created` + current `status`, so existing repos are not blank.
- Stays plain readable YAML in the user's repo, versioned by git like
  everything else. No new storage layer.

Optional `outcome_note` (free text) for terminal states: "rejected after
onsite, they went with an internal candidate".

### 3. Outcomes page

New top-level route `/outcomes` (nav item next to Applications). Contents:

- **Sankey** of transitions aggregated over all applications. Columns follow
  the phase order; terminal states are their own column. Link thickness =
  number of applications that made that transition.
- **Stat tiles** above it: total applications, response rate (reached screen or
  beyond / applied), interview rate, offer rate, and median days from
  `applied` to first response.

Rendering: `d3-sankey` + `d3-shape` for layout and ribbon paths (chosen for
robust layout and crossing minimization), drawn as our own SVG elements so
styling stays on the app's theme variables rather than looking like a generic
d3 chart. No d3 DOM manipulation - React owns the elements, d3 only computes
geometry.

Empty state: with fewer than two transitions, show the tiles and a short
"apply to a few roles and the flow shows up here" message instead of an
unreadable one-node diagram.

## Files touched

Backend
- `datarepo.py`: `APP_STATUSES` + phase metadata, history append in
  `set_app_meta`, history synthesis in `list_applications`/`get_application`.
- `tests/test_api.py`: transition appends history, legacy migration, invalid
  status still rejected.

Frontend
- `lib/status.ts` (new): the single status table - label, phase, color -
  imported by Applications, Workspace, Outcomes. Replaces the two ad-hoc
  copies currently in Applications.tsx.
- `routes/Outcomes.tsx` (new): stat tiles + `components/Sankey.tsx`.
- `routes/Applications.tsx`: filter chips grouped by phase.
- `routes/Workspace.tsx`: status select grouped by phase; the pipeline strip
  shows the submitted stages; terminal states render as an end cap with the
  optional note.
- `App.tsx`, `main.tsx`: nav item + route.

## Deliberately not doing

- Per-round interview tracking (round 1, round 2...) - notes cover it.
- Reminders/follow-up nudges - separate feature, not outcome tracking.
- Editing history by hand in the UI - it is plain YAML in the repo if a
  correction is ever needed.
