# Asset Descriptions

⚠️  GEMINI_API_KEY not set — descriptions below are catalog-derived (alt text, headings, section context, filename) instead of Vision-generated. To get richer Vision descriptions on the next capture, set GEMINI_API_KEY (or GOOGLE_API_KEY) and re-run.

The `logo-<hash>.svg` filename prefix is a structural hint (DOM said this SVG was inside a `<header>`, home-link `<a>`, or had an aria-label matching the page brand). To pick the actual brand logo without Vision, open the `logo-*` candidates in a previewer or rasterize them with `sharp` before referencing — composing a fake logo ships off-brand in the final video.

- favicon.svg — 1KB, favicon
- svgs/logo-4c24a6d9.svg — logo 4c24a6d9
- svgs/logo-83230857.svg — logo 83230857
- svgs/svg-4c9b27b4.svg — svg 4c9b27b4
- svgs/svg-4fd0e714.svg — svg 4fd0e714
- svgs/svg-8a2ae701.svg — svg 8a2ae701
- svgs/svg-f2932342.svg — svg f2932342

## Production product screens

These screenshots were captured from the deployed ResumeDB demo at 1600 by
1000 CSS pixels unless otherwise noted. All visible applicant and job details
are synthetic hackathon demo data.

- product-screens/01-dashboard.png - Home dashboard for Earnestine Braun, showing the tracked application, Ready status, profile readiness, and clearly marked synthetic-profile/demo badges.
- product-screens/02-settings-profile-agent.png - Profile and Settings view with canonical applicant facts, explicit application answers, and connected-agent configuration.
- product-screens/03-knowledge.png - Student knowledge base with structured experience and reusable career evidence.
- product-screens/04-career-agent.png - Career Agent discovery workspace with natural-language instructions and the four-stage live run timeline.
- product-screens/05-applications.png - Applications table with the five pipeline stages: Not Started, In Progress, Draft, Ready, and Submitted.
- product-screens/06-application-overview.png - Northstar Robotics application workbench showing the Ready gate, job description, and agent-authored tailoring decisions.
- product-screens/07-evidence-tailoring.png - Evidence-backed before and after tailoring cards, including exact job requirements and links back to canonical source facts.
- product-screens/08-extension-preflight.png - Autofill handoff view with approved-package metrics and the explicit sequence from page scan to user submission.
- product-screens/09-ats-empty.png - Empty synthetic Northstar Robotics ATS sandbox before autofill.
- product-screens/10-ats-filled.png - The same synthetic ATS sandbox after approved profile fields have been filled.
- product-screens/11-ats-profile-answers.png - Filled work-eligibility and voluntary self-identification fields, demonstrating that sensitive answers come from the explicit profile rather than inference.
- product-screens/13-extension-preflight-live.png - Chrome extension side panel at 420 by 850 CSS pixels, staged with the deployed demo application's known package to show the working preflight state: 11 mapped fields, zero review blockers, tailored resume present, and manual submission preserved.
- product-screens/14-tailored-resume.png - Tailored one-page resume rendered inside the Northstar Robotics workbench, with role-specific React, TypeScript, Python, PostgreSQL, and product-impact bullets.
- product-screens/15-cover-qa.png - Application answers and tailored cover letter, with every sensitive answer showing its canonical profile source and missing facts designed to remain blank.
