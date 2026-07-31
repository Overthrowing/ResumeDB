# Resume data repo - agent rulebook

Read CLAUDE.md in this directory first: it is the full rulebook (layout, rules,
truth policy, safety rules) and applies to every agent working here.

This file exists because some agents (e.g. Codex) read AGENTS.md instead of
CLAUDE.md and do not auto-load skills. If that is you:

- Follow every rule in CLAUDE.md.
- Task playbooks live in .claude/skills/<name>/SKILL.md. Before doing one of
  these tasks, read and follow the matching skill file:
  - tailor-resume: tailor resume.yaml for an application
  - intake-interview: interview the user and draft db/ proposals
  - jd-from-link: fetch a job posting URL into jd.md
  - manage-applications: create/track applications in the pipeline
  - ats-audit: score a rendered resume against the JD
  - template-author: create or modify resume templates
