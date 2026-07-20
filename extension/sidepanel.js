let backendUrl = null;
let wsUrl = null;

document.addEventListener('DOMContentLoaded', () => {
  const appSelect = document.getElementById('app-select');
  const preflightButton = document.getElementById('preflight-btn');
  const preflightPanel = document.getElementById('preflight-panel');
  const preflightPage = document.getElementById('preflight-page');
  const preflightMapped = document.getElementById('preflight-mapped');
  const preflightReview = document.getElementById('preflight-review');
  const preflightResume = document.getElementById('preflight-resume');
  const preflightFields = document.getElementById('preflight-fields');
  const fillButton = document.getElementById('fill-btn');
  const openFillButton = document.getElementById('open-fill-btn');
  const readyQueueButton = document.getElementById('ready-queue-btn');
  const submittedButton = document.getElementById('submitted-btn');
  const scrapeButton = document.getElementById('scrape-btn');
  const statusText = document.getElementById('status-text');
  const progress = document.getElementById('open-fill-progress');
  const progressText = document.getElementById('open-fill-status');
  const matchScore = document.getElementById('match-score');
  const matchedKeywords = document.getElementById('matched-keywords');
  const missingKeywords = document.getElementById('missing-keywords');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-btn');
  const connectionPanel = document.getElementById('connection-panel');
  const connectionMessage = document.getElementById('connection-message');
  const retryButton = document.getElementById('retry-btn');
  const openAppButton = document.getElementById('open-app-btn');
  const connectionSettingsButton = document.getElementById('connection-settings-btn');
  const versionText = document.getElementById('extension-version');

  let applications = [];
  let activePackage = null;
  let socket = null;
  let conversationId = null;

  versionText.textContent = `v${chrome.runtime.getManifest().version}`;

  const connectBackend = async () => {
    let lastError = null;
    for (const candidate of await getBackendCandidates()) {
      try {
        const response = await fetch(`${candidate}/api/health`, { signal: AbortSignal.timeout(2500) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const health = await response.json();
        if (!health.data_repo_ok) throw new Error('The career-data repository is not initialized.');
        backendUrl = candidate;
        wsUrl = candidate.replace(/^http/, 'ws');
        return health;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      lastError?.message === 'The career-data repository is not initialized.'
        ? lastError.message
        : 'ResumeDB is not reachable. Check the configured backend URL, then retry.',
    );
  };

  const request = async (path, options) => {
    if (!backendUrl) await connectBackend();
    let response;
    try {
      response = await fetch(`${backendUrl}${path}`, options);
    } catch {
      backendUrl = null;
      wsUrl = null;
      throw new Error('Lost the ResumeDB connection. Check the configured backend URL, then retry.');
    }
    if (!response.ok) {
      let message = response.statusText;
      try { message = (await response.json()).detail || message; } catch { /* text response */ }
      throw new Error(message);
    }
    return response.json();
  };

  const setStatus = (message, kind = '') => {
    statusText.textContent = message;
    statusText.className = `status${kind ? ` ${kind}` : ''}`;
  };

  const showConnectionProblem = (error) => {
    connectionMessage.textContent = error.message;
    connectionPanel.hidden = false;
    appSelect.disabled = true;
    appSelect.innerHTML = '<option value="">ResumeDB disconnected</option>';
    applications = [];
    activePackage = null;
    preflightPanel.hidden = true;
    setBusy(false);
    setStatus('Connection required.', 'error');
  };

  const clearConnectionProblem = () => {
    connectionPanel.hidden = true;
    appSelect.disabled = false;
  };

  const setBusy = (busy, message = '') => {
    progress.style.display = busy ? 'flex' : 'none';
    if (message) progressText.textContent = message;
    preflightButton.disabled = busy || !activePackage || activePackage.application.meta.status !== 'ready';
    fillButton.disabled = busy || !activePackage || activePackage.application.meta.status !== 'ready';
    openFillButton.disabled = fillButton.disabled || !activePackage?.application.meta.source;
    readyQueueButton.disabled = busy || !applications.some((app) => app.status === 'ready' && app.source);
  };

  const loadApplications = async () => {
    setStatus('Connecting to ResumeDB...');
    await connectBackend();
    clearConnectionProblem();
    applications = await request('/api/applications');
    appSelect.innerHTML = '<option value="">Select an application</option>';
    for (const app of applications) {
      const option = document.createElement('option');
      option.value = app.id;
      option.textContent = `${app.company} - ${app.role} (${app.status.replace('_', ' ')})`;
      appSelect.appendChild(option);
    }
    const readyCount = applications.filter((app) => app.status === 'ready' && app.source).length;
    readyQueueButton.textContent = `Open ready queue (${readyCount})`;
    readyQueueButton.disabled = readyCount === 0;
    const preferred = applications.find((app) => app.status === 'ready');
    if (preferred) {
      appSelect.value = preferred.id;
      await loadPackage(preferred.id);
    } else {
      setStatus(applications.length ? 'Select an application. Drafts must be approved before autofill.' : 'No applications tracked yet.');
    }
  };

  const loadPackage = async (appId) => {
    activePackage = appId ? await request(`/api/applications/${appId}/autofill-package`) : null;
    preflightPanel.hidden = true;
    const ready = activePackage?.application.meta.status === 'ready';
    preflightButton.disabled = !ready;
    fillButton.disabled = !ready;
    openFillButton.disabled = !ready || !activePackage.application.meta.source;
    submittedButton.style.display = activePackage ? 'block' : 'none';
    submittedButton.disabled = !ready;
    setStatus(
      ready
        ? activePackage.missing.length
          ? `${activePackage.missing.length} missing answers need review before autofill.`
          : 'Approved package ready to autofill.'
        : activePackage
          ? `Application is ${activePackage.application.meta.status}. Approve its draft in ResumeDB first.`
          : 'Select a ready application.',
      ready && !activePackage.missing.length ? 'success' : '',
    );
  };

  const pdfBase64 = async (appId) => {
    const response = await fetch(`${backendUrl}/api/applications/${appId}/resume.pdf`);
    if (!response.ok) throw new Error('The tailored resume PDF is unavailable. Render the draft in ResumeDB first.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };

  const waitForTab = async (tabId) => {
    const existing = await chrome.tabs.get(tabId);
    if (existing.status === 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 900));
      return;
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Application page took too long to load.'));
      }, 30000);
      const listener = (updatedId, changeInfo) => {
        if (updatedId !== tabId || changeInfo.status !== 'complete') return;
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 900);
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
  };

  const prepareTab = async (tabId) => {
    const target = await chrome.tabs.get(tabId);
    if (!/^https?:\/\//i.test(target.url || '')) {
      throw new Error('Chrome blocks ResumeDB on this page. Open an http or https application page and try again.');
    }
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } catch (error) {
      throw new Error(`ResumeDB cannot access this page. Reload the extension and confirm site access is allowed. ${error.message}`);
    }
    return target;
  };

  const sendToTab = (tabId, message) => new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!response?.success) reject(new Error(response?.message || 'The page scan failed.'));
      else resolve(response);
    });
  });

  const scanTab = async (tabId, applicationPackage) => {
    const target = await prepareTab(tabId);
    const result = await sendToTab(tabId, {
      action: 'preflight',
      profile: applicationPackage.profile,
      answers: applicationPackage.answers,
    });
    return { ...result, pageTitle: target.title || 'Current application page', tabId };
  };

  const renderPreflight = (result) => {
    preflightPage.textContent = result.pageTitle;
    preflightMapped.textContent = String(result.mapped);
    preflightReview.textContent = String(result.review);
    preflightResume.textContent = result.resumeDetected ? 'Yes' : 'No';
    preflightFields.innerHTML = '';
    for (const field of result.fields || []) {
      const row = document.createElement('div');
      row.className = `preflight-field ${field.status}`;
      const mark = document.createElement('span');
      mark.className = 'mark';
      mark.textContent = field.status === 'ready' ? '✓' : '!';
      const name = document.createElement('span');
      name.className = 'field-name';
      name.textContent = field.label;
      const source = document.createElement('span');
      source.className = 'field-source';
      source.textContent = field.source;
      row.append(mark, name, source);
      preflightFields.appendChild(row);
    }
    preflightPanel.hidden = false;
  };

  const fillTab = async (tabId, applicationPackage) => {
    const app = applicationPackage.application;
    await prepareTab(tabId);
    const pdf = await pdfBase64(app.meta.id);
    return sendToTab(tabId, {
      action: 'autofill',
      profile: applicationPackage.profile,
      answers: applicationPackage.answers,
      pdfBase64: pdf,
      pdfName: `${app.meta.company.replace(/[^a-z0-9]/gi, '_')}_Resume.pdf`,
    });
  };

  appSelect.addEventListener('change', async () => {
    resetChat();
    try { await loadPackage(appSelect.value); }
    catch (error) { setStatus(error.message, 'error'); }
  });

  preflightButton.addEventListener('click', async () => {
    if (!activePackage) return;
    setBusy(true, 'Scanning the current page without changing it...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('Open the application page first.');
      const result = await scanTab(tab.id, activePackage);
      renderPreflight(result);
      setStatus(
        `${result.mapped} fields ready${result.review ? `, ${result.review} need review` : ''}. Nothing was changed.`,
        result.review ? '' : 'success',
      );
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  });

  fillButton.addEventListener('click', async () => {
    if (!activePackage) return;
    setBusy(true, 'Filling the current page...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('Open the application page first.');
      const result = await fillTab(tab.id, activePackage);
      setStatus(result.message, result.unmatchedRequired?.length ? '' : 'success');
      submittedButton.disabled = false;
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  });

  openFillButton.addEventListener('click', async () => {
    if (!activePackage?.application.meta.source) return;
    setBusy(true, 'Opening the application page...');
    try {
      const tab = await chrome.tabs.create({ url: activePackage.application.meta.source, active: true });
      await waitForTab(tab.id);
      const result = await fillTab(tab.id, activePackage);
      setStatus(result.message, result.unmatchedRequired?.length ? '' : 'success');
      submittedButton.disabled = false;
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  });

  readyQueueButton.addEventListener('click', async () => {
    const ready = applications.filter((app) => app.status === 'ready' && app.source);
    setBusy(true, `Opening ${ready.length} approved applications...`);
    let completed = 0;
    const failures = [];
    for (const app of ready) {
      try {
        progressText.textContent = `Preparing ${completed + 1} of ${ready.length}: ${app.company}`;
        const applicationPackage = await request(`/api/applications/${app.id}/autofill-package`);
        const tab = await chrome.tabs.create({ url: app.source, active: completed === 0 });
        await waitForTab(tab.id);
        await fillTab(tab.id, applicationPackage);
        completed += 1;
      } catch (error) {
        failures.push(`${app.company}: ${error.message}`);
      }
    }
    setBusy(false);
    setStatus(
      `Prepared ${completed} of ${ready.length} applications in browser tabs.${failures.length ? ` ${failures.length} need manual attention.` : ' Review and submit each tab.'}`,
      failures.length ? '' : 'success',
    );
  });

  submittedButton.addEventListener('click', async () => {
    if (!activePackage) return;
    try {
      await request(`/api/applications/${activePackage.application.meta.id}/submitted`, { method: 'POST' });
      setStatus('Recorded as submitted.', 'success');
      await loadApplications();
      activePackage = null;
      appSelect.value = '';
      submittedButton.style.display = 'none';
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });

  scrapeButton.addEventListener('click', async () => {
    scrapeButton.disabled = true;
    setStatus('Capturing this page for the career agent...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active page found.');
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      const captured = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, (response) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else if (!response?.success) reject(new Error(response?.message || 'Capture failed.'));
          else resolve(response);
        });
      });
      const command = `Add this job to my applications. Source URL: ${captured.url}. Apply URL: ${captured.applyUrl || ''}. Page title: ${captured.title}. Captured posting:\n${captured.text}`;
      const result = await request('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, auto_prepare: true }),
      });
      setStatus(result.summary || 'Captured and sent to the career agent.', 'success');
      await loadApplications();
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      scrapeButton.disabled = false;
    }
  });

  const loadMetrics = async () => {
    if (!activePackage) return;
    matchScore.textContent = '...';
    try {
      const report = await request(`/api/applications/${activePackage.application.meta.id}/audit`, { method: 'POST' });
      if (report.llm?.error) throw new Error(report.llm.error);
      matchScore.textContent = `${Math.round(report.llm?.score || 0)}%`;
      matchedKeywords.innerHTML = '';
      missingKeywords.innerHTML = '';
      for (const keyword of report.llm?.covered || []) {
        const badge = document.createElement('span');
        badge.className = 'keyword matched';
        badge.textContent = keyword;
        matchedKeywords.appendChild(badge);
      }
      for (const keyword of report.llm?.missing || []) {
        const badge = document.createElement('span');
        badge.className = 'keyword missing';
        badge.textContent = keyword;
        missingKeywords.appendChild(badge);
      }
    } catch (error) {
      matchScore.textContent = 'Err';
      missingKeywords.textContent = error.message;
    }
  };

  const resetChat = () => {
    if (socket) socket.close();
    socket = null;
    conversationId = null;
    chatMessages.innerHTML = '<div class="msg agent">Select an application to talk with its tailoring agent.</div>';
    chatInput.disabled = true;
    sendButton.disabled = true;
  };

  const initChat = () => {
    if (!activePackage || socket) return;
    const scope = `app:${activePackage.application.meta.id}`;
    socket = new WebSocket(`${wsUrl}/api/chat?scope=${encodeURIComponent(scope)}&conversation=${conversationId || ''}`);
    socket.onopen = () => {
      chatMessages.innerHTML = '<div class="msg agent">Connected to the application agent.</div>';
      chatInput.disabled = false;
      sendButton.disabled = false;
    };
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'conversation') conversationId = data.id;
      if (data.type === 'text_delta' || data.type === 'result' || data.type === 'error') {
        let bubble = chatMessages.lastElementChild;
        if (!bubble || bubble.dataset.streaming !== 'true') {
          bubble = document.createElement('div');
          bubble.className = `msg agent${data.type === 'error' ? ' error' : ''}`;
          bubble.dataset.streaming = 'true';
          chatMessages.appendChild(bubble);
        }
        if (data.type === 'text_delta') bubble.textContent += data.text;
        else {
          bubble.textContent = data.text || data.message || bubble.textContent;
          delete bubble.dataset.streaming;
          chatInput.disabled = false;
          sendButton.disabled = false;
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    };
    socket.onclose = () => { socket = null; };
  };

  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text || socket?.readyState !== WebSocket.OPEN) return;
    const bubble = document.createElement('div');
    bubble.className = 'msg user';
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    socket.send(JSON.stringify({ type: 'message', text }));
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;
  };

  sendButton.addEventListener('click', sendMessage);
  retryButton.addEventListener('click', () => {
    backendUrl = null;
    wsUrl = null;
    retryButton.disabled = true;
    loadApplications()
      .catch(showConnectionProblem)
      .finally(() => { retryButton.disabled = false; });
  });
  openAppButton.addEventListener('click', async () => {
    const { webAppUrl } = await getResumeDbSettings();
    chrome.tabs.create({ url: webAppUrl });
  });
  connectionSettingsButton.addEventListener('click', () => chrome.runtime.openOptionsPage());
  chatInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') sendMessage(); });
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.panel').forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target)?.classList.add('active');
      if (tab.dataset.target === 'metrics-panel') loadMetrics();
      if (tab.dataset.target === 'chat-panel') initChat();
    });
  });

  loadApplications().catch(showConnectionProblem);
});
