// Content script for Google Meet pages
// This script runs on Google Meet pages to provide better integration

(function() {
  'use strict';

  // Check if we're on a Google Meet page
  if (!window.location.hostname.includes('meet.google.com')) {
    return;
  }

  console.log('Google Meet Live Transcription extension loaded');

  // Notify the extension that we're on a Meet page
  chrome.runtime.sendMessage({
    type: 'meet-page-loaded',
    url: window.location.href
  });

  // Listen for page navigation changes in Google Meet
  let currentUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      chrome.runtime.sendMessage({
        type: 'meet-page-changed',
        url: currentUrl
      });
    }
  });

  // Start observing for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Add a subtle indicator that the extension is active
  function addExtensionIndicator() {
    // Check if indicator already exists
    if (document.getElementById('transcription-indicator')) {
      return;
    }

    const indicator = document.createElement('div');
    indicator.id = 'transcription-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(26, 115, 232, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: 'Google Sans', sans-serif;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        transition: all 0.2s ease;
      " onmouseover="this.style.backgroundColor='rgba(26, 115, 232, 1)'" 
         onmouseout="this.style.backgroundColor='rgba(26, 115, 232, 0.9)'">
        🎙️ Transcription Ready
      </div>
    `;

    indicator.addEventListener('click', () => {
      // Open side panel when clicked
      chrome.runtime.sendMessage({
        type: 'open-side-panel'
      });
    });

    document.body.appendChild(indicator);

    // Remove indicator after 5 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.opacity = '0';
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 200);
      }
    }, 5000);
  }

  // Wait for the page to fully load before adding indicator
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExtensionIndicator);
  } else {
    addExtensionIndicator();
  }

  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'check-meet-status':
        sendResponse({
          isGoogleMeet: true,
          url: window.location.href,
          title: document.title
        });
        break;
    }
  });

  // Detect when user joins/leaves a meeting
  const detectMeetingState = () => {
    const joinButton = document.querySelector('[data-call-to-action="join"]');
    const leaveButton = document.querySelector('[data-call-to-action="hangup"]');
    
    if (leaveButton) {
      // User is in a meeting
      chrome.runtime.sendMessage({
        type: 'meeting-joined'
      });
    } else if (joinButton) {
      // User is in the lobby/waiting to join
      chrome.runtime.sendMessage({
        type: 'meeting-lobby'
      });
    }
  };

  // Check meeting state periodically
  setInterval(detectMeetingState, 2000);

})(); 