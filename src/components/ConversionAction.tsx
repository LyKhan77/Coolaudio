import { useEffect, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { formatTimecode } from '../lib/timecode';
import type { ConversionStatus } from '../types/converter';

interface ConversionActionProps {
  actionLabel: string;
  status: ConversionStatus;
  progress: number;
  stageLabel: string;
  disabled: boolean;
  onConvert: () => void;
}

export function ConversionAction({
  actionLabel,
  status,
  progress,
  stageLabel,
  disabled,
  onConvert,
}: ConversionActionProps) {
  const isBusy = status === 'loading-core' || status === 'converting';
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!isBusy) {
      setElapsedSec(0);
      return;
    }

    setElapsedSec(0);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isBusy]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled || isBusy}
        onClick={onConvert}
        className="brutal-btn w-full py-3.5 px-5 text-base font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
        style={{
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
        }}
      >
        {isBusy ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {status === 'loading-core' ? 'Loading FFmpeg Core…' : `Processing (${progress}%)`}
          </>
        ) : (
          <>
            {actionLabel}
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {isBusy && (
        <div className="brutal-surface p-3 space-y-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className="truncate">{stageLabel || 'Processing…'}</span>
            <span className="font-mono-tabular shrink-0">
              {formatTimecode(elapsedSec)} · {progress}%
            </span>
          </div>
          <div className="w-full h-4 border-2 border-[var(--ink)] bg-[var(--bg)] overflow-hidden">
            <div
              className="h-full transition-[width] duration-150 ease-out"
              style={{
                width: `${Math.max(4, progress)}%`,
                backgroundColor: 'var(--primary)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
