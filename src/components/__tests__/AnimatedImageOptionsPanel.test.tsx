import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnimatedImageOptionsPanel } from '../AnimatedImageOptionsPanel';

const options = { format: 'gif', fps: 12, widthPx: 480 } as const;

describe('AnimatedImageOptionsPanel', () => {
  it('changes format, fps and width while keeping the other settings', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<AnimatedImageOptionsPanel options={options} durationSec={10} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /WebP/ }));
    expect(onChange).toHaveBeenLastCalledWith({ ...options, format: 'webp' });

    await user.click(screen.getByRole('radio', { name: '15 fps' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...options, fps: 15 });

    await user.click(screen.getByRole('radio', { name: '640 px' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...options, widthPx: 640 });
  });

  it('shows an alert when the clip is over the max length', () => {
    render(<AnimatedImageOptionsPanel options={options} durationSec={45} onChange={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/too long/i);
  });
});
