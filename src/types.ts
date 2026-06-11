export enum InstrumentType {
  SINGING_BOWL = "SINGING_BOWL",
  AMBIENT_PAD = "AMBIENT_PAD",
  MELODIC_LEAD = "MELODIC_LEAD",
  GROUNDING_BASS = "GROUNDING_BASS",
  WIND_CHIMES = "WIND_CHIMES",
}

export interface AgentInstrument {
  id: string;
  name: string;
  type: InstrumentType;
  prompt: string;
  specialty: string;
  avatar: string;
  color: string;
  parameters: {
    resonance: number; // 0 to 1
    decay: number; // 0 to 1
    detune: number; // in cents
    modulation: number; // 0 to 1
    cutoff: number; // Hz / filter
  };
}

export interface NoteTrigger {
  id: string;
  pitch: string; // e.g., "C3", "E3", "G3", "B3", "C4"
  duration: number; // in steps (usually 1, 2, 4...)
  velocity: number; // 0 to 1 (volume scaler)
}

export interface Track {
  id: string;
  agentId: string;
  name: string;
  instrumentType: InstrumentType;
  color: string;
  volume: number; // 0 to 1
  muted: boolean;
  soloed: boolean;
  pan: number; // -1 to 1
  steps: (NoteTrigger | null)[]; // 16 steps
}

export interface SequencerState {
  isPlaying: boolean;
  bpm: number;
  currentStep: number;
  totalSteps: number;
  loop: boolean;
  selectedTrackId: string | null;
  selectedStep: number | null;
}

export interface AIResponseLog {
  timestamp: string;
  agentName: string;
  message: string;
  type: "orchestrator" | "agent" | "system" | "error";
  rawLog?: string;
}

export interface AgentCompositionRequest {
  orchestratorPrompt: string;
  agents: AgentInstrument[];
  bpm: number;
}

export interface InstrumentPatternRequest {
  agent: AgentInstrument;
  contextPrompt: string;
  bpm: number;
}

export interface AICompositionResult {
  bpm: number;
  orchestratorSummary: string;
  agentLogs: { agentName: string; log: string }[];
  tracks: {
    agentId: string;
    steps: {
      stepIndex: number;
      pitch: string;
      duration?: number;
      velocity?: number;
    }[];
  }[];
}

export interface AIPatternResult {
  agentName: string;
  summary: string;
  steps: {
    stepIndex: number;
    pitch: string;
    duration?: number;
    velocity?: number;
  }[];
}
