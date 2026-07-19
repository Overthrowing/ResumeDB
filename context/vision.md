# ResumeDB product vision

ResumeDB is a career operating system for university students pursuing
software, data, product, and quant internships. Its career agent learns the
user's real evidence over time, discovers qualified opportunities, prepares
tailored applications, and reduces each application to a short human review and
final submission.

## Hackathon MVP

The hackathon build is intentionally single-user and local. It demonstrates the
full core product loop without production authentication, billing, or
multi-tenancy.

Core surfaces:

- Responsive web application for knowledge, discovery, review, and tracking
- Hosted agent provider through Claude Code or Codex
- Optional external agent access through the local API
- Chrome extension for signed-in page capture and application autofill

Core behavior:

- Resume import and a complete canonical profile
- Full agent access to user-provided career knowledge
- Natural-language job ingestion and scheduled discovery
- Qualification from explicit constraints, semantic evidence, and preferences
- Automatic high-confidence preparation through `draft`
- Human approval from `draft` to `ready` after required facts and the rendered
  resume PDF pass deterministic readiness checks
- Browser autofill from `ready`, with the user performing final submission
- Manual tracking after submission

## Truth and learning

ResumeDB is persuasive but evidence-backed. It can emphasize transferable
skills, mirror supported terminology, reorder evidence, and write stronger
accomplishment language. It never invents employers, projects, dates, degrees,
graduation details, demographics, authorization, technologies, credentials,
scope, or metrics.

Canonical facts require explicit user input or confirmation. The agent may
learn editable preferences from accepted edits, rejected edits, and application
outcomes. Application-specific drafts remain separate from permanent evidence.

## Job sources

Sources are agent skills rather than separate product workflows. A universal
job command accepts any URL, pasted posting, or natural-language search goal.
Specialized extraction strategies may improve reliability, while a validated
canonical pipeline handles deduplication, provenance, qualification, and
security. The extension covers authenticated or unsupported pages through
user-directed capture.

## Future layers

- Email monitoring and automatic outcome classification
- Interview preparation
- Goal journal for clubs, projects, coursework, and research
- Privacy-safe university and peer outcome insights
- Four-year internship and career planning
- Major-specific portfolios, personal sites, and networking artifacts
- Production hosted accounts, billing, and multi-user isolation
