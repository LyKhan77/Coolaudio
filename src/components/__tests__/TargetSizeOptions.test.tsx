import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TargetSizeOptions } from '../TargetSizeOptions';

describe('TargetSizeOptions', () => {
  it('selects a preset and reports the estimated video bitrate', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TargetSizeOptions
        targetSizeMB={8}
        durationSec={60}
        sourceDurationSec={60}
        sourceSizeBytes={50_000_000}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('radio', { name: '8 MB' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/Video ~885 kbps/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '25 MB' }));
    expect(onChange).toHaveBeenCalledWith(25);
  });

  it('warns when the target is infeasible for the duration', () => {
    render(
      <TargetSizeOptions
        targetSizeMB={1}
        durationSec={600}
        sourceDurationSec={600}
        sourceSizeBytes={50_000_000}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/too small/i);
  });

  it('warns when the source is already under the target', () => {
    render(
      <TargetSizeOptions
        targetSizeMB={25}
        durationSec={60}
        sourceDurationSec={60}
        sourceSizeBytes={5_000_000}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(/already under 25 MB/i)).toBeInTheDocument();
  });
});
