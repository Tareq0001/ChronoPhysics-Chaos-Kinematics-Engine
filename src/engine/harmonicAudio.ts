/**
 * CHRONO-PHYSICS: Web Audio Harmonic Synthesizer
 * Lead Computational Physics Architect: أ. طارق ابوعشي
 *
 * Generates celestial pentatonic FM soundscapes mapped to kinetic energy peaks
 * and zero-crossing angular dynamics without audio clipping or latency.
 */

export class HarmonicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;
  private lastTriggerTime: number = 0;
  private minIntervalMs: number = 55; // Prevent acoustic saturation

  // Pentatonic scale frequencies in Hz (C4 to E6)
  private readonly scaleFrequencies: number[] = [
    261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
    523.25, 587.33, 659.25, 783.99, 880.00, // C5, D5, E5, G5, A5
    1046.50, 1174.66, 1318.51               // C6, D6, E6
  ];

  constructor() {
    // Lazy initialization on first user interaction
  }

  public init(): void {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.', e);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.12, now);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number): void {
    if (this.masterGain && this.ctx && !this.isMuted) {
      const v = Math.max(0, Math.min(1, vol));
      this.masterGain.gain.setValueAtTime(v * 0.18, this.ctx.currentTime);
    }
  }

  /**
   * Triggers an FM crystal chime mapped to normalized energy or velocity [0, 1]
   */
  public triggerPulse(intensity: number, pitchOffset: number = 0): void {
    if (this.isMuted) return;
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = performance.now();
    if (now - this.lastTriggerTime < this.minIntervalMs) return;
    this.lastTriggerTime = now;

    const audioNow = this.ctx.currentTime;

    // Pick scale note based on intensity and offset
    const clampedIntensity = Math.max(0.05, Math.min(1.0, intensity));
    const rawIdx = Math.floor(clampedIntensity * (this.scaleFrequencies.length - 1)) + pitchOffset;
    const noteIdx = Math.max(0, Math.min(this.scaleFrequencies.length - 1, rawIdx));
    const carrierFreq = this.scaleFrequencies[noteIdx];

    // Carrier Oscillator
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(carrierFreq, audioNow);

    // Modulator Oscillator (FM Synthesis for bell-like shimmer)
    const modulator = this.ctx.createOscillator();
    modulator.type = 'sine';
    const modRatio = 1.414; // Inharmonic ratio for quantum bell tone
    modulator.frequency.setValueAtTime(carrierFreq * modRatio, audioNow);

    const modGain = this.ctx.createGain();
    const modDepth = carrierFreq * 0.35 * clampedIntensity;
    modGain.gain.setValueAtTime(modDepth, audioNow);
    modGain.gain.exponentialRampToValueAtTime(0.01, audioNow + 0.28);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Note Envelope Gain
    const noteGain = this.ctx.createGain();
    const peakVolume = 0.45 * Math.min(1.0, clampedIntensity + 0.2);
    noteGain.gain.setValueAtTime(0.0001, audioNow);
    // Smooth micro-attack to avoid clicks
    noteGain.gain.linearRampToValueAtTime(peakVolume, audioNow + 0.015);
    // Exponential decay tail
    const decayDuration = 0.25 + clampedIntensity * 0.35;
    noteGain.gain.exponentialRampToValueAtTime(0.0001, audioNow + decayDuration);

    carrier.connect(noteGain);
    noteGain.connect(this.masterGain);

    carrier.start(audioNow);
    modulator.start(audioNow);

    carrier.stop(audioNow + decayDuration + 0.05);
    modulator.stop(audioNow + decayDuration + 0.05);
  }
}
