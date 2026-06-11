import { InstrumentType, Track, NoteTrigger } from "./types";

// Pitch helper
export function pitchToFreq(pitch: string): number {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const regex = /^([A-G]#?)(\d+)$/;
  const match = pitch.toUpperCase().trim().match(regex);
  if (!match) return 440;
  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  const noteIndex = notes.indexOf(noteName);
  const semitones = noteIndex + (octave - 4) * 12;
  return 440 * Math.pow(2, semitones / 12);
}

class AudioEngine {
  public ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public analyzer: AnalyserNode | null = null;
  public delayNode: DelayNode | null = null;
  public delayGain: GainNode | null = null;
  public delayFeedbackGainNode: GainNode | null = null;
  public convolverNode: ConvolverNode | null = null;
  public convolverGain: GainNode | null = null;
  public masterFilter: BiquadFilterNode | null = null;
  public masterDistortion: WaveShaperNode | null = null;

  // Active playing voices tracking for cleanup
  private activeNodes: { source: AudioNode[]; gains: GainNode[] }[] = [];

  // Track channels for controls (vol, pan, mute, solo)
  private trackChannels: Map<string, { gain: GainNode; panner: StereoPannerNode }> = new Map();

  // Scheduler properties
  private isPlaying = false;
  private bpm = 80;
  private currentStep = 0;
  private totalSteps = 16;
  private nextStepTime = 0.0;
  private lookahead = 25.0; // ms
  private scheduleAheadTime = 0.1; // seconds
  private timerId: number | NodeJS.Timeout | null = null;

  // Track states for scheduler
  private tracks: Track[] = [];
  private onStepCallback: ((step: number) => void) | null = null;

  constructor() {
    // Audio engine is instantiated but lazy initialized on first interaction
  }

  private makeDistortionCurve(amount: number) {
    const k = typeof amount === "number" ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.analyzer = this.ctx.createAnalyser();
    this.analyzer.fftSize = 256;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Setup master lowpass filter
    this.masterFilter = this.ctx.createBiquadFilter();
    this.masterFilter.type = "lowpass";
    this.masterFilter.frequency.setValueAtTime(14000, this.ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    // Setup master saturation / wave shaper
    this.masterDistortion = this.ctx.createWaveShaper();
    this.masterDistortion.curve = this.makeDistortionCurve(0);
    this.masterDistortion.oversample = "4x";

    // Setup master delay send effect
    this.delayNode = this.ctx.createDelay(2.0);
    this.delayGain = this.ctx.createGain();
    this.delayFeedbackGainNode = this.ctx.createGain();

    this.delayNode.delayTime.setValueAtTime(0.4, this.ctx.currentTime); // 400ms delay
    this.delayGain.gain.setValueAtTime(0.2, this.ctx.currentTime); // effect send level
    this.delayFeedbackGainNode.gain.setValueAtTime(0.4, this.ctx.currentTime); // feedback level

    // Connect delay loop
    this.delayNode.connect(this.delayFeedbackGainNode);
    this.delayFeedbackGainNode.connect(this.delayNode);

    // Setup master Reverb Convolver with dynamic simulated echoic impulse response
    this.convolverNode = this.ctx.createConvolver();
    this.convolverGain = this.ctx.createGain();
    this.convolverGain.gain.setValueAtTime(0.2, this.ctx.currentTime); // default 20% level

    try {
      const rate = this.ctx.sampleRate;
      const len = rate * 2.5; // 2.5 seconds reverb decay
      const convolverBuffer = this.ctx.createBuffer(2, len, rate);
      for (let channel = 0; channel < convolverBuffer.numberOfChannels; channel++) {
        const channelData = convolverBuffer.getChannelData(channel);
        for (let i = 0; i < len; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
        }
      }
      this.convolverNode.buffer = convolverBuffer;
    } catch (e) {
      console.warn("Failed to generate synthetic impulse response buffer:", e);
    }

    // Connect effects path:
    // masterGain -> masterFilter -> masterDistortion -> analyzer -> destination
    this.masterGain.connect(this.masterFilter);
    this.masterFilter.connect(this.masterDistortion);
    this.masterDistortion.connect(this.analyzer);
    this.analyzer.connect(this.ctx.destination);

    // Delay send return connects back into masterGain for dry blend
    this.delayGain.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);

    // Reverb send return connects back into masterGain for dry blend
    this.convolverGain.connect(this.convolverNode);
    this.convolverNode.connect(this.masterGain);
  }

  public updateDelayParams(time: number, feedback: number, level: number) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.delayNode) {
      this.delayNode.delayTime.setValueAtTime(Math.max(0.01, Math.min(2.0, time)), t);
    }
    if (this.delayFeedbackGainNode) {
      this.delayFeedbackGainNode.gain.setValueAtTime(Math.max(0, Math.min(0.95, feedback)), t);
    }
    if (this.delayGain) {
      this.delayGain.gain.setValueAtTime(Math.max(0, Math.min(1.0, level)), t);
    }
  }

  public updateReverbParams(level: number) {
    this.init();
    if (!this.ctx) return;
    if (this.convolverGain) {
      this.convolverGain.gain.setValueAtTime(Math.max(0, Math.min(1.0, level)), this.ctx.currentTime);
    }
  }

  public updateFilterParams(cutoff: number, q: number) {
    this.init();
    if (!this.ctx) return;
    if (this.masterFilter) {
      const clampedCutoff = Math.max(80, Math.min(20000, cutoff));
      this.masterFilter.frequency.setValueAtTime(clampedCutoff, this.ctx.currentTime);
      this.masterFilter.Q.setValueAtTime(Math.max(0.1, Math.min(15.0, q)), this.ctx.currentTime);
    }
  }

  public updateSaturationParams(drive: number) {
    this.init();
    if (!this.ctx) return;
    if (this.masterDistortion) {
      this.masterDistortion.curve = this.makeDistortionCurve(Math.max(0, Math.min(100, drive)));
    }
  }

  public getTrackChannel(trackId: string) {
    if (!this.ctx || !this.masterGain) return null;
    let channel = this.trackChannels.get(trackId);
    if (!channel) {
      const trackGain = this.ctx.createGain();
      const trackPanner = this.ctx.createStereoPanner();
      
      trackGain.connect(trackPanner);
      trackPanner.connect(this.masterGain);

      channel = { gain: trackGain, panner: trackPanner };
      this.trackChannels.set(trackId, channel);
    }
    return channel;
  }

  public updateTrackControls(track: Track) {
    this.init();
    const channel = this.getTrackChannel(track.id);
    if (!channel || !this.ctx) return;

    // Handle mute / solo logic volume calculation
    let vol = track.volume;
    if (track.muted) {
      vol = 0;
    }
    
    // Smooth transition
    channel.gain.gain.setValueAtTime(channel.gain.gain.value, this.ctx.currentTime);
    channel.gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);

    channel.panner.pan.setValueAtTime(channel.panner.pan.value, this.ctx.currentTime);
    channel.panner.pan.linearRampToValueAtTime(track.pan, this.ctx.currentTime + 0.05);
  }

  public setMasterVolume(vol: number) {
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.05);
    }
  }

  public setTempo(bpm: number) {
    this.bpm = bpm;
  }

  // Play a note immediately (audition/click)
  public playNote(pitch: string, track: Track, params?: any) {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const channel = this.getTrackChannel(track.id);
    const dest = channel ? channel.gain : this.masterGain;
    const time = this.ctx.currentTime;
    
    const soundData = this.triggerSynth(pitch, track.instrumentType, dest, time, 1.0, params);
    this.activeNodes.push(soundData);
  }

  // Pure procedural Web Audio synths
  private triggerSynth(
    pitch: string,
    type: InstrumentType,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    customParams?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };
    
    const freq = pitchToFreq(pitch);

    switch (type) {
      case InstrumentType.SINGING_BOWL:
        return this.triggerSingingBowl(freq, dest, time, velocity, customParams);
      case InstrumentType.AMBIENT_PAD:
        return this.triggerAmbientPad(freq, dest, time, velocity, customParams);
      case InstrumentType.MELODIC_LEAD:
        return this.triggerMelodicLead(freq, dest, time, velocity, customParams);
      case InstrumentType.GROUNDING_BASS:
        return this.triggerGroundingBass(freq, dest, time, velocity, customParams);
      case InstrumentType.WIND_CHIMES:
        return this.triggerWindChimes(freq, dest, time, velocity, customParams);
      default:
        return this.triggerSingingBowl(freq, dest, time, velocity);
    }
  }

  /**
   * Chandler's Healing Singing Bowl Synth
   * Multi-partial sinewaves with gentle amplitude beating to sound authentic and resonant.
   */
  private triggerSingingBowl(
    freq: number,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    params?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };

    const sources: AudioNode[] = [];
    const gains: GainNode[] = [];

    // Singing bowl parameters
    const resonance = params?.resonance ?? 0.85;
    const decayTime = 12.0 * resonance + 2.0; // 2s to 14s decay
    const attackTime = 2.0; // Soft singing bowl rise

    // Main resonator gain node
    const bowlMasterGain = this.ctx.createGain();
    bowlMasterGain.gain.setValueAtTime(0, time);
    bowlMasterGain.gain.linearRampToValueAtTime(0.2 * velocity, time + attackTime);
    bowlMasterGain.gain.exponentialRampToValueAtTime(0.0001, time + decayTime);
    bowlMasterGain.connect(dest);
    gains.push(bowlMasterGain);

    // Harmonic details (singing bowls have beautiful inharmonic partials)
    // fundamental (f0), octa (2 * f0), second, 2.76 * f0, 3.4 * f0 etc.
    const partials = [
      { ratio: 1.00, volume: 1.00, beatFreq: 0.15 },
      { ratio: 1.51, volume: 0.50, beatFreq: 0.35 },
      { ratio: 2.01, volume: 0.35, beatFreq: 0.55 },
      { ratio: 2.75, volume: 0.20, beatFreq: 0.80 },
      { ratio: 3.25, volume: 0.15, beatFreq: 1.10 },
      { ratio: 3.98, volume: 0.08, beatFreq: 1.50 }
    ];

    partials.forEach((part) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const partialGain = this.ctx.createGain();

      osc.type = "sine";
      // Detune slightly according to params
      const detuneCents = params?.detune ?? 0;
      osc.frequency.setValueAtTime(freq * part.ratio, time);
      if (detuneCents !== 0) {
        osc.detune.setValueAtTime(detuneCents, time);
      }

      // Healing beating (tremolo) per partial to make them wash together and shimmer
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(part.beatFreq, time);
      lfoGain.gain.setValueAtTime(0.12 * part.volume, time); // mod depth

      // Connect LFO tremolo
      lfo.connect(lfoGain);
      lfoGain.connect(partialGain.gain);

      // Base partial volume
      partialGain.gain.setValueAtTime(part.volume * 0.4, time);

      // Connect partial audio path
      osc.connect(partialGain);
      partialGain.connect(bowlMasterGain);

      osc.start(time);
      osc.stop(time + decayTime + 0.5);
      lfo.start(time);
      lfo.stop(time + decayTime + 0.5);

      sources.push(osc);
      sources.push(lfo);
      gains.push(partialGain);
    });

    return { source: sources, gains };
  }

  /**
   * Ambient Pad Synth
   * Dual sawtooth/triangle detuned oscillators with modulating lowpass filter.
   */
  private triggerAmbientPad(
    freq: number,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    params?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };

    const sources: AudioNode[] = [];
    const gains: GainNode[] = [];

    const padDecay = 6.0 * (params?.decay ?? 0.7);
    const attack = 1.2;

    const padMasterGain = this.ctx.createGain();
    padMasterGain.gain.setValueAtTime(0, time);
    padMasterGain.gain.linearRampToValueAtTime(0.18 * velocity, time + attack);
    padMasterGain.gain.exponentialRampToValueAtTime(0.0001, time + padDecay);
    padMasterGain.connect(dest);
    gains.push(padMasterGain);

    // Warm Low-pass Filter Sweep
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.setValueAtTime(6, time);
    
    const startCutoff = params?.cutoff ?? 400;
    filter.frequency.setValueAtTime(startCutoff, time);
    filter.frequency.exponentialRampToValueAtTime(startCutoff * 3.5, time + 1.5);
    filter.frequency.exponentialRampToValueAtTime(startCutoff, time + padDecay);
    filter.connect(padMasterGain);

    // Oscillator 1 (Triangle wave)
    const osc1 = this.ctx.createOscillator();
    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(freq, time);
    osc1.detune.setValueAtTime(-12 + (params?.detune ?? 0), time);

    // Oscillator 2 (Sine/Saw)
    const osc2 = this.ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 0.995, time); // detuned
    osc2.detune.setValueAtTime(12 + (params?.detune ?? 0), time);

    osc1.connect(filter);
    osc2.connect(filter);

    osc1.start(time);
    osc1.stop(time + padDecay + 0.5);
    osc2.start(time);
    osc2.stop(time + padDecay + 0.5);

    sources.push(osc1, osc2);
    return { source: sources, gains };
  }

  /**
   * Melodic Lead Pluck Synth
   * High resonant filter, prompt pluck envelope, routed to delay loop.
   */
  private triggerMelodicLead(
    freq: number,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    params?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };

    const sources: AudioNode[] = [];
    const gains: GainNode[] = [];

    const leadGain = this.ctx.createGain();
    leadGain.gain.setValueAtTime(0, time);
    leadGain.gain.linearRampToValueAtTime(0.12 * velocity, time + 0.01);
    leadGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.8);
    leadGain.connect(dest);
    gains.push(leadGain);

    // Route a sample of lead to delay node as well
    if (this.delayGain) {
      leadGain.connect(this.delayGain);
    }

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);

    // FM Modulator osc (Adds bell-like metallic chime harmonic on pluck attack)
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();

    modOsc.type = "sine";
    modOsc.frequency.setValueAtTime(freq * 3.5, time); // Carrier modulation ratio
    
    // FM envelope (decays fast)
    modGain.gain.setValueAtTime(300, time);
    modGain.gain.exponentialRampToValueAtTime(0.1, time + 0.15);

    modOsc.connect(modGain);
    modGain.connect(osc.frequency);

    osc.connect(leadGain);

    osc.start(time);
    osc.stop(time + 1.0);
    modOsc.start(time);
    modOsc.stop(time + 0.3);

    sources.push(osc, modOsc);
    gains.push(modGain);

    return { source: sources, gains };
  }

  /**
   * Deep Grounding Sub-Bass Synth
   * Pure power sine sub that anchors the space.
   */
  private triggerGroundingBass(
    freq: number,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    params?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };

    const sources: AudioNode[] = [];
    const gains: GainNode[] = [];

    const bassGain = this.ctx.createGain();
    bassGain.gain.setValueAtTime(0, time);
    bassGain.gain.linearRampToValueAtTime(0.25 * velocity, time + 0.1);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, time + 2.5);
    bassGain.connect(dest);
    gains.push(bassGain);

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    // Play on octave lower for deep grounding feel
    osc.frequency.setValueAtTime(freq / 2, time);

    // Soft SATURATION filter
    const waveshaper = this.ctx.createWaveShaper();
    const makeDistortionCurve = (amount: number) => {
      const k = typeof amount === "number" ? amount : 50;
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    };
    waveshaper.curve = makeDistortionCurve(30);
    waveshaper.oversample = "4x";

    osc.connect(waveshaper);
    waveshaper.connect(bassGain);

    osc.start(time);
    osc.stop(time + 3.0);

    sources.push(osc);
    return { source: sources, gains };
  }

  /**
   * Wind Chimes Synth
   * High-pass noise + high-pitched micro-delay metallic strikes.
   */
  private triggerWindChimes(
    freq: number,
    dest: AudioNode,
    time: number,
    velocity = 1.0,
    params?: any
  ): { source: AudioNode[]; gains: GainNode[] } {
    if (!this.ctx) return { source: [], gains: [] };

    const sources: AudioNode[] = [];
    const gains: GainNode[] = [];

    // Base pitch should be high for chimes
    const baseFreq = freq < 400 ? freq * 4 : freq;

    const chimeMasterGain = this.ctx.createGain();
    chimeMasterGain.gain.setValueAtTime(0, time);
    chimeMasterGain.gain.linearRampToValueAtTime(0.12 * velocity, time + 0.005);
    chimeMasterGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);
    chimeMasterGain.connect(dest);
    gains.push(chimeMasterGain);

    // Multiple micro oscillators at high harmonic intervals
    const frequencies = [baseFreq, baseFreq * 1.33, baseFreq * 1.5, baseFreq * 1.83, baseFreq * 2.2];

    frequencies.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, time + idx * 0.03); // staggered strikes represent chimes moving

      // individual gain decaying slightly differently
      oscGain.gain.setValueAtTime(0.08, time + idx * 0.03);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4 + idx * 0.1);

      osc.connect(oscGain);
      oscGain.connect(chimeMasterGain);

      osc.start(time + idx * 0.03);
      osc.stop(time + 2.0);

      sources.push(osc);
      gains.push(oscGain);
    });

    return { source: sources, gains };
  }

  // --- Scheduler Logic ---
  private scheduler() {
    if (!this.ctx) return;
    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = secondsPerBeat / 4.0; // 16th note steps or 1/4 of a beat
    this.nextStepTime += stepDuration;
    
    // Loop steps
    this.currentStep = (this.currentStep + 1) % this.totalSteps;
  }

  private scheduleStep(stepIndex: number, time: number) {
    if (this.onStepCallback) {
      // Sync UI step slightly ahead so it flashes at trigger
      this.onStepCallback(stepIndex);
    }

    this.tracks.forEach((track) => {
      const stepTrigger = track.steps[stepIndex];
      if (stepTrigger && !track.muted) {
        const channel = this.getTrackChannel(track.id);
        const destination = channel ? channel.gain : (this.masterGain || this.ctx!.destination);
        
        // Trigger synthesize node paths
        const nodeData = this.triggerSynth(
          stepTrigger.pitch,
          track.instrumentType,
          destination,
          time,
          stepTrigger.velocity,
          null
        );
        this.activeNodes.push(nodeData);
      }
    });
  }

  public start(tracks: Track[], bpm: number, onStep: (step: number) => void) {
    this.init();
    if (this.isPlaying) return;

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    this.tracks = tracks;
    this.bpm = bpm;
    this.onStepCallback = onStep;
    this.isPlaying = true;
    
    this.nextStepTime = this.ctx!.currentTime + 0.05;
    this.currentStep = 0;

    const run = () => {
      if (!this.isPlaying) return;
      this.scheduler();
      this.timerId = setTimeout(run, this.lookahead);
    };

    run();
  }

  public updateTracks(tracks: Track[]) {
    this.tracks = tracks;
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId as any);
      this.timerId = null;
    }
    this.currentStep = 0;
    
    // Stop and clear all active voices
    this.activeNodes.forEach((node) => {
      node.source.forEach((src) => {
        try {
          (src as any).stop();
        } catch (e) {}
      });
    });
    this.activeNodes = [];
  }

  public cleanAll() {
    this.stop();
    this.trackChannels.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
