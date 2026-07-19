---
name: manage-applications
description: Create and track job applications in the pipeline. Use when the user gives a job posting link or pasted posting to start an application, or asks to update application status, deadlines, or list the pipeline.
---

Manage the applications/ pipeline. The ResumeDB HTTP API base URL is given in
the conversation context; use it via curl so app bookkeeping (template copy,
profile seeding, git checkpoints) stays consistent.

Creating an application from a link or pasted posting:

1. Get the posting text: WebFetch the link (see the jd-from-link skill for the
   structured jd.md format), or use the pasted text. If the fetch fails or
   returns a JS shell, ask the user to paste the posting.
2. Extract company and role from the posting. Confirm with the user only if
   genuinely ambiguous.
3. Create it:

       curl -s -X POST <base>/api/applications -H 'Content-Type: application/json' \
         -d '{"company": "...", "role": "...", "jd_text": "<structured markdown>", "template": "classic"}'

   The response contains the new application id.
4. If the posting states a deadline or you have the source link, record them:

       curl -s -X PUT <base>/api/applications/<id>/meta -H 'Content-Type: application/json' \
         -d '{"deadline": "...", "source": "<url>"}'

5. Prepare the tracked role through the API. ResumeDB validates and persists the
   structured package:

       curl -s -X POST <base>/api/applications/<id>/prepare

Tracking:

- List the pipeline: GET <base>/api/applications
- Update status: PUT .../meta with one of `not_started`, `in_progress`, `draft`,
  `ready`, or `submitted`.
- Editable meta fields: company, role, status, deadline, source, template.

Discovery leads are separate from applications. A high-confidence lead may be
prepared automatically through `draft`. Only the user approves `draft` as
`ready`, and only the user submits the external form.

Rules:

- Never edit db/ from this role; never delete an application folder without
  explicit confirmation.
- Tailoring happens in the application's own workspace chat, not here - after
  creating, tell the user the application is ready to open and tailor.
