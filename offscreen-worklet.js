class PCMCollectorProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
	}

	process(inputs) {
		const input = inputs[0];
		if (!input || input.length === 0) {
			return true;
		}
		// Mono: use channel 0
		const channelData = input[0];
		// Copy to transferable buffer to avoid blocking
		const buffer = new Float32Array(channelData.length);
		buffer.set(channelData);
		this.port.postMessage(buffer, [buffer.buffer]);
		return true;
	}
}

registerProcessor('pcm-collector', PCMCollectorProcessor); 