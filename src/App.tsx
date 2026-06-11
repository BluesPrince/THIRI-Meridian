import React, { useState, useEffect, useRef } from "react";
import { Sparkles, HelpCircle, AlertCircle, RefreshCw, AudioLines, Compass, Music, User, Zap } from "lucide-react";
import { audioEngine } from "./audioEngine";
import {
  AgentInstrument,
  InstrumentType,
  Track,
  NoteTrigger,
  AIResponseLog,
  AICompositionResult,
  AIPatternResult,
} from "./types";

import AudioVisualizer from "./components/AudioVisualizer";
import AIOperationsPanel from "./components/AIOperationsPanel";
import AgentSettingsCard from "./components/AgentSettingsCard";
import DAWSequencerGrid from "./components/DAWSequencerGrid";
import CymaticsResearchLab from "./components/CymaticsResearchLab";
import OpenDAWPanel from "./components/OpenDAWPanel";

// Seed active instrument list
const INITIAL_AGENTS: AgentInstrument[] = [
  {
    id: "agent-singing-bowl",
    name: "Chandler (Bowl Agent)",
    type: InstrumentType.SINGING_BOWL,
    prompt: "Create healing, soft physical bowl patterns. Emphasize extremely warm, non-integer sine wave partials that clash gently on fourths and fifths to produce resonant beating loops.",
    specialty: "Solfeggio Bowls & Healing Sine Sweeps",
    avatar: "🥣",
    color: "251, 191, 36", // Amber 400
    parameters: { resonance: 0.9, decay: 0.75, detune: 5, modulation: 0.4, cutoff: 250 },
  },
  {
    id: "agent-ambient-pad",
    name: "Aira (Pad Agent)",
    type: InstrumentType.AMBIENT_PAD,
    prompt: "Provide warm, atmospheric polyphonic beds to anchor the space. Fill in root/fifth drones with slow filter sweeps.",
    specialty: "Luminous Choral Analog Drones",
    avatar: "🌫️",
    color: "129, 140, 248", // Indigo 400
    parameters: { resonance: 0.6, decay: 0.8, detune: -12, modulation: 0.6, cutoff: 450 },
  },
  {
    id: "agent-melodic-lead",
    name: "Lyra (Bell Agent)",
    type: InstrumentType.MELODIC_LEAD,
    prompt: "Strike cozy crystalline pentatonic bell melodies with fast attack and lots of stereo delay feedback.",
    specialty: "Glistening Bell Plucks & FM Bells",
    avatar: "🔮",
    color: "52, 211, 153", // Emerald 400
    parameters: { resonance: 0.55, decay: 0.35, detune: 0, modulation: 0.8, cutoff: 800 },
  },
  {
    id: "agent-grounding-bass",
    name: "Bhumi (Bass Agent)",
    type: InstrumentType.GROUNDING_BASS,
    prompt: "Deliver deep, sub-frequency grounding root chords to lower the heart rate. Do not rush, keep notes steady.",
    specialty: "Ultra-Sub Meditative Grounding",
    avatar: "🕉️",
    color: "6, 182, 212", // Cyan 500
    parameters: { resonance: 0.3, decay: 0.6, detune: 0, modulation: 0.2, cutoff: 120 },
  },
  {
    id: "agent-wind-chimes",
    name: "Zephyr (Chime Agent)",
    type: InstrumentType.WIND_CHIMES,
    prompt: "Scatter shimmering high-pitched metal wind chime strikes randomly across the bar for space and breathing.",
    specialty: "Scattered Breeze Resonance Chimes",
    avatar: "🔔",
    color: "232, 121, 249", // Fuchsia 400
    parameters: { resonance: 0.8, decay: 0.5, detune: 25, modulation: 0.3, cutoff: 1100 },
  },
];

// Helper to create empty track steps
const createEmptySteps = (): (NoteTrigger | null)[] => Array.from({ length: 16 }, () => null);

