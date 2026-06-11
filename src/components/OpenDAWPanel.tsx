import React, { useEffect, useRef, useState } from "react";
import { Move, Settings, Volume2, HelpCircle, Power, Zap, Hash, Layers } from "lucide-react";
import { audioEngine } from "../audioEngine";
import { Track } from "../types";

interface OpenDAWPanelProps {
  tracks: Track[];
  bpm: number;
  isPlaying: boolean;
  onClose: () => void;
}

export default function OpenDAWPanel({ tracks, bpm, isPlaying, onClose }: OpenDAWPanelProps) {
  // Sound controls states
  const [delayTime, setDelayTime] = useState(0.4);
  const [delayFeedback, setDelayFeedback] = useState(0.5);
  const [delayLevel, setDelayLevel] = useState(0.2);

  const [reverbLevel, setReverbLevel] = useState(0.25);

  const [cutoff, setCutoff] = useState(14000);
  const [filterQ, setFilterQ] = useState(1.0);

  const [saturationDrive, setSaturationDrive] = useState(20);

  // Patch bay socket connections matrix
  // Track indexed 0..4, Output indexed 0 (Master), 1 (Delay Feed), 2 (Reverb Send), 3 (Lowpass Filter)
  const [matrixPorts, setMatrixPorts] = useState<boolean[][]>([
    [true, true, false, true],  // Singing Bowl
    [true, false, true, true],  // Ambient Pad
    [true, true, true, false],  // Melodic Lead
    [true, false, false, true], // Grounding Bass
    [true, true, true, true],   // Wind Chimes
  ]);

  const [activeTab, setActiveTab] = useState<"rack" | "patchbay" | "vectorscope">("rack");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Position for draggable window feel
  const [position, setPosition] = useState({ x: 80, y: 120 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({ startX: 0, startY: 0, posX: 80, posY: 120 });

  // Update real audio engine parameters on state changes
  useEffect(() => {
    audioEngine.updateDelayParams(delayTime, delayFeedback, delayLevel);
  }, [delayTime, delayFeedback, delayLevel]);

  useEffect(() => {
    audioEngine.updateReverbParams(reverbLevel);
  }, [reverbLevel]);

  useEffect(() => {
    audioEngine.updateFilterParams(cutoff, filterQ);
  }, [cutoff, filterQ]);

  useEffect(() => {
    audioEngine.updateSaturationParams(saturationDrive);
  }, [saturationDrive]);

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on title bar
    if ((e.target as HTMLElement).closest(".window-header")) {
      setIsDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(10, dragRef.current.posX + dx),
        y: Math.max(10, dragRef.current.posY + dy),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // CRT Green Oscilloscope & Lissajous Phase Vectorscope rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 290;
    const height = 180;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const bufferLength = 128;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;

    const drawScope = () => {
      animationId = requestAnimationFrame(drawScope);

      // Fade visual trail
      ctx.fillStyle = "rgba(18, 22, 28, 0.3)";
      ctx.fillRect(0, 0, width, height);

      // Draw subtle circular scope background grid
      ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
      ctx.lineWidth = 0.5;
      
      // Draw grid segments
      ctx.beginPath();
      // Horizontal centerline
      ctx.moveTo(10, height / 2);
      ctx.lineTo(width - 10, height / 2);
      // Vertical centerline
      ctx.moveTo(width / 2, 10);
      ctx.lineTo(width / 2, height - 10);
      // Faint circular boundaries
      for (let r = 30; r < width / 2; r += 32) {
        ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Read Web Audio Analyzer stream data
      if (audioEngine.analyzer) {
        audioEngine.analyzer.getByteTimeDomainData(dataArray);
      } else {
        // Fallback simulation (idle noise) if context is not started
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 128 + Math.sin(i * 0.2 + Date.now() * 0.01) * 3 * (isPlaying ? 2 : 0.4);
        }
      }

      ctx.save();
      // Phosphor neon green glow styles
      ctx.shadowBlur = 8;
      ctx.shadowColor = "rgba(16, 185, 129, 0.8)";
      ctx.strokeStyle = "rgba(52, 211, 153, 0.95)";
      ctx.lineWidth = 2.0;

      if (activeTab === "vectorscope") {
        // Render Lissajous Stereo Phase visualization
        ctx.beginPath();
        for (let i = 0; i < bufferLength - 1; i++) {
          const val1 = (dataArray[i] - 128) / 128.0; // [-1.0, 1.0]
          const val2 = (dataArray[(i + 1) % bufferLength] - 128) / 128.0;

          // Rotate coordinate by 45 degrees to represent L/R correlation
          const x = width / 2 + (val1 - val2) * (width * 0.35);
          const y = height / 2 + (val1 + val2) * (height * 0.35);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Render standard time domain sound waveform
        ctx.beginPath();
        const sliceWidth = (width - 20) / bufferLength;
        let x = 10;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
        ctx.stroke();
      }
      ctx.restore();

      // Small digital telemetry labels
      ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
      ctx.font = "8px ui-monospace, monospace";
      ctx.fillText(`SWEEP RATE: 44.1 KHZ`, 16, height - 12);
      ctx.fillText(`VECTOR: ${activeTab === "vectorscope" ? "XY CORRELATION" : "YT WAVEFORM"}`, width - 110, height - 12);
    };

    drawScope();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, activeTab]);

  // Turn matrix state on/off
  const toggleMatrixPort = (trackIdx: number, portIdx: number) => {
    const updated = [...matrixPorts];
    updated[trackIdx][portIdx] = !updated[trackIdx][portIdx];
    setMatrixPorts(updated);
  };

  return (
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
      }}
      className="fixed select-none md:w-[780px] bg-slate-950 border border-slate-700/85 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      id="opendaw-window-console"
    >
      
      {/* Sleek Mac/Professional DAW Window header */}
      <div 
        onMouseDown={handleMouseDown}
        className="window-header bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between cursor-move"
      >
        <div className="flex items-center gap-3">
          {/* Classic Window Dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-550 border border-red-600 cursor-pointer flex items-center justify-center text-[7px] text-red-900 font-bold hover:text-slate-100">×</button>
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></div>
          </div>
          
          <div className="h-4 w-px bg-slate-800"></div>

          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-mono text-xs font-bold text-orange-500 uppercase tracking-widest leading-none">
              openDAW Suite
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-medium">
              v1.0.8 // STABLE ENGINE
            </span>
          </div>
        </div>

        {/* Studio clock telemetry */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-[8px] text-slate-500">BPM</span>
            <span className="text-orange-400 font-bold">{bpm}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-[8px] text-slate-500">SAMPLE</span>
            <span className="text-emerald-400 font-bold">44.1k</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            <span className="text-[8px] text-slate-500">LATENCY</span>
            <span className="text-cyan-400 font-bold">~5.4ms</span>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-500 hover:text-slate-300 text-xs font-sans font-bold px-1.5 py-0.5 cursor-pointer border border-slate-800 rounded bg-slate-950"
            title="Minimize Window"
          >
            HIDE
          </button>
        </div>
      </div>

      {/* Ribbon toolbar */}
      <div className="bg-slate-900/60 border-b border-slate-850 px-4 py-2 flex items-center justify-between text-xs font-sans">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.2 rounded-lg border border-slate-800">
          {[
            { id: "rack", label: "Virtual FX Rack" },
            { id: "patchbay", label: "Patchbay Matrix" },
            { id: "vectorscope", label: "Lissajous Vector Scope" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-800 text-orange-500 shadow border border-slate-755"
                  : "text-slate-500 hover:text-slate-350"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
          <Zap className="w-3 h-3 text-amber-400 fill-amber-400/20" />
          <span>DRAG THE HEADER TO TRANSLATE WINDOW FREELY</span>
        </div>
      </div>

      {/* Main console interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 bg-slate-950 items-stretch">
        
        {/* Left Side: CRT Oscilloscope Screen */}
        <div className="col-span-1 md:col-span-5 flex flex-col justify-between bg-slate-900 border border-slate-850 p-4 rounded-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-350 leading-none font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Acoustic Wave Monitoring
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab("rack")}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${activeTab === "vectorscope" ? "bg-slate-950 text-slate-500 border border-slate-850" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}
              >
                YT-WAVE
              </button>
              <button
                onClick={() => setActiveTab("vectorscope")}
                className={`text-[8px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${activeTab === "vectorscope" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-950 text-slate-500 border border-slate-850"}`}
              >
                XY-PHASE
              </button>
            </div>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              className="bg-slate-950 rounded border border-slate-800 w-full"
            />
            {/* Corner retro HUD indicators */}
            <div className="absolute top-2 left-2 flex flex-col gap-0.5 px-1 bg-slate-950/80 rounded border border-slate-850 text-[7px] font-mono text-emerald-400/80">
              <span>TRIG: AUTO INT</span>
              <span>CAL: PRO-TEMP</span>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded border border-slate-850 font-sans">
            <div className="flex justify-between font-mono text-[9px] mb-1">
              <span>DYNAMIC RANGE</span>
              <span className="text-emerald-400">GOOD // ACTIVE</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-normal font-medium">
              This analyzer maps high-fidelity audio streams to green phosphor scans. Switch to <strong>XY-PHASE</strong> vector mode to monitor stereo phase correlation loops.
            </p>
          </div>
        </div>

        {/* Right Side: Modules Rack OR Patch Bay Router */}
        <div className="col-span-1 md:col-span-7 flex flex-col bg-slate-900 border border-slate-850 rounded-lg overflow-hidden shrink-0">
          
          {activeTab === "rack" && (
            <div className="flex-1 flex flex-col">
              {/* Header inside */}
              <div className="bg-slate-950/80 p-2.5 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[10px] font-mono text-orange-400/90 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Settings className="w-3 h-3 text-orange-400" />
                  PRO-SERIES FX COMPACT RACK
                </span>
                <span className="text-[9px] font-mono text-slate-500">4 MODULES IN SERIES</span>
              </div>

              {/* FX Rack Blocks */}
              <div className="p-4 space-y-4 flex-1">
                
                {/* Tape saturation module */}
                <div className="grid grid-cols-12 gap-3.5 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850 relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-550"></div>
                  
                  <div className="col-span-4">
                    <span className="text-[8px] font-mono text-red-400/90 font-bold block uppercase leading-none">WARM DRIVE</span>
                    <span className="text-xs font-sans font-bold text-slate-200 mt-1 block">Tape Shaper</span>
                  </div>

                  <div className="col-span-8 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                        <span>SATURATION</span>
                        <span className="text-red-400 font-semibold">{saturationDrive}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={saturationDrive}
                        onChange={(e) => setSaturationDrive(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Delay module */}
                <div className="grid grid-cols-12 gap-3.5 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850 relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-orange-455"></div>
                  
                  <div className="col-span-3">
                    <span className="text-[8px] font-mono text-orange-400/90 font-bold block uppercase leading-none">TEMPO DELAY</span>
                    <span className="text-xs font-sans font-bold text-slate-200 mt-1 block">Echo Line</span>
                  </div>

                  <div className="col-span-9 space-y-2.5">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono text-slate-550">
                          <span>TIME</span>
                          <span className="text-orange-400">{(delayTime * 1000).toFixed(0)}ms</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.5"
                          step="0.05"
                          value={delayTime}
                          onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono text-slate-550">
                          <span>FEEDBACK</span>
                          <span className="text-orange-400">{(delayFeedback * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.9"
                          step="0.05"
                          value={delayFeedback}
                          onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono text-slate-550">
                          <span>SEND LVL</span>
                          <span className="text-orange-400">{(delayLevel * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="0.8"
                          step="0.05"
                          value={delayLevel}
                          onChange={(e) => setDelayLevel(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reverb module */}
                <div className="grid grid-cols-12 gap-3.5 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850 relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-400"></div>
                  
                  <div className="col-span-4">
                    <span className="text-[8px] font-mono text-cyan-400/90 font-bold block uppercase leading-none">CONVOLVER</span>
                    <span className="text-xs font-sans font-bold text-slate-200 mt-1 block">Lush Reverb</span>
                  </div>

                  <div className="col-span-8 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-[9px] font-mono text-slate-500 mb-1">
                        <span>REVERB DENSITY MIX</span>
                        <span className="text-cyan-400 font-semibold">{(reverbLevel * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.8"
                        step="0.05"
                        value={reverbLevel}
                        onChange={(e) => setReverbLevel(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Cutoff lowpass module */}
                <div className="grid grid-cols-12 gap-3.5 items-center bg-slate-950/40 p-3 rounded-lg border border-slate-850 relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-505"></div>
                  
                  <div className="col-span-4">
                    <span className="text-[8px] font-mono text-indigo-400/90 font-bold block uppercase leading-none">MASTER FILTER</span>
                    <span className="text-xs font-sans font-bold text-slate-200 mt-1 block">Ladder Lowpass</span>
                  </div>

                  <div className="col-span-8 space-y-2.5">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono text-slate-550">
                          <span>CUTOFF</span>
                          <span className="text-indigo-400">{cutoff >= 1000 ? `${(cutoff / 1000).toFixed(1)}k` : cutoff} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="20000"
                          step="100"
                          value={cutoff}
                          onChange={(e) => setCutoff(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between text-[8px] font-mono text-slate-550">
                          <span>RESO (Q)</span>
                          <span className="text-indigo-400">{filterQ.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="8.0"
                          step="0.1"
                          value={filterQ}
                          onChange={(e) => setFilterQ(parseFloat(e.target.value))}
                          className="w-full h-1 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "patchbay" && (
            <div className="flex-1 flex flex-col">
              <div className="bg-slate-950/80 p-2.5 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[10px] font-mono text-orange-400/90 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3 h-3 text-orange-400" />
                  MODULAR INTER-PATCH BAY CONNECTIONS
                </span>
                <span className="text-[9px] font-mono text-slate-500">ACTIVE SIGNAL ROUTING</span>
              </div>

              {/* Grid showing connections */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-[10px] text-slate-400 leading-normal mb-3 font-sans">
                  Connect virtual patching cords between cooperative sound healing channels and output effects modules. Solid orange nodes represent completed active connections routing audio vectors.
                </p>

                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-850 select-none">
                  <div className="grid grid-cols-5 gap-2 text-center text-[9px] font-mono text-slate-450 border-b border-slate-800 pb-2 mb-2">
                    <div className="text-left font-bold text-slate-400">CHANNEL SOURCE</div>
                    <div>DRY MST</div>
                    <div>DLY BUS</div>
                    <div>RVB BUS</div>
                    <div>LPF FLT</div>
                  </div>

                  {tracks.map((track, trackIdx) => (
                    <div key={track.id} className="grid grid-cols-5 gap-2 items-center text-center text-xs py-1.5 border-b border-slate-855 last:border-0">
                      <div className="text-left flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(${track.color})` }} />
                        <span className="font-mono text-[10px] font-semibold text-slate-300 truncate tracking-tight">{track.name}</span>
                      </div>
                      
                      {Array.from({ length: 4 }).map((_, portIdx) => (
                        <div key={portIdx} className="flex justify-center">
                          <button
                            onClick={() => toggleMatrixPort(trackIdx, portIdx)}
                            className={`w-4 h-4 rounded-full flex items-center justify-center border focus:outline-none transition-all cursor-pointer ${
                              matrixPorts[trackIdx][portIdx]
                                ? "bg-orange-550 border-orange-455 shadow-md shadow-orange-550/20 text-slate-900"
                                : "bg-slate-900 border-slate-800 hover:border-slate-600"
                            }`}
                            title={`Route ${track.name} to Output Option ${portIdx}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-850 pt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-550 block"></span>
                    <span>ACTIVE SOCKET TERMINALS</span>
                  </div>
                  <div>
                    <span>AUTO SOLDER RESISTANCE: SYMPATHETIC</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "vectorscope" && (
            <div className="flex-1 p-5 flex flex-col justify-center items-center text-center">
              <span className="text-3xl mb-2">🔭</span>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Lissajous (X-Y) Phase Correlation Scope
              </h3>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                This mode overlays Left & Right audio channels orthogonally to monitor spatial phase drift. Perfect spheres represent pure frequencies, while intersecting loops are indicative of warm stereo drone beating.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("rack")}
                  className="bg-slate-800 border border-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-slate-100 px-4 py-2 rounded-lg cursor-pointer"
                >
                  Return to FX Controls
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
