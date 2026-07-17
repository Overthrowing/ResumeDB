# Project Instructions

## Writing style

- Never use the em dash "—". Use plain dash "-" instead.
- When writing commit messages, NEVER auto-add your agent name as co-author.
- When creating markdown files, minimize the usage of complicated features (emojis, diagrams, etc) that make the raw file hard to read, stick to simple readable markdown code.

## Python environment

- All python code must be run in a micromamba environment. Feel free to make new ones, but never install packages to the base system.

## Research and libraries

- Always use search liberally to find documentation or info on how to use libraries.
- When using toolkits, use the docs and examples.

## Engineering principles

- When making technical decisions, do not give much weight to development cost. What you think needs one month can be done in hours. Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- Iteration and Tokens are cheap, Time is expensive. Always optimize for efficiently producing output. Only worry about exessive token costs if running vague loops with no purpose.
- When doing bug fixes, always start with reproducing the bug in an E2E setting as closely aligned with how an end user would experience it as possible. This makes sure you find the real problem so your fix will actually solve it.
- When end-to-end testing a product, be picky about the UI you see and be obsessed with pixel perfection. If something clearly looks off, even if it is not directly related to what you are doing, try to get it fixed along the way.
- Apply that same high standard to engineering excellence: lint, test failures, and test flakiness. If you see one, even if it is not caused by what you are working on right now, still get it fixed.


# Agent Workflow

- Inspect relevant files before changing code.
- Prefer minimal, targeted changes that follow existing patterns.
- For tasks touching more than two files, write or present a short plan before broad edits.
- Run the smallest relevant test first, then broader verification when code behavior changed.
- Keep unrelated dirty worktree changes intact.
- In this repository, assigned scope and worktree ownership take precedence over
  broader guidance to fix unrelated issues. Report out-of-scope failures; fix
  them only after they receive a separate owner and worktree, or when the
  operator expands the scope.
- In the final response, summarize what changed, tests run, and any tests not run with the reason.
- Follow the git-commit skill for atomic commits. Use follow-up commits after a
  hash is shared; never rewrite shared or integrated history.
- Follow the Parallel Worktree Protocol whenever more than one write-capable
  task is active.
- Update docs and comments regularly, especially if you have completed a certain milestone or changed a functionality.

# Parallel Worktree Protocol

- Isolation comes from a separate worktree directory, not from a branch name.
  Agents that share one checkout also share its branch and uncommitted edits.
- The primary checkout must remain on `main` at all times. Never create or check
  out a task branch in the primary checkout, even when only one task is active.
- The primary checkout is integration-only. The operator designates one
  integration owner as the sole writer to `main`.
- The operator is the integration owner by default. An agent owns integration
  only when the operator explicitly delegates it in the current task thread.
- Discover active Treehouse lease holders with
  `treehouse status`. Do not infer ownership from branch names
  or directory age.
- Every write-capable task, regardless of size or concurrency, gets one leased
  worktree, one `<task>` branch, and a non-overlapping file scope.
  Read-only agents may share a checkout only if they make no filesystem or Git
  changes.
- Before leasing task worktrees, the integration owner fetches `origin`,
  confirms the primary checkout is clean, runs `devenv test`, and pushes `main`
  so local and remote share the exact recorded base SHA.
- Treehouse manages the reusable worktree pool configured by `treehouse.toml`.
  Acquire with
  `treehouse get --lease --lease-holder <agent-or-task>`, then
  create the branch inside it with
  `git switch -c <task> <base_sha>`.
- Create every task branch only inside its leased worktree. A task branch may be
  based on the recorded current `main` SHA, but it must never be created or
  checked out in the primary checkout.
- A task owner writes only its assigned branch and paths. It must not switch,
  commit, reset, merge into, or push `main` or another task branch.
- Before handoff, merge current `main` into the task branch with
  `git merge main`, resolve drift there without rewriting
  history, run the focused checks and `just test`, and leave it clean.
- The task thread is the canonical handoff record; Git history is the canonical
  record of integrated commits. Do not create ad hoc repository handoff ledgers
  or status plans.
- The integration owner may integrate into `main`. After integration it
  reruns `just test`, pushes `origin/main`, and marks the task `integrated` or
  `superseded` before any cleanup.
- Return a Treehouse lease using `treehouse return <path>` after its disposition is
  recorded as `integrated` or `superseded`, canonical `main` is on `origin/main`,
  and the operator or integration owner marks it safe.