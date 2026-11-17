import { lazy, Suspense, useEffect, useRef, useState } from 'react';

// Lazy so three.js stays out of the initial bundle; fall back to the static avatar if offline.
const CreatorVoxel = lazy(() =>
  import('./CreatorVoxel').catch(() => ({
    default: ({ fallbackSrc, alt }: { fallbackSrc: string; alt: string }) => (
      <img src={fallbackSrc} alt={alt} className="w-full h-full object-cover object-top" />
    ),
  })),
);

export function CreatorBadge() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="creator-tip"
        aria-label="About the creator"
        className="block w-16 h-16 border-2 border-[var(--ink)] bg-[var(--bg)] overflow-hidden cursor-pointer"
        style={{ boxShadow: '2px 2px 0 var(--ink)' }}
      >
        <Suspense
          fallback={
            <img src="/lee-anime.png" alt="" className="w-full h-full object-cover object-top" />
          }
        >
          <CreatorVoxel fallbackSrc="/lee-anime.png" alt="Lee Khan" />
        </Suspense>
      </button>

      {open && (
        <div
          id="creator-tip"
          className="absolute right-0 top-full mt-3 z-20 w-60 border-2 border-[var(--ink)] bg-[var(--surface)] p-3 text-left"
          style={{ boxShadow: '4px 4px 0 var(--ink)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Lee Khan</span>
            <span
              className="font-mono-tabular text-[10px] font-bold px-1.5 py-0.5 border border-[var(--ink)] text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              CREATOR
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">
            &ldquo;No regrets, just lessons in my flow.&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
