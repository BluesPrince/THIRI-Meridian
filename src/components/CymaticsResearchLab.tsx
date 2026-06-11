import React, { useEffect, useRef, useState } from "react";
import { Info, Sparkles, Brain, Scale, Layers } from "lucide-react";
import { Track, InstrumentType } from "../types";
import { pitchToFreq } from "../audioEngine";

interface CymaticsResearchLabProps {
  tracks: Track[];
  isPlaying: boolean;
}

// Particle class for the Chladni plate physics simulation
class SandParticle {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;

  constructor(width: number, height: number) {
    // Random polar or Cartesian scatter
    this.x = Math.random() * width;
    this.y = Math.random() * height;
  }

  // Update physical coordinates moving with Chladni standing wave displacement gradient
  public update(
    width: number,
    height: number,
    n: number,
    m: number,
    amplitude: number,
    chladniForm: "square" | "clamped" | "concentric"
  ) {
    // Convert to relative coordinate [-0.5, 0.5] or [0, 1] for wave equations
    const nx = (this.x / width) - 0.5;
    const ny = (this.y / height) - 0.5;

    let z = 0;
    let dzdx = 0;
    let dzdy = 0;

    // Numerical gradient of wave amplitude to push particle towards minimal vibration regions (nodes)
    const epsilon = 0.001;

    const getZ = (rx: number, ry: number) => {
      // Scale standard math equations based on chosen mode
      if (chladniForm === "square") {
        // Free border approximation: z = cos(n * pi * x) * cos(m * pi * y) - cos(m * pi * x) * cos(n * pi * y)
        return (
          Math.cos(n * Math.PI * rx) * Math.cos(m * Math.PI * ry) -
          Math.cos(m * Math.PI * rx) * Math.cos(n * Math.PI * ry)
        );
      } else if (chladniForm === "clamped") {
        // Clamped border approximation: z = sin(n * pi * (x+0.5)) * sin(m * pi * (y+0.5)) + sin(m * pi * (x+0.5)) * sin(n * pi * (y+0.5))
        return (
          Math.sin(n * Math.PI * (rx + 0.5)) * Math.sin(m * Math.PI * (ry + 0.5)) +
          Math.sin(m * Math.PI * (rx + 0.5)) * Math.sin(n * Math.PI * (ry + 0.5))
        );
      } else {
        // Circular / concentric modes: z = cos(n * pi * r) * cos(m * theta)
        const r = Math.sqrt(rx * rx + ry * ry) * 2; // scale radius
        const theta = Math.atan2(ry, rx);
        return Math.cos(n * Math.PI * r) * Math.cos(m * theta);
      }
    };

    // Current wave value at particle position
    z = getZ(nx, ny);

    // Calculate gradients manually with simple central difference
    const z_right = getZ(nx + epsilon, ny);
    const z_left = getZ(nx - epsilon, ny);
    const z_up = getZ(nx, ny + epsilon);
    const z_down = getZ(nx, ny - epsilon);

    dzdx = (z_right - z_left) / (2 * epsilon);
    dzdy = (z_up - z_down) / (2 * epsilon);

    // Physical movement: sand is thrown away from high vibration regions (anti-nodes) to nodes
    // Force is proportional to wave amplitude and the spatial slope of amplitude (gradient)
    const forceFactor = 3.5 * amplitude * Math.abs(z);

    // Add slight random crawl for realistic physical scattering (thermal drift)
    const noiseLevel = 0.15;
    const randomAngle = Math.random() * Math.PI * 2;
    const randomForce = Math.random() * noiseLevel;

    // The heavier the vibration, the faster particles bounce around towards calm sections (nodes)
    this.vx = -dzdx * forceFactor * Math.sign(z) + Math.cos(randomAngle) * randomForce;
    this.vy = -dzdy * forceFactor * Math.sign(z) + Math.sin(randomAngle) * randomForce;

    // Apply soft drag to avoid infinite acceleration
    this.vx *= 0.85;
    this.vy *= 0.85;

    this.x += this.vx;
    this.y += this.vy;

    // Bounce off limits neatly
    if (this.x < 2) { this.x = 2; this.vx *= -0.5; }
    if (this.x > width - 2) { this.x = width - 2; this.vx *= -0.5; }
    if (this.y < 2) { this.y = 2; this.vy *= -0.5; }
    if (this.y > height - 2) { this.y = height - 2; this.vy *= -0.5; }
  }
}

