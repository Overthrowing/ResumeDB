# ResumeDB

A local, single-user web app that keeps your full career history in a plain-file
database and uses a Claude agent to tailor a one-page resume per job application.

Your data lives in a separate private git repository (default `~/resume-data`):
one YAML file per experience/project/skill/course/education/extra entry with no
length limits, plus one folder per application (job description, notes,
resume.yaml, rendered PDF, chat history). The agent selects and rewrites content
from the database into each application; the database itself stays ground truth
that only you approve changes to. Every change - yours or the agent's - is a
scoped git checkpoint you can inspect and undo from the UI.

The design rationale and full architecture live in [context/prompt.md](context/prompt.md).

## Prerequisites

- [Claude Code](https://claude.com/claude-code) installed and logged in
  (`claude auth login`) - the agent runs on your existing subscription
- [typst](https://typst.app) - `brew install typst`
- [micromamba](https://mamba.readthedocs.io) for the Python environment
- Node 20+ with pnpm

## Setup

```
micromamba create -f backend/env.yml -y
cd frontend && pnpm install && pnpm build && cd ..
```

## Run

```
make dev
```

Backend on http://localhost:8000 (serves the built frontend), Vite dev server
with hot reload on http://localhost:5173. First launch walks you through
creating the data repository.

## Tests

```
make test
```

## How it works

- The backend shells out to the `claude` CLI headlessly (stream-json over a
  WebSocket to the browser). See
  [context/CLAUDE_CLI_INTEGRATION.md](context/CLAUDE_CLI_INTEGRATION.md).
- Rendering is deterministic: templates are self-contained Typst files that read
  `resume.yaml` via `sys.inputs`. Drop a `.typ` file into the data repo's
  `templates/` to add one; agents can author them too (compile-checked against
  `templates/sample.yaml`).
- Agent behaviors (intake interviews, tailoring, template authoring, ATS audit,
  cover letters, fetching a job posting from a link) are Claude Code skills
  scaffolded into the data repo - editable prompt files, not hardcoded strings.
- The ATS check extracts text from the rendered PDF and diffs it against your
  data (proving machines can read it), then scores keyword coverage against the
  job description.

## Security note

Agent turns run with `--dangerously-skip-permissions` scoped to the data repo.
Job descriptions fetched from the web are untrusted input; this trade-off was
made consciously for a personal tool. See context/prompt.md.
