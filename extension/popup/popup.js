// popup.js
const logList = document.getElementById('log-list');
const btnAnalyze = document.getElementById('btn-analyze');
const btnSend = document.getElementById('btn-send');
const btnToggleMask = document.getElementById('btn-toggle-mask');
const toggleRedact = document.getElementById('toggle-redact');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

function addLog(msg) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logList.appendChild(li);
  li.scrollIntoView();
}

btnAnalyze.addEventListener('click', async () => {
  const isRedactOn = toggleRedact.checked;
  addLog(`Starting analysis (Redact: ${isRedactOn ? 'ON' : 'OFF'})...`);
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs.length) {
      addLog('Error: No active tab detected.');
      return;
    }
    const activeTab = tabs[0];
    if (!activeTab.url || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:')) {
      addLog('Note: Cannot run on internal browser pages. Open a regular website.');
      return;
    }

    chrome.runtime.sendMessage({ 
      type: 'ANALYZE_AND_REDACT', 
      tabId: activeTab.id,
      redactEnabled: isRedactOn
    }, (response) => {
      if (chrome.runtime.lastError) {
        addLog('Error: ' + chrome.runtime.lastError.message);
        return;
      }
      if (response?.error) {
        addLog('Error: ' + response.error);
        return;
      }
      addLog('Analysis complete. ' + (response?.message || ''));
    });
  } catch (err) {
    addLog('Error: ' + err.message);
  }
});

btnToggleMask.addEventListener('click', async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_OVERLAY' }, (res) => {
      if (chrome.runtime.lastError) {
        addLog('Note: Please click "Analyze Page" first.');
        return;
      }
      if (res && res.visible !== undefined) {
        toggleRedact.checked = res.visible;
        addLog(res.visible ? 'Mask overlay visible (ON).' : 'Mask overlay hidden (OFF / Unmasked).');
      }
    });
  } catch (err) {
    addLog('Error: ' + err.message);
  }
});

toggleRedact.addEventListener('change', async () => {
  const isChecked = toggleRedact.checked;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_OVERLAY', visible: isChecked }, (res) => {
      if (chrome.runtime.lastError) {
        // Tab overlay might not be initialized yet
        return;
      }
      addLog(isChecked ? 'Mask overlay enabled.' : 'Mask overlay disabled.');
    });
  } catch (err) {
    console.error(err);
  }
});

btnSend.addEventListener('click', async () => {
  const task = document.getElementById('task-input').value;
  addLog('Sending to server...');
  chrome.runtime.sendMessage({ type: 'SEND_TO_SERVER', task }, (response) => {
    if (chrome.runtime.lastError) {
      addLog('Error: ' + chrome.runtime.lastError.message);
      return;
    }
    if (response?.success) {
      addLog('Server response received.');
      if (response.message) {
        addLog(`💡 Answer: ${response.message}`);
      }
      if (response.reasoning) {
        addLog(`📋 Details: ${response.reasoning}`);
      }
      if (response.actionsCount > 0) {
        addLog(`⚡ Executing ${response.actionsCount} automated action(s)...`);
      }
    } else {
      addLog('Failed: ' + (response?.error || 'Unknown error'));
    }
  });
});

// Initial status and overlay state check
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (res?.connected) {
    statusIndicator.className = 'indicator connected';
    statusText.textContent = 'Connected';
  } else {
    statusIndicator.className = 'indicator disconnected';
    statusText.textContent = 'Disconnected';
  }
});

chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
  if (tabs.length > 0) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_OVERLAY_STATE' }, (res) => {
      if (!chrome.runtime.lastError && res && res.visible !== undefined) {
        toggleRedact.checked = res.visible;
      }
    });
  }
});
