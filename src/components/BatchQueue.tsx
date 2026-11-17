import { useRef } from 'react';
import { AlertTriangle, Download, FilePlus2, Loader2, Play, Square, Trash2, X } from 'lucide-react';
import { MAX_BATCH_FILES } from '../lib/batchQueue';
import { formatBytes } from '../lib/timecode';
import type { ToolConfig } from '../lib/toolConfig';
import type { BatchItem } from '../types/converter';

interface BatchQueueProps {
  tool: ToolConfig;
  items: BatchItem[];
  running: boolean;
  /** Message shown above the list, e.g. about skipped files. */
  notice?: string | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onCancel: () => void;
  onClear: () => void;
  onDownloadZip: () => void;
}

const STATUS_LABEL: Record<BatchItem['status'], string> = {
  queued: 'QUEUED',
  running: 'RUNNING',
  done: 'DONE',
  error: 'FAILED',
};

const BTN = 'brutal-btn min-h-11 px-4 py-2 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer';

export function BatchQueue({
  tool,
  items,
  running,
  notice,
  onAddFiles,
  onRemove,
  onStart,
  onCancel,
  onClear,
  onDownloadZip,
}: BatchQueueProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const queued = items.filter((item) => item.status === 'queued').length;
  const failed = items.filter((item) => item.status === 'error').length;
  const done = items.filter((item) => item.status === 'done').length;
  const pending = queued + failed;
  const startLabel =
    queued === 0 && failed > 0
      ? `Retry ${failed} failed`
      : `Convert ${pending} file${pending === 1 ? '' : 's'}`;

  return (
    <section className="brutal-box p-4 sm:p-5 space-y-4" aria-label="Batch queue">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide">Batch Queue</h2>
        <p className="font-mono-tabular text-xs font-bold text-[var(--muted)]">
          {done} of {items.length} done{failed > 0 ? ` · ${failed} failed` : ''}
        </p>
      </div>

      {notice && (
        <div
          className="border-2 border-[var(--ink)] p-3 flex items-start gap-2.5 text-xs"
          style={{ backgroundColor: 'var(--warning-bg)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="border-2 border-[var(--ink)] bg-[var(--bg)] p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{item.file.name}</p>
                <p className="font-mono-tabular text-xs text-[var(--muted)] mt-0.5">
                  {formatBytes(item.file.size)}
                  {item.result ? ` → ${formatBytes(item.result.sizeBytes)}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 border-2 border-[var(--ink)]"
                  style={{
                    backgroundColor:
                      item.status === 'done'
                        ? 'var(--primary)'
                        : item.status === 'error'
                          ? 'var(--danger)'
                          : item.status === 'running'
                            ? 'var(--accent)'
                            : 'var(--surface)',
                    color: item.status === 'queued' ? 'var(--ink)' : '#ffffff',
                  }}
                >
                  {STATUS_LABEL[item.status]}
                </span>

                {item.status !== 'running' && (
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.file.name}`}
                    className="brutal-btn w-9 h-9 pointer-coarse:w-11 pointer-coarse:h-11 bg-[var(--bg)] flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {item.status === 'running' && (
              <div className="space-y-1">
                {item.stageLabel && (
                  <p className="font-mono-tabular text-[11px] text-[var(--muted)] truncate">
                    {item.stageLabel}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className="flex-1 h-3 border-2 border-[var(--ink)] bg-[var(--bg)] overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.progress}
                  >
                    <div
                      className="h-full"
                      style={{ width: `${Math.max(4, item.progress)}%`, backgroundColor: 'var(--primary)' }}
                    />
                  </div>
                  <span className="font-mono-tabular text-xs font-bold">{item.progress}%</span>
                </div>
              </div>
            )}

            {item.status === 'error' && item.error && (
              <p className="text-xs font-bold" style={{ color: 'var(--danger)' }}>
                {item.error}
              </p>
            )}

            {item.status === 'done' && item.result && (
              <a
                href={item.result.url}
                download={item.result.filename}
                className="brutal-btn min-h-11 px-3 py-2 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 no-underline"
                style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
              >
                <Download className="w-4 h-4" />
                Download {item.result.filename}
              </a>
            )}
          </li>
        ))}
      </ul>

      <input
        ref={inputRef}
        type="file"
        accept={tool.accept}
        multiple
        className="hidden"
        onChange={(e) => {
          onAddFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap gap-3">
        {running ? (
          <button
            type="button"
            onClick={onCancel}
            className={BTN}
            style={{ backgroundColor: 'var(--danger)', color: '#ffffff' }}
          >
            <Square className="w-4 h-4" />
            Cancel
          </button>
        ) : (
          pending > 0 && (
            <button
              type="button"
              onClick={onStart}
              className={BTN}
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
            >
              <Play className="w-4 h-4" />
              {startLabel}
            </button>
          )
        )}

        {running && (
          <span className="flex items-center gap-2 font-mono-tabular text-xs text-[var(--muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Keep this tab open
          </span>
        )}

        <button
          type="button"
          disabled={running || items.length >= MAX_BATCH_FILES}
          onClick={() => inputRef.current?.click()}
          className={`${BTN} bg-[var(--bg)] text-[var(--ink)]`}
        >
          <FilePlus2 className="w-4 h-4" />
          Add files
        </button>

        {done > 0 && (
          <button
            type="button"
            disabled={running}
            onClick={onDownloadZip}
            className={`${BTN} bg-[var(--bg)] text-[var(--ink)]`}
          >
            <Download className="w-4 h-4" />
            Download all (ZIP)
          </button>
        )}

        <button
          type="button"
          disabled={running}
          onClick={onClear}
          className={`${BTN} bg-[var(--bg)] text-[var(--ink)] sm:ml-auto`}
        >
          <Trash2 className="w-4 h-4" />
          Clear all
        </button>
      </div>

      <p className="font-mono-tabular text-[11px] text-[var(--muted)]">
        Up to {MAX_BATCH_FILES} files. Finished files stay in browser memory until you clear them.
      </p>
    </section>
  );
}
