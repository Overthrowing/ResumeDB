const BACKEND_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('app-select');
  const btn = document.getElementById('fill-btn');
  const status = document.getElementById('status-text');

  let profile = null;

  try {
    // 1. Fetch Profile
    const profileRes = await fetch(`${BACKEND_URL}/api/db/profile`);
    if (!profileRes.ok) throw new Error('Could not connect to ResumeDB API.');
    profile = await profileRes.json();

    // 2. Fetch Applications
    const appsRes = await fetch(`${BACKEND_URL}/api/applications`);
    if (!appsRes.ok) throw new Error('Could not fetch applications.');
    const apps = await appsRes.json();

    // Clear loading option
    select.innerHTML = '<option value="">-- Choose an application --</option>';

    if (apps.length === 0) {
      select.innerHTML += '<option value="" disabled>No applications tracked yet.</option>';
      status.innerText = 'Track an application in ResumeDB first.';
      return;
    }

    apps.forEach(app => {
      const opt = document.createElement('option');
      opt.value = app.id;
      opt.innerText = `${app.company} - ${app.role} (${app.status})`;
      select.appendChild(opt);
    });

    status.innerText = 'Select an application above to fill forms.';

    select.addEventListener('change', () => {
      btn.disabled = !select.value;
    });

  } catch (err) {
    status.innerText = err.message;
    status.className = 'status error';
  }

  btn.addEventListener('click', async () => {
    const appId = select.value;
    if (!appId || !profile) return;

    btn.disabled = true;
    status.innerText = 'Preparing application data...';
    status.className = 'status';

    try {
      // 1. Fetch full application details (for resume meta)
      const appRes = await fetch(`${BACKEND_URL}/api/applications/${appId}`);
      if (!appRes.ok) throw new Error('Failed to load application details.');
      const application = await appRes.json();

      // 2. Fetch tailored PDF
      status.innerText = 'Downloading tailored resume PDF...';
      let pdfBase64 = null;
      try {
        const pdfRes = await fetch(`${BACKEND_URL}/api/applications/${appId}/resume.pdf`);
        if (pdfRes.ok) {
          const arrayBuffer = await pdfRes.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          pdfBase64 = btoa(binary);
        }
      } catch (pdfErr) {
        console.warn('Tailored PDF not found or compiled yet. Continuing without PDF.', pdfErr);
      }

      // 3. Inject content script
      status.innerText = 'Injecting helper onto page...';
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active browser tab found.');

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 4. Send message to start autofill
      status.innerText = 'Filling form fields...';
      chrome.tabs.sendMessage(tab.id, {
        action: 'autofill',
        profile,
        application,
        pdfBase64,
        pdfName: `${application.meta.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`
      }, (response) => {
        btn.disabled = false;
        if (chrome.runtime.lastError) {
          status.innerText = `Error: ${chrome.runtime.lastError.message}`;
          status.className = 'status error';
        } else if (response && response.success) {
          status.innerText = 'Application form filled successfully!';
          status.className = 'status success';
        } else {
          status.innerText = response?.message || 'Autofill failed.';
          status.className = 'status error';
        }
      });

    } catch (err) {
      btn.disabled = false;
      status.innerText = err.message;
      status.className = 'status error';
    }
  });
});
