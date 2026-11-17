import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from '../UpdateBanner';

describe('UpdateBanner', () => {
  it('renders nothing when no update is available', () => {
    const { container } = render(
      <UpdateBanner updateAvailable={false} onUpdate={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('triggers onUpdate and onDismiss callbacks', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const onDismiss = vi.fn();

    render(<UpdateBanner updateAvailable={true} onUpdate={onUpdate} onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent(/new version of coolaudio is ready/i);

    await user.click(screen.getByRole('button', { name: /reload now/i }));
    expect(onUpdate).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /later/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables RELOAD NOW while a conversion is running', () => {
    render(<UpdateBanner updateAvailable={true} busy={true} onUpdate={vi.fn()} onDismiss={vi.fn()} />);

    expect(screen.getByRole('button', { name: /reload now/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /later/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent(/finish your current job/i);
  });
});
