import { Minimize2 } from 'lucide-react';
import { computeTargetBitrates, estimateSourceKbps } from '../lib/ffmpegArgs';

interface TargetSizeOptionsProps {
  targetSizeMB: number;
  /** Duration that will be encoded (trimmed range if trimmed). 0 while still unknown. */
  durationSec: number;
  /** Full source duration, used with the file size to cap the video bitrate. */
  sourceDurationSec: number;
  sourceSizeBytes: number;
  disabled?: boolean;
  onChange: (targetSizeMB: number) => void;
}

const PRESETS = [8, 10, 25, 50];

export function TargetSizeOptions({
  targetSizeMB,
  durationSec,
  sourceDurationSec,
  sourceSizeBytes,
  disabled,
  onChange,
}: TargetSizeOptionsProps) {
  const { videoKbps, feasible } = computeTargetBitrates({
    targetMB: targetSizeMB,
    durationSec,
    sourceKbps: estimateSourceKbps(sourceSizeBytes, sourceDurationSec),
  });
  const alreadySmaller = targetSizeMB > 0 && sourceSizeBytes > 0 && sourceSizeBytes <= targetSizeMB * 1e6;

  return (
    <section className="brutal-box p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Minimize2 className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wide">Target Size</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-label="Target size presets">
        {PRESETS.map((mb) => {
          const active = targetSizeMB === mb;
          return (
            <button
              key={mb}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(mb)}
              className="brutal-btn py-2.5 px-3 min-h-11 text-left cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--primary)' : 'var(--bg)',
                color: active ? '#ffffff' : 'var(--ink)',
              }}
            >
              <span className="font-mono-tabular text-sm font-bold">{mb} MB</span>
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor="target-size-mb" className="block text-xs font-bold uppercase mb-1">
          Custom size (MB)
        </label>
        <input
          id="target-size-mb"
          type="number"
          inputMode="decimal"
          min={1}
          step="any"
          disabled={disabled}
          value={targetSizeMB > 0 ? targetSizeMB : ''}
          onChange={(e) => onChange(Number(e.target.value))}
          className="brutal-input w-full sm:w-40 px-3 py-2.5 text-sm"
        />
      </div>

      <p
        role={feasible || durationSec === 0 ? undefined : 'alert'}
        className="font-mono-tabular text-xs"
        style={{ color: feasible || durationSec === 0 ? 'var(--muted)' : 'var(--danger)' }}
      >
        {durationSec === 0
          ? 'Reading video length...'
          : !feasible
            ? 'Target is too small for this video length. Increase the size or use a shorter video.'
            : alreadySmaller
              ? `Source is already under ${targetSizeMB} MB; re-encoding may not help. Video ~${videoKbps} kbps.`
              : `Video ~${videoKbps} kbps. Final size is approximate and may land a bit under the target.`}
      </p>
    </section>
  );
}
