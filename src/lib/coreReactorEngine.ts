import { getReactorProfile } from "@/config/coreReactor";

export interface CoreReactorOutput {
  live: number;
  volume: number;
  mid: number;
  beat0: number;
  beat1: number;
  beat2: number;
  beat3: number;
}

const WAVE_DELAYS_MS = [0, 90, 180, 270];
const LAYER_DECAY = [0.9, 0.91, 0.92, 0.93];

export class CoreReactorEngine {
  private readonly prevBassBins: Uint8Array<ArrayBuffer>;
  private readonly timeBuf: Uint8Array<ArrayBuffer>;
  private readonly layerPulse = [0, 0, 0, 0];
  private readonly scheduled: { layer: number; at: number; strength: number }[] =
    [];

  private envelope = 0;
  private volume = 0;
  private midLevel = 0;
  private lastBeatMs = 0;
  private beatGain = 0.5;
  private rhythmBias = 0.5;
  private bassFluxAvg = 12;

  constructor(binCount: number) {
    this.prevBassBins = new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
    this.timeBuf = new Uint8Array(2048) as Uint8Array<ArrayBuffer>;
  }

  setStation(stationId: string): void {
    const profile = getReactorProfile(stationId);
    this.beatGain = profile.beatGain;
    this.rhythmBias = profile.rhythmBias;
    this.reset();
  }

  reset(): void {
    this.prevBassBins.fill(0);
    this.scheduled.length = 0;
    this.layerPulse.fill(0);
    this.envelope = 0;
    this.volume = 0;
    this.midLevel = 0;
    this.lastBeatMs = 0;
    this.bassFluxAvg = 12;
  }

  update(analyser: AnalyserNode): CoreReactorOutput {
    const now = performance.now();
    const bins = new Uint8Array(
      analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
    analyser.getByteFrequencyData(bins);
    analyser.getByteTimeDomainData(this.timeBuf);

    let sumSq = 0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const sample = (this.timeBuf[i] - 128) / 128;
      sumSq += sample * sample;
    }
    const rms = Math.sqrt(sumSq / this.timeBuf.length);

    const bassEnd = Math.max(6, Math.floor(bins.length * 0.06));
    const midEnd = Math.max(bassEnd + 1, Math.floor(bins.length * 0.35));

    let bass = 0;
    for (let i = 0; i < bassEnd; i++) bass += bins[i];
    bass /= bassEnd;

    let mid = 0;
    for (let i = bassEnd; i < midEnd; i++) mid += bins[i];
    mid /= midEnd - bassEnd;

    let bassFlux = 0;
    for (let i = 0; i < bassEnd; i++) {
      const delta = bins[i] - this.prevBassBins[i];
      if (delta > 0) bassFlux += delta;
    }
    for (let i = 0; i < bassEnd; i++) this.prevBassBins[i] = bins[i];

    const response = 0.35 + this.rhythmBias * 0.65;
    const attack = 0.06 + response * 0.1;
    const release = 0.018 + response * 0.025;

    if (rms > this.envelope) {
      this.envelope += (rms - this.envelope) * attack;
    } else {
      this.envelope += (rms - this.envelope) * release;
    }

    const spectral =
      (bass / 255) * 0.5 + (mid / 255) * 0.3 + this.envelope * 0.2;
    this.volume = this.volume * 0.94 + spectral * 0.06;
    this.midLevel = this.midLevel * 0.93 + (mid / 255) * 0.07;

    this.bassFluxAvg = this.bassFluxAvg * 0.97 + bassFlux * 0.03;
    const threshold = this.bassFluxAvg * 1.75 + 22;
    const beatCooldown = 520 - this.rhythmBias * 180;

    if (
      bassFlux > threshold &&
      this.envelope > 0.04 &&
      now - this.lastBeatMs > beatCooldown
    ) {
      this.lastBeatMs = now;
      const excess = (bassFlux - threshold) / 180;
      const strength = Math.min(0.42, (0.12 + excess) * this.beatGain);
      this.triggerWave(strength, now);
    }

    this.advanceWave(now);

    const liveOut = Math.min(1, this.envelope * (2.1 + this.rhythmBias * 0.6));
    const volOut = Math.min(1, this.volume * 2.4);
    const midOut = Math.min(1, this.midLevel * 2.2);

    const beat0 = Math.min(1, liveOut * 0.82 + this.layerPulse[0] * 0.22);
    const beat1 = Math.min(1, liveOut * 0.72 + this.layerPulse[1] * 0.18);
    const beat2 = Math.min(1, volOut * 0.68 + midOut * 0.12 + this.layerPulse[2] * 0.16);
    const beat3 = Math.min(1, volOut * 0.62 + this.layerPulse[3] * 0.14);

    return {
      live: liveOut,
      volume: volOut,
      mid: midOut,
      beat0,
      beat1,
      beat2,
      beat3,
    };
  }

  private triggerWave(strength: number, now: number): void {
    for (let layer = 0; layer < WAVE_DELAYS_MS.length; layer++) {
      this.scheduled.push({
        layer,
        at: now + WAVE_DELAYS_MS[layer],
        strength: strength * (1 - layer * 0.18),
      });
    }
  }

  private advanceWave(now: number): void {
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const hit = this.scheduled[i];
      if (hit.at <= now) {
        this.layerPulse[hit.layer] = Math.max(
          this.layerPulse[hit.layer],
          hit.strength
        );
        this.scheduled.splice(i, 1);
      }
    }

    for (let i = 0; i < this.layerPulse.length; i++) {
      this.layerPulse[i] *= LAYER_DECAY[i];
    }
  }
}
