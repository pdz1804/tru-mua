/**
 * Ambient sound, synthesised with Web Audio so the repo ships no audio files.
 * There is deliberately no music: only rain, a door bell and small chimes.
 * The context is created lazily on the first enable (browsers require a user gesture).
 */
let ac: AudioContext | null = null;
let master: GainNode;
let rainGain: GainNode;
let rainFilter: BiquadFilterNode;
let enabled = false;

function ensure() {
  if (ac) return ac;
  ac = new AudioContext();
  master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);

  // Rain: two seconds of looped white noise through a low-pass that closes when indoors.
  const len = ac.sampleRate * 2;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  rainFilter = ac.createBiquadFilter();
  rainFilter.type = 'lowpass';
  rainFilter.frequency.value = 2400;
  rainGain = ac.createGain();
  rainGain.gain.value = 0.16;
  src.connect(rainFilter).connect(rainGain).connect(master);
  src.start();
  return ac;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on && !ac) return;
  const ctx = ensure();
  if (on) void ctx.resume();
  master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.4);
}

/** Inside the café the rain is muffled by the walls and glass. */
export function setIndoor(indoor: boolean) {
  if (!ac) return;
  rainFilter.frequency.setTargetAtTime(indoor ? 520 : 2400, ac.currentTime, 0.6);
  rainGain.gain.setTargetAtTime(indoor ? 0.1 : 0.16, ac.currentTime, 0.6);
}

function tone(freq: number, at: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const ctx = ac!;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master);
  o.start(at);
  o.stop(at + dur + 0.05);
}

export type Cue = 'door' | 'memory' | 'page' | 'postcard';

/** Short one-shot cues. Silent when sound is off. */
export function cue(c: Cue) {
  if (!enabled || !ac) return;
  const t = ac.currentTime;
  if (c === 'door') [1318.5, 987.8].forEach((f, i) => tone(f, t + i * 0.16, 1.2, 0.12, 'triangle'));
  if (c === 'memory') [784, 1046.5, 1568].forEach((f, i) => tone(f, t + i * 0.09, 0.9, 0.08));
  if (c === 'page') tone(660, t, 0.18, 0.04, 'triangle');
  if (c === 'postcard') [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, 1.4, 0.07));
}
