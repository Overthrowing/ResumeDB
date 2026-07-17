---
name: tailor-resume
description: Tailor the resume for the current job application by selecting and rewriting master database content into resume.yaml. Use for any request to generate, tailor, tighten, or rework the resume in an application folder.
---

Tailor the resume for one application folder (applications/<id>/).

Process:

1. Read every db/ entry, db/profile.yaml, this application's jd.md and notes.md,
   and templates/SCHEMA.md.
2. Select the entries most relevant to the job description, decide section order,
   and rewrite bullets into applications/<id>/resume.yaml following SCHEMA.md
   exactly. Mirror the JD's terminology where the underlying fact supports it.
3. Render and fit: run
   typst compile --root . --input data=/applications/<id>/resume.yaml applications/<id>/resume.typ applications/<id>/resume.pdf
   and check the page count. Target exactly 1 page. Prefer cutting or tightening
   content in resume.yaml over layout hacks; edit resume.typ only as a last
   resort for spacing, never for content.
4. Explain every decision. End your reply with a "## Decisions" overview and
   write the same content to applications/<id>/decisions.md (overwrite it each
   run). One bullet per decision, each tied to JD evidence:
   - what you included, led with, reordered, rewrote, cut, or downplayed
   - why, quoting or closely paraphrasing the JD line that justifies it
     (e.g. included ledger migration first - JD: "drive migrations ... own
     reliability of our edge data plane")
   - keyword mirroring choices and any db content you considered but left out,
     with the reason
   Decisions without a JD tie (space constraints, memory.md rules) name that
   reason instead. This overview is how the user audits your work - never skip
   or compress it to generalities.

Truth policy:

- Rephrasing, reordering, emphasizing, and JD-keyword mirroring: always allowed.
- Any claim stronger than what db/ supports is an embellishment. You may suggest
  embellishments, but present each one clearly in chat as "PROPOSED
  EMBELLISHMENT: <claim> (db says: <fact>)" and only include approved ones. The
  user can dial aggressiveness up or down per chat.
- Missing metrics: ask the user for the real number. Never invent one.
- If an answer reveals durable new facts about an experience, draft a proposal
  into proposals/ (see intake-interview) instead of editing db/.
