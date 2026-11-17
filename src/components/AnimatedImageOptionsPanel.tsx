import { Film } from 'lucide-react';
import { MAX_ANIMATED_SEC } from '../lib/ffmpegArgs';
import type { AnimatedImageOptions } from '../types/converter';

interface AnimatedImageOptionsPanelProps {
  options: AnimatedImageOptions;
  /** Duration that will be encoded (trimmed range if trimmed). 0 while still unknown. */
  durationSec: number;
  disabled?: boolean;
  onChange: (options: AnimatedImageOptions) => void;
}

const FORMATS: Array<{ value: AnimatedImageOptions['format']; label: string; hint: string }> = [
  { value: 'gif', label: 'GIF', hint: 'Works everywhere, larger files' },
  { value: 'webp', label: 'WebP', hint: 'Much smaller, modern apps' },
];
const FPS_VALUES: Array<AnimatedImageOptions['fps']> = [10, 12, 15];
const WIDTH_VALUES: Array<AnimatedImageOptions['widthPx']> = [320, 480, 640];

interface ChoiceGroupProps<T extends string | number> {
  label: string;
  values: Array<{ value: T; label: string; hint?: string }>;
  selected: T;
  disabled?: boolean;
  columns: string;
  onSelect: (value: T) => void;
}

function ChoiceGroup<T extends string | number>({
  label,
  values,
  selected,
  disabled,
  columns,
  onSelect,
}: ChoiceGroupProps<T>) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase">{label}</h3>
      <div className={`grid ${columns} gap-3`} role="radiogroup" aria-label={label}>
        {values.map((item) => {
          const active = selected === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onSelect(item.value)}
              className="brutal-btn py-2.5 px-3 min-h-11 text-left cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--primary)' : 'var(--bg)',
                color: active ? '#ffffff' : 'var(--ink)',
              }}
            >
              <div className="font-mono-tabular text-sm font-bold">{item.label}</div>
              {item.hint && (
                <div
                  className="text-xs mt-0.5"
                  style={{ color: active ? 'oklch(0.95 0.01 188)' : 'var(--muted)' }}
                >
                  {item.hint}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AnimatedImageOptionsPanel({
  options,
  durationSec,
  disabled,
  onChange,
}: AnimatedImageOptionsPanelProps) {
  const tooLong = durationSec > MAX_ANIMATED_SEC;

  return (
    <section className="brutal-box p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Film className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wide">Animation Settings</h2>
      </div>

      <ChoiceGroup
        label="Format"
        values={FORMATS}
        selected={options.format}
        disabled={disabled}
        columns="grid-cols-2"
        onSelect={(format) => onChange({ ...options, format })}
      />
      <ChoiceGroup
        label="Frame rate"
        values={FPS_VALUES.map((v) => ({ value: v, label: `${v} fps` }))}
        selected={options.fps}
        disabled={disabled}
        columns="grid-cols-3"
        onSelect={(fps) => onChange({ ...options, fps })}
      />
      <ChoiceGroup
        label="Width"
        values={WIDTH_VALUES.map((v) => ({ value: v, label: `${v} px` }))}
        selected={options.widthPx}
        disabled={disabled}
        columns="grid-cols-3"
        onSelect={(widthPx) => onChange({ ...options, widthPx })}
      />

      <p
        role={tooLong ? 'alert' : undefined}
        className="font-mono-tabular text-xs"
        style={{ color: tooLong ? 'var(--danger)' : 'var(--muted)' }}
      >
        {tooLong
          ? `Clip is too long. Trim it to ${MAX_ANIMATED_SEC} seconds or less.`
          : 'Short clips and lower fps/width keep the file small. Smaller sources are never upscaled.'}
      </p>
    </section>
  );
}
