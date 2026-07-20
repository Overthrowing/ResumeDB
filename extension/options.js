document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const backendInput = document.getElementById('backend-url');
  const webAppInput = document.getElementById('web-app-url');
  const status = document.getElementById('status');
  const settings = await getResumeDbSettings();

  backendInput.value = settings.backendUrl;
  webAppInput.value = settings.webAppUrl;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const backendUrl = normalizeBaseUrl(backendInput.value, '');
    const webAppUrl = normalizeBaseUrl(webAppInput.value, '');
    if (!backendUrl || !webAppUrl) {
      status.textContent = 'Enter valid HTTP or HTTPS URLs.';
      status.style.color = '#ef8f8f';
      return;
    }

    status.textContent = 'Testing Railway connection...';
    status.style.color = '#aaa';
    try {
      const response = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await chrome.storage.sync.set({ backendUrl, webAppUrl });
      status.textContent = 'Saved. ResumeDB is reachable.';
      status.style.color = '#86c892';
    } catch (error) {
      status.textContent = `Could not reach Railway: ${error.message}`;
      status.style.color = '#ef8f8f';
    }
  });
});
