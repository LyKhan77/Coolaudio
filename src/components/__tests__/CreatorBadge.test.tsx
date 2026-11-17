import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreatorBadge } from '../CreatorBadge';

// jsdom has no WebGL.
vi.mock('../CreatorVoxel', () => ({ default: () => null }));

describe('CreatorBadge', () => {
  it('toggles the creator tip on click and closes it on Escape or an outside click', async () => {
    const user = userEvent.setup();
    render(<CreatorBadge />);
    const button = screen.getByRole('button', { name: 'About the creator' });
    expect(screen.queryByText('Lee Khan')).toBeNull();

    await user.click(button);
    expect(screen.getByText('Lee Khan')).toBeTruthy();
    expect(screen.getByText('CREATOR')).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('true');

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Lee Khan')).toBeNull();

    await user.click(button);
    await user.click(document.body);
    expect(screen.queryByText('Lee Khan')).toBeNull();
  });
});
