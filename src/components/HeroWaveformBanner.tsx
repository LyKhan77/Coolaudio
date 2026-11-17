import { useEffect, useRef } from 'react';

interface HeroWaveformBannerProps {
  isProcessing?: boolean;
}

const BAR_COUNT = 64;

export function HeroWaveformBanner({ isProcessing = false }: HeroWaveformBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let t = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const stepW = canvas.width / BAR_COUNT;

      for (let i = 0; i < BAR_COUNT; i++) {
        const amp =
          0.22 + 0.52 * Math.abs(Math.sin(i * 0.22 + t) * Math.cos(i * 0.08 - t * 0.45));
        const h = amp * (canvas.height - 28);
        const x = i * stepW + 3;
        const y = (canvas.height - h) / 2;

        if (i % 8 === 0) {
          ctx.fillStyle = 'rgba(255, 90, 31, 0.22)';
        } else if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(31, 75, 255, 0.16)';
        } else {
          ctx.fillStyle = 'rgba(15, 19, 34, 0.07)';
        }

        ctx.fillRect(x, y, Math.max(4, stepW - 6), h);
      }

      if (!reduced) {
        t += isProcessing ? 0.04 : 0.018;
        rafId = window.requestAnimationFrame(draw);
      }
    };

    draw();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [isProcessing]);

  return (
    <section className="brutal-box relative overflow-hidden p-5 sm:p-7">
      <canvas
        ref={canvasRef}
        width={920}
        height={170}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative z-10 space-y-2.5">
        <span className="font-mono-tabular text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] block">
          COOLAUDIO · 0 KB UPLOADED · 100% ON-DEVICE STUDIO
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-[1.03] max-w-xl">
          Convert &amp; slice media on the beat.
        </h2>
        <p className="text-sm sm:text-base text-[var(--muted)] max-w-2xl leading-relaxed">
          Extract MP3s from MP4, trim video or audio clips with sample-accurate precision, and
          embed ID3v2.3 tags directly inside your browser.
        </p>
      </div>
    </section>
  );
}
