/**
 * Nonogram Master - Web Audio Sound Synthesizer
 * Soft, warm, and responsive audio feedback
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.lastClickTime = 0;
    this.lastLineCompleteTime = 0;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  canPlay() {
    if (!window.settingsManager || !window.settingsManager.get('sound')) return false;
    this.initContext();
    return !!this.ctx;
  }

  playClick() {
    if (!this.canPlay()) return;
    const now = performance.now();
    if (this.lastClickTime && (now - this.lastClickTime < 100)) return;
    this.lastClickTime = now;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this._triggerClickSound();
  }

  _triggerClickSound() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Soft, crisp tactile tap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.035);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  playFill(pitchOffset = 0) {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Warm pentatonic scale tones
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
    const freq = pentatonic[Math.abs(pitchOffset) % pentatonic.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.06);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playCross() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Soft pencil mark
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  playErase() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.04);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  playPick() {
    this.playErase();
  }

  playError() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.setValueAtTime(130, t + 0.08);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);

    if (window.settingsManager && window.settingsManager.get('vibration') && navigator.vibrate) {
      try { navigator.vibrate([60, 40, 60]); } catch (err) {}
    }
  }

  playLineComplete() {
    if (!this.canPlay()) return;
    const now = Date.now();
    if (this.lastLineCompleteTime && (now - this.lastLineCompleteTime < 120)) {
      return;
    }
    this.lastLineCompleteTime = now;
    const t = this.ctx.currentTime;

    // Gentle 3-note arpeggio (C5, E5, G5)
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.15);
    });
  }

  playVictory() {
    if (!this.canPlay()) return;
    const t = this.ctx.currentTime;

    // Soft fanfare sequence
    const notes = [
      { f: 523.25, d: 0.12 },
      { f: 659.25, d: 0.12 },
      { f: 783.99, d: 0.12 },
      { f: 1046.50, d: 0.35 }
    ];

    let offset = 0;
    notes.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + offset;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + note.d);

      offset += 0.08;
    });

    if (window.settingsManager && window.settingsManager.get('vibration') && navigator.vibrate) {
      try { navigator.vibrate([100, 80, 150]); } catch (e) {}
    }
  }
}

const sounds = new SoundSystem();
window.sounds = sounds;

// Unlock WebAudio AudioContext immediately on any touch or click gesture
const unlockAudio = () => {
  if (window.sounds) {
    window.sounds.initContext();
  }
};

['pointerdown', 'touchstart', 'mousedown', 'click', 'keydown'].forEach(evtType => {
  window.addEventListener(evtType, unlockAudio, { passive: true });
});

