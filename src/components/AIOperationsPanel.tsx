import React, { useState, useEffect } from "react";
import { Key, Sparkles, Send, Music, HelpCircle, AlertCircle } from "lucide-react";
import { AgentInstrument, AIResponseLog } from "../types";

interface AIOperationsPanelProps {
  agents: AgentInstrument[];
  logs: AIResponseLog[];
  onCompose: (prompt: string, apiKey: string) => Promise<void>;
  isLoading: boolean;
}

export default function AIOperationsPanel({
  agents,
  logs,
  onCompose,
  isLoading,
}: AIOperationsPanelProps) {
  const [prompt, setPrompt] = useState(
    "A deep meditative healing sunrise journey. Start with Chandler's soft singing bowls, slowly blending into high warm wind chimes and sub bass."
  );
  const [apiKey, setApiKey] = useState("");
  const [showKeyForm, setShowKeyForm] = useState(false);

  // Load custom API key from localstorage if it exists
  useEffect(() => {
    const savedKey = localStorage.getItem("CHANDLER_THIRI_API_KEY");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("CHANDLER_THIRI_API_KEY", apiKey);
    setShowKeyForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onCompose(prompt, apiKey);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl" id="ai-operations-panel">
      {/* Header and key button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-sans font-medium text-slate-100 tracking-tight flex items-center gap-2">
              Thiri.ai Orchestrator
            </h2>
            <p className="text-xs font-mono text-slate-400">COORDINATE THE COOPERATIVE HEALING BAND</p>
          </div>
        </div>

        <button
          onClick={() => setShowKeyForm(!showKeyForm)}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            apiKey
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          }`}
          id="toggle-api-key"
        >
          <Key className="w-3.5 h-3.5" />
          {apiKey ? "API KEY INTEGRATED" : "INTEGRATE API KEY"}
        </button>
      </div>

      {/* Secret API Key Entry Modal/Collapse */}
      {showKeyForm && (
        <div className="mb-6 p-4 bg-slate-950/60 border border-slate-800 rounded-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <h3 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-amber-400" />
            Integrate Personal Gemini API Key
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Your key stays completely private in your own browser's <strong>localStorage</strong>. It is passed
            only in secure headers to proxy AI requests to Gemini models on the server.
          </p>
          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-750 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-sans font-medium text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Save Key
            </button>
          </form>
          {apiKey && (
            <button
              onClick={() => {
                setApiKey("");
                localStorage.removeItem("CHANDLER_THIRI_API_KEY");
              }}
              className="mt-2.5 text-[10px] font-mono text-rose-400 hover:underline flex items-center gap-1"
            >
              Remove Integrated Key
            </button>
          )}
        </div>
      )}

      {/* Prompt Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 tracking-wider mb-2 uppercase">
            ORCHESTRATOR PROMPT (THIRI.AI CONDUCTS IN C MAJOR)
          </label>
          <div className="relative">
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all leading-relaxed pr-12 min-h-[85px] resize-none"
              placeholder="What soothing atmospheric music should the specialized agents compose?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="absolute right-3.5 bottom-4 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-all focus:outline-none cursor-pointer"
              aria-label="Send composition instructions to agents"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-indigo-200 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Suggestion tags */}
        <div className="flex flex-wrap gap-2">
          {[
            "Deep Sound Bath with Chandler's heavy bowl drone",
            "Crystalline forest morning wind chimes & pads",
            "Sub-octave grounding frequencies for deep sleep",
            "Slow melodic sunrise bells and warm choral synthesizers",
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setPrompt(suggestion)}
              disabled={isLoading}
              className="text-[10px] font-sans text-slate-400 hover:text-indigo-400 bg-slate-850 hover:bg-slate-800 px-2.5 py-1.2 rounded-full border border-slate-800 hover:border-slate-700 transition-all cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      {/* Agents Collaborative Meeting Room / Logs */}
      <div className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden">
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-bold flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-indigo-400" />
            Cooperative Meeting Room Transcript
          </span>
          <span className="text-[9px] font-mono text-slate-500">REALTIME THREAT RESISTANT HEALING RECORD</span>
        </div>

        <div className="p-4 space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-850">
          {logs.length === 0 ? (
            <div className="text-center py-6">
              <span className="inline-block p-2 bg-slate-900 rounded-full border border-slate-800/60 mb-2">
                <HelpCircle className="w-5 h-5 text-slate-500" />
              </span>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                No active orchestration matches. Type a prompt above and ask the specialized agents to craft some beautiful frequencies.
              </p>
            </div>
          ) : (
            logs.map((log, index) => {
              const borderColors: Record<string, string> = {
                orchestrator: "border-indigo-500/20 bg-indigo-505/5",
                agent: "border-emerald-500/10 bg-emerald-500/5",
                system: "border-slate-850 bg-slate-900/40",
                error: "border-rose-500/20 bg-rose-500/5",
              };

              const nameColors: Record<string, string> = {
                orchestrator: "text-indigo-400",
                agent: "text-emerald-400",
                system: "text-slate-400",
                error: "text-rose-400",
              };

              const isChandler = log.agentName.toLowerCase().includes("chandler");

              return (
                <div
                  key={index}
                  className={`p-3 border rounded-lg text-xs transition-all leading-relaxed ${
                    borderColors[log.type] || "border-slate-800"
                  } ${isChandler ? "border-amber-400/20 bg-amber-500/5" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-mono text-[11px] font-bold ${nameColors[log.type]} flex items-center gap-1`}>
                      {isChandler && "🪈 "}
                      {log.agentName}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">{log.timestamp}</span>
                  </div>
                  <p className="text-slate-300 font-sans">{log.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
