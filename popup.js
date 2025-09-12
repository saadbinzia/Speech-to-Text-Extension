let isMonitoring = false;

document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');

  startBtn.addEventListener('click', async () => {
    try {
      // Open the sidepanel
      await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
      
      // Start monitoring
      chrome.runtime.sendMessage({ type: 'start-monitor' }, (response) => {
        if (chrome.runtime.lastError) {
          status.textContent = `Error: ${chrome.runtime.lastError.message}`;
          return;
        }
        isMonitoring = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'block';
        status.textContent = 'Monitoring started! Check the side panel for logs.';
      });
    } catch (error) {
      status.textContent = `Error opening side panel: ${error.message}`;
    }
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'stop-monitor' }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = `Error: ${chrome.runtime.lastError.message}`;
        return;
      }
      isMonitoring = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      status.textContent = 'Monitoring stopped.';
    });
  });

  // Check if already monitoring
  chrome.runtime.sendMessage({ type: 'get-status' }, (response) => {
    if (response && response.monitoring) {
      isMonitoring = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      status.textContent = 'Currently monitoring. Check side panel for logs.';
    }
  });
});
