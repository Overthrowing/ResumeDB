# Using the Claude Code CLI as an LLM Backend in Any Project

A practical guide to embedding the `claude` CLI (Claude Code) as a headless LLM engine inside another application — the pattern Dayflow uses, generalized. Instead of calling the Anthropic API with an API key, you shell out to the locally installed `claude` binary and let the user's existing Claude Code login pay for inference.

Verified against Claude Code **2.1.197**. Flags occasionally change; run `claude --help` to confirm.

---

## 1. Why (and when) to do this

**Pros**

- **Zero API-key management.** Auth rides on the user's existing Claude subscription or API login. Your app never stores a secret.
- **Free capability upgrades.** The CLI brings its own agentic loop, tools (file read, bash, web search), model routing, and retries.
- **Multimodal via the filesystem.** The model can read images/PDFs from disk with its Read tool — no base64 plumbing.

**Cons**

- The CLI must be installed and logged in; you must handle "not found" and "not authenticated" gracefully.
- Latency is higher than a raw API call (process spawn + agentic overhead).
- You depend on the CLI's output formats, which are versioned but can evolve.

Rule of thumb: use the CLI when your users are developers who likely already have Claude Code, or when you explicitly want "bring your own subscription." Use the Anthropic SDK/API directly for server-side products.

---

## 2. Authentication

### How users authenticate

The CLI has three auth paths; your app should not care which one is active, only whether *any* is:

| Method | Command | Best for |
|---|---|---|
| Subscription OAuth login | `claude auth login` (or `/login` inside the REPL) | Individual users with a Claude Pro/Max/Team plan |
| Long-lived token | `claude setup-token` | Headless machines / CI where a browser OAuth flow is awkward (requires a subscription) |
| API key | `export ANTHROPIC_API_KEY=sk-ant-...` | Pay-per-token API billing; server environments |

Check state with:

```bash
claude auth status
```

**Precedence trap:** an exported `ANTHROPIC_API_KEY` takes priority over a stored OAuth login. If a user is logged in but also has a stale key exported, requests bill (or fail) against the key. When debugging auth for your users, `claude auth status` shows which credential source won; `unset ANTHROPIC_API_KEY` restores the login.

`claude auth logout` clears the stored login.

### Detecting auth problems from your app

- **Binary missing:** exit code 127, or stderr containing `command not found`. Surface: "Install Claude Code and run `claude auth login`."
- **Not authenticated:** non-zero exit with an auth error on stderr. Surface: "Run `claude auth login` in a terminal."
- Don't try to drive the OAuth flow yourself — it's interactive by design. Send the user to a terminal.

### CI / servers

For non-interactive environments, either export `ANTHROPIC_API_KEY`, or generate a token once with `claude setup-token` and provision it. Consider `--bare` mode (see §7) so auth is strictly the env var and no keychain/OAuth is consulted.

### Finding the binary

Users install `claude` via installers that touch shell profiles (`~/.local/bin`, npm globals, Homebrew), so a bare `Process`/`subprocess` spawn with a minimal PATH often fails. Two options:

1. **Run through the user's login shell** (Dayflow's approach): `$SHELL -l -i -c "claude ..."`. Resolves PATH, nvm shims, etc. exactly as the user's terminal would.
2. **Probe known paths** (`which claude` via login shell once, cache the result).

Option 1 is the most robust on macOS/Linux desktop apps; cache-probe if spawning a login shell per request is too slow.

---

## 3. Headless invocation basics

The core flag is `-p` / `--print`: run one prompt non-interactively, print the result, exit.

```bash
claude -p "Summarize this repo's architecture"
```

Useful companions:

