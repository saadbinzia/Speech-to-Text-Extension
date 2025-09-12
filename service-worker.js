let monitoring = false;
let offscreenCreated = false;

chrome.action.onClicked.addListener(async (tab) => {
  // This will be handled by the popup now
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'start-monitor':
      startMonitor().then(() => sendResponse({ ok: true })).catch(err => {
        console.error(err);
        sendResponse({ ok: false, error: err.message });
      });
      return true;
    case 'stop-monitor':
      stopMonitor().then(() => sendResponse({ ok: true })).catch(err => {
        console.error(err);
        sendResponse({ ok: false, error: err.message });
      });
      return true;
    case 'get-status':
      sendResponse({ monitoring: monitoring });
      return true;
    case 'voice-activity':
      // Forward to sidepanel if open
      chrome.runtime.sendMessage(message).catch(() => {});
      break;
    case 'meet-active-speaker':
      // Receive from content script and forward to sidepanel
      chrome.runtime.sendMessage({ type: 'status', data: `Active speaker: ${message.data.displayName || 'Unknown'}` }).catch(() => {});
      chrome.runtime.sendMessage({ type: 'voice-activity', data: { source: 'meet-dom', ...message.data } }).catch(() => {});
      break;
  }
});

async function startMonitor() {
  if (monitoring) return;
  // Ensure offscreen exists
  const contexts = await chrome.runtime.getContexts({});
  const existing = contexts.find(c => c.contextType === 'OFFSCREEN_DOCUMENT');
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Analyze tab audio levels for Meet voice activity'
    });
  }

  // Get active tab and stream id
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab');
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });

  chrome.runtime.sendMessage({ type: 'offscreen-start-audio', target: 'offscreen', data: { streamId } });
  monitoring = true;
  chrome.action.setIcon({ path: 'icons/recording.png' });
  chrome.runtime.sendMessage({ type: 'status', data: 'Monitoring started' }).catch(() => {});
}

async function stopMonitor() {
  if (!monitoring) return;
  chrome.runtime.sendMessage({ type: 'offscreen-stop-audio', target: 'offscreen' });
  monitoring = false;
  chrome.action.setIcon({ path: 'icons/not-recording.png' });
  chrome.runtime.sendMessage({ type: 'status', data: 'Monitoring stopped' }).catch(() => {});
}
