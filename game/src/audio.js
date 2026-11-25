// Warung Kilat — synthesized sound effects, WebAudio only, no files.
// Every sound is built from oscillators and filtered noise at call time,
// so the game loads nothing and works offline. The context is created on
// the first user gesture; calls before that are silent no-ops.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!this.ctx || !this.enabled) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* sound is decoration; never break the game */
    }
  }

  noise(dur, filterFreq, vol, when = 0, type = 'bandpass') {
    if (!this.ctx || !this.enabled) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur);
    } catch {
      /* sound is decoration; never break the game */
    }
  }

  // A knife chop: short noise burst plus a low thock.
  chop() {
    this.noise(0.07, 2400, 0.5);
    this.tone(140, 0.08, 'sine', 0.35, 0, 70);
  }

  // Served: a bright two-note ding plus a coin blip.
  ding() {
    this.tone(880, 0.16, 'sine', 0.4);
    this.tone(1318, 0.28, 'sine', 0.35, 0.09);
    this.tone(1760, 0.12, 'triangle', 0.2, 0.18);
  }

  // Wrong move: a low sawtooth buzz.
  buzz() {
    this.tone(130, 0.22, 'sawtooth', 0.3, 0, 90);
  }

  // A pan sizzle while food lands.
  sizzle() {
    this.noise(0.35, 5200, 0.16, 0, 'highpass');
  }

  // Level up: a rising pentatonic run.
  levelUp() {
    const notes = [523, 587, 659, 784, 880];
    notes.forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.3, i * 0.07));
  }

  // Soft UI click.
  click() {
    this.tone(660, 0.06, 'sine', 0.25);
  }

  // A customer walking out: a falling sigh.
  miss() {
    this.tone(330, 0.3, 'sine', 0.25, 0, 180);
  }
}
