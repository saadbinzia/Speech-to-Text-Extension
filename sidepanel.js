class TranscriptionPanel {
  constructor() {
    this.isRecording = false;
    this.transcripts = [];
    this.currentPartialTranscript = null;
    
    this.initializeElements();
    this.attachEventListeners();
    this.checkCurrentTab();
  }

  initializeElements() {
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.statusText = document.getElementById('statusText');
    this.transcriptionContainer = document.getElementById('transcriptionContainer');
    this.noTranscripts = document.getElementById('noTranscripts');
    this.warning = document.getElementById('warning');

    // New elements
    this.meetingTitle = document.getElementById('meetingTitle');
    this.meetingDot = document.getElementById('meetingDot');
    this.meetingStatus = document.getElementById('meetingStatus');
  }

  attachEventListeners() {
    this.startBtn.addEventListener('click', () => this.startRecording());
    this.stopBtn.addEventListener('click', () => this.stopRecording());

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      switch (message.type) {
        case 'transcription':
          this.handleTranscription(message.data);
          break;
        // Display final results sent directly from offscreen.js
        case 'transcription-result':
          if (Array.isArray(message.data?.utterances)) {
            // Render diarized utterances
            for (const u of message.data.utterances) {
              const speaker = (u.speaker !== undefined && u.speaker !== null) ? `Speaker ${u.speaker}` : 'Speaker';
              this.handleTranscription({
                text: `${speaker}: ${u.text || ''}`,
                confidence: u.confidence ?? 0.9,
                timestamp: message.data?.timestamp || Date.now(),
                isFinal: true
              });
            }
          } else {
            this.handleTranscription({
              text: message.data?.text || '',
              confidence: message.data?.confidence ?? 0.9,
              timestamp: message.data?.timestamp || Date.now(),
              isFinal: true
            });
          }
          break;
        case 'recording-started':
          this.updateRecordingState(true);
          break;
        case 'recording-stopped':
          this.updateRecordingState(false);
          break;
      }
    });
  }

  async checkCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab?.title) {
        this.meetingTitle.textContent = tab.title;
      }

      if (!tab.url || !tab.url.includes('meet.google.com')) {
        this.warning.classList.add('show');
        this.startBtn.disabled = true;
      } else {
        this.warning.classList.remove('show');
        this.startBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error checking current tab:', error);
    }
  }

  async startRecording() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.includes('meet.google.com')) {
        alert('Please navigate to a Google Meet page first');
        return;
      }

      chrome.runtime.sendMessage({
        type: 'start-transcription',
        tabId: tab.id
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please try again.');
    }
  }

  stopRecording() {
    chrome.runtime.sendMessage({
      type: 'stop-transcription'
    });
  }

  updateRecordingState(recording) {
    this.isRecording = recording;
    
    if (recording) {
      this.statusIndicator.classList.add('recording');
      this.statusText.textContent = 'Recording and transcribing...';
      this.startBtn.disabled = true;
      this.stopBtn.disabled = false;
      this.noTranscripts.style.display = 'none';
      this.meetingDot.classList.add('active');
      this.meetingStatus.querySelector('span:last-child').textContent = 'Recording in progress';
    } else {
      this.statusIndicator.classList.remove('recording');
      this.statusText.textContent = 'Recording stopped';
      this.startBtn.disabled = false;
      this.stopBtn.disabled = true;
      this.meetingDot.classList.remove('active');
      this.meetingStatus.querySelector('span:last-child').textContent = 'No active recording';
      
      // Show no transcripts message if no transcripts exist
      if (this.transcripts.length === 0) {
        this.noTranscripts.style.display = 'block';
      }
    }
  }

  handleTranscription(data) {
    const { text, confidence = 0.9, timestamp = Date.now(), isFinal = true } = data;
    
    if (!text || text.trim() === '') return;

    if (isFinal) {
      // Remove any existing partial transcript
      if (this.currentPartialTranscript) {
        this.currentPartialTranscript.remove();
        this.currentPartialTranscript = null;
      }

      // Add final transcript
      this.addTranscript(text, confidence, timestamp, false);
      this.transcripts.push({ text, confidence, timestamp, isFinal: true });
      
    } else {
      // Handle partial transcript
      if (this.currentPartialTranscript) {
        this.updatePartialTranscript(text, confidence, timestamp);
      } else {
        this.addTranscript(text, confidence, timestamp, true);
      }
    }

    // Auto-scroll to bottom
    this.transcriptionContainer.scrollTop = this.transcriptionContainer.scrollHeight;
  }

  addTranscript(text, confidence, timestamp, isPartial) {
    const transcriptElement = document.createElement('div');
    transcriptElement.className = `transcript-item ${isPartial ? 'partial' : ''}`;
    
    const confidencePercent = Math.round(confidence * 100);
    const timeString = new Date(timestamp).toLocaleTimeString();
    
    transcriptElement.innerHTML = `
      <div class="transcript-text">${this.escapeHtml(text)}</div>
      <div class="transcript-meta">
        <span class="timestamp">${timeString}</span>
        <span class="confidence">${confidencePercent}% confidence</span>
      </div>
    `;

    if (isPartial) {
      this.currentPartialTranscript = transcriptElement;
    }

    // TODO: Uncomment the next line to display transcript items in the UI
    // this.transcriptionContainer.appendChild(transcriptElement);
    this.noTranscripts.style.display = 'none';
  }

  updatePartialTranscript(text, confidence, timestamp) {
    if (!this.currentPartialTranscript) return;

    const confidencePercent = Math.round(confidence * 100);
    const timeString = new Date(timestamp).toLocaleTimeString();
    
    this.currentPartialTranscript.innerHTML = `
      <div class="transcript-text">${this.escapeHtml(text)}</div>
      <div class="transcript-meta">
        <span class="timestamp">${timeString}</span>
        <span class="confidence">${confidencePercent}% confidence</span>
      </div>
    `;
  }

  clearTranscripts() {
    this.transcripts = [];
    this.currentPartialTranscript = null;
    this.transcriptionContainer.innerHTML = '';
    this.noTranscripts.style.display = 'block';
    this.transcriptionContainer.appendChild(this.noTranscripts);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize the transcription panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TranscriptionPanel();
});

// Check if we're on a Google Meet page when the side panel opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url && tabs[0].url.includes('meet.google.com')) {
    document.getElementById('warning').classList.remove('show');
    document.getElementById('startBtn').disabled = false;
  }
}); 