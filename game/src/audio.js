// Procedural WebAudio sound effects — no audio files, nothing over the network.
// Everything is a short oscillator blip, so the game stays a handful of static files.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, gain, when = 0, slideTo = 0) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const t0 = ac.currentTime + when;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    muted() {
      return muted;
    },
    click() {
      blip(660, 0.06, 'square', 0.05);
    },
    pickup() {
      blip(880, 0.09, 'sine', 0.09);
      blip(1320, 0.12, 'sine', 0.07, 0.07);
    },
    diamond() {
      [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.16, 'triangle', 0.09, i * 0.08));
    },
    spotted() {
      blip(220, 0.18, 'sawtooth', 0.1, 0, 440);
      blip(220, 0.18, 'sawtooth', 0.1, 0.16, 440);
    },
    lockdown() {
      [392, 311, 392, 311].forEach((f, i) => blip(f, 0.14, 'square', 0.08, i * 0.13));
    },
    emp() {
      blip(1200, 0.3, 'sine', 0.08, 0, 120);
    },
    smoke() {
      blip(300, 0.25, 'sine', 0.06, 0, 90);
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => blip(f, 0.22, 'triangle', 0.09, i * 0.1));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => blip(f, 0.25, 'triangle', 0.09, i * 0.14));
    },
  };
}
