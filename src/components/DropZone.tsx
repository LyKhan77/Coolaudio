import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileAudio2, FileVideo, RefreshCw, Upload } from 'lucide-react';
import { largeFileThresholdBytes } from '../lib/deviceLimits';
import { isSupportedFileForTool } from '../lib/ffmpegArgs';
import { formatBytes, formatTimecode } from '../lib/timecode';
import type { ToolConfig } from '../lib/toolConfig';
import type { MediaSourceFile } from '../types/converter';

interface DropZoneProps {
  tool: ToolConfig;
  source: MediaSourceFile | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  /** Called instead of onFileSelected when a batch-capable tool receives 2 or more valid files. */
  onFilesSelected?: (files: File[], skippedUnsupported: number) => void;
  onClear: () => void;
}

export function DropZone({
  tool,
  source,
  disabled,
  onFileSelected,
  onFilesSelected,
  onClear,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValidationError(null);
  }, [tool.id]);

  const handleCandidateFiles = (candidates: File[]) => {
    if (candidates.length === 0) return;
    const valid = candidates.filter((file) => isSupportedFileForTool(file, tool));
    if (valid.length === 0) {
      setValidationError(tool.invalidFileMessage);
      return;
    }

    const skipped = candidates.length - valid.length;
    setValidationError(
      skipped > 0 && tool.supportsBatch
        ? `${skipped} unsupported file${skipped === 1 ? '' : 's'} skipped.`
        : null,
    );

    if (tool.supportsBatch && valid.length > 1 && onFilesSelected) {
      onFilesSelected(valid, skipped);
    } else {
      onFileSelected(valid[0]);
    }
  };

  if (source) {
    const isLarge = source.file.size > largeFileThresholdBytes();
    const Icon = tool.mediaKind === 'video' ? FileVideo : FileAudio2;

    return (
      <div className="space-y-3">
        <div className="brutal-surface p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-[var(--ink)]"
              style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm sm:text-base truncate">{source.file.name}</p>
              <p className="font-mono-tabular text-xs text-[var(--muted)] mt-0.5">
                {formatBytes(source.file.size)} ·{' '}
                {source.durationSec > 0 ? formatTimecode(source.durationSec) : 'Reading duration…'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="brutal-btn bg-[var(--bg)] text-[var(--ink)] px-3 py-2 pointer-coarse:min-h-11 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Replace
          </button>
        </div>

        {isLarge && (
          <div
            className="border-2 border-[var(--ink)] p-3 flex items-start gap-2.5 text-xs"
            style={{ backgroundColor: 'var(--warning-bg)' }}
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Large file detected ({formatBytes(source.file.size)}). The browser holds several copies
              in memory while processing, so this may fail on this device. Keep this tab open and,
              if it fails, trim the clip first or try a desktop browser.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Select or drop file for ${tool.label}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) {
            handleCandidateFiles(Array.from(e.dataTransfer.files ?? []));
          }
        }}
        className="brutal-box p-8 sm:p-12 text-center cursor-pointer transition-colors"
        style={{
          backgroundColor: dragActive ? 'var(--accent)' : 'var(--surface)',
          color: dragActive ? '#ffffff' : 'var(--ink)',
          borderStyle: dragActive ? 'solid' : 'dashed',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={tool.accept}
          multiple={Boolean(tool.supportsBatch)}
          className="hidden"
          onChange={(e) => {
            handleCandidateFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />

        <div
          className="w-12 h-12 mx-auto mb-4 flex items-center justify-center border-2 border-[var(--ink)] bg-[var(--bg)]"
          style={{ boxShadow: '3px 3px 0 var(--ink)' }}
        >
          <Upload className="w-5 h-5" />
        </div>

        <p className="text-base sm:text-lg font-bold">
          {dragActive ? 'Drop file here' : tool.dropPrompt}
        </p>
        <p className="font-mono-tabular text-xs text-[var(--muted)] mt-2">{tool.formatsHint}</p>
        {tool.supportsBatch && (
          <p className="font-mono-tabular text-xs text-[var(--muted)] mt-1">
            SELECT SEVERAL FILES TO CONVERT THEM IN ONE BATCH
          </p>
        )}
      </div>

      {validationError && (
        <div
          role="alert"
          className="border-2 border-[var(--ink)] p-3 text-sm font-medium"
          style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          {validationError}
        </div>
      )}
    </div>
  );
}
