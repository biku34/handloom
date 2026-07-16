"use client";

import { useRef, useState } from "react";

/** One-tap voice-note player (FR-F1 AC-6). No autoplay. */
export default function AudioPlayer({ src, label, durationSec }: { src: string; label: string; durationSec?: number }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-maroon-700 text-white px-4 py-3">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="h-11 w-11 shrink-0 rounded-full bg-white text-maroon-700 text-lg font-bold flex items-center justify-center cursor-pointer"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{label}</div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/25 overflow-hidden">
          <div className="h-full bg-silk-300 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {durationSec ? <span className="text-xs tabular-nums opacity-80">{Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}</span> : null}
      <audio
        ref={ref}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress((el.currentTime / el.duration) * 100);
        }}
      />
    </div>
  );
}
