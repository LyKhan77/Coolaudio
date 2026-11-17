import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';

describe('App source objectUrl lifecycle', () => {
  const createObjectURL = vi.fn(() => 'blob:mock-source-url');
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not revoke the source objectUrl when duration metadata loads', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Trim MP3' }));

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mp3File = new File(['mp3-data'], 'demo.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [mp3File] } });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();

    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio).toBeTruthy();

    Object.defineProperty(audio, 'duration', { value: 42, configurable: true });
    fireEvent.loadedMetadata(audio);

    expect(screen.getByText('CLIP 00:42 / 00:42')).toBeInTheDocument();
    expect(revokeObjectURL).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /replace/i }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-source-url');
  });
});
