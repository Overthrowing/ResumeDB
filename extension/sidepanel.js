const BACKEND_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
  // Tab Switching Logic
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      // Trigger action on tab focus if needed
      if (targetId === 'metrics-panel') {
        loadMetrics();
      } else if (targetId === 'chat-panel') {
        initChat();
      }
    });
  });

  // State
  let activeProfile = null;
  let activeApp = null;
  let ws = null;
  let activeConvId = null;

  // DOM Elements
  const select = document.getElementById('app-select');
  const fillBtn = document.getElementById('fill-btn');
  const statusText = document.getElementById('status-text');

  const matchScoreEl = document.getElementById('match-score');
  const matchedKeywordsEl = document.getElementById('matched-keywords');
  const missingKeywordsEl = document.getElementById('missing-keywords');

  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  const openFillBtn = document.getElementById('open-fill-btn');
  const openFillProgress = document.getElementById('open-fill-progress');
  const openFillStatus = document.getElementById('open-fill-status');

  const scrapeBtn = document.getElementById('scrape-btn');
  const scrapeResults = document.getElementById('scrape-results');
  const scrapeCompany = document.getElementById('scrape-company');
  const scrapeRole = document.getElementById('scrape-role');
  const scrapeLocation = document.getElementById('scrape-location');
  const trackRoleBtn = document.getElementById('track-role-btn');

  let lastScrapedJob = null;

  // Load Initial Data (Profile and Application Tracker)
  const init = async () => {
    try {
      // Load Profile
      const profRes = await fetch(`${BACKEND_URL}/api/db/profile`);
      if (!profRes.ok) throw new Error('Could not connect to ResumeDB API.');
      activeProfile = await profRes.json();

      // Load Applications
      const appsRes = await fetch(`${BACKEND_URL}/api/applications`);
      if (!appsRes.ok) throw new Error('Could not fetch applications.');
      const apps = await appsRes.json();

      select.innerHTML = '<option value="">-- Select tracked role --</option>';
      if (apps.length === 0) {
        select.innerHTML += '<option value="" disabled>No applications tracked yet.</option>';
        updateStatus('Track a role in ResumeDB first.', 'error');
        return;
      }

      apps.forEach(app => {
        const opt = document.createElement('option');
        opt.value = app.id;
        opt.innerText = `${app.company} - ${app.role} (${app.status})`;
        select.appendChild(opt);
      });

      updateStatus('Select a role to start autofilling.');
    } catch (err) {
      updateStatus(err.message, 'error');
    }
  };

  const updateStatus = (text, type = '') => {
    statusText.innerText = text;
    statusText.className = 'status';
    if (type) statusText.classList.add(type);
  };

  // Handle Application Selection Change
  select.addEventListener('change', async () => {
    const appId = select.value;
    activeApp = null;
    fillBtn.disabled = !appId;
    openFillBtn.disabled = !appId;
    
    // Reset views
    resetMetrics();
    resetChat();

    if (!appId) {
      updateStatus('Select a role to start autofilling.');
      return;
    }

    updateStatus('Loading application details...');
    try {
      const appRes = await fetch(`${BACKEND_URL}/api/applications/${appId}`);
      if (!appRes.ok) throw new Error('Failed to fetch details.');
      activeApp = await appRes.json();
      updateStatus('Ready to autofill.');

      // Load tab-specific content if currently active
      const activeTabId = document.querySelector('.tab.active').getAttribute('data-target');
      if (activeTabId === 'metrics-panel') {
        loadMetrics();
      } else if (activeTabId === 'chat-panel') {
        initChat();
      }
    } catch (err) {
      updateStatus(err.message, 'error');
    }
  });

  // Autofill Action Trigger
  fillBtn.addEventListener('click', async () => {
    if (!activeApp || !activeProfile) return;

    fillBtn.disabled = true;
    updateStatus('Preparing application data...');

    try {
      const appId = activeApp.meta.id;

      // 1. Fetch tailored PDF
      updateStatus('Downloading tailored resume PDF...');
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
        console.warn('PDF compile check failed. Continuing with profile fields only.', pdfErr);
      }

      // 2. Query active browser tab
      updateStatus('Injecting autofill script...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('Open the application page in your main window.');

      // 3. Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // 4. Send message to content script
      updateStatus('Auto-filling form fields...');
      chrome.tabs.sendMessage(tab.id, {
        action: 'autofill',
        profile: activeProfile,
        application: activeApp,
        pdfBase64,
        pdfName: `${activeApp.meta.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`
      }, (response) => {
        fillBtn.disabled = false;
        if (chrome.runtime.lastError) {
          updateStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
        } else if (response && response.success) {
          updateStatus(response.message, 'success');
        } else {
          updateStatus(response?.message || 'Autofill failed.', 'error');
        }
      });
    } catch (err) {
      fillBtn.disabled = false;
      updateStatus(err.message, 'error');
    }
  });

  // Open & Auto-fill Action Trigger
  openFillBtn.addEventListener('click', async () => {
    if (!activeApp || !activeProfile) return;
    
    const sourceUrl = activeApp.meta.source || activeApp.meta.jd_url;
    if (!sourceUrl) {
      updateStatus('No source link specified for this application.', 'error');
      return;
    }

    openFillBtn.disabled = true;
    fillBtn.disabled = true;
    openFillProgress.style.display = 'flex';
    openFillStatus.innerText = 'Opening application page...';

    try {
      const appId = activeApp.meta.id;

      // 1. Fetch tailored PDF
      openFillStatus.innerText = 'Downloading tailored resume PDF...';
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
        console.warn('PDF compile check failed. Continuing with profile fields only.', pdfErr);
      }

      // 2. Open new tab
      openFillStatus.innerText = 'Loading page in new tab...';
      const tab = await chrome.tabs.create({ url: sourceUrl, active: true });
      
      // 3. Wait for load complete
      const tabId = tab.id;
      const onTabUpdated = (updatedTabId, changeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(onTabUpdated);
          
          // Wait 1.5 seconds for React/SPA initialization on the page
          setTimeout(async () => {
            try {
              openFillStatus.innerText = 'Injecting autofill script...';
              await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
              });

              openFillStatus.innerText = 'Auto-filling form fields...';
              chrome.tabs.sendMessage(tabId, {
                action: 'autofill',
                profile: activeProfile,
                application: activeApp,
                pdfBase64,
                pdfName: `${activeApp.meta.company.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`
              }, (response) => {
                openFillBtn.disabled = false;
                fillBtn.disabled = false;
                openFillProgress.style.display = 'none';
                if (chrome.runtime.lastError) {
                  updateStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
                } else if (response && response.success) {
                  updateStatus(response.message, 'success');
                } else {
                  updateStatus(response?.message || 'Autofill failed.', 'error');
                }
              });
            } catch (err) {
              openFillBtn.disabled = false;
              fillBtn.disabled = false;
              openFillProgress.style.display = 'none';
              updateStatus(err.message, 'error');
            }
          }, 1500);
        }
      };
      chrome.tabs.onUpdated.addListener(onTabUpdated);

    } catch (err) {
      openFillBtn.disabled = false;
      fillBtn.disabled = false;
      openFillProgress.style.display = 'none';
      updateStatus(err.message, 'error');
    }
  });

  // Keywords / ATS Audit Analysis
  const resetMetrics = () => {
    matchScoreEl.innerText = '-';
    matchedKeywordsEl.innerHTML = '<div class="text-muted" style="font-size: 12px; font-style: italic;">Select application to see analysis...</div>';
    missingKeywordsEl.innerHTML = '<div class="text-muted" style="font-size: 12px; font-style: italic;">Select application to see analysis...</div>';
  };

  const loadMetrics = async () => {
    if (!activeApp) {
      resetMetrics();
      return;
    }

    matchScoreEl.innerText = '⏳';
    matchedKeywordsEl.innerHTML = '<div style="font-size: 12px; color: #888;">Running ATS check audit... (Takes ~10 seconds)</div>';
    missingKeywordsEl.innerHTML = '<div style="font-size: 12px; color: #888;">Running ATS check audit... (Takes ~10 seconds)</div>';

    try {
      const auditRes = await fetch(`${BACKEND_URL}/api/applications/${activeApp.meta.id}/audit`, {
        method: 'POST'
      });
      if (!auditRes.ok) throw new Error('Audit endpoint failed.');
      const report = await auditRes.json();
      
      const llm = report.llm;
      if (!llm || llm.error) {
        throw new Error(llm?.error || 'Keyword metrics rubric failed');
      }

      // Compute or retrieve match score
      const covered = llm.covered || [];
      const missing = llm.missing || [];
      const score = llm.score !== undefined 
        ? llm.score 
        : (covered.length + missing.length > 0 
            ? Math.round((covered.length / (covered.length + missing.length)) * 100) 
            : 0);

      matchScoreEl.innerText = `${score}%`;

      // Render matched keywords
      if (covered.length > 0) {
        matchedKeywordsEl.innerHTML = '';
        covered.forEach(kw => {
          const badge = document.createElement('span');
          badge.className = 'keyword matched';
          badge.innerText = kw;
          matchedKeywordsEl.appendChild(badge);
        });
      } else {
        matchedKeywordsEl.innerHTML = '<div class="text-muted" style="font-size: 12px; font-style: italic;">No matching keywords found.</div>';
      }

      // Render missing keywords
      if (missing.length > 0) {
        missingKeywordsEl.innerHTML = '';
        missing.forEach(kw => {
          const badge = document.createElement('span');
          badge.className = 'keyword missing';
          badge.innerText = kw;
          missingKeywordsEl.appendChild(badge);
        });
      } else {
        missingKeywordsEl.innerHTML = '<div class="text-muted" style="font-size: 12px; font-style: italic;">No missing keywords! You have complete coverage.</div>';
      }

    } catch (err) {
      matchScoreEl.innerText = 'Err';
      matchedKeywordsEl.innerHTML = `<div class="status error" style="font-size: 12px;">Failed to load metrics: ${err.message}</div>`;
      missingKeywordsEl.innerHTML = `<div class="status error" style="font-size: 12px;">Failed to load metrics: ${err.message}</div>`;
    }
  };

  // AI Chat Assistant Logic
  const resetChat = () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    activeConvId = null;
    chatMessages.innerHTML = '<div class="msg agent">Select a role and type a message below to consult the tailored application assistant...</div>';
    chatInput.disabled = true;
    chatInput.value = '';
    sendBtn.disabled = true;
  };

  const initChat = () => {
    if (!activeApp) {
      resetChat();
      return;
    }

    if (ws) return; // already initialized

    chatMessages.innerHTML = '<div class="msg agent">Connecting to tailor assistant...</div>';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    const scope = `app:${activeApp.meta.id}`;
    
    // Connect WebSocket
    const wsUrl = `${WS_URL}/api/chat?scope=${encodeURIComponent(scope)}&conversation=${activeConvId || ''}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      chatMessages.innerHTML = '<div class="msg agent">Connected! Ask the assistant to refine details, write cover letters, or optimize experience bullet points.</div>';
      chatInput.disabled = false;
      sendBtn.disabled = false;
    };

    ws.onerror = () => {
      chatMessages.innerHTML = '<div class="msg agent error">Connection to chat assistant failed. Make sure your server is running.</div>';
    };

    ws.onclose = () => {
      ws = null;
    };

    let activeAgentBubble = null;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'text_delta') {
        if (!activeAgentBubble) {
          activeAgentBubble = document.createElement('div');
          activeAgentBubble.className = 'msg agent';
          chatMessages.appendChild(activeAgentBubble);
        }
        activeAgentBubble.innerText += data.text;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else if (data.type === 'result') {
        if (activeAgentBubble) {
          activeAgentBubble.innerText = data.text || activeAgentBubble.innerText;
        } else {
          const bubble = document.createElement('div');
          bubble.className = 'msg agent';
          bubble.innerText = data.text;
          chatMessages.appendChild(bubble);
        }
        activeAgentBubble = null;
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else if (data.type === 'error') {
        const bubble = document.createElement('div');
        bubble.className = 'msg agent error';
        bubble.innerText = `Error: ${data.message}`;
        chatMessages.appendChild(bubble);
        activeAgentBubble = null;
        chatInput.disabled = false;
        sendBtn.disabled = false;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      } else if (data.type === 'conversation') {
        activeConvId = data.id;
      }
    };
  };

  const sendMessage = () => {
    const text = chatInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;

    // Append user message bubble
    const bubble = document.createElement('div');
    bubble.className = 'msg user';
    bubble.innerText = text;
    chatMessages.appendChild(bubble);
    
    // Clear draft and disable inputs during response generation
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Send payload
    ws.send(JSON.stringify({ type: 'message', text }));
  };

  sendBtn.addEventListener('click', sendMessage);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  });

  // Page Scraping Logic
  scrapeBtn.addEventListener('click', async () => {
    scrapeBtn.disabled = true;
    updateStatus('Scraping page...');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('No active browser tab found.');

      // Inject content script if not already present
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      chrome.tabs.sendMessage(tab.id, { action: 'scrape' }, async (response) => {
        if (chrome.runtime.lastError) {
          updateStatus(chrome.runtime.lastError.message, 'error');
          scrapeBtn.disabled = false;
          return;
        }
        if (!response || !response.success) {
          updateStatus(response?.message || 'Scrape failed.', 'error');
          scrapeBtn.disabled = false;
          return;
        }

        updateStatus('Extracting job details via agent...');
        try {
          const ingestRes = await fetch(`${BACKEND_URL}/api/agent/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: response.text })
          });
          if (!ingestRes.ok) throw new Error('Ingest agent failed to process text.');
          const parsed = await ingestRes.json();
          
          if (parsed.job) {
            lastScrapedJob = parsed.job;
            if (response.applyUrl && !lastScrapedJob.application_url) {
              lastScrapedJob.application_url = response.applyUrl;
            }
            if (!lastScrapedJob.source_url) {
              lastScrapedJob.source_url = tab.url;
            }

            scrapeCompany.innerText = `Company: ${parsed.job.company}`;
            scrapeRole.innerText = `Role: ${parsed.job.role}`;
            scrapeLocation.innerText = `Location: ${parsed.job.location || 'Remote/Not listed'}`;
            
            scrapeResults.style.display = 'block';
            updateStatus('Page scraped successfully!', 'success');
          } else {
            throw new Error('No job details could be parsed.');
          }
        } catch (apiErr) {
          updateStatus(apiErr.message, 'error');
        } finally {
          scrapeBtn.disabled = false;
        }
      });
    } catch (err) {
      scrapeBtn.disabled = false;
      updateStatus(err.message, 'error');
    }
  });

  trackRoleBtn.addEventListener('click', async () => {
    if (!lastScrapedJob) return;
    trackRoleBtn.disabled = true;
    updateStatus('Tracking application...');
    try {
      const res = await fetch(`${BACKEND_URL}/api/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: lastScrapedJob.company,
          role: lastScrapedJob.role,
          jd_text: `What they look for:\n${lastScrapedJob.what_they_look_for || ''}\n\nGood to know:\n${lastScrapedJob.good_to_know || ''}\n\nJob description:\n${lastScrapedJob.job_description || ''}`,
          jd_url: lastScrapedJob.application_url || undefined,
          template: 'classic'
        })
      });
      if (!res.ok) throw new Error('Failed to track application.');
      const data = await res.json();
      
      // Update status to not_started
      await fetch(`${BACKEND_URL}/api/applications/${data.id}/meta`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'not_started', source: lastScrapedJob.source_url || lastScrapedJob.application_url })
      });

      updateStatus('Application tracked successfully!', 'success');
      scrapeResults.style.display = 'none';
      init(); // Refresh applications dropdown
    } catch (err) {
      updateStatus(err.message, 'error');
    } finally {
      trackRoleBtn.disabled = false;
    }
  });

  // Run On Load
  init();
});
