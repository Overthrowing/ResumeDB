---
name: prepare-application
description: Prepare the complete evidence-backed application package for a tracked role.
---

Call POST /api/applications/<id>/prepare. ResumeDB gives the preparation agent
the complete knowledge base and persists validated structured output: tailored
resume, application answers, missing facts, cover letter when useful, recruiter
message, provenance, and tailoring decisions. The resulting state is `draft`.
Only the user can approve it as `ready`, and only the user performs final
submission.
