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

The current side panel shows the ResumeDB logo and version `2.1.0` in its
header. The extension requests access to job application pages because Chrome
requires explicit site access before it can capture or fill them.

## Troubleshooting

If the side panel remains on **Connecting to ResumeDB...**, first confirm that
`make dev` is running. If the header has no ResumeDB logo or version, Chrome is
still running an older unpacked copy:

1. Open `chrome://extensions`.
2. Remove the old ResumeDB extension.
3. Choose **Load unpacked** and select the `extension` directory from the
   checkout you are currently running.
4. Reload the job application tab after loading or reloading the extension.

After editing extension source files, use the Reload button on the ResumeDB
card in `chrome://extensions`, then reload the target page. Chrome does not
automatically refresh unpacked extensions or already-open pages.

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

## Local test site

1. In ResumeDB, open **Profile & Settings**.
2. Choose **Create Ready demo + open form** and confirm the synthetic-data
   notice.
3. On the Northstar Robotics form, open the extension side panel.
4. Select the Ready Northstar application and choose **Auto-fill current form**.
5. Verify that the profile fields, voluntary answers, and hidden resume input
   are filled. The interest response and certification remain manual on
   purpose.
6. Complete those two fields and use **Submit demo application**. The page
   shows a local success message and sends no data.

The blank test form is also available at
`http://localhost:5173/?demo=ats`. It includes `JobPosting` structured data, so
**Capture this job page** can exercise the ingestion path too.
