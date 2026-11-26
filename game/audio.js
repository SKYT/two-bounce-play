let audio;
export function enableAudio() {
  try {
    audio ??= new AudioContext();
    audio.resume().catch(() => {});
  } catch {}
}
export function tone(frequency, duration) {
  if (!audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.frequency.setValueAtTime(frequency,now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency*.45,now+duration);
  gain.gain.setValueAtTime(.12,now);
  gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start();
  oscillator.stop(now+duration);
}

export function swish() {
  if (!audio || audio.state !== 'running') return;
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * .15), audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random()*2-1) * .25 * (1-i/samples.length)**3;
  const noise = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2800;
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(audio.destination);
  noise.onended = () => { noise.disconnect(); filter.disconnect(); };
  noise.start();
}
