---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "ResumeDB is an agentic internship operating system, not merely a resume builder"
destination: youtube-embed
aspect: 1920x1080
language: en
audience: online-hackathon-judges
length: 90s
angle: student-journey
narration: yes
voice: fish-energetic-male
---

## Intent

Follow one university student through the complete working internship loop:
build a canonical profile and answer bank, discover and qualify a role, watch
the agent work, review evidence-backed tailoring, approve the application,
preview extension mappings, autofill the sandbox application, and retain the
human-controlled submit gate. The tone is confident, energetic, and credible.

## Assets

- https://resumedb-ai.vercel.app/ - the deployed product and primary source for captured interface footage.
- Repository webapp and extension icons - official ResumeDB brand marks for the opening and close.

## Customizations

- Use Fish Audio for narration with the `s2.1-pro-free` model header on every TTS request.
- Start with Fish Audio's documented Energetic Male public voice and allow a voice change before final audio generation.
- Keep the supplied temporary Fish key environment-only. Never commit or print it.
- Generate word-level caption timing by locally transcribing the Fish narration.
- Feature the product's own captured screens rather than inventing fictional product UI.
- End with a clearly labeled seven-second Future roadmap slide in a clean two-column layout.

## Notes

- Show only working MVP capabilities as shipped features.
- The Future roadmap slide lists email status tracking, interview preparation,
  progress journaling, university network insights, four-year internship
  planning, and major-specific portfolios or networking tools.
- The working-feature story should cover profile memory, explicit application
  answers, job discovery, the live agent timeline, application pipeline stages,
  tailored before-and-after artifacts, review gates, extension preflight,
  sandbox autofill, manual submission, and bring-your-own-agent support.
- Do not expose the temporary Fish Audio API key in Git, logs, metadata, or renders.
