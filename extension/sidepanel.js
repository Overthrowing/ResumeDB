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

  // Run On Load
  init();
});
