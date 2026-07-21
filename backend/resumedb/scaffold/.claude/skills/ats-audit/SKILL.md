---
name: ats-audit
description: Score a rendered resume against the job description for keyword coverage. Used by the app's Audit button; can also be invoked in chat.
---

Audit applications/<id>/ for ATS keyword coverage.

1. Read jd.md and resume.yaml in the application folder.
2. Extract the skills, technologies, qualifications, and role-specific terms the
   JD actually asks for. Ignore boilerplate benefits and EEO text, plus facts
   that do not belong in a resume, such as citizenship or work authorization.
3. For each term, check whether resume.yaml covers it, counting synonyms and
   morphological variants (e.g. "Kubernetes" covers "k8s") as covered.
4. Report as JSON: {"score": 0-100 coverage percentage weighted by how central
   each term is to the role, "covered": [...], "missing": [...], "notes": "one
   short paragraph on the biggest gaps and whether the db/ plausibly contains
   material to close them"}.

Only report on coverage; do not edit any files.
