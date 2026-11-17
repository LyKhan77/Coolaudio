import { SlidersHorizontal, Tag } from 'lucide-react';
import type { BitrateOption, Id3Metadata } from '../types/converter';

interface EncodingOptionsProps {
  bitrate: BitrateOption;
  metadata: Id3Metadata;
  disabled?: boolean;
  /** In batch mode each file's title comes from its file name, so the shared Title field is hidden. */
  hideTitle?: boolean;
  onBitrateChange: (bitrate: BitrateOption) => void;
  onMetadataChange: (metadata: Id3Metadata) => void;
}

const BITRATES: Array<{ value: BitrateOption; label: string; hint: string }> = [
  { value: 128, label: '128 kbps', hint: 'Compact' },
  { value: 192, label: '192 kbps', hint: 'Balanced' },
  { value: 320, label: '320 kbps', hint: 'Studio' },
];

export function EncodingOptions({
  bitrate,
  metadata,
  disabled,
  hideTitle,
  onBitrateChange,
  onMetadataChange,
}: EncodingOptionsProps) {
  return (
    <section className="brutal-box p-4 sm:p-5 space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          <h2 className="text-sm font-bold uppercase tracking-wide">MP3 Bitrate</h2>
        </div>

        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="MP3 Bitrate">
          {BITRATES.map((item) => {
            const active = bitrate === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => onBitrateChange(item.value)}
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
      </div>

      <div className="border-t-2 border-[var(--ink)] pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4" />
            <h2 className="text-sm font-bold uppercase tracking-wide">ID3 Metadata Tags</h2>
          </div>
          <span className="font-mono-tabular text-[11px] text-[var(--muted)]">ID3v2.3</span>
        </div>

        <div className={`grid grid-cols-1 gap-3 ${hideTitle ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {!hideTitle && (
          <div>
            <label htmlFor="id3-title" className="block text-xs font-bold uppercase mb-1">
              Title
            </label>
            <input
              id="id3-title"
              type="text"
              disabled={disabled}
              value={metadata.title}
              onChange={(e) => onMetadataChange({ ...metadata, title: e.target.value })}
              placeholder="Track title"
              className="brutal-input w-full px-3 py-2 text-sm"
            />
          </div>
          )}

          <div>
            <label htmlFor="id3-artist" className="block text-xs font-bold uppercase mb-1">
              Artist
            </label>
            <input
              id="id3-artist"
              type="text"
              disabled={disabled}
              value={metadata.artist}
              onChange={(e) => onMetadataChange({ ...metadata, artist: e.target.value })}
              placeholder="Artist name"
              className="brutal-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="id3-album" className="block text-xs font-bold uppercase mb-1">
              Album
            </label>
            <input
              id="id3-album"
              type="text"
              disabled={disabled}
              value={metadata.album}
              onChange={(e) => onMetadataChange({ ...metadata, album: e.target.value })}
              placeholder="Album (optional)"
              className="brutal-input w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
