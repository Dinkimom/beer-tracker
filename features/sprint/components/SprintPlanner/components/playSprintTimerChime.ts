const CHIME_FREQUENCIES_HZ = [880, 1174] as const;

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  if (window.AudioContext) {
    return window.AudioContext;
  }
  return (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

export function playSprintTimerChime(): void {
  const AudioContextCtor = audioContextConstructor();
  if (!AudioContextCtor) {
    return;
  }
  const context = new AudioContextCtor();
  const now = context.currentTime;
  for (let index = 0; index < CHIME_FREQUENCIES_HZ.length; index += 1) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = CHIME_FREQUENCIES_HZ[index];
    gain.gain.setValueAtTime(0.0001, now);
    const startAt = now + index * 0.18;
    gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.18);
  }
  window.setTimeout(() => {
    context.close().catch(() => undefined);
  }, 800);
}
