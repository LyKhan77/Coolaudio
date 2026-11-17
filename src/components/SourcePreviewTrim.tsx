import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Scissors } from 'lucide-react';
import { formatTimecode, parseTimecode } from '../lib/timecode';
import type { TrimRange } from '../types/converter';

interface SourcePreviewTrimProps {
  mediaKind: 'video' | 'audio';
  objectUrl: string;
  durationSec: number;
  trim: TrimRange;
  disabled?: boolean;
  onDurationDetected: (duration: number) => void;
  onTrimChange: (next: TrimRange) => void;
}

const MIN_CLIP_SEC = 0.5;

export function SourcePreviewTrim({
  mediaKind,
  objectUrl,
  durationSec,
  trim,
  disabled,
  onDurationDetected,
  onTrimChange,
}: SourcePreviewTrimProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [startText, setStartText] = useState(formatTimecode(trim.startSec));
  const [endText, setEndText] = useState(formatTimecode(trim.endSec));

  useEffect(() => {
    setStartText(formatTimecode(trim.startSec));
  }, [trim.startSec]);

  useEffect(() => {
    setEndText(formatTimecode(trim.endSec));
  }, [trim.endSec]);

  const maxDuration = Math.max(durationSec, 0.5);
  const selectedDuration = Math.max(0, trim.endSec - trim.startSec);

  const commitStartText = () => {
    const parsed = parseTimecode(startText);
    if (parsed === null) {
      setStartText(formatTimecode(trim.startSec));
      return;
    }
    const clamped = Math.min(Math.max(0, parsed), Math.max(0, trim.endSec - MIN_CLIP_SEC));
    onTrimChange({ startSec: clamped, endSec: trim.endSec });
  };

  const commitEndText = () => {
    const parsed = parseTimecode(endText);
    if (parsed === null) {
      setEndText(formatTimecode(trim.endSec));
      return;
    }
    const clamped = Math.max(
      Math.min(maxDuration, parsed),
      Math.min(maxDuration, trim.startSec + MIN_CLIP_SEC),
    );
    onTrimChange({ startSec: trim.startSec, endSec: clamped });
  };

  const setStartToPlayhead = () => {
    if (durationSec <= 0) return;
    const clamped = Math.min(currentTime, Math.max(0, trim.endSec - MIN_CLIP_SEC));
    onTrimChange({ startSec: clamped, endSec: trim.endSec });
  };

  const setEndToPlayhead = () => {
    if (durationSec <= 0) return;
    const clamped = Math.max(currentTime, Math.min(maxDuration, trim.startSec + MIN_CLIP_SEC));
    onTrimChange({ startSec: trim.startSec, endSec: clamped });
  };

  const resetTrim = () => {
    onTrimChange({ startSec: 0, endSec: durationSec });
  };

  const handleLoadedMetadata = (el: HTMLMediaElement) => {
    if (Number.isFinite(el.duration) && el.duration > 0) {
      onDurationDetected(el.duration);
    }
  };

  return (
    <section className="brutal-box p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-wide">Source Preview & Trim</h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono-tabular text-xs font-bold px-2 py-1 border-2 border-[var(--ink)] bg-[var(--surface)]">
            CLIP {formatTimecode(selectedDuration)} / {formatTimecode(durationSec)}
          </span>
          {durationSec > 0 && (trim.startSec > 0.05 || trim.endSec < durationSec - 0.05) && (
            <button
              type="button"
              disabled={disabled}
              onClick={resetTrim}
              className="text-xs font-bold underline flex items-center gap-1 cursor-pointer pointer-coarse:min-h-11 pointer-coarse:px-2"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {mediaKind === 'video' ? (
        <div className="border-2 border-[var(--ink)] bg-black overflow-hidden">
          <video
            ref={(el) => {
              mediaRef.current = el;
            }}
            src={objectUrl}
            controls
            preload="auto"
            className="w-full max-h-56 block"
            onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
        </div>
      ) : (
        <div className="border-2 border-[var(--ink)] bg-[var(--surface)] p-3">
          <audio
            ref={(el) => {
              mediaRef.current = el;
            }}
            src={objectUrl}
            controls
            preload="auto"
            className="w-full block"
            onLoadedMetadata={(e) => handleLoadedMetadata(e.currentTarget)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          />
        </div>
      )}

      {durationSec > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="trim-start-input" className="text-xs font-bold uppercase">
                Start Time
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={setStartToPlayhead}
                className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 pointer-coarse:min-h-11 pointer-coarse:px-3 border border-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--accent)] cursor-pointer"
              >
                Use Playhead ({formatTimecode(currentTime)})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="trim-start-input"
                type="text"
                disabled={disabled}
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
                onBlur={commitStartText}
                onKeyDown={(e) => e.key === 'Enter' && commitStartText()}
                className="brutal-input font-mono-tabular text-xs font-bold w-20 px-2.5 py-1.5 pointer-coarse:min-h-11 pointer-coarse:w-24"
                aria-label="Start timecode"
              />
              <input
                type="range"
                min={0}
                max={Math.max(0, trim.endSec - MIN_CLIP_SEC)}
                step={0.1}
                disabled={disabled}
                value={trim.startSec}
                onChange={(e) => {
                  const nextStart = Number(e.target.value);
                  onTrimChange({ startSec: nextStart, endSec: trim.endSec });
                  if (mediaRef.current) mediaRef.current.currentTime = nextStart;
                }}
                className="brutal-range flex-1"
                aria-label="Trim start slider"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="trim-end-input" className="text-xs font-bold uppercase">
                End Time
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={setEndToPlayhead}
                className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 pointer-coarse:min-h-11 pointer-coarse:px-3 border border-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--accent)] cursor-pointer"
              >
                Use Playhead ({formatTimecode(currentTime)})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="trim-end-input"
                type="text"
                disabled={disabled}
                value={endText}
                onChange={(e) => setEndText(e.target.value)}
                onBlur={commitEndText}
                onKeyDown={(e) => e.key === 'Enter' && commitEndText()}
                className="brutal-input font-mono-tabular text-xs font-bold w-20 px-2.5 py-1.5 pointer-coarse:min-h-11 pointer-coarse:w-24"
                aria-label="End timecode"
              />
              <input
                type="range"
                min={Math.min(maxDuration, trim.startSec + MIN_CLIP_SEC)}
                max={maxDuration}
                step={0.1}
                disabled={disabled}
                value={trim.endSec}
                onChange={(e) => {
                  const nextEnd = Number(e.target.value);
                  onTrimChange({ startSec: trim.startSec, endSec: nextEnd });
                  if (mediaRef.current) mediaRef.current.currentTime = nextEnd;
                }}
                className="brutal-range flex-1"
                aria-label="Trim end slider"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
