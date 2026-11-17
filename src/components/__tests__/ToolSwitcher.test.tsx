import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToolSwitcher } from '../ToolSwitcher';

describe('ToolSwitcher', () => {
  it('renders all 6 tools and switches active tool on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<ToolSwitcher activeMode="mp4-to-mp3" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'MP4 → MP3' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Trim MP4' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Compress MP4' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Video → GIF' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Trim MP3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Audio → MP3' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Trim MP4' }));
    expect(onChange).toHaveBeenCalledWith('trim-mp4');
  });
});
