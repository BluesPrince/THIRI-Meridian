import React, { useState } from "react";
import { Sliders, RotateCcw, Volume2, Info, Sparkles } from "lucide-react";
import { AgentInstrument, InstrumentType } from "../types";

interface AgentSettingsCardProps {
  key?: string;
  agent: AgentInstrument;
  onUpdateAgent: (updated: AgentInstrument) => void;
  onRecreatePattern: (agent: AgentInstrument) => Promise<void>;
  isRecreating: boolean;
  onAudition: (agent: AgentInstrument) => void;
}

export default function AgentSettingsCard({
  agent,
  onUpdateAgent,
  onRecreatePattern,
  isRecreating,
  onAudition,
}: AgentSettingsCardProps) {
  const [editingPrompt, setEditingPrompt] = useState(agent.prompt);

  const handleParamChange = (key: keyof typeof agent.parameters, value: number) => {
    onUpdateAgent({
      ...agent,
      parameters: {
        ...agent.parameters,
        [key]: value,
      },
    });
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAgent({
      ...agent,
      prompt: editingPrompt,
    });
  };

  const isChandlerBowl = agent.type === InstrumentType.SINGING_BOWL;

  return (
    <div
      className={`border rounded-2xl p-5 shadow-lg bg-slate-900 transition-all ${
        isChandlerBowl
          ? "border-amber-400/30 shadow-amber-500/5 ring-1 ring-amber-400/10"
          : "border-slate-800"
      }`}
      id={`agent-${agent.id}`}
    >
      {/* Agent details */}
      <div className="flex items-start gap-3.5 mb-4">
        <span className="text-3xl p-1 select-none">{agent.avatar}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-sans font-medium text-slate-100 truncate">{agent.name}</h3>
            {isChandlerBowl && (
              <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-wider font-bold">
                Chandler's Healing Instrument
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-slate-400 truncate uppercase mt-0.5">{agent.specialty}</p>
        </div>
        
        {/* Play audition sound button */}
        <button
          onClick={() => onAudition(agent)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-755 transition-all cursor-pointer"
          title="Play audition note"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Specialty descriptions */}
      <div className="mb-4 text-xs font-sans text-slate-300 flex items-start gap-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850">
        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isChandlerBowl
            ? "Chandler's bowl synth uses multiple non-integer sine partials mixed with ultra-slow tremolos, creating warm, cozy beating interferences."
            : agent.type === InstrumentType.AMBIENT_PAD
            ? "A beautiful polyphonic triangle pad sweep with fine detuning and a modulating physical lowpass sweep."
            : agent.type === InstrumentType.MELODIC_LEAD
            ? "Cozy metallic pluck synthesis coupled with FM bell modulation routed through a soft feedback stereo delay send."
            : agent.type === InstrumentType.GROUNDING_BASS
            ? "Deep, pure-power subharmonic grounding frequencies that anchor high-frequency brainwaves."
            : "High-register crystal chimes replicating gentle, randomized breeze-blown metallic clinks."}
        </p>
      </div>

      {/* Sliders for synth params */}
      <div className="space-y-3 mb-4 border-t border-slate-800/60 pt-4">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 tracking-wider uppercase mb-1">
          <Sliders className="w-3.5 h-3.5" />
          Synthesizer Parameters
        </div>

        {/* Param Sliders */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400">RESONANCE</span>
              <span className="text-slate-200">{(agent.parameters.resonance * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={agent.parameters.resonance}
              onChange={(e) => handleParamChange("resonance", parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400 font-sans">DECAY TIME</span>
              <span className="text-slate-200">{(agent.parameters.decay * 10).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={agent.parameters.decay}
              onChange={(e) => handleParamChange("decay", parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-slate-400">DETUNE</span>
              <span className="text-slate-200">{agent.parameters.detune > 0 ? "+" : ""}{agent.parameters.detune}¢</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="1"
              value={agent.parameters.detune}
              onChange={(e) => handleParamChange("detune", parseInt(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-sans mb-1">
              <span className="text-slate-400 font-mono text-[10px]">CUTOFF FREQ</span>
              <span className="text-slate-200 font-mono">{agent.parameters.cutoff}Hz</span>
            </div>
            <input
              type="range"
              min="80"
              max="1200"
              step="10"
              value={agent.parameters.cutoff}
              onChange={(e) => handleParamChange("cutoff", parseInt(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Agent Guidelines input form */}
      <form onSubmit={handlePromptSubmit} className="space-y-2 border-t border-slate-800/60 pt-4 mb-4">
        <label className="block text-[10px] font-mono text-slate-400 tracking-wider uppercase">
          Agent Intent & Directives
        </label>
        <textarea
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors h-14 resize-none leading-relaxed"
          value={editingPrompt}
          onChange={(e) => setEditingPrompt(e.target.value)}
          placeholder={`Directives for ${agent.name}...`}
          onBlur={() => onUpdateAgent({ ...agent, prompt: editingPrompt })}
        />
      </form>

      {/* Single Agent re-compose trigger button */}
      <div className="border-t border-slate-800/60 pt-3 flex justify-between items-center">
        <span className="text-[10px] font-mono text-slate-500">INDIVIDUAL RECOMPOSITION</span>
        <button
          onClick={() => onRecreatePattern(agent)}
          disabled={isRecreating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-950 disabled:text-slate-650 text-slate-200 rounded-lg border border-slate-750 hover:border-slate-700 hover:text-indigo-400 text-xs font-mono transition-all cursor-pointer"
        >
          {isRecreating ? (
            <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <RotateCcw className="w-3.5 h-3.5" />
          )}
          RE-COMPOSE TRACK
        </button>
      </div>
    </div>
  );
}