export default function CymaticsResearchLab({ tracks, isPlaying }: CymaticsResearchLabProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"cymatics" | "brainwave" | "acoustics">("cymatics");
  const [clippingLimit, setClippingLimit] = useState<"square" | "clamped" | "concentric">("square");
  const [vibrationIntensity, setVibrationIntensity] = useState(0.8);
  const [activeFrequencies, setActiveFrequencies] = useState<number[]>([]);
  const [detectedBinauralBeat, setDetectedBinauralBeat] = useState<{ beat: number; type: string; info: string } | null>(null);

  // Track the most recent triggered notes of active channels
  useEffect(() => {
    // Collect active playing frequencies from tracks
    const freqs: number[] = [];
    tracks.forEach((track) => {
      if (!track.muted) {
        // Find if this track has been triggered recently
        track.steps.forEach((step) => {
          if (step) {
            const freq = pitchToFreq(step.pitch);
            if (!freqs.includes(freq)) {
              freqs.push(freq);
            }
          }
        });
      }
    });

    if (isPlaying && freqs.length > 0) {
      setActiveFrequencies(freqs.sort((a, b) => a - b));
    } else {
      setActiveFrequencies([]);
    }
  }, [tracks, isPlaying]);

  // Derive active modes (N, M) from active sound frequencies
  // Low frequencies = thick wide waves (low mode), High frequencies = tight close waves (high mode)
  const getModesFromFrequencies = (): { n: number; m: number; noteLabel: string } => {
    if (activeFrequencies.length === 0) {
      return { n: 2, m: 2, noteLabel: "NONE (MEDITATIVE HUM)" };
    }
    // Use the primary frequency (usually the root or bowl frequency)
    const primaryFreq = activeFrequencies[0];
    
    // Map frequency ranges to nice integer Chladni standing wave modes
    if (primaryFreq < 100) return { n: 2, m: 3, noteLabel: `Grounding Sub (${primaryFreq.toFixed(1)}Hz)` };
    if (primaryFreq < 150) return { n: 3, m: 3, noteLabel: `Bowls fundamental (${primaryFreq.toFixed(1)}Hz)` };
    if (primaryFreq < 220) return { n: 3, m: 5, noteLabel: `Resonant Bowing Mid (${primaryFreq.toFixed(1)}Hz)` };
    if (primaryFreq < 355) return { n: 4, m: 6, noteLabel: `Singing Soprano (${primaryFreq.toFixed(1)}Hz)` };
    if (primaryFreq < 600) return { n: 5, m: 7, noteLabel: `Consonant Melodic (${primaryFreq.toFixed(1)}Hz)` };
    if (primaryFreq < 1200) return { n: 7, m: 9, noteLabel: `Glittering Chimes (${primaryFreq.toFixed(1)}Hz)` };
    return { n: 9, m: 11, noteLabel: `Crystalline Sferics (${primaryFreq.toFixed(1)}Hz)` };
  };

  // Process binaural beat calculations
  useEffect(() => {
    if (activeFrequencies.length < 2) {
      setDetectedBinauralBeat(null);
      return;
    }

    // Find the closest two frequencies to evaluate beat frequency
    let minDifference = Infinity;
    let baseF1 = 0;
    let baseF2 = 0;

    for (let i = 0; i < activeFrequencies.length; i++) {
      for (let j = i + 1; j < activeFrequencies.length; j++) {
        const diff = Math.abs(activeFrequencies[i] - activeFrequencies[j]);
        if (diff > 0.5 && diff < minDifference) {
          minDifference = diff;
          baseF1 = activeFrequencies[i];
          baseF2 = activeFrequencies[j];
        }
      }
    }

    if (minDifference < 45) {
      // Map beat frequency to real scientific EEG brainwaves
      let type = "Binaural Dream Waves";
      let info = "No matching frequency";

      if (minDifference < 4) {
        type = "Delta Waves (0.5 - 4 Hz)";
        info = "Deep non-REM restorative sleep state, trigger releasing of growth hormones & cellular recovery.";
      } else if (minDifference < 8) {
        type = "Theta Waves (4 - 8 Hz)";
        info = "Hypnagogic meditative states, access to deep memory pools, vivid visualization, and creative flow.";
      } else if (minDifference < 12) {
        type = "Alpha Waves (8 - 12 Hz)";
        info = "Relaxed wakeful readiness, reduction of cortisol/stress spikes, mental integration, and calm attention.";
      } else if (minDifference < 30) {
        type = "Beta Waves (12 - 30 Hz)";
        info = "Active concentration, cognitive focus, logical processing, and analytical mental effort.";
      } else {
        type = "Gamma Waves (30 - 45 Hz)";
        info = "High-level information synthesis, sensory binding, focus burst states, and spike of visual awareness.";
      }

      setDetectedBinauralBeat({
        beat: minDifference,
        type,
        info,
      });
    } else {
      setDetectedBinauralBeat(null);
    }
  }, [activeFrequencies]);

  // Main Chladni Plate Physics canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas sizes
    const width = 280;
    const height = 280;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Spawn 1200 microscopic sand particles
    const particlesCount = 1350;
    const particlesList: SandParticle[] = [];
    for (let i = 0; i < particlesCount; i++) {
      particlesList.push(new SandParticle(width, height));
    }

    let isRunning = true;

    // Get active wave modes
    const animLoop = () => {
      if (!isRunning) return;

      // Clear dark background with faint fading grid (gives beautiful sand motion trailing effect)
      ctx.fillStyle = "rgba(10, 15, 30, 0.28)"; 
      ctx.fillRect(0, 0, width, height);

      // Extract active modal values
      const modes = getModesFromFrequencies();
      const currentAmp = isPlaying ? vibrationIntensity * 0.9 + 0.1 : 0.04; // small simulation drift even if idle to simulate micro-acoustic noise

      // Draw beautiful structural metal boundaries
      ctx.save();
      ctx.strokeStyle = "rgba(51, 65, 85, 0.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Center crosshairs (nodal anchors)
      ctx.beginPath();
      ctx.moveTo(width / 2, 10); ctx.lineTo(width / 2, height - 10);
      ctx.moveTo(10, height / 2); ctx.lineTo(width - 10, height / 2);
      ctx.strokeStyle = "rgba(71, 85, 105, 0.15)";
      ctx.stroke();

      // Circular patterns background rendering (ghost background visualizer representing wave fields)
      if (currentAmp > 0.05) {
        ctx.fillStyle = "rgba(99, 102, 241, 0.012)"; // Indigo wave energy field
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          ctx.arc(width / 2, height / 2, (width / 5) * (i + 1) * Math.sin(Date.now() * 0.001), 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.restore();

      // Render & Update physical particles (Sand)
      ctx.save();
      
      // Select coordinate coloring for active state
      // Grains are rendered with custom alpha reflecting speed
      for (let i = 0; i < particlesList.length; i++) {
        const p = particlesList[i];
        
        // Calculate physics loop step
        p.update(width, height, modes.n, modes.m, currentAmp, clippingLimit);

        // Draw particle representation (sand grains)
        const densitySpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        
        // Coloring matches specific instrument theme or amber grain
        if (isPlaying) {
          ctx.fillStyle = `rgba(16, 185, 129, ${Math.max(0.4, 1.0 - densitySpeed * 0.6)})`; // Emerald
        } else {
          ctx.fillStyle = `rgba(245, 158, 11, ${Math.max(0.35, 0.9 - densitySpeed * 0.55)})`; // Golden/Amber sand
        }

        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }
      ctx.restore();

      // Dynamic text headers on top corner
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 10px ui-monospace, SFMono-Regular, SF Pro, monospace";
      ctx.fillText(`CHLADNI RESONATOR: MODE (${modes.n}, ${modes.m})`, 16, 26);

      ctx.fillStyle = "rgba(100, 116, 139, 0.9)";
      ctx.font = "9px font-sans";
      ctx.fillText(`PRIMARY SOUND SOURCE: ${modes.noteLabel}`, 16, 38);

      // Active state pulse indicators
      if (isPlaying) {
        ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
        ctx.beginPath();
        ctx.arc(width - 25, 22, 4 * Math.sin(Date.now() * 0.015) + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(animLoop);
    };

    animLoop();

    // Canvas click triggers displacement blast to shuffle sand
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Disrupt sand with circular shockwave blast
      particlesList.forEach((p) => {
        const dx = p.x - clickX;
        const dy = p.y - clickY;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 75) {
          const power = (75 - r) / 10;
          p.vx += (dx / r) * power * 8;
          p.vy += (dy / r) * power * 8;
        }
      });
    };

    canvas.addEventListener("mousedown", handleCanvasClick);

    return () => {
      isRunning = false;
      canvas.removeEventListener("mousedown", handleCanvasClick);
    };
  }, [isPlaying, activeFrequencies, clippingLimit, vibrationIntensity]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="cymatics-research-lab">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-sans font-medium text-slate-100 tracking-tight">
              Science of Sound & Cymatics Research Lab
            </h2>
            <p className="text-xs text-slate-450 uppercase font-mono tracking-wider">
              REAL PHYSICS SIMULATIONS & PSYCHOACOUSTIC RESONANCE
            </p>
          </div>
        </div>

        {/* Tab triggers */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.2 rounded-xl border border-slate-800">
          {[
            { id: "cymatics", label: "Chladni Plate", icon: Layers },
            { id: "brainwave", label: "Brainwaves", icon: Brain },
            { id: "acoustics", label: "Acoustic Science", icon: Scale },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-550/10"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column is active Visualizer stage */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-950/60 p-4 rounded-xl border border-slate-850">
          <canvas
            ref={canvasRef}
            className="rounded-lg shadow-inner bg-slate-950 border border-slate-850 cursor-crosshair"
            title="Interactive Chladni Resonance Plate (Click to disturb sand)"
          />
          <div className="mt-3.5 text-center">
            <span className="text-[10px] font-mono text-slate-500 leading-none">
              SHOCKWAVE DRIVER : TAP CANVAS SURFACE TO DISRUPT SYSTEM
            </span>
          </div>
        </div>

        {/* Right column is active Tab details */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          
          {activeTab === "cymatics" && (
            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <h3 className="text-sm font-sans font-medium text-slate-200 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Square Chladni Plate Simulator
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In 1787, German physicist Ernst Chladni demonstrated that solid plates vibrating at stable harmonic intervals segment themselves into 2D standing wave geometries. Grains of sand are physically thrown away from high displacement section (anti-nodes) and collect where there is zero local displacement (nodal lines).
                </p>
              </div>

              {/* Lab configuration dials */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/60">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1.5 tracking-wider">
                    Resonator Wave Boundary Form
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { id: "square", label: "Square Free" },
                      { id: "clamped", label: "Clamped" },
                      { id: "concentric", label: "Concentric" },
                    ].map((form) => (
                      <button
                        key={form.id}
                        onClick={() => setClippingLimit(form.id as any)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-sans transition-all cursor-pointer ${
                          clippingLimit === form.id
                            ? "bg-slate-800 border-indigo-500/40 text-indigo-400 font-bold"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {form.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1 flex justify-between">
                    <span>Acoustic Amplitude Driving</span>
                    <span>{(vibrationIntensity * 100).toFixed(0)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.5"
                    step="0.05"
                    value={vibrationIntensity}
                    onChange={(e) => setVibrationIntensity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
                  />
                  <div className="flex justify-between text-[8px] font-mono text-slate-500 mt-1">
                    <span>SOFT HUM</span>
                    <span>STAND WAVE SATURATION</span>
                  </div>
                </div>
              </div>

              {/* Physical details bullet list */}
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5"></div>
                  <p className="text-xs text-slate-350 leading-relaxed">
                    <strong>Wavelength and Resonance:</strong> Higher pitched notes (such as Zephyr's chimes) represent higher vibration modes, compressing the nodal paths and forging elaborate symmetric crystalline visual grids. Lower frequencies (like Bhumi's sub bass) leave large open planes of empty space.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5"></div>
                  <p className="text-xs text-slate-350 leading-relaxed">
                    <strong>Beating and Interference:</strong> Play Chandler's bowls alongside pads or melodies. As the sound beats together, you will observe the sand particles physically wobble or sweep slowly back and forth in rhythm with the acoustic beat frequency.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "brainwave" && (
            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <h3 className="text-sm font-sans font-medium text-slate-200 mb-1 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  Neurological Resonance & Binaural Entrainment
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When the auditory cortex is stimulated with two tones of slightly different frequencies (e.g. 150Hz in left ear and 156Hz in right ear), the brain perceives an internal, non-acoustic <strong>binaural beat</strong> equivalent to the difference (6Hz). Science proves this alters neuronal firing curves, entraining cortical rhythms to matches state (e.g., Theta waves).
                </p>
              </div>

              {/* Binaural Beat Analyzer Status HUD */}
              {detectedBinauralBeat ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      ACTIVE BINAURAL ANALYSIS : SYNCED
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      Beat Frequency: {detectedBinauralBeat.beat.toFixed(2)} Hz
                    </span>
                  </div>
                  <h4 className="text-sm font-sans font-semibold text-slate-100 flex items-center gap-1.5">
                    🔮 {detectedBinauralBeat.type}
                  </h4>
                  <p className="text-xs text-slate-350 mt-1 leading-relaxed">
                    {detectedBinauralBeat.info}
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl text-center">
                  <span className="text-xl inline-block mb-1.5">🧘🏼</span>
                  <h4 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Awaiting Multi-Frequency Input
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed mt-0.5">
                    Load the default serene chord and play the sequencer. Having multiple sound bowl tracks playing simultaneously at close frequencies triggers active neurological interference simulations.
                  </p>
                </div>
              )}

              {/* Table of brainwaves for medical research reference */}
              <div className="grid grid-cols-5 gap-2 border-t border-slate-800/65 pt-4">
                {[
                  { name: "Delta", range: "0.5-4Hz", state: "Sleep", color: "text-cyan-400" },
                  { name: "Theta", range: "4-8Hz", state: "Dream/Zenz", color: "text-amber-400" },
                  { name: "Alpha", range: "8-12Hz", state: "Peaceful", color: "text-indigo-400" },
                  { name: "Beta", range: "12-30Hz", state: "Active", color: "text-emerald-400" },
                  { name: "Gamma", range: "30+Hz", state: "Synthesis", color: "text-fuchsia-400" },
                ].map((wave) => (
                  <div key={wave.name} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-center">
                    <span className="text-[9px] font-mono text-slate-500 block uppercase">BAND</span>
                    <span className={`text-xs font-bold ${wave.color} block font-sans`}>{wave.name}</span>
                    <span className="text-[9px] font-mono font-bold text-slate-300 block">{wave.range}</span>
                    <span className="text-[10px] text-slate-450 block truncate">{wave.state}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "acoustics" && (
            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <h3 className="text-sm font-sans font-medium text-slate-200 mb-1 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-400" />
                  Acoustic Harmonics & Solfeggio Science Factsheet
                </h3>
                <p className="text-xs text-slate-450 leading-relaxed">
                  While historical Solfeggio tuning patterns (like 432 Hz and 528 Hz) are frequently decorated with mystical/esoteric prose, the actual therapeutic science of sound healing resides in <strong>Psychoacoustics</strong> and <strong>Mechanical Wave Interference</strong>:
                </p>
              </div>

              {/* Solid science concepts accordion-style info block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
                <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-lg">
                  <h4 className="text-xs font-mono font-bold text-slate-200 mb-1">
                    1. Harmonic Ratios vs Equal Temperament
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Solfeggio and natural wind chimes prefer integer ratios such as 3:2 (fifths) or 4:3 (fourths) representing Just Intonation. These ratios lock into stable mechanical resonances on cell membranes, avoiding the tension created by modern Equal Temperament pitches.
                  </p>
                </div>

                <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-lg">
                  <h4 className="text-xs font-mono font-bold text-slate-200 mb-1">
                    2. Mechanical Resonance of Instruments
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Singing bowls contain irregular metallic structures that do not match perfect integers, producing rich inharmonic partials. These partials create beautiful amplitude beat oscillations (beating), which physically calm our baroreceptors, triggering vasodilation and a lowered heart-rate.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-500 leading-normal">
                  Our system aligns Web Audio Oscillators precisely with these physical resonance models. Play any chord and watch the sand particles form structural nodes on the plate above.
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
