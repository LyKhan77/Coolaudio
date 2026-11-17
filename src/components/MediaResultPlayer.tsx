import { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { formatBytes, formatTimecode } from '../lib/timecode';
import type { MediaResult } from '../types/converter';

interface MediaResultPlayerProps {
  result: MediaResult;
  downloadLabel: string;
  onReset: () => void;
}

export function MediaResultPlayer({ result, downloadLabel, onReset }: MediaResultPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.durationSec);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(result.durationSec);
  }, [result]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  return (
    <section
      className="brutal-box p-4 sm:p-5 space-y-4"
      style={{ backgroundColor: 'var(--surface)' }}
      aria-label="Processed media result"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="font-mono-tabular text-xs font-bold px-2 py-0.5 border-2 border-[var(--ink)]"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            READY
          </span>
          <p className="font-bold text-sm sm:text-base truncate">{result.filename}</p>
        </div>

        <span className="font-mono-tabular text-xs text-[var(--muted)]">
          {result.specLabel} · {formatBytes(result.sizeBytes)}
        </span>
      </div>

      {result.kind === 'audio' ? (
        <>
          <audio
            ref={audioRef}
            src={result.url}
            preload="metadata"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
          />

          <div className="border-2 border-[var(--ink)] bg-[var(--bg)] p-3 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause preview' : 'Play preview'}
              className="brutal-btn w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 flex items-center justify-center cursor-pointer"
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 0.1)}
                step={0.05}
                value={Math.min(currentTime, duration)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setCurrentTime(next);
                  if (audioRef.current) audioRef.current.currentTime = next;
                }}
                className="brutal-range w-full"
                aria-label="Audio preview seek bar"
              />
              <div className="flex justify-between font-mono-tabular text-[11px] text-[var(--muted)]">
                <span>{formatTimecode(currentTime)}</span>
                <span>{formatTimecode(duration)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="brutal-btn w-10 h-10 pointer-coarse:w-11 pointer-coarse:h-11 shrink-0 bg-[var(--surface)] flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </>
      ) : result.kind === 'image' ? (
        <div className="border-2 border-[var(--ink)] bg-black overflow-hidden flex justify-center">
          <img
            src={result.url}
            alt="Animated preview"
            className="max-w-full max-h-64 block object-contain"
          />
        </div>
      ) : (
        <div className="border-2 border-[var(--ink)] bg-black overflow-hidden">
          <video
            src={result.url}
            controls
            preload="metadata"
            className="w-full max-h-64 block"
            aria-label="Trimmed MP4 preview"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={result.url}
          download={result.filename}
          className="brutal-btn flex-1 min-w-[200px] py-3 px-4 text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 no-underline"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
        >
          <Download className="w-4 h-4" />
          {downloadLabel}
        </a>

        <button
          type="button"
          onClick={onReset}
          className="brutal-btn bg-[var(--bg)] text-[var(--ink)] py-3 px-4 text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Process Another
        </button>
      </div>
    </section>
  );
}
