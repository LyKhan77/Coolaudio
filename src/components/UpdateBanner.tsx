interface UpdateBannerProps {
  updateAvailable: boolean;
  busy?: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function UpdateBanner({ updateAvailable, busy = false, onUpdate, onDismiss }: UpdateBannerProps) {
  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="brutal-surface p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className="font-mono-tabular text-[11px] font-bold px-2 py-0.5 border border-[var(--ink)]"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
        >
          UPDATE READY
        </span>
        <span className="font-medium">
          A new version of Coolaudio is ready.
          {busy && ' Finish your current job before reloading.'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUpdate}
          disabled={busy}
          className="brutal-btn min-h-[44px] px-3 py-2 text-xs font-mono-tabular font-bold uppercase cursor-pointer"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
        >
          RELOAD NOW
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="brutal-btn min-h-[44px] px-3 py-2 text-xs font-mono-tabular font-bold uppercase bg-[var(--bg)] text-[var(--ink)] cursor-pointer"
        >
          LATER
        </button>
      </div>
    </div>
  );
}
