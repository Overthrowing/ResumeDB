# ResumeDB Autofill Helper Extension

This Chrome Extension works directly with your local ResumeDB server to automatically fill job application forms (on Lever, Greenhouse, Workday, etc.) using your stored profile details and programmatically uploads your tailored PDF resume.

## Installation

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the extension directory:
   `/Users/nathanye/Dev/Hackathons/ResumeDB/extension`

## Usage

1. Start your ResumeDB server as usual (`make dev`).
2. Go to any job application form on the web (e.g. Lever, Greenhouse, or Workday).
3. Click the **ResumeDB Autofill Helper** icon in your Chrome toolbar.
4. Select the specific job application you are filling out from the dropdown menu.
5. Click **Auto-fill Form**. The extension will automatically populate the form fields and upload your tailored PDF resume!
