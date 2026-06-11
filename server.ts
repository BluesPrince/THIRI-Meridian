import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to initialize Gemini Client
function getGeminiClient(clientApiKey?: string) {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server, nor was a user-provided API key sent in the request.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST API for Multi-Agent Orchestrated Composition
app.post("/api/agents/compose", async (req, res) => {
  try {
    const { orchestratorPrompt, agents, bpm } = req.body;
    const clientKey = req.headers["x-gemini-api-key"] as string;

    const ai = getGeminiClient(clientKey);

    // List of active instruments so Gemini knows what tracks are available
    const instrumentsList = agents.map((a: any) => `- Agent Node "${a.name}" (Type: ${a.type}, Specialty: ${a.specialty}, Prompt context: "${a.prompt}")`).join("\n");

    const systemInstruction = `You are Thiri.ai Orchestrator, a world-class ambient & meditative music conductor.
Your role is to orchestrate a collaborative performance from multiple Specialized Instrument Agents. Each agent has a distinct sonic specialty and plays on its own track.

You must design a 16-step musical sequence (0 to 15 index) for EACH active instrument agent.
The overall aesthetic MUST be restorative, healing, and beautiful. Follow these rules for notes:
1. Chandler's Singing Bowls (SINGING_BOWL): Chandler likes extremely soft, slow-evolving, healing singing bowl patterns. Pitch ranges should be C3, D3, E3, G3, A3, C4, G4.
Bowl notes should be sparse, long-lasting (duration 4 or 8 steps), and hold deep open intervals (e.g. root + fifths, C3 and G3) to allow resonant healing hums. Do not do fast run of notes.
2. Ambient Pad (AMBIENT_PAD): Warm, supportive drone background. Uses long notes (e.g. duration 4 or 8) in the low-mid register (C2, G2, C3, E3, G3, A3).
3. Melodic Lead (MELODIC_LEAD): Cozy bells/plucks. Can play delicate high-register melodies (C4, D4, E4, G4, A4, C5, E5, G5). Pentatonic scale is highly recommended for harmoniousness. Sparse, gentle plucks.
4. Grounding Bass (GROUNDING_BASS): Rich, warm grounding notes (C1, F1, G1, A1, C2) anchoring the harmony. Usually triggers on step 0, 4, 8, or 12.
5. Wind Chimes (WIND_CHIMES): High glittering frequencies (C6, E6, G6, B6, C7, E7, G7) that sound like gentle, fluttering crystalline drops. Keep them random and sparse.

You must output a single well-formed JSON object containing:
1. "bpm": The suggested tempo (between 60 and 95 bpm).
2. "orchestratorSummary": A poetic, scannable description of what the composition represents, how the agents collaborated, and the emotional/healing qualities of the sound.
3. "agentLogs": A list of logs detailing what each agent contributed during Thiri's orchestration meeting (especially Chandler's thoughts on healing sine bowls).
4. "tracks": An array for each agent containing "agentId" and "steps". Each item in "steps" has "stepIndex" (0 to 15), "pitch" (e.g., "C3"), "duration" (integer steps), and "velocity" (0 to 1).

Keep steps sparse. An instrument should only play 1 to 4 notes across the 16 steps, except for chimes or delicate leads which can have up to 8 soft notes. Remember, healing music requires breathing room (negative space).`;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Design an ambient composition with the following agents:\n${instrumentsList}\n\nClient goal / theme prompt: "${orchestratorPrompt}". Present composition in C Major or Pentatonic Major for ultimate harmony.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bpm: { type: Type.INTEGER, description: "Calculated BPM for the healing vibes" },
            orchestratorSummary: { type: Type.STRING, description: "Poetic synthesis of the performance" },
            agentLogs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agentName: { type: Type.STRING },
                  log: { type: Type.STRING, description: "The agent's musical intent" }
                }
              }
            },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  agentId: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepIndex: { type: Type.INTEGER },
                        pitch: { type: Type.STRING },
                        duration: { type: Type.INTEGER },
                        velocity: { type: Type.NUMBER }
                      },
                      required: ["stepIndex", "pitch"]
                    }
                  }
                },
                required: ["agentId", "steps"]
              }
            }
          },
          required: ["bpm", "orchestratorSummary", "agentLogs", "tracks"]
        }
      }
    });

    const parsedData = JSON.parse(modelResponse.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI composition error:", err);
    res.status(500).json({ error: err.message || "Failed to generate composition" });
  }
});

// REST API for generating a single Agent's instrument pattern
app.post("/api/agents/generate-pattern", async (req, res) => {
  try {
    const { agent, contextPrompt, bpm } = req.body;
    const clientKey = req.headers["x-gemini-api-key"] as string;

    const ai = getGeminiClient(clientKey);

    const systemInstruction = `You are a Specialized Instrument Agent of type ${agent.type} called "${agent.name}".
Your specialty is: "${agent.specialty}".
Your client's visual guidelines and goal: "${agent.prompt}".

You need to write a brand new 16-step sequence (0 to 15 index) just for your track.
Pitches must align with soft meditative harmonics:
- If you are SINGING_BOWL, write very slow, long notes (E.g. Step 0: C3 (dur 8), Step 8: G3 (dur 8)). Singing bowls sound amazing with 2 or 3 long overlapping resonances.
- If AMBIENT_PAD, write warm triads or root drone notes with duration 4 or 8.
- If MELODIC_LEAD, write a delicate melody on pentatonic pitches (C4, D4, E4, G4, A4, C5, E5, G5).
- If GROUNDING_BASS, write warm supporting subs on C1, C2, G1.
- If WIND_CHIMES, write high scattered glittery chimes (C6, E6, G6, B6, C7).

Output a JSON object with:
1. "agentName": "${agent.name}"
2. "summary": A short friendly description of the pattern you created and its healing attributes.
3. "steps": An array list of note triggers containing "stepIndex", "pitch", "duration", and "velocity".`;

    const modelResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate a music sheet sequence of 16 steps matching your instrument constraints. Prompt context: "${contextPrompt}". Current tempo is ${bpm} bpm.`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agentName: { type: Type.STRING },
            summary: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepIndex: { type: Type.INTEGER },
                  pitch: { type: Type.STRING },
                  duration: { type: Type.INTEGER },
                  velocity: { type: Type.NUMBER }
                },
                required: ["stepIndex", "pitch"]
              }
            }
          },
          required: ["agentName", "summary", "steps"]
        }
      }
    });

    const parsedData = JSON.parse(modelResponse.text || "{}");
    res.json(parsedData);
  } catch (err: any) {
    console.error("AI single pattern error:", err);
    res.status(500).json({ error: err.message || "Failed to generate track musical pattern" });
  }
});

// Configure Vite integration for Full Stack
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
