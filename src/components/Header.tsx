import type { ConversionStatus } from '../types/converter';
import { CreatorBadge } from './CreatorBadge';

interface HeaderProps {
  subtitle: string;
  status: ConversionStatus;
  progress: number;
}

export function Header({ subtitle, status, progress }: HeaderProps) {
  let badgeText = 'READY';
  let badgeBg = 'var(--surface)';
  let badgeColor = 'var(--ink)';

  if (status === 'loading-core' || status === 'converting') {
    badgeText = status === 'loading-core' ? 'LOADING ENGINE…' : `CONVERTING ${progress}%`;
    badgeBg = 'var(--accent)';
    badgeColor = '#ffffff';
  } else if (status === 'error') {
    badgeText = 'ERROR';
    badgeBg = 'var(--danger)';
    badgeColor = '#ffffff';
  } else if (status === 'done') {
    badgeText = 'DONE';
    badgeBg = 'var(--primary)';
    badgeColor = '#ffffff';
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 border-[var(--ink)]">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase">
            COOLAUDIO
          </h1>
          <span
            className="font-mono-tabular text-xs font-bold px-2 py-0.5 border-2 border-[var(--ink)]"
            style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}
          >
            LOCAL WASM
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
      </div>

      {/* ml-auto keeps the group, and the tip anchored to it, on the right when the header wraps */}
      <div className="flex items-center gap-3 ml-auto">
        <div
          className="font-mono-tabular text-xs font-bold px-3 py-1.5 border-2 border-[var(--ink)]"
          style={{ backgroundColor: badgeBg, color: badgeColor }}
          aria-live="polite"
        >
          {badgeText}
        </div>

        <CreatorBadge />
      </div>
    </header>
  );
}
