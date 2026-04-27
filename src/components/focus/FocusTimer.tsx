"use client";

import { useState, useEffect, useRef } from "react";
import { X, Pause, Play } from "lucide-react";

const DURATIONS = [
  { label: "25 min", seconds: 25 * 60 },
  { label: "45 min", seconds: 45 * 60 },
  { label: "60 min", seconds: 60 * 60 },
];

const PLAYLISTS = [
  {
    key: "noire-jazz",
    label: "Noire Jazz",
    description: "Moody jazz for deep focus",
    videoId: "Ja967n4H-w4",
  },
  {
    key: "lofi-study",
    label: "Lofi Study",
    description: "Beats to relax and study to",
    videoId: "jfKfPfyJRdk",
  },
  {
    key: "ethereal-study",
    label: "Ethereal Study",
    description: "Ambient soundscapes for deep work",
    videoId: "UfcAVejslrU",
  },
];

const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  onClose: () => void;
}

export function FocusTimer({ onClose }: Props) {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [fading, setFading] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Timer countdown
  useEffect(() => {
    if (!running || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  // When timer finishes: stop music, fade out, close
  useEffect(() => {
    if (!finished) return;
    sendVideoCommand("pauseVideo");
    setVideoPlaying(false);
    const fadeTimer = setTimeout(() => setFading(true), 300);
    const closeTimer = setTimeout(() => onClose(), 1500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [finished, onClose]);

  // When playlist changes, assume video auto-plays (autoplay=1 in src)
  useEffect(() => {
    setVideoPlaying(!!activePlaylist);
  }, [activePlaylist]);

  function sendVideoCommand(command: string) {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      "*"
    );
  }

  function toggleVideo() {
    if (!activePlaylist) return;
    if (videoPlaying) {
      sendVideoCommand("pauseVideo");
      setVideoPlaying(false);
    } else {
      sendVideoCommand("playVideo");
      setVideoPlaying(true);
    }
  }

  function selectDuration(secs: number) {
    setTotalSeconds(secs);
    setRemaining(secs);
    setRunning(false);
    setFinished(false);
  }

  function toggleRunning() {
    if (finished) {
      setRemaining(totalSeconds);
      setFinished(false);
      setRunning(true);
    } else {
      setRunning((v) => !v);
    }
  }

  function handleClose() {
    sendVideoCommand("pauseVideo");
    onClose();
  }

  const progress = remaining / totalSeconds;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeDisplay = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const activePlaylistData = PLAYLISTS.find((p) => p.key === activePlaylist);

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        transition: "opacity 1.2s ease",
        opacity: fading ? 0 : 1,
      }}
    >
      {/* ── Always-on dark background ─────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 50%, #1e1b4b 0%, #0e0e10 60%)" }}
      />

      {/* ── Video background ──────────────────────────────────────────── */}
      {activePlaylist && (
        <iframe
          ref={iframeRef}
          key={activePlaylist}
          src={`https://www.youtube.com/embed/${activePlaylistData?.videoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          title={activePlaylistData?.label}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100vw",
            height: "56.25vw",
            minHeight: "100vh",
            minWidth: "177.78vh",
            border: "none",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-black/55" />

      {/* ── Close button ─────────────────────────────────────────────── */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-8 text-white/50 hover:text-white transition-colors z-10"
      >
        <X size={22} />
      </button>

      {/* ── Centered content ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 pb-14">

        {/* Duration pills */}
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.label}
              onClick={() => selectDuration(d.seconds)}
              className={`text-xs px-4 py-1.5 rounded-full border backdrop-blur-sm transition-colors ${
                totalSeconds === d.seconds
                  ? "border-white/60 text-white bg-white/15"
                  : "border-white/20 text-white/40 hover:border-white/40 hover:text-white/70"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Circular timer */}
        <div className="relative">
          <svg width="280" height="280" viewBox="0 0 280 280">
            {/* Solid fill so iframe errors can't bleed through */}
            <circle cx="140" cy="140" r={RADIUS} fill="rgba(0,0,0,0.4)" />
            {/* Track ring */}
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1.5"
            />
            {/* Progress ring */}
            <circle
              cx="140" cy="140" r={RADIUS}
              fill="none"
              stroke={finished ? "#22c55e" : "rgba(255,255,255,0.85)"}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 140 140)"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          {/* Time + label overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-light text-white tracking-tight tabular-nums drop-shadow-lg">
              {timeDisplay}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mt-2">
              {finished ? "Complete" : running ? "Remaining" : "Paused"}
            </span>
          </div>
        </div>

        {/* Start / Pause button */}
        <button
          onClick={toggleRunning}
          className="flex items-center gap-2 px-7 py-2.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? "Pause Session" : finished ? "Restart" : "Start Session"}
        </button>

        {/* Playlist pills */}
        <div className="flex gap-2">
          {PLAYLISTS.map((p) => (
            <button
              key={p.key}
              onClick={() =>
                setActivePlaylist(activePlaylist === p.key ? null : p.key)
              }
              className={`text-[11px] px-3.5 py-1.5 rounded-full border font-medium backdrop-blur-sm transition-colors ${
                activePlaylist === p.key
                  ? "border-white/60 text-white bg-white/15"
                  : "border-white/20 text-white/40 hover:border-white/40 hover:text-white/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Music bar ────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center px-6 gap-4 bg-black/40 backdrop-blur-md border-t border-white/10">
        <button
          onClick={toggleVideo}
          disabled={!activePlaylist}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 flex-shrink-0"
        >
          {videoPlaying
            ? <Pause size={13} className="text-white" />
            : <Play size={13} className="text-white ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80 truncate">
            {activePlaylistData?.label ?? "No playlist selected"}
          </p>
          {activePlaylistData && (
            <p className="text-[10px] text-white/35 truncate">
              {activePlaylistData.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
