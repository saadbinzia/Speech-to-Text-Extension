// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

let isRecording = false;
let assemblyAIKey = 'c7498f05ecfe46d39c00ee121d6f7073';

// Show popup when extension icon is clicked (instead of directly opening sidebar)
chrome.action.onClicked.addListener(async (tab) => {
  // The popup will show automatically when the action is clicked
  // No need to do anything here - popup.html will be displayed
});

// Enable side panel on Google Meet pages
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  
  const url = new URL(tab.url);
  if (url.hostname === 'meet.google.com') {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel.html',
      enabled: true
    });
  }
});

// Handle messages from side panel and content script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.type) {
    case 'start-transcription':
      await startTranscription(message.tabId);
      break;
    case 'stop-transcription':
      await stopTranscription();
      break;
    case 'get-recording-status':
      sendResponse({ isRecording });
      break;
  }
});

async function startTranscription(tabId) {
  if (isRecording) return;
  
  try {
    // Create offscreen document for recording
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
  );

  if (!offscreenDocument) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
        justification: 'Recording Google Meet audio for transcription'
      });
    }

    // Get media stream for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId
    });

    // Start recording in offscreen document
    chrome.runtime.sendMessage({
      type: 'start-recording',
      target: 'offscreen',
      data: { streamId, assemblyAIKey }
    });

    isRecording = true;
    chrome.action.setIcon({ path: 'icons/recording.png' });
    
    // Notify side panel
    chrome.runtime.sendMessage({
      type: 'recording-started'
    });
    
  } catch (error) {
    console.error('Failed to start transcription:', error);
  }
}

async function stopTranscription() {
  if (!isRecording) return;
  
  chrome.runtime.sendMessage({
    type: 'stop-recording',
    target: 'offscreen'
  });
  
  isRecording = false;
  chrome.action.setIcon({ path: 'icons/not-recording.png' });
  
  // Notify side panel
  chrome.runtime.sendMessage({
    type: 'recording-stopped'
  });
}