| Flag | Purpose |
|---|---|
| `--model <alias-or-id>` | `sonnet`, `opus`, `haiku`, `fable`, or a full model ID. Omit to use the user's default. |
| `--effort low\|medium\|high\|xhigh\|max` | Reasoning effort — `low` for cheap classification, higher for hard tasks |
| `--output-format text\|json\|stream-json` | See §5 |
| `--resume <session-id>` | Continue a prior conversation (multi-turn) |
| `--no-session-persistence` | Don't write the session to disk (one-shot batch jobs; can't be resumed) |
| `--max-budget-usd <n>` | Hard dollar cap per invocation (API-key users) |
| `--fallback-model <m1,m2>` | Auto-fallback when the primary model is overloaded |
| `--json-schema '<schema>'` | Force structured output validated against a JSON Schema |

### Passing the prompt safely

The prompt is a positional argument — **always shell-escape it** (or better, avoid the shell entirely and pass argv directly to the process API). If you must build a shell string, single-quote and escape embedded quotes; use `--` before the prompt so a prompt starting with `-` isn't parsed as a flag:

```bash
claude -p --model sonnet -- 'What does '\''--verbose'\'' do in this project?'
```

For long or untrusted prompts, pipe via stdin instead:

```bash
cat prompt.txt | claude -p
```

### Working directory matters

The CLI treats the cwd as the project: it auto-discovers `CLAUDE.md`, `.claude/settings.json`, `.mcp.json`, and greenlights file access there. Two consequences:

- **To analyze a repo,** run with cwd set to that repo.
- **To use the CLI as a pure LLM** (no project context), run it in a dedicated scratch directory your app owns (Dayflow uses `~/Library/Application Support/<App>/chatcli`). This prevents it from slurping unrelated CLAUDE.md files and gives tool calls a sandbox. Pass extra readable directories with `--add-dir` if needed.

Note: `-p` skips the workspace-trust dialog, so only invoke it in directories you control.

---

## 4. Permissions and tool control

Headless runs can't answer interactive permission prompts, so you must decide up front what the model may do. Pick ONE of these postures per call:

**a) No tools at all — pure text generation:**

```bash
claude -p --tools "" -- '<prompt>'
```

(Older pattern: `--allowedTools "[]"`. `--tools ""` is the current explicit form.)

**b) A specific tool allowlist:**

```bash
claude -p --tools "Read,Grep,Glob" -- '<prompt>'          # built-in tool set selection
claude -p --allowedTools "Bash(git *) Read" -- '<prompt>'  # permission-rule granularity
```

`--disallowedTools` is the deny-list complement.

**c) Everything, no prompts:**

```bash
claude -p --dangerously-skip-permissions -- '<prompt>'
```

Only appropriate when the working directory is a sandbox your app owns and the prompt content is trusted. This is what Dayflow uses because it runs in an app-owned empty directory. If the prompt embeds untrusted third-party content (web pages, user uploads), prefer (a) or (b) — prompt injection plus unrestricted Bash is a real exfiltration risk.

`--permission-mode` (`default`, `acceptEdits`, `plan`, `bypassPermissions`, ...) is the softer dial when you do have a settings file with permission rules.

**Isolate from user config.** The user's own MCP servers, hooks, and plugins can slow down or break your invocation. Defensive flags:

- `--strict-mcp-config` — ignore all configured MCP servers (only use ones you pass via `--mcp-config`).
- `--setting-sources ""` — don't load user/project settings.
- `--bare` — the maximal version: skips hooks, plugins, CLAUDE.md discovery, keychain reads (see §7).

---

## 5. Output formats and parsing

### `--output-format text` (default)

Plain text on stdout. Fine for humans, brittle for programs (no metadata, no error/result separation).

### `--output-format json`

One JSON object on stdout when the run completes: the result text plus metadata (session id, cost, duration, turn count). Best for one-shot programmatic calls:

```bash
claude -p --output-format json -- 'Classify this commit message: ...' | jq -r '.result'
```

### `--output-format stream-json` (JSONL streaming)

Requires `--verbose`. Emits one JSON object per line as the run progresses. Add `--include-partial-messages` to get token-level deltas. This is what you want for live UI streaming:

```bash
claude -p --output-format stream-json --verbose --include-partial-messages -- '<prompt>'
```