export default function App() {
  const [agents, setAgents] = useState<AgentInstrument[]>(INITIAL_AGENTS);
  
  // Track structures corresponding to the active agents
  const [tracks, setTracks] = useState<Track[]>(() =>
    INITIAL_AGENTS.map((agent) => ({
      id: `track-${agent.id}`,
      agentId: agent.id,
      name: agent.name.split(" ")[0],
      instrumentType: agent.type,
      color: agent.color,
      volume: agent.type === InstrumentType.SINGING_BOWL ? 0.85 : 0.65,
      muted: false,
      soloed: false,
      pan: agent.type === InstrumentType.SINGING_BOWL ? 0 : agent.type === InstrumentType.MELODIC_LEAD ? 0.3 : agent.type === InstrumentType.WIND_CHIMES ? -0.3 : 0,
      steps: createEmptySteps(),
    }))
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(72);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<AIResponseLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recreatingTrackId, setRecreatingTrackId] = useState<string | null>(null);
  const [isOpenDAWOpen, setIsOpenDAWOpen] = useState(false);

  // Mount logic - clean audio context on unmount
  useEffect(() => {
    // Add default friendly log
    addLog(
      "Thiri.ai Conductor",
      "Welcome to the AI Agent Cooperative DAW. Click 'LOAD SERENE DEFAULT CHORD' to seed a gorgeous healing performance instantly, or enter your API Key and write an Orchestration prompt to let the agents compose autonomously!",
      "system"
    );

    return () => {
      audioEngine.cleanAll();
    };
  }, []);

  // Synchronize changes to tracks controls (mutes, solos, gains) into our audioEngine channels
  useEffect(() => {
    tracks.forEach((track) => {
      audioEngine.updateTrackControls(track);
    });
    audioEngine.updateTracks(tracks);
  }, [tracks]);

  // Helper to append logs
  const addLog = (agentName: string, message: string, type: "orchestrator" | "agent" | "system" | "error") => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs((prev) => [{ timestamp, agentName, message, type }, ...prev]);
  };

  // Pre-seed a gorgeous default serene C-major chord pattern
  const handleLoadPreseed = () => {
    const freshTracks = tracks.map((track) => {
      const steps = createEmptySteps();
      
      switch (track.instrumentType) {
        case InstrumentType.SINGING_BOWL:
          // Chandler's healing bowls holding spacious 4-step drone frequencies
          steps[0] = { id: "p1", pitch: "C3", duration: 4, velocity: 0.9 };
          steps[4] = { id: "p2", pitch: "G3", duration: 4, velocity: 0.8 };
          steps[8] = { id: "p3", pitch: "C3", duration: 4, velocity: 0.9 };
          steps[12] = { id: "p4", pitch: "G3", duration: 4, velocity: 0.82 };
          break;
        case InstrumentType.AMBIENT_PAD:
          // Soft harmonic background
          steps[0] = { id: "pad1", pitch: "C3", duration: 8, velocity: 0.7 };
          steps[8] = { id: "pad2", pitch: "E3", duration: 8, velocity: 0.65 };
          break;
        case InstrumentType.MELODIC_LEAD:
          // Sparse sweet chimes melodies
          steps[2] = { id: "l1", pitch: "E4", duration: 1, velocity: 0.7 };
          steps[5] = { id: "l2", pitch: "G4", duration: 1, velocity: 0.8 };
          steps[10] = { id: "l3", pitch: "C5", duration: 1, velocity: 0.85 };
          steps[13] = { id: "l4", pitch: "A4", duration: 1, velocity: 0.75 };
          break;
        case InstrumentType.GROUNDING_BASS:
          // Anchor bass root
          steps[0] = { id: "b1", pitch: "C2", duration: 8, velocity: 0.85 };
          steps[8] = { id: "b2", pitch: "G1", duration: 8, velocity: 0.8 };
          break;
        case InstrumentType.WIND_CHIMES:
          // Randomized crystalline chimes
          steps[3] = { id: "c1", pitch: "E6", duration: 1, velocity: 0.65 };
          steps[7] = { id: "c2", pitch: "G6", duration: 1, velocity: 0.75 };
          steps[11] = { id: "c3", pitch: "C7", duration: 1, velocity: 0.85 };
          steps[14] = { id: "c4", pitch: "E7", duration: 1, velocity: 0.7 };
          break;
      }
      return { ...track, steps };
    });

    setTracks(freshTracks);
    setBpm(72);
    audioEngine.setTempo(72);
    addLog(
      "Chandler (Bowl Agent)",
      "Sweet, cozy presets loaded. Listen to my warm healing bowl notes resonating on C3 and G3! Play the sequencer to hear our harmony.",
      "agent"
    );
  };

  const handleClearGrid = () => {
    setTracks((prev) => prev.map((t) => ({ ...t, steps: createEmptySteps() })));
    addLog("System", "DAW matrix step grid cleared.", "system");
  };

  // Play and stop controls
  const handlePlayToggle = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      audioEngine.start(tracks, bpm, (stepIndex) => {
        setCurrentStep(stepIndex);
      });
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleBpmChange = (newBpm: number) => {
    const capped = Math.max(50, Math.min(140, newBpm));
    setBpm(capped);
    audioEngine.setTempo(capped);
  };

  // Trigger a note audition instantly
  const handleAuditionAgent = (agent: AgentInstrument) => {
    const matchingTrack = tracks.find((t) => t.agentId === agent.id);
    if (!matchingTrack) return;
    
    // Choose an audible test pitch
    const pitch = agent.type === InstrumentType.GROUNDING_BASS ? "C2" : agent.type === InstrumentType.WIND_CHIMES ? "C6" : "C4";
    audioEngine.playNote(pitch, matchingTrack, agent.parameters);
  };

  // Update a single agent model config
  const handleUpdateAgent = (updated: AgentInstrument) => {
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Multi-Agent REST api composition coordinator (Thiri.ai)
  const handleCoordinateCompose = async (orchestratorPrompt: string, customApiKey: string) => {
    setIsLoading(true);
    addLog("Thiri.ai", `Gathering agents for meeting. Prompt context: "${orchestratorPrompt}"...`, "orchestrator");

    try {
      const response = await fetch("/api/agents/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": customApiKey,
        },
        body: JSON.stringify({
          orchestratorPrompt,
          agents,
          bpm,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Internal Server Error during collaborative composition");
      }

      const result: AICompositionResult = await response.json();

      // Load resulting notes into tracks
      const updatedTracks = tracks.map((track) => {
        const correspondingResult = result.tracks.find((t) => t.agentId === track.agentId);
        const steps = createEmptySteps();

        if (correspondingResult) {
          correspondingResult.steps.forEach((stepNote) => {
            if (stepNote.stepIndex >= 0 && stepNote.stepIndex < 16) {
              steps[stepNote.stepIndex] = {
                id: Math.random().toString(),
                pitch: stepNote.pitch,
                duration: stepNote.duration || 1,
                velocity: stepNote.velocity || 0.8,
              };
            }
          });
        }
        return { ...track, steps };
      });

      setTracks(updatedTracks);
      if (result.bpm) {
        setBpm(result.bpm);
        audioEngine.setTempo(result.bpm);
      }

      // Add summary & agentlogs
      addLog("Thiri.ai Conductor", result.orchestratorSummary, "orchestrator");
      result.agentLogs.forEach((log) => {
        addLog(log.agentName, log.log, "agent");
      });

    } catch (err: any) {
      console.error(err);
      addLog(
        "System Error",
        `Composition failed: ${err.message}. If you are getting API key errors, please make sure you clicked 'INTEGRATE API KEY' to configure your personal Gemini API Key, or configure standard environment credentials in the secrets tab.`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Re-compose a single agent's instrument track autonomously (Indiviual Agent API endpoint)
  const handleRecreatePattern = async (agent: AgentInstrument) => {
    const matchingTrack = tracks.find((t) => t.agentId === agent.id);
    if (!matchingTrack) return;

    setRecreatingTrackId(agent.id);
    addLog(agent.name, `Consulting Thiri and rewriting my track sequence...`, "agent");

    try {
      const savedKey = localStorage.getItem("CHANDLER_THIRI_API_KEY") || "";
      const response = await fetch("/api/agents/generate-pattern", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gemini-api-key": savedKey,
        },
        body: JSON.stringify({
          agent,
          contextPrompt: agent.prompt,
          bpm,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate single pattern");
      }

      const result: AIPatternResult = await response.json();

      // Write resulting steps back just for this track
      const updatedTracks = tracks.map((track) => {
        if (track.agentId === agent.id) {
          const steps = createEmptySteps();
          result.steps.forEach((stepNote) => {
            if (stepNote.stepIndex >= 0 && stepNote.stepIndex < 16) {
              steps[stepNote.stepIndex] = {
                id: Math.random().toString(),
                pitch: stepNote.pitch,
                duration: stepNote.duration || 1,
                velocity: stepNote.velocity || 0.8,
              };
            }
          });
          return { ...track, steps };
        }
        return track;
      });

      setTracks(updatedTracks);
      addLog(agent.name, result.summary, "agent");

    } catch (err: any) {
      console.error(err);
      addLog(
        "System Error",
        `Failed to re-compose ${agent.name}'s track: ${err.message}. Please verify your API Key and try again.`,
        "error"
      );
    } finally {
      setRecreatingTrackId(null);
    }
  };

  // Modify manual grid note toggling
  const handleToggleStep = (trackId: string, stepIndex: number, note: NoteTrigger | null) => {
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === trackId) {
          const steps = [...track.steps];
          steps[stepIndex] = note;
          return { ...track, steps };
        }
        return track;
      })
    );
  };

  const handleUpdateTrackSettings = (trackId: string, updates: Partial<Track>) => {
    setTracks((prev) => prev.map((t) => (t.id === trackId ? { ...t, ...updates } : t)));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Decorative top header glow */}
      <div className="absolute top-0 left-0 right-0 h-[220px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none select-none" />

      {/* Primary header */}
      <header className="relative border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-2xl shadow-lg shadow-indigo-500/10 text-white shrink-0">
              <AudioLines className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Orchestra.ai
                </h1>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  v1.2 DAW SPACE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 leading-relaxed">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                Cooperative Multi-Agent Digital Audio Workstation inspired by <strong>openDAW</strong> and <strong>Thiri.ai</strong>.
              </p>
            </div>
          </div>

          {/* User Meta Data context */}
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800/80 px-4 py-2 rounded-xl shrink-0">
            <User className="w-4 h-4 text-emerald-400" />
            <div className="text-left font-mono">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                CHANDLER'S COZY PATTERNS
              </div>
              <div className="text-[9px] text-slate-500 leading-none mt-1">
                SYSTEM : HEALING SINEWAVES ACTIVE
              </div>
            </div>
          </div>

          {/* openDAW toggle button */}
          <button
            onClick={() => setIsOpenDAWOpen(!isOpenDAWOpen)}
            className={`flex items-center gap-2.5 px-4.5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase transition-all cursor-pointer border shrink-0 ${
              isOpenDAWOpen
                ? "bg-orange-550 text-slate-950 border-orange-455 shadow-md shadow-orange-500/20"
                : "bg-slate-900/80 hover:bg-slate-900 text-orange-500 border-slate-800 hover:border-orange-550/30"
            }`}
          >
            <Zap className={`w-4 h-4 ${isOpenDAWOpen ? "animate-pulse font-extrabold fill-slate-950" : "animate-bounce"}`} />
            <span>{isOpenDAWOpen ? "CLOSE CONSOLE" : "OPEN OPENDAW CONSOLE"}</span>
          </button>
        </div>
      </header>

      {/* Main Core Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-6 relative">
        
        {/* Top visualizers grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Visual spectrum and Oscilloscope */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-3.5 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <div>
              <h3 className="text-sm font-sans font-medium text-slate-200 mb-1 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-emerald-400" />
                Live Healing Waveforms
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch the beautiful sine cycles of Chandler's wooden bowls blending with warm pads and ground dynamics.
              </p>
            </div>
            <AudioVisualizer isPlaying={isPlaying} />
          </div>

          {/* AI Orchestrator controls */}
          <div className="lg:col-span-8">
            <AIOperationsPanel
              agents={agents}
              logs={logs}
              onCompose={handleCoordinateCompose}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Sequencer Grid Area */}
        <DAWSequencerGrid
          tracks={tracks}
          isPlaying={isPlaying}
          bpm={bpm}
          currentStep={currentStep}
          onPlayToggle={handlePlayToggle}
          onStop={handleStop}
          onBpmChange={handleBpmChange}
          onToggleStep={handleToggleStep}
          onClearGrid={handleClearGrid}
          onUpdateTrackSettings={handleUpdateTrackSettings}
          onLoadPreseed={handleLoadPreseed}
        />

        {/* Science & Cymatics Physics Lab */}
        <CymaticsResearchLab
          tracks={tracks}
          isPlaying={isPlaying}
        />

        {/* Specialized Agents Settings list */}
        <div>
          <div className="mb-4">
            <h2 className="text-base font-sans font-medium text-slate-200">Meet the Specialized Healing Instruments</h2>
            <p className="text-xs text-slate-400">Configure parameters or ask individual agents to rewrite patterns on their dedicated channels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
            {agents.map((agent) => (
              <AgentSettingsCard
                key={agent.id}
                agent={agent}
                onUpdateAgent={handleUpdateAgent}
                onRecreatePattern={handleRecreatePattern}
                isRecreating={recreatingTrackId === agent.id}
                onAudition={handleAuditionAgent}
              />
            ))}
          </div>
        </div>

        {isOpenDAWOpen && (
          <OpenDAWPanel
            tracks={tracks}
            bpm={bpm}
            isPlaying={isPlaying}
            onClose={() => setIsOpenDAWOpen(false)}
          />
        )}

      </main>

      {/* Decorative footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6 font-mono text-[10px] text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>COOPERATIVE INSTRUMENT AGENCY LAYER : SYSTEM ONLINE</span>
          <span>SINEWAVE RESISTANCE PATTERN : SOLFEGGIO FREQUENCIES ENABLED</span>
        </div>
      </footer>

    </div>
  );
}
