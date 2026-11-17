import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EncodingOptions } from '../EncodingOptions';

describe('EncodingOptions', () => {
  it('switches bitrate and updates ID3 metadata fields', async () => {
    const user = userEvent.setup();
    const onBitrateChange = vi.fn();
    const onMetadataChange = vi.fn();

    render(
      <EncodingOptions
        bitrate={192}
        metadata={{ title: 'Demo', artist: '', album: '' }}
        onBitrateChange={onBitrateChange}
        onMetadataChange={onMetadataChange}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /320 kbps/i }));
    expect(onBitrateChange).toHaveBeenCalledWith(320);

    const artistInput = screen.getByLabelText(/artist/i);
    await user.type(artistInput, 'A');
    expect(onMetadataChange).toHaveBeenCalledWith({
      title: 'Demo',
      artist: 'A',
      album: '',
    });
  });
});
