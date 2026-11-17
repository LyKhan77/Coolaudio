import { useEffect, useState } from 'react';

interface BeatGridStripProps {
  isProcessing?: boolean;
}

const STEP_COUNT = 16;

export function BeatGridStrip({ isProcessing = false }: BeatGridStripProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setActiveStep(0);
      return;
    }

    const intervalMs = isProcessing ? 170 : 280;
    const id = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEP_COUNT);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [isProcessing]);

  return (
    <div
      className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 w-full pointer-events-none select-none"
      aria-hidden="true"
    >
      {Array.from({ length: STEP_COUNT }, (_, idx) => {
        const isLit = idx === activeStep;
        const isDownbeat = idx % 4 === 0;
        return (
          <div
            key={idx}
            className={`beat-cell min-w-0${isLit ? ' lit' : ''}${isDownbeat ? ' downbeat' : ''}`}
          />
        );
      })}
    </div>
  );
}
