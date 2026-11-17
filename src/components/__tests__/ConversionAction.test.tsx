import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConversionAction } from '../ConversionAction';

afterEach(() => {
  vi.useRealTimers();
});

describe('ConversionAction', () => {
  it('shows stage label, percentage, and ticking elapsed time while converting', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <ConversionAction
        actionLabel="Create Animation"
        status="converting"
        progress={24}
        stageLabel="Step 1/2 · Building GIF color palette…"
        disabled={false}
        onConvert={vi.fn()}
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Step 1/2 · Building GIF color palette…');
    expect(status).toHaveTextContent('00:00 · 24%');

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(status).toHaveTextContent('00:03 · 24%');

    rerender(
      <ConversionAction
        actionLabel="Create Animation"
        status="done"
        progress={100}
        stageLabel="Processing complete"
        disabled={false}
        onConvert={vi.fn()}
      />,
    );
    expect(screen.queryByRole('status')).toBeNull();
  });
});
