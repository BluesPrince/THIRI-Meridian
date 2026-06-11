import React, { useEffect, useRef } from "react";
import { audioEngine } from "../audioEngine";

interface AudioVisualizerProps {
  isPlaying: boolean;
}

export default function AudioVisualizer({ isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-dpi screens
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Dynamic visualization variables
    let idlePhase = 0;

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear with elegant translucent slate background
      ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
      ctx.fillRect(0, 0, width, height);

      const hasAudio = isPlaying && audioEngine.analyzer && audioEngine.ctx;

      if (hasAudio) {
        const bufferLength = audioEngine.analyzer!.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Draw frequency spectrum bars on bottom
        audioEngine.analyzer!.getByteFrequencyData(dataArray);
        
        ctx.save();
        const barWidth = (width / bufferLength) * 1.6;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] * 0.45;
          const greenIntensity = Math.min(180 + barHeight, 235);
          ctx.fillStyle = `rgba(16, 185, 129, ${0.1 + (dataArray[i] / 255) * 0.75})`;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
        ctx.restore();

        // Draw oscilloscope line centrally
        const waveArray = new Uint8Array(bufferLength);
        audioEngine.analyzer!.getByteTimeDomainData(waveArray);

        ctx.strokeStyle = "rgba(52, 211, 153, 0.95)"; // Healing emerald color
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(16, 185, 129, 0.4)";
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let xWave = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = waveArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(xWave, y);
          } else {
            ctx.lineTo(xWave, y);
          }

          xWave += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else {
        // Draw elegant meditative breathing waves when idle
        idlePhase += 0.02;
        const centerY = height / 2;
        
        ctx.save();
        ctx.lineWidth = 1.5;
        
        // Render 3 overlapping soft sine waves
        for (let w = 0; w < 3; w++) {
          const alpha = 0.15 + (w * 0.15);
          ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`; // Cozy indigo tones
          ctx.beginPath();
          
          const freqMultiplier = 0.008 + w * 0.003;
          const speedMultiplier = (w + 1) * 0.5;
          
          for (let x = 0; x < width; x++) {
            const y = centerY + Math.sin(x * freqMultiplier + idlePhase * speedMultiplier) * (15 + w * 12) * Math.sin(idlePhase * 0.2);
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        
        // Breathing center text hint
        ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
        ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText("MEDITATIVE SINEBREATH SYSTEM : IDLE", width / 2, height - 15);
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full h-32 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"}`}></span>
        <span className="text-[10px] font-mono tracking-wider text-slate-400 font-bold">
          {isPlaying ? "LIVE OSCILLOSCOPE & SPECTRUM" : "HEALING SINEBREATH ENGINE"}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-full block" id="visualizer-canvas" />
    </div>
  );
}
