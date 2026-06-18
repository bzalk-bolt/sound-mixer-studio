function encodeWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const dataSize = numFrames * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

export async function clipAudioFromUrl(
  url: string,
  startSec: number,
  endSec: number,
): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const sampleRate = decoded.sampleRate;
  const numChannels = decoded.numberOfChannels;
  const startFrame = Math.floor(startSec * sampleRate);
  const endFrame = Math.min(Math.floor(endSec * sampleRate), decoded.length);
  const frameCount = endFrame - startFrame;

  if (frameCount <= 0) {
    throw new Error('Selected region is empty');
  }

  const offlineCtx = new OfflineAudioContext(numChannels, frameCount, sampleRate);
  const clipBuffer = offlineCtx.createBuffer(numChannels, frameCount, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const source = decoded.getChannelData(ch);
    const dest = clipBuffer.getChannelData(ch);
    dest.set(source.subarray(startFrame, endFrame));
  }

  const source = offlineCtx.createBufferSource();
  source.buffer = clipBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  const rendered = await offlineCtx.startRendering();

  const wavData = encodeWav(rendered);
  const blob = new Blob([wavData], { type: 'audio/wav' });
  const filename = `clip_${startSec.toFixed(1)}s_${endSec.toFixed(1)}s.wav`;
  return new File([blob], filename, { type: 'audio/wav' });
}

export async function decodeAudioPeaks(
  url: string,
  peakCount: number,
): Promise<{ peaks: Float32Array; duration: number }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const audioCtx = new AudioContext();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const channelData = decoded.getChannelData(0);
  const framesPerPeak = Math.floor(channelData.length / peakCount);
  const peaks = new Float32Array(peakCount);

  for (let i = 0; i < peakCount; i++) {
    let max = 0;
    const start = i * framesPerPeak;
    const end = Math.min(start + framesPerPeak, channelData.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channelData[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
  }

  return { peaks, duration: decoded.duration };
}
