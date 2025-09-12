(function(){
  console.log('[Meet Voice Monitor] Content script loaded - scanning for participants...');
  
  let lastActiveSpeakers = [];
  let lastParticipants = [];
  
  function findParticipantNames() {
    const participants = new Set();
    
    // Method 1: Look for participant name spans (like "PUBLASH GAMING (Saadii)")
    const nameSpans = document.querySelectorAll('span.notranslate');
    nameSpans.forEach(span => {
      const text = span.textContent?.trim();
      if (text && text.length > 2 && !isUIMessage(text) && text.includes('(') && text.includes(')')) {
        participants.add(text);
      }
    });
    
    // Method 2: Look for data-self-name attributes
    const selfNameElements = document.querySelectorAll('[data-self-name]');
    selfNameElements.forEach(el => {
      const name = el.getAttribute('data-self-name') || el.textContent?.trim();
      if (name && name.length > 2 && !isUIMessage(name)) {
        participants.add(name);
      }
    });
    
    // Method 3: Look in participant tiles with data-participant-id
    const participantTiles = document.querySelectorAll('[data-participant-id]');
    participantTiles.forEach(tile => {
      const nameSpan = tile.querySelector('span.notranslate');
      if (nameSpan) {
        const name = nameSpan.textContent?.trim();
        if (name && name.length > 2 && !isUIMessage(name)) {
          participants.add(name);
        }
      }
    });
    
    return Array.from(participants);
  }
  
  function findActiveSpeakers() {
    const activeSpeakers = [];
    
    // Primary method: Look for tiles with the speaking class 'kssMZb'
    const speakingTiles = document.querySelectorAll('.kssMZb');
    speakingTiles.forEach(tile => {
      // Find the name span within this speaking tile
      const nameSpan = tile.querySelector('span.notranslate');
      if (nameSpan) {
        const name = nameSpan.textContent?.trim();
        if (name && !isUIMessage(name)) {
          activeSpeakers.push(name);
        }
      }
    });
    
    // Fallback method: Look for aria-label speaking indicators
    const ariaElements = document.querySelectorAll('[aria-label*="is speaking"]');
    ariaElements.forEach(el => {
      const name = el.getAttribute('aria-label').replace(/\s*is speaking.*$/i, '');
      if (name && !isUIMessage(name) && !activeSpeakers.includes(name)) {
        activeSpeakers.push(name);
      }
    });
    
    return activeSpeakers;
  }
  
  function isUIMessage(text) {
    const uiMessages = [
      "You're continuously framed",
      "You're pinned",
      "You're spotlighted",
      "continuously",
      "pinned",
      "spotlighted",
      "breakout",
      "main room",
      "devices",
      "mic",
      "camera"
    ];
    
    return uiMessages.some(msg => text.toLowerCase().includes(msg.toLowerCase()));
  }
  
  function scanAndReport() {
    const participants = findParticipantNames();
    const activeSpeakers = findActiveSpeakers();
    
    // Only send participants if the list changed
    if (participants.length > 0 && JSON.stringify(participants.sort()) !== JSON.stringify(lastParticipants.sort())) {
      console.log(`[Meet Voice Monitor] Found participants:`, participants);
      lastParticipants = [...participants];
      
      // Send participant list to extension
      chrome.runtime.sendMessage({
        type: 'participants-detected',
        data: {
          participants: participants,
          timestamp: Date.now()
        }
      }).catch(() => {}); // Ignore errors if extension popup is closed
    }
    
    // Only send active speakers if they changed
    if (JSON.stringify(activeSpeakers.sort()) !== JSON.stringify(lastActiveSpeakers.sort())) {
      if (activeSpeakers.length > 0) {
        activeSpeakers.forEach(speaker => {
          console.log(`[Meet Voice Monitor] 🎤 ACTIVE SPEAKER: ${speaker}`);
          
          // Send to extension popup
          chrome.runtime.sendMessage({
            type: 'voice-activity',
            data: {
              source: 'meet-dom',
              displayName: speaker,
              active: true,
              ts: Date.now()
            }
          }).catch(() => {}); // Ignore errors if extension popup is closed
        });
      }
      lastActiveSpeakers = [...activeSpeakers];
    }
    
    // Debug: Log speaking tiles found
    const speakingTiles = document.querySelectorAll('.kssMZb');
    if (speakingTiles.length > 0) {
      console.log(`[Meet Voice Monitor] Debug - Found ${speakingTiles.length} speaking tiles with kssMZb class`);
    }
    
    // Debug: Log all participant tiles
    if (Math.random() < 0.1) { // 10% of the time
      const allTiles = document.querySelectorAll('[data-participant-id]');
      console.log(`[Meet Voice Monitor] Debug - Found ${allTiles.length} participant tiles total`);
      
      // Show class names of first few tiles for debugging
      Array.from(allTiles).slice(0, 3).forEach((tile, i) => {
        console.log(`[Meet Voice Monitor] Debug - Tile ${i} classes:`, tile.className);
      });
    }
  }
  
  // Initial scan
  setTimeout(scanAndReport, 1000);
  
  // Periodic scan every 2 seconds (more frequent since we have the right class)
  setInterval(scanAndReport, 2000);
  
  // Watch for DOM changes, especially class changes
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // Check if kssMZb class was added or removed
        const target = mutation.target;
        if (target.classList.contains('kssMZb') || 
            (mutation.oldValue && mutation.oldValue.includes('kssMZb'))) {
          shouldScan = true;
        }
      } else if (mutation.type === 'childList') {
        shouldScan = true;
      }
    });
    
    if (shouldScan) {
      // Debounce the scan to avoid too many calls
      clearTimeout(window.meetScanTimeout);
      window.meetScanTimeout = setTimeout(scanAndReport, 300);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-label', 'data-self-name'],
    attributeOldValue: true
  });
  
  console.log('[Meet Voice Monitor] Watching for kssMZb class changes (speaking indicator)');
})(); 