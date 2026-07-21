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
- Live, persistent agent-run timelines from knowledge read through preparation
- Job-specific resume, application answers, cover letter, recruiter message,
  provenance, and tailoring decisions
- Evidence-linked before-and-after views for every material resume rewrite
- Exact five-stage workflow: `not_started`, `in_progress`, `draft`, `ready`,
  and `submitted`
- Deterministic readiness blockers before human approval
- Chrome extension capture, read-only field-mapping preflight, custom-form
  autofill, resume upload, and ready queue
- Animated guided demo with spotlight masks and a simulated cursor
- Manual post-submission outcomes
- Claude Code and Codex provider support
- Revocable bring-your-own-agent connections over Streamable HTTP MCP
- Full API access for external agents through the generated OpenAPI interface
- Chat attachments for PDFs, images, and text files, plus bulk approval for
  reviewed career-fact proposals

## How Codex and GPT-5.6 were used

Codex was the primary engineering agent for implementation, debugging,
end-to-end dogfooding, deployment checks, test coverage, and the submission
workflow. GPT-5.6 supplied the reasoning for that Codex work, including the
final judge-path audit.

ResumeDB also treats Codex as a product surface, not only a development tool.
The hosted **Bring your own agent** card creates a revocable Streamable HTTP
MCP connection without asking ResumeDB to store an OpenAI API key. In the
verified judge flow, a fresh GPT-5.6 Codex session connected to the hosted MCP
server, invoked `get_candidate_context` and `list_applications`, and read the
synthetic Ready application. The same bounded tool set can save job leads and
create or tailor drafts, while approval and submission remain human-only.

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

## Hosted hackathon deployment

The hosted demo uses Vercel for the Vite frontend and Railway for the FastAPI
backend. Local development still uses the Vite proxy and requires no
environment changes.

### Railway backend

1. Create a Railway service from this GitHub repository and keep the service
   root at `/` so Railway detects the root `Dockerfile` and `railway.toml`.
2. Attach one persistent volume at `/data`. The deployment is intentionally
   limited to one replica because career-data writes are Git-backed. Do not
   set `RAILWAY_RUN_UID`; the startup script enters as root only to assign the
   mounted volume to its unprivileged `resumedb` runtime user.
3. For ResumeDB-hosted agent runs, set these variables:

   ```text
   RESUMEDB_ALLOWED_ORIGINS=https://your-app.vercel.app
   RESUMEDB_AGENT_PROVIDER=claude
   ANTHROPIC_API_KEY=your-server-side-key
   ```

   To use Codex instead, set `RESUMEDB_AGENT_PROVIDER=codex` and
   `OPENAI_API_KEY`. The startup script authenticates the containerized Codex
   CLI from that secret. Never put either model key in a Vercel `VITE_`
   variable.

   Model credentials are optional when the deployment uses only the guided
   demo and bring-your-own-agent MCP tools. In that mode the connected user's
   agent performs all model reasoning, so Railway does not need an OpenAI or
   Anthropic key. Hosted Career Agent actions remain unavailable until a
   server-side provider is authenticated.
4. Generate a Railway public domain. On first launch, the onboarding screen
   creates the career-data repository at `/data/resume-data`.

For Vercel preview deployments, either add each preview origin to
`RESUMEDB_ALLOWED_ORIGINS` or set a deliberately narrow
`RESUMEDB_ALLOWED_ORIGIN_REGEX`. Do not use a catch-all origin regex for a
backend that holds a model credential.

### Vercel frontend

1. Import the same repository into Vercel and set the project Root Directory
   to `frontend`.
2. Set `VITE_API_BASE_URL` to the Railway public domain for Production and any
   Preview environments you intend to use.
3. Deploy. `frontend/vercel.json` preserves SPA deep links, and both HTTP and
   WebSocket clients connect directly to Railway.

### Hosted Chrome extension

The packaged extension defaults to the hosted Railway backend and Vercel web
app, so judges do not need to configure a server or run this repository. Use
**Connection settings** only to point the extension at a local or custom
deployment.

## Demo flow

For the fastest hackathon walkthrough, open **Profile & Settings** and use the
purple **Hackathon demo** sandbox card. Synthetic profiles, knowledge entries,
applications, and extension selections keep the same purple Demo treatment so
they cannot be confused with real candidate data:

1. **Fill fields with Faker** generates a synthetic student directly in the
   visible form. Nothing is saved until you choose **Save profile**.
2. **Create Ready demo + open form** saves a synthetic profile and three
   clearly labeled demo knowledge entries, creates a tailored Northstar
   Robotics application, renders its PDF, approves it as `ready`, and opens the
   local ATS test site.
3. Open the Chrome extension on the Northstar page, select the Ready demo
   application, and choose **Scan page before filling**. Review the matched
   fields without changing the form, then choose **Fill mapped fields**.
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

Judge installation does not require a repository checkout:

1. Download `ResumeDB-Chrome-Extension.zip` from the submission files and
   unzip it.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked and select the extracted
   `ResumeDB-Chrome-Extension` directory.
5. Open the [hosted ResumeDB app](https://resumedb-ai.vercel.app/), create the
   Ready demo, then click the extension icon on the Northstar application.

For local development, load the repository's `extension` directory and use
**Connection settings** to enter the local backend and web-app URLs.

The installed side panel should display the ResumeDB logo and version `2.4.1`.
If it has no logo or remains on **Connecting to ResumeDB...**, remove the old
unpacked copy, load the intended extracted extension directory again, and
reload the job page. Unpacked extensions do not update automatically.

The extension can capture the current job, preview exact mappings without
changing the page, fill any approved application using semantic labels and the
answer bank, upload the tailored PDF, and open all ready applications in
browser tabs. It never clicks a final Submit button or bypasses a CAPTCHA.

For a repeatable local extension test, use the Northstar Robotics form created
by the Hackathon demo flow above. Reload the unpacked extension from
`chrome://extensions` and reload the target page after changing extension
source files.

## Agent access

ResumeDB exposes the complete knowledge base and the same career capabilities
through its FastAPI OpenAPI API at `http://localhost:8000/docs`. An external
agent can read the profile and evidence, invoke `/api/agent/command`, prepare
applications, and inspect readiness.

The hackathon build has no account authentication or per-user data isolation.
Treat a public Railway deployment as a shared synthetic demo: do not load real
candidate data, use a provider key with a strict spending limit, and remove or
rotate the key after judging. Real user deployments require authentication,
tenant isolation, and durable request-level usage controls.

### Bring your own agent

Open **Profile & Settings**, find **Bring your own agent**, and choose
**Create agent connection**. ResumeDB shows the plaintext token once and stores
only its SHA-256 hash on the persistent volume.

For Codex, copy the generated two-line command into one terminal, then launch
or restart Codex from that terminal. Codex uses the user's existing ChatGPT or
API authentication. Other Streamable HTTP MCP clients can use the displayed
endpoint with the token in an `Authorization: Bearer ...` header.

After connecting, try:

```text
Use ResumeDB to read my complete career context, find internships I qualify
for, and save supported applications as drafts.
```

The MCP server exposes bounded tools for reading the complete approved career
knowledge base, saving job leads, creating and tailoring application drafts,
rendering resumes, proposing new knowledge, and publishing progress to the
existing live agent timeline. It never invokes ResumeDB's configured hosted
model. Connected agents cannot move a draft to `ready` or a ready application
to `submitted`; those remain human actions.

Rotate or revoke the token from the same settings card. Rotation immediately
invalidates the previous token.

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
node --check extension/background.js
node --check extension/content.js
```
