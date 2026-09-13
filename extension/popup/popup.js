// popup.js
const logList = document.getElementById('log-list');
const btnAnalyze = document.getElementById('btn-analyze');
const btnSend = document.getElementById('btn-send');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

function addLog(msg) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logList.appendChild(li);
  li.scrollIntoView();
}

btnAnalyze.addEventListener('click', async () => {
  addLog('Starting analysis...');
  try {
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    chrome.runtime.sendMessage({ type: 'ANALYZE_AND_REDACT', tabId: tabs[0].id }, (response) => {
      if (chrome.runtime.lastError) {
        addLog('Error: ' + chrome.runtime.lastError.message);
        return;
      }
      addLog('Analysis complete. ' + (response?.message || ''));
    });
  } catch (err) {
    addLog('Error: ' + err.message);
  }
});

btnSend.addEventListener('click', async () => {
  const task = document.getElementById('task-input').value;
  addLog('Sending to server...');
  chrome.runtime.sendMessage({ type: 'SEND_TO_SERVER', task }, (response) => {
    if (response?.success) {
      addLog('Sent successfully.');
    } else {
      addLog('Failed to send.');
    }
  });
});

// Initial status check
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
  if (res?.connected) {
    statusIndicator.className = 'indicator connected';
    statusText.textContent = 'Connected';
  } else {
    statusIndicator.className = 'indicator disconnected';
    statusText.textContent = 'Disconnected';
  }
});
