import React, { useState } from "react";
import { Play, Square, Volume2, VolumeX, Grid, Trash2, ArrowRight, Sparkles, ChevronDown } from "lucide-react";
import { Track, NoteTrigger, InstrumentType } from "../types";

interface DAWSequencerGridProps {
  tracks: Track[];
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  onPlayToggle: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onToggleStep: (trackId: string, stepIndex: number, note: NoteTrigger | null) => void;
  onClearGrid: () => void;
  onUpdateTrackSettings: (trackId: string, updates: Partial<Track>) => void;
  onLoadPreseed: () => void;
}

export default function DAWSequencerGrid({
  tracks,
  isPlaying,
  bpm,
  currentStep,
  onPlayToggle,
  onStop,
  onBpmChange,
  onToggleStep,
  onClearGrid,
  onUpdateTrackSettings,
  onLoadPreseed,
}: DAWSequencerGridProps) {
  // Store status of which note is being edited for pitching
  const [activePitchEditor, setActivePitchEditor] = useState<{ trackId: string; stepIndex: number } | null>(null);

  // Suggested harmonious scale keys for each instrument class
  const getPitchesForType = (type: InstrumentType): string[] => {
    switch (type) {
      case InstrumentType.SINGING_BOWL:
        return ["C3", "D3", "E3", "G3", "A3", "C4", "G4"];
      case InstrumentType.AMBIENT_PAD:
        return ["C2", "G2", "C3", "E3", "G3", "B3"];
      case InstrumentType.MELODIC_LEAD:
        return ["C4", "E4", "G4", "A4", "C5", "E5", "G5", "C6"];
      case InstrumentType.GROUNDING_BASS:
        return ["C1", "F1", "G1", "A1", "C2"];
      case InstrumentType.WIND_CHIMES:
        return ["C6", "E6", "G6", "B6", "C7", "E7", "G7"];
    }
  };

  const handleStepClick = (track: Track, stepIndex: number) => {
    const existing = track.steps[stepIndex];
    if (existing) {
      // If clicked, open pitch cycling or remove if clicking twice
      onToggleStep(track.id, stepIndex, null); // remove
      setActivePitchEditor(null);
    } else {
      // Add default comfortable root pitch for this instrument
      const pitches = getPitchesForType(track.instrumentType);
      const defaultPitch = pitches[0] || "C4";
      const newNote: NoteTrigger = {
        id: Math.random().toString(),
        pitch: defaultPitch,
        duration: track.instrumentType === InstrumentType.SINGING_BOWL || track.instrumentType === InstrumentType.AMBIENT_PAD ? 4 : 1,
        velocity: 0.8,
      };
      onToggleStep(track.id, stepIndex, newNote);
      // Automatically show the pitch selector dropdown
      setActivePitchEditor({ trackId: track.id, stepIndex });
    }
  };

  const handlePitchSelect = (trackId: string, stepIndex: number, existingNote: NoteTrigger, newPitch: string) => {
    onToggleStep(trackId, stepIndex, {
      ...existingNote,
      pitch: newPitch,
    });
    setActivePitchEditor(null);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="daw-sequencer-grid">
      {/* Transport controls header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 pb-6 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={onPlayToggle}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-sans font-semibold text-sm transition-all focus:outline-none cursor-pointer ${
              isPlaying
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-lg shadow-amber-500/10"
                : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/10 animate-pulse"
            }`}
            id="transport-play-btn"
          >
            <Play className={`w-4.5 h-4.5 ${isPlaying ? "fill-slate-950 stroke-none" : "fill-slate-950"}`} />
            {isPlaying ? "PAUSE LIVE" : "PLAY SEQUENCER"}
          </button>

          {/* Stop */}
          <button
            onClick={onStop}
            className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
            id="transport-stop-btn"
            title="Stop & Reset Timeline"
          >
            <Square className="w-4 h-4 fill-current stroke-none" />
          </button>

          {/* Tempo Controls */}
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">TEMPO:</span>
            <input
              type="number"
              min="50"
              max="140"
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 80)}
              className="w-12 bg-transparent text-slate-100 font-sans font-bold text-sm text-center focus:outline-none"
            />
            <span className="text-xs font-mono text-slate-500">BPM</span>
          </div>
        </div>

        {/* Global Utilities */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Preseed Loader */}
          <button
            onClick={onLoadPreseed}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 rounded-lg text-xs font-mono transition-all cursor-pointer"
            id="btn-load-preseed"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            LOAD SERENE DEFAULT CHORD
          </button>

          {/* Clear Grid */}
          <button
            onClick={onClearGrid}
            className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 border border-transparent rounded-lg text-xs font-mono transition-all cursor-pointer"
            id="btn-clear-grid"
          >
            <Trash2 className="w-4 h-4" />
            CLEAR
          </button>
        </div>
      </div>

      {/* Grid container with standard DAW matrix */}
      <div className="overflow-x-auto select-none" id="daw-matrix-container">
        <div className="min-w-[850px] relative">
          
          {/* Horizontal Step Header with timeline count (playhead) */}
          <div className="flex items-center mb-3">
            {/* Empty Spacer aligning to tracks channel strip */}
            <div className="w-[280px] shrink-0 pr-4 flex justify-between text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold">
              <span>TRACK CHANNEL INDEX</span>
              <span>VOLUME / PAN / MUTE</span>
            </div>

            {/* Steps numbers */}
            <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
              {Array.from({ length: 16 }).map((_, stepIdx) => {
                const isActivePlayhead = currentStep === stepIdx && isPlaying;
                return (
                  <div
                    key={stepIdx}
                    className={`text-center py-1 rounded-sm text-[10px] font-mono transition-all flex flex-col items-center justify-center ${
                      isActivePlayhead
                        ? "text-emerald-400 font-extrabold bg-emerald-500/10 border-b-2 border-emerald-400 scale-102"
                        : "text-slate-500"
                    }`}
                  >
                    <span>{(stepIdx + 1).toString().padStart(2, "0")}</span>
                    {isActivePlayhead && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-0.5 animate-ping"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grid Lanes */}
          <div className="space-y-3.5">
            {tracks.map((track) => {
              const channelStripColor = `border-[rgba(${track.color},0.3)]`;
              
              return (
                <div key={track.id} className="flex items-center group">
                  
                  {/* Track Channel Mixer Controls */}
                  <div className="w-[280px] shrink-0 pr-4 mr-1 flex flex-col justify-between border-r border-slate-800">
                    <div className="flex items-center gap-2 justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xl filter drop-shadow-sm shrink-0">
                          {track.instrumentType === InstrumentType.SINGING_BOWL
                            ? "🥣"
                            : track.instrumentType === InstrumentType.AMBIENT_PAD
                            ? "🌫️"
                            : track.instrumentType === InstrumentType.MELODIC_LEAD
                            ? "🔮"
                            : track.instrumentType === InstrumentType.GROUNDING_BASS
                            ? "🕉️"
                            : "🔔"}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-sans font-medium text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                            {track.name}
                          </h4>
                          <span className="text-[8px] font-mono text-slate-500 block uppercase">
                            {track.instrumentType.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      {/* Mute and Solo */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => onUpdateTrackSettings(track.id, { muted: !track.muted })}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                            track.muted
                              ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          }`}
                          title="Mute Track"
                        >
                          M
                        </button>
                        <button
                          onClick={() => onUpdateTrackSettings(track.id, { soloed: !track.soloed })}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                            track.soloed
                              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                              : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                          }`}
                          title="Solo Track"
                        >
                          S
                        </button>
                      </div>
                    </div>

                    {/* Faders line (Volume / Panner) */}
                    <div className="flex items-center gap-3">
                      {/* Vol slide */}
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-[9px] text-slate-500 font-mono">VOL</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={track.volume}
                          onChange={(e) => onUpdateTrackSettings(track.id, { volume: parseFloat(e.target.value) })}
                          className="flex-1 h-0.7 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                        />
                      </div>
                      
                      {/* Pan knob representator */}
                      <div className="w-16 flex items-center gap-1">
                        <span className="text-[9px] text-slate-500 font-mono">PAN</span>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.1"
                          value={track.pan}
                          onChange={(e) => onUpdateTrackSettings(track.id, { pan: parseFloat(e.target.value) })}
                          className="w-full h-0.7 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-slate-400"
                          title={`Pan: ${track.pan === 0 ? "Center" : track.pan < 0 ? "L" + Math.abs(track.pan) : "R" + track.pan}`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 16 Matrix Steps column */}
                  <div className="flex-1 grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
                    {track.steps.map((noteTrigger, stepIdx) => {
                      const isPlayhead = currentStep === stepIdx && isPlaying;
                      const hasNote = noteTrigger !== null;

                      // Decide step button background color
                      let buttonBg = "bg-slate-950/45 hover:bg-slate-800 border-slate-800/80";
                      let textColor = "text-transparent";
                      let borderStyle = "border";

                      if (hasNote) {
                        buttonBg = track.instrumentType === InstrumentType.SINGING_BOWL
                          ? "bg-amber-400/20 hover:bg-amber-400/25 text-amber-300 border-amber-400/40"
                          : track.instrumentType === InstrumentType.AMBIENT_PAD
                          ? "bg-indigo-400/25 hover:bg-indigo-400/30 text-indigo-300 border-indigo-400/40"
                          : track.instrumentType === InstrumentType.MELODIC_LEAD
                          ? "bg-emerald-400/25 hover:bg-emerald-400/30 text-emerald-300 border-emerald-400/40"
                          : track.instrumentType === InstrumentType.GROUNDING_BASS
                          ? "bg-cyan-500/25 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40"
                          : "bg-fuchsia-400/20 hover:bg-fuchsia-400/25 text-fuchsia-300 border-fuchsia-400/40";
                      }

                      const showEditor = activePitchEditor?.trackId === track.id && activePitchEditor?.stepIndex === stepIdx;

                      return (
                        <div key={stepIdx} className="relative h-13">
                          <button
                            onClick={() => handleStepClick(track, stepIdx)}
                            className={`w-full h-full rounded-lg text-[9px] font-mono flex flex-col items-center justify-between py-1 transition-all focus:outline-none cursor-pointer border ${buttonBg} ${
                              isPlayhead ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 border-transparent shadow shadow-emerald-400/30" : ""
                            }`}
                            id={`step-${track.id}-${stepIdx}`}
                          >
                            <span className="text-[8px] opacity-40 select-none">
                              {/* simple tick marker */}
                              {(stepIdx % 4 === 0) ? "•" : ""}
                            </span>
                            
                            <span className="font-extrabold max-w-full font-mono text-center truncate px-0.5">
                              {hasNote ? noteTrigger.pitch : ""}
                            </span>

                            <span className="text-[7px] opacity-50 block truncate max-w-full">
                              {hasNote ? `d:${noteTrigger.duration}` : ""}
                            </span>
                          </button>

                          {/* Float pitch picker editor */}
                          {showEditor && hasNote && (
                            <div className="absolute top-14 left-0 z-50 bg-slate-950 border border-slate-750 p-2 rounded-xl shadow-2xl min-w-[120px] max-h-[160px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                              <div className="text-[8px] font-mono text-slate-500 mb-1.5 uppercase tracking-wider pb-1.5 border-b border-slate-900">
                                Pitch Scale
                              </div>
                              <div className="space-y-1">
                                {getPitchesForType(track.instrumentType).map((pitchOption) => (
                                  <button
                                    key={pitchOption}
                                    onClick={() => handlePitchSelect(track.id, stepIdx, noteTrigger, pitchOption)}
                                    className={`w-full text-left px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                                      noteTrigger.pitch === pitchOption
                                        ? "bg-indigo-500/20 text-indigo-400 font-bold"
                                        : "text-slate-300 hover:bg-slate-850"
                                    }`}
                                  >
                                    {pitchOption}
                                  </button>
                                ))}
                              </div>
                              <button
                                onClick={() => setActivePitchEditor(null)}
                                className="w-full text-center mt-2 pt-1.5 border-t border-slate-900 text-[9px] text-slate-500 hover:text-slate-300 hover:underline cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Quick guide under matrix */}
          <div className="mt-4 flex items-center justify-between text-[11px] font-sans text-slate-550 border-t border-slate-800/40 pt-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Grid className="w-3.5 h-3.5" />
              <strong>Quick Guide:</strong> Click any cell to add a default pitch. Click an active cell to delete it. Double click to tweak pitches.
            </span>
            <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
              Thiri.ai Sequenced Room <ArrowRight className="w-3 h-3" /> C-Major Healing Cleansing
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
