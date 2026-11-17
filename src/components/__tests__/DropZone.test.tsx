import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TOOL_CONFIGS } from '../../lib/toolConfig';
import { DropZone } from '../DropZone';

describe('DropZone', () => {
  it('accepts valid files for active tool and rejects unsupported extensions', () => {
    const onFileSelected = vi.fn();
    const onClear = vi.fn();

    const { container } = render(
      <DropZone
        tool={TOOL_CONFIGS['trim-mp3']}
        source={null}
        onFileSelected={onFileSelected}
        onClear={onClear}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const badFile = new File(['hello'], 'video.mp4', { type: 'video/mp4' });
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/unsupported format/i);

    const goodFile = new File(['mp3-bytes'], 'track.mp3', { type: 'audio/mpeg' });
    fireEvent.change(input, { target: { files: [goodFile] } });

    expect(onFileSelected).toHaveBeenCalledWith(goodFile);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends several valid files to onFilesSelected on batch tools and skips unsupported ones', () => {
    const onFileSelected = vi.fn();
    const onFilesSelected = vi.fn();

    const { container } = render(
      <DropZone
        tool={TOOL_CONFIGS['audio-to-mp3']}
        source={null}
        onFileSelected={onFileSelected}
        onFilesSelected={onFilesSelected}
        onClear={() => {}}
      />,
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(true);

    const a = new File(['a'], 'a.wav', { type: 'audio/wav' });
    const b = new File(['b'], 'b.flac', { type: 'audio/flac' });
    const bad = new File(['c'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [a, b, bad] } });

    expect(onFilesSelected).toHaveBeenCalledWith([a, b], 1);
    expect(onFileSelected).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/1 unsupported file/i);
  });

  it('keeps a single selection on the single-file path, and never allows multiple on trim tools', () => {
    const onFileSelected = vi.fn();
    const onFilesSelected = vi.fn();

    const { container, rerender } = render(
      <DropZone
        tool={TOOL_CONFIGS['audio-to-mp3']}
        source={null}
        onFileSelected={onFileSelected}
        onFilesSelected={onFilesSelected}
        onClear={() => {}}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const a = new File(['a'], 'a.wav', { type: 'audio/wav' });
    fireEvent.change(input, { target: { files: [a] } });
    expect(onFileSelected).toHaveBeenCalledWith(a);
    expect(onFilesSelected).not.toHaveBeenCalled();

    rerender(
      <DropZone
        tool={TOOL_CONFIGS['trim-mp3']}
        source={null}
        onFileSelected={onFileSelected}
        onFilesSelected={onFilesSelected}
        onClear={() => {}}
      />,
    );
    const trimInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(trimInput.multiple).toBe(false);
  });
});
