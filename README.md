# ResumeDB

ResumeDB is an agent-native internship operating system for university
students. It learns a complete, user-approved career knowledge base, discovers
qualified jobs, prepares tailored application packages, and fills application
sites through a Chrome extension. The user reviews every draft and performs the
final submission.

This repository is a single-user hackathon build. Career data lives in a
separate local Git repository so every profile and application change is
inspectable and recoverable.

## What works

- Agent-led PDF resume import into a durable career knowledge base
- Full factual profile and reusable application answer bank
- Natural-language job discovery and ingestion from any public URL or pasted page
- Persistent daily discovery goals
- Explainable fit scoring with evidence, missing facts, and hard conflicts
- Automatic preparation of high-confidence matches
- Job-specific resume, application answers, cover letter, recruiter message,
  provenance, and tailoring decisions
- Exact five-stage workflow: `not_started`, `in_progress`, `draft`, `ready`,
  and `submitted`
- Deterministic readiness blockers before human approval
- Chrome extension capture, custom-form autofill, resume upload, and ready queue
- Manual post-submission outcomes
- Claude Code and Codex provider support
- Full API access for external agents through the generated OpenAPI interface

## Requirements

- Python 3.12 or newer and [uv](https://docs.astral.sh/uv/)
- Node.js 20 or newer and pnpm
- [Typst](https://typst.app/) for PDF rendering
- Either Claude Code or Codex installed and authenticated

## Setup

```sh
uv sync
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
```

Start the backend and Vite development server:

```sh
make dev
```

Open `http://localhost:5173`. The first launch creates a local career-data
repository with no fictional sample experience and optionally imports a PDF
resume.

The production-style built frontend is served by FastAPI at
`http://localhost:8000` after `make build`.

## Demo flow

For the fastest hackathon walkthrough, open **Profile & Settings** and use the
Hackathon demo card:

1. **Fill fields with Faker** generates a synthetic student directly in the
   visible form. Nothing is saved until you choose **Save profile**.
2. **Create Ready demo + open form** saves a synthetic profile and three
   clearly labeled demo knowledge entries, creates a tailored Northstar
   Robotics application, renders its PDF, approves it as `ready`, and opens the
   local ATS test site.
3. Open the Chrome extension on the Northstar page, select the Ready demo
   application, and choose **Auto-fill current form**.
4. Confirm that the profile, answer bank, and tailored PDF are filled. The
   intentionally unmatched interest question and certification checkbox stay
   for human review, and the extension leaves final submission to you.

You can reopen the blank ATS form at `http://localhost:5173/?demo=ats`, or use
**Open blank test form** in the Hackathon demo card. The form has structured
job metadata for capture testing and never transmits or stores an application.

For a walkthrough with your own data:

1. Complete the factual profile and import career evidence.
2. Open Career Agent and enter a request such as:

   ```text
   Find summer 2027 software engineering internships in New York that fit my background.
   ```

   A direct URL works too:

   ```text
   Add this to my applications https://example.com/job/123
   ```

3. High-confidence matches prepare automatically. Medium matches remain in the
   discovery inbox for review.
4. Open a `draft`, inspect its resume, answers, provenance, missing facts, and
   decisions, render its PDF, then approve it as `ready`.
5. Use the extension to autofill one application or open the full ready queue.
6. Submit each external form yourself, then record it as `submitted`.

## Chrome extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked and select the repository's `extension` directory.
4. Start ResumeDB, then click the extension icon on any job page.

The extension can capture the current job, fill any approved application using
semantic labels and the answer bank, upload the tailored PDF, and open all
ready applications in browser tabs. It never clicks a final Submit button or
bypasses a CAPTCHA.

For a repeatable local extension test, use the Northstar Robotics form created
by the Hackathon demo flow above. Reload the unpacked extension from
`chrome://extensions` after changing extension source files.

## Agent access

ResumeDB exposes the complete local knowledge base and the same career
capabilities through its FastAPI OpenAPI API at `http://localhost:8000/docs`.
An external agent can read the profile and evidence, invoke `/api/agent/command`,
prepare applications, and inspect readiness. The hackathon build has no auth,
so expose it only on the local machine.

## Safety model

- Job descriptions and websites are untrusted data, never agent instructions.
- Structured jobs and application packages are validated before ResumeDB writes them.
- Structured reasoning tasks run without repository write tools.
- Agents may reframe and emphasize supported evidence, but never fabricate facts.
- A draft cannot become ready until its tailored resume PDF exists and every
  required application fact is resolved.
- Identity, demographics, age, graduation, education, authorization, dates,
  credentials, skills, and metrics are never inferred when missing.
- `draft` to `ready` requires human review. `ready` to `submitted` requires the user.

## Verification

```sh
make test
pnpm --dir frontend lint
pnpm --dir frontend build
node --check extension/sidepanel.js
node --check extension/content.js
```
