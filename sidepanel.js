let isMonitoring = false;
let currentActiveSpeaker = null;
let lastParticipantsList = [];
let lastParticipantsTime = 0;

document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const status = document.getElementById('status');
  const logs = document.getElementById('logs');

  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'start-monitor' }, (response) => {
      if (chrome.runtime.lastError) {
        append(`❌ ERR start: ${chrome.runtime.lastError.message}`, 'info');
        return;
      }
      isMonitoring = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      status.textContent = 'Monitoring... Voice activity will appear below.';
      append('🎤 Monitoring started - detecting voice and participants...', 'info');
      // Reset state
      currentActiveSpeaker = null;
      lastParticipantsList = [];
      lastParticipantsTime = 0;
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'stop-monitor' }, (response) => {
      if (chrome.runtime.lastError) {
        append(`❌ ERR stop: ${chrome.runtime.lastError.message}`, 'info');
        return;
      }
      isMonitoring = false;
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      status.textContent = 'Ready. Click Start to begin monitoring.';
      append('⏹️ Monitoring stopped', 'info');
      // Reset state
      currentActiveSpeaker = null;
      lastParticipantsList = [];
    });
  });

  // Listen for voice activity events
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'voice-activity') {
      const data = message.data;
      if (data.hasAudio) {
        // Voice detected from audio analysis - show with current speaker name if available
        const speakerName = currentActiveSpeaker ? ` of ${currentActiveSpeaker}` : '';
        // append(`🔊 VOICE DETECTED${speakerName}: RMS=${data.metrics.rms}, Peak=${data.metrics.peak}, dBFS=${data.metrics.dbfs}`, 'voice-detected');
      } else if (data.displayName && data.active) {
        // Active speaker detected from DOM - only update if it's a new speaker
        if (currentActiveSpeaker !== data.displayName) {
          currentActiveSpeaker = data.displayName;
          append(`�� ACTIVE SPEAKER: ${data.displayName}`, 'active-speaker');
        }
      }
    } else if (message.type === 'participants-detected') {
      // List of participants found - only show if participants changed
      const participants = message.data.participants;
      const now = Date.now();
      
      // Only update if participants list changed or it's been more than 30 seconds
      if (participants.length > 0 && 
          (JSON.stringify(participants.sort()) !== JSON.stringify(lastParticipantsList.sort()) ||
           now - lastParticipantsTime > 30000)) {
        lastParticipantsList = [...participants];
        lastParticipantsTime = now;
        append(`👥 Participants found: ${participants.join(', ')}`, 'participants');
      }
    }
  });

  function append(text, type = 'info') {
    const div = document.createElement('div');
    div.textContent = text;
    div.className = `log-entry ${type}`;
    
    logs.appendChild(div);
    logs.scrollTop = logs.scrollHeight;
    
    // Keep only last 100 messages to prevent memory issues
    while (logs.children.length > 100) {
      logs.removeChild(logs.firstChild);
    }
  }
});
