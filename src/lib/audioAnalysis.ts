/** Reliable analyser tap for internet radio streams. */
export function createAnalyserContext(): {
  context: AudioContext;
  analyser: AnalyserNode;
} {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.82;
  analyser.minDecibels = -90;
  analyser.maxDecibels = -5;
  return { context, analyser };
}

export function connectElementAnalyser(
  context: AudioContext,
  analyser: AnalyserNode,
  audio: HTMLAudioElement
): void {
  const source = context.createMediaElementSource(audio);
  const gain = context.createGain();
  gain.gain.value = 1;
  source.connect(analyser);
  source.connect(gain);
  gain.connect(context.destination);
}

function connectCaptureStreamAnalyser(
  context: AudioContext,
  analyser: AnalyserNode,
  audio: HTMLAudioElement
): boolean {
  const stream = audio.captureStream?.() ?? audio.mozCaptureStream?.();
  if (!stream?.getAudioTracks().length) return false;

  const source = context.createMediaStreamSource(stream);
  source.connect(analyser);
  return true;
}

/** Element source when possible; captureStream tap as fallback (playback stays on `<audio>`). */
export function wireAudioAnalysis(
  context: AudioContext,
  analyser: AnalyserNode,
  audio: HTMLAudioElement
): boolean {
  try {
    connectElementAnalyser(context, analyser, audio);
    return true;
  } catch {
    return connectCaptureStreamAnalyser(context, analyser, audio);
  }
}
