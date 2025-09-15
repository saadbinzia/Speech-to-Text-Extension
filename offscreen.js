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

let assemblyAIKey;
let isProcessing = false;
let audioBufferFloats = [];
let audioCtx;
let workletNode;
let stream;
let bufferStartTime = null;

chrome.runtime.onMessage.addListener(async (message) => {
	if (message.target === 'offscreen') {
		switch (message.type) {
			case 'start-recording':
				startRecording(message.data);
				break;
			case 'stop-recording':
				stopRecording();
				break;
			default:
				throw new Error(`Unrecognized message: ${message.type}`);
		}
	}
});

async function startRecording(data) {
	if (isProcessing) return;
	assemblyAIKey = data.assemblyAIKey;
	const streamId = data.streamId;
	try {
		stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				mandatory: {
					chromeMediaSource: 'tab',
					chromeMediaSourceId: streamId
				}
			}
		});

		audioCtx = new AudioContext({ sampleRate: 16000 });
		await audioCtx.audioWorklet.addModule('offscreen-worklet.js');
		const source = audioCtx.createMediaStreamSource(stream);
		workletNode = new AudioWorkletNode(audioCtx, 'pcm-collector');
		source.connect(workletNode);
		workletNode.connect(audioCtx.destination);

		audioBufferFloats = [];
		bufferStartTime = audioCtx.currentTime;
		updateStatus('recording', 'Recording', 'green');
		updateStatus('ai', 'Processing...', 'orange');

		workletNode.port.onmessage = (e) => {
			const chunk = e.data; // Float32Array at 16kHz mono
			audioBufferFloats.push(chunk);
			const elapsed = audioCtx.currentTime - bufferStartTime;
			if (elapsed >= 30 && !isProcessing) {
				processThirtySeconds();
			}
		};
	} catch (err) {
		console.error('Failed to start recording:', err);
	}
}

function stopRecording() {
	try {
		if (workletNode) workletNode.disconnect();
		if (audioCtx) audioCtx.close();
		if (stream) stream.getTracks().forEach(t => t.stop());
	} catch {}
	workletNode = undefined;
	audioCtx = undefined;
	stream = undefined;
	audioBufferFloats = [];
	bufferStartTime = null;
	isProcessing = false;
	updateStatus('recording', 'Stopped', 'red');
	updateStatus('ai', 'Disconnected', 'red');
}

function updateStatus(type, text, color) {
	const element = document.getElementById(`${type}-status`);
	if (element) {
		element.textContent = text;
		element.style.color = color;
	}
}

async function processThirtySeconds() {
	if (isProcessing) return;
	isProcessing = true;
	const chunks = audioBufferFloats;
	audioBufferFloats = [];
	bufferStartTime = audioCtx.currentTime;
	try {
		const floatData = concatFloat32(chunks);
		const wavBlob = floatToWavBlob(floatData, 16000);
		console.log('Uploading WAV file (30 seconds):', wavBlob);
		await transcribeAudio(wavBlob, { mimeType: 'audio/wav', extension: 'wav' });
	} catch (e) {
		console.error('Error processing 30s audio:', e);
	} finally {
		isProcessing = false;
	}
}

function concatFloat32(chunks) {
	let total = 0;
	for (const c of chunks) total += c.length;
	const out = new Float32Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.length;
	}
	return out;
}

function floatToWavBlob(float32Data, sampleRate) {
	const numChannels = 1;
	const bytesPerSample = 2;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataLength = float32Data.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);

	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataLength, true);
	writeString(view, 8, 'WAVE');
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true);
	writeString(view, 36, 'data');
	view.setUint32(40, dataLength, true);

	floatTo16BitPCM(view, 44, float32Data);
	return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

function floatTo16BitPCM(view, offset, input) {
	for (let i = 0; i < input.length; i++, offset += 2) {
		const s = Math.max(-1, Math.min(1, input[i]));
		view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
	}
}

async function transcribeAudio(audioBlob, format) {
	try {
		const audioFile = new File([audioBlob], `audio.${format.extension}`, { type: format.mimeType });
		const uploadUrl = await uploadAudioToAssemblyAIWithRetry(audioFile);
		console.log('Audio uploaded successfully:', uploadUrl);
		const transcriptId = await submitTranscription(uploadUrl);
		console.log('Transcription submitted, ID:', transcriptId);
		const result = await pollTranscriptionResults(transcriptId);
		console.log('Transcription completed:', result.text);

		// Prefer diarized utterances if available
		if (Array.isArray(result.utterances) && result.utterances.length > 0) {
			chrome.runtime.sendMessage({
				type: 'transcription-result',
				data: {
					utterances: result.utterances,
					timestamp: new Date().toISOString()
				}
			});
		} else {
			chrome.runtime.sendMessage({ type: 'transcription-result', data: { text: result.text, timestamp: new Date().toISOString() } });
		}
		updateStatus('ai', 'Connected', 'green');
	} catch (error) {
		console.error('Transcription error:', error);
		updateStatus('ai', 'Error', 'red');
	}
}

async function uploadAudioToAssemblyAIWithRetry(audioFile, maxRetries = 4) {
	let attempt = 0;
	let delay = 1000;
	while (true) {
		try {
			// Send raw binary body per AssemblyAI requirements (no FormData)
			const response = await fetch('https://api.assemblyai.com/v2/upload', {
				method: 'POST',
				headers: {
					'authorization': assemblyAIKey,
					'transfer-encoding': 'chunked'
				},
				body: audioFile
			});
			if (!response.ok) {
				throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
			}
			const result = await response.json();
			return result.upload_url;
		} catch (err) {
			attempt++;
			if (attempt > maxRetries) throw err;
			console.warn(`Upload attempt ${attempt} failed. Retrying in ${delay}ms...`, err);
			await new Promise(r => setTimeout(r, delay));
			delay *= 2;
		}
	}
}

async function submitTranscription(audioUrl) {
	const response = await fetch('https://api.assemblyai.com/v2/transcript', {
		method: 'POST',
		headers: { 'authorization': assemblyAIKey, 'content-type': 'application/json' },
		body: JSON.stringify({
			audio_url: audioUrl,
			speech_model: 'universal',
			punctuate: true,
			format_text: true,
			speaker_labels: true
		})
	});
	if (!response.ok) throw new Error(`Transcription submission failed: ${response.status} ${response.statusText}`);
	const result = await response.json();
	return result.id;
}

async function pollTranscriptionResults(transcriptId) {
	const maxAttempts = 20;
	const pollInterval = 3000;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, { headers: { 'authorization': assemblyAIKey } });
		if (!response.ok) throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
		const result = await response.json();
		if (result.status === 'completed') return result;
		if (result.status === 'error') throw new Error(`Transcription failed: ${result.error}`);
		if (attempt < maxAttempts) await new Promise(r => setTimeout(r, pollInterval));
	}
	throw new Error('Transcription timed out');
}
