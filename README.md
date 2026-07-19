# THIRI Meridian

A browser DAW where five AI instrument agents — singing bowls, ambient pad, bell lead, grounding bass, wind chimes — compose 16-step ambient sequences through Gemini, play them on a live Web Audio synth engine, and drive a physics-accurate Chladni-plate cymatics simulation with the frequencies in the grid.

Chandler's singing bowls sit at the center of the ensemble: long C3/G3 drones with inharmonic partials that beat gently against the pad and bass, the way real bowls do.

## How it works

**The agents.** Each of the five agents owns one track in a 16-step sequencer: Chandler (singing bowls), Aira (pad), Lyra (bells), Bhumi (bass), Zephyr (chimes). Each carries its own synthesis parameters — resonance, decay, detune, modulation, filter cutoff — editable from its settings card.

**Composition.** An Express server exposes two endpoints backed by Gemini (`gemini-3.5-flash` via `@google/genai`, structured JSON output). `/api/agents/compose` hands the full agent roster and your theme prompt to a "Thiri.ai Orchestrator" system prompt, which returns a bpm, a step pattern per agent, and each agent's commentary for the session log. `/api/agents/generate-pattern` lets a single agent rewrite only its own track. The orchestrator is constrained to sparse, C-major/pentatonic writing with long bowl durations — negative space is enforced in the prompt, not hoped for.

**Sound.** Everything is synthesized in the browser, no samples: per-instrument oscillator recipes (FM bells, detuned pads, LFO-modulated bowls), per-track gain/pan/mute/solo, and a master chain of lowpass filter, waveshaper, feedback delay, and convolver reverb with a generated impulse response. A lookahead scheduler keeps the 16-step loop steady between 50 and 140 bpm.

**Cymatics.** The Research Lab maps the pitches currently in the grid to Chladni plate modes (n, m) and runs 1,350 simulated sand particles down the standing-wave displacement gradient toward the nodal lines — the same math as sand on a bowed metal plate. Three boundary conditions (square free-edge, clamped, concentric), adjustable drive amplitude, click the plate to scatter the sand. A second tab compares the closest pair of active frequencies and labels beat differences under 45 Hz with the matching EEG band, delta through gamma. An openDAW-styled console adds a CRT oscilloscope and Lissajous vectorscope.

No API key is needed to play: the grid is fully hand-editable and the "load serene default chord" preset seeds a C-major performance instantly. Gemini is only required for the agent-composition features.

## Running it

Prerequisites: Node.js.

```
npm install
cp .env.example .env   # set GEMINI_API_KEY
npm run dev            # http://localhost:3000
```

Production build: `npm run build && npm start`.

Instead of a server-side key, you can paste a Gemini API key in the UI ("Integrate API key"); it is stored in localStorage and sent per-request in a header.

## Context

Part of the [THIRI](https://thiri.ai) ecosystem by Dennison Blackett ([BluesPrince](https://github.com/BluesPrince)) — deterministic music theory for the AI era. See also [thiri-mcp](https://github.com/BluesPrince/thiri-mcp).