Event shapes to handle (parse each line independently; ignore unknown types for forward compatibility):

| Line `type` | Meaning | What to extract |
|---|---|---|
| `system` (subtype `init`) | Run started | `session_id` — save it for `--resume` |
| `stream_event` | Wrapped API stream event | `event.delta.type == "text_delta"` → `event.delta.text`; `"thinking_delta"` → `event.delta.thinking` |
| `assistant` / `user` | Full message turns (incl. tool use/results) | Optional — tool-call visibility |
| `result` | Final outcome | `result` (final text), `is_error`, cost/usage fields |

Parsing rules learned the hard way (from Dayflow's implementation):

- **Buffer by newline.** Chunks from the pipe don't align with line boundaries; accumulate bytes and split on `\n`.
- **Strip ANSI escapes** before `JSON.parse` — depending on TTY detection the CLI can emit escape sequences around output.
- **Deduplicate the final text.** If you accumulated `text_delta`s, ignore the `result` payload's text (or vice versa) or you'll show the answer twice.
- **Drain remaining stdout after process exit** — the last lines often arrive after the exit notification.

### Structured output

For machine-consumable answers, prefer `--json-schema` over "reply in JSON" prompting:

```bash
claude -p --output-format json \
  --json-schema '{"type":"object","properties":{"category":{"type":"string"},"confidence":{"type":"number"}},"required":["category","confidence"]}' \
  -- 'Categorize this activity: ...'
```

The result text is guaranteed to validate against the schema.

---

## 6. Multi-turn sessions

The CLI persists sessions on disk. To build a chat feature:

1. First call: parse `session_id` from the `system`/init event (stream-json) or the `json` result object.
2. Subsequent calls: add `--resume <session-id>` — full history is restored server-side of your app; you only send the new user message.
3. `--fork-session` resumes into a *new* session id (branching); `--session-id <uuid>` lets you pre-pick the id.
4. `-c` / `--continue` resumes the most recent session in the cwd — convenient for CLIs, too implicit for apps (prefer explicit `--resume`).

For stateless batch jobs, add `--no-session-persistence` so you don't accumulate session files in the user's `~/.claude`.

---

## 7. Prompting through the CLI

Everything you know about prompting applies, plus a few CLI-specific levers:

- **System prompts:** `--system-prompt` replaces the entire Claude Code system prompt (you lose its tool-use scaffolding — usually not what you want); `--append-system-prompt` adds your instructions on top (usually what you want). Both have `-file` variants in recent versions for long prompts.
- **Project context via CLAUDE.md:** anything in `CLAUDE.md` at the cwd is auto-loaded. For an app-owned sandbox directory, you can *write* a CLAUDE.md there to inject standing instructions without lengthening each prompt.
- **Images and files:** there is no `--image` flag. List absolute file paths in the prompt and let the model read them with its Read tool (which handles images and PDFs natively):

  ```
  Analyze these screenshots and describe the user's activity.
  Images:
  - /path/to/frame1.png
  - /path/to/frame2.png
  ```

  This requires the Read tool to be enabled — don't combine with `--tools ""`.
- **Determinism helpers:** put output-format contracts in the prompt *and* enforce with `--json-schema`; keep per-request variability (timestamps, ids) at the end of the prompt so prompt caching still hits.
- **Effort as a quality dial:** `--effort low` for classification/extraction, `high`/`xhigh` for analysis. Cheaper and more reliable than model-switching for most tuning.
- **`--bare` for reproducibility:** in `--bare` mode, nothing from the user's machine (hooks, plugins, memory, CLAUDE.md) leaks into your prompt — you supply all context explicitly via flags. Auth becomes strictly `ANTHROPIC_API_KEY`. Ideal for embedded/server use; not suitable when you specifically want the user's subscription login.

---

## 8. Process management in a host application

Lessons from a production integration (Dayflow, macOS/Swift — the patterns are language-agnostic):

- **Spawn via login shell** (`$SHELL -l -i -c "cd <sandbox> && exec claude ..."`) so PATH and auth resolve like the user's terminal. `exec` avoids a lingering shell parent.
- **Timeouts are mandatory.** Agentic runs can hang. Enforce a wall-clock timeout (Dayflow: 300 s), kill the process on expiry, and capture partial stdout/stderr into the error for debugging.
- **Capture stderr separately.** It's your only diagnostic channel: `command not found`, auth errors, rate limits all land there.
- **PTY caveat:** if you attach the process to a pseudo-terminal (e.g. to influence TTY-dependent behavior), initialize it with a real window size (80×24). Claude Code's terminal layer crashes on a 0×0 PTY grid. If you don't need a PTY, plain pipes are simpler and avoid ANSI noise — Dayflow uses pipes for one-shot calls and a sized PTY only where required.
- **Read stdout continuously.** A full pipe buffer will deadlock the child. Attach a reader before/immediately after launch.
- **One process per request; no pooling.** The CLI is designed for this — session state lives on disk, not in the process. Concurrency = spawn N processes (mind the user's rate limits).
- **Log the exact command line** (with the prompt elided or truncated) — indispensable when users report failures.

Skeleton in pseudo-code:

```
cmd  = build_argv(tool_flags, model, escaped_prompt)
proc = spawn(login_shell, ["-l", "-c", "cd sandbox && exec " + cmd],
             stdout=pipe, stderr=pipe)
reader = start_line_reader(proc.stdout, on_jsonl_line)
if !wait(proc, timeout=300s):
    proc.kill(); raise Timeout(partial_stdout, partial_stderr)
drain_remaining(proc.stdout)
if proc.exit_code != 0:
    raise map_error(proc.exit_code, stderr)   # 127 → "install claude"
```

---

## 9. Cost, rate limits, and etiquette

- Subscription auth draws from the user's plan limits; heavy background usage can exhaust their quota for interactive Claude Code. Be transparent about volume, batch where possible, and prefer `--effort low` + `haiku`/`sonnet` for high-frequency tasks.
- `--max-budget-usd` gives API-key users a per-run spend cap.
- Rate-limit errors surface on stderr / as `is_error` results. Back off exponentially; don't hot-retry.
- Session files accumulate under `~/.claude`. Use `--no-session-persistence` for throwaway calls.

---

## 10. Quick-reference recipes

```bash
# Pure text generation, no tools, cheap
claude -p --model haiku --effort low --tools "" -- 'Rewrite this sentence: ...'

# Structured extraction
claude -p --output-format json --json-schema "$SCHEMA" -- "$PROMPT" | jq '.result | fromjson'

# Streaming chat turn with session continuity
claude -p --output-format stream-json --verbose --include-partial-messages \
  --resume "$SESSION_ID" -- "$USER_MESSAGE"

# Analyze images
claude -p --dangerously-skip-permissions --strict-mcp-config \
  -- $'Describe what is happening in these screenshots.\nImages:\n- /abs/path/1.png\n- /abs/path/2.png'

# Hermetic server-side call (API key only, no user config)
ANTHROPIC_API_KEY=$KEY claude -p --bare --no-session-persistence \
  --append-system-prompt "$SYSTEM" -- "$PROMPT"

# Health check before first use
claude --version && claude auth status
```

### Integration checklist

- [ ] Resolve the binary via login shell or cached `which`
- [ ] Dedicated sandbox working directory
- [ ] Explicit tool/permission posture per call type
- [ ] `--strict-mcp-config` (or `--bare`) to isolate from user config
- [ ] JSONL parser: newline buffering, ANSI stripping, unknown-type tolerance, dedup of final text
- [ ] Wall-clock timeout + kill + partial-output capture
- [ ] Friendly errors for exit 127 (install) and auth failures (`claude auth login`)
- [ ] Session-id capture for multi-turn; `--no-session-persistence` for one-shots
