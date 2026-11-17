import { Scissors } from 'lucide-react';
import type { VideoCutMode } from '../types/converter';

interface VideoTrimOptionsProps {
  cutMode: VideoCutMode;
  disabled?: boolean;
  onChange: (mode: VideoCutMode) => void;
}

const CUT_MODES: Array<{ value: VideoCutMode; label: string; hint: string }> = [
  {
    value: 'copy',
    label: 'Fast Copy',
    hint: 'Instant lossless stream copy (keyframe-snapped)',
  },
  {
    value: 'accurate',
    label: 'Accurate',
    hint: 'Re-encode H.264 + AAC for frame-exact cuts',
  },
];

export function VideoTrimOptions({ cutMode, disabled, onChange }: VideoTrimOptionsProps) {
  return (
    <section className="brutal-box p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Scissors className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wide">Video Cut Mode</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Video Cut Mode">
        {CUT_MODES.map((item) => {
          const active = cutMode === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(item.value)}
              className="brutal-btn py-2.5 px-3 text-left cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--primary)' : 'var(--bg)',
                color: active ? '#ffffff' : 'var(--ink)',
              }}
            >
              <div className="font-mono-tabular text-sm font-bold">{item.label}</div>
              <div
                className="text-xs mt-0.5"
                style={{ color: active ? 'oklch(0.95 0.01 188)' : 'var(--muted)' }}
              >
                {item.hint}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
