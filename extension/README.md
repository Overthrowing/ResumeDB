# ResumeDB Chrome extension

The extension bridges ResumeDB with the user's signed-in browser session. It
captures job pages, fills approved application packages, uploads tailored PDF
resumes, and opens the ready queue without storing job-site passwords.

## Install

1. Start ResumeDB with `make dev`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Choose Load unpacked and select this `extension` directory.
5. Click the ResumeDB extension icon to open the side panel.

## Workflow

- Capture this job page sends the visible page and structured metadata through
  the universal ResumeDB job agent.
- Auto-fill current form fills explicit profile and application answers and
  uploads the tailored resume.
- Open and Auto-fill opens the selected approved posting and fills it.
- Open ready queue prepares every approved application in separate tabs.
- I submitted this application records the final state after the user submits.

ResumeDB never clicks the external site's final Submit button and does not
bypass CAPTCHAs. Required fields without canonical answers remain visible for
the user.
