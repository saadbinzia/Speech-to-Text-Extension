# Google Meet Live Transcription Extension

A Chrome extension that provides real-time transcription for Google Meet using Assembly AI, displayed in a convenient side panel with conversation-like interface similar to Google Meet's built-in captions.

## Features

- 🎙️ **Real-time Audio Transcription**: Converts Google Meet audio to text using Assembly AI
- 📱 **Side Panel Interface**: Clean, modern UI that doesn't interfere with your meeting
- 💬 **Conversation Display**: Shows transcriptions like chat messages with timestamps and confidence scores
- 🔄 **Live Updates**: Real-time partial transcripts that update as people speak
- 🎯 **Google Meet Integration**: Automatically detects Google Meet pages and provides seamless integration
- 📊 **Confidence Scoring**: Shows transcription accuracy for each message

## Installation

1. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the extension folder

2. **Permissions**:
   - The extension will request permissions for:
     - Tab capture (to record audio)
     - Side panel access
     - Google Meet and Assembly AI API access

## Usage

### Getting Started

1. **Navigate to Google Meet**: Open any Google Meet meeting
2. **Open Side Panel**: Click the extension icon in the toolbar to open the side panel
3. **Start Transcription**: Click "Start Recording" in the side panel
4. **View Live Transcripts**: Watch as conversations appear in real-time with timestamps and confidence scores

### Side Panel Features

- **Start/Stop Recording**: Control transcription with easy-to-use buttons
- **Live Status Indicator**: See recording status with visual indicators
- **Conversation View**: Transcripts appear as conversation bubbles
- **Confidence Scores**: Each transcript shows accuracy percentage
- **Clear Transcripts**: Remove all transcripts with one click
- **Auto-scroll**: Automatically scrolls to show latest transcripts

### Visual Indicators

- 🟢 **Green Pulsing Dot**: Currently recording and transcribing
- 🔴 **Red Dot**: Ready to record but not active
- **Partial Transcripts**: Appear in lighter blue while being processed
- **Final Transcripts**: Appear in darker blue when complete

## Technical Details

### Architecture

- **Service Worker**: Handles extension lifecycle and tab management
- **Side Panel**: Modern UI for displaying transcripts
- **Offscreen Document**: Handles audio recording and Assembly AI integration
- **Content Script**: Provides Google Meet integration and page detection

### Assembly AI Integration

- Uses Assembly AI's real-time transcription API
- Supports both partial and final transcripts
- Includes confidence scoring for accuracy assessment
- WebSocket connection for low-latency streaming

### Audio Processing

- Captures tab audio using Chrome's `tabCapture` API
- Processes audio in 250ms chunks for real-time feel
- Converts to base64 for Assembly AI compatibility
- Audio-only capture (no video) for privacy and efficiency

## Privacy & Security

- **No Data Storage**: Transcripts are not saved permanently
- **Local Processing**: Audio processing happens locally
- **API Communication**: Only audio data is sent to Assembly AI for transcription
- **Session-based**: All data is cleared when recording stops

## Troubleshooting

### Common Issues

1. **"Please navigate to Google Meet" Warning**:
   - Make sure you're on a `meet.google.com` page
   - Refresh the page and try again

2. **No Transcription Appearing**:
   - Check that your microphone is working in the meeting
   - Ensure Assembly AI service is accessible
   - Try stopping and restarting the recording

3. **Side Panel Not Opening**:
   - Make sure you're on a Google Meet page
   - Check that the extension is enabled in Chrome extensions

4. **Poor Transcription Quality**:
   - Check your internet connection
   - Ensure meeting participants are speaking clearly
   - Check the confidence scores (lower scores indicate less reliable transcripts)

### Browser Compatibility

- **Chrome**: Version 116+ (Manifest V3 support required)
- **Side Panel API**: Requires Chrome 114+
- **Tab Capture**: Requires appropriate permissions

## Development

### File Structure

```
swiftly/
├── manifest.json          # Extension configuration
├── service-worker.js      # Background script
├── sidepanel.html        # Side panel UI
├── sidepanel.js          # Side panel logic
├── offscreen.html        # Offscreen document
├── offscreen.js          # Audio recording & AI integration
├── content-script.js     # Google Meet integration
├── icons/                # Extension icons
└── README.md            # This file
```

### Key Technologies

- **Chrome Extensions API**: Manifest V3
- **Assembly AI**: Real-time transcription
- **WebSockets**: Live audio streaming
- **MediaRecorder API**: Audio capture
- **Chrome Side Panel API**: Modern UI integration

## API Key

The extension uses Assembly AI with the provided API key. The key is embedded in the service worker for this demo version.

**Important**: For production use, consider implementing secure key storage and user-provided keys.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all permissions are granted
3. Ensure you're on a supported Google Meet page
4. Check that Assembly AI service is accessible

## Version History

- **v2.0**: Complete rewrite as side panel extension with Assembly AI integration
- **v1.0**: Basic tab recording functionality
