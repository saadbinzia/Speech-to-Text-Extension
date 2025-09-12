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

let audioContext;
let mediaStream;
let analyser;
let source;
let loopId;
let audioElement; // Add this to play the audio back

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen') {
    if (message.type === 'offscreen-start-audio') {
      start(message.data.streamId).then(() => sendResponse({ ok: true })).catch(e => {
        chrome.runtime.sendMessage({ type: 'error', data: e.message });
        sendResponse({ ok: false, error: e.message });
      });
      return true;
    }
    if (message.type === 'offscreen-stop-audio') {
      stop();
      sendResponse({ ok: true });
    }
  }
});

async function start(streamId) {
  if (audioContext) return;
  const constraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    }
  };
  
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Create audio element to play the audio back so you can still hear it
    audioElement = document.createElement('audio');
    audioElement.srcObject = mediaStream;
    audioElement.autoplay = true;
    audioElement.volume = 1.0;
    document.body.appendChild(audioElement);
    
    // Set up audio analysis
    audioContext = new AudioContext();
    source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    
    // Resume audio context if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Start analysis loop
    startAnalysis();
    console.log('Audio analysis started - audio should continue playing normally');
  } catch (error) {
    console.error('Failed to start audio analysis:', error);
    throw error;
  }
}

function startAnalysis() {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function analyze() {
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS (Root Mean Square) for better audio level detection
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);
    
    // Calculate peak
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      if (dataArray[i] > peak) peak = dataArray[i];
    }
    
    // Convert to dBFS (decibels relative to full scale)
    const dbfs = peak > 0 ? 20 * Math.log10(peak / 255) : -120;
    
    // Much lower threshold to detect any audio activity
    const hasAudio = rms > 1 || peak > 2;
    
    if (hasAudio) {
      const metrics = { rms: Math.round(rms), peak, dbfs: Math.round(dbfs) };
      chrome.runtime.sendMessage({
        type: 'voice-activity',
        data: {
          source: 'audio-analyzer',
          timestamp: Date.now(),
          metrics,
          hasAudio: true
        }
      });
    }
    
    // Debug: Log raw values occasionally to see what we're getting
    if (Math.random() < 0.05) { // 5% of the time
      console.log(`Debug: rms=${rms.toFixed(2)}, peak=${peak}, dbfs=${dbfs.toFixed(1)}`);
    }
  }
  
  // Run analysis every 200ms
  loopId = setInterval(analyze, 200);
  // Run immediately
  analyze();
}

function stop() {
  if (loopId) {
    clearInterval(loopId);
    loopId = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (audioElement) {
    audioElement.remove();
    audioElement = null;
  }
  console.log('Audio analysis stopped');
}
