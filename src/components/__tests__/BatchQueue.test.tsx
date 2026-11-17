import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TOOL_CONFIGS } from '../../lib/toolConfig';
import type { BatchItem } from '../../types/converter';
import { BatchQueue } from '../BatchQueue';

function item(partial: Partial<BatchItem> & { name: string }): BatchItem {
  const { name, ...rest } = partial;
  return {
    id: name,
    file: new File(['x'.repeat(2048)], name),
    durationSec: 30,
    status: 'queued',
    progress: 0,
    ...rest,
  };
}

const handlers = () => ({
  onAddFiles: vi.fn(),
  onRemove: vi.fn(),
  onStart: vi.fn(),
  onCancel: vi.fn(),
  onClear: vi.fn(),
  onDownloadZip: vi.fn(),
});

const doneResult = (name: string) => ({
  kind: 'audio' as const,
  url: `blob:${name}`,
  blob: new Blob(['y']),
  filename: `${name}.mp3`,
  sizeBytes: 1024,
  durationSec: 30,
  specLabel: 'MP3 · 192 kbps',
});

describe('BatchQueue', () => {
  it('lists files, starts the batch, and removes a queued file', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(
      <BatchQueue
        tool={TOOL_CONFIGS['audio-to-mp3']}
        items={[item({ name: 'a.wav' }), item({ name: 'b.wav' })]}
        running={false}
        {...h}
      />,
    );

    expect(screen.getByText('a.wav')).toBeInTheDocument();
    expect(screen.getByText('b.wav')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /convert 2 files/i }));
    expect(h.onStart).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /remove a\.wav/i }));
    expect(h.onRemove).toHaveBeenCalledWith('a.wav');
  });

  it('shows progress for running files, cancel, and disables other actions while running', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(
      <BatchQueue
        tool={TOOL_CONFIGS['audio-to-mp3']}
        items={[item({ name: 'a.wav', status: 'running', progress: 40 }), item({ name: 'b.wav' })]}
        running
        {...h}
      />,
    );

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convert/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove a\.wav/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(h.onCancel).toHaveBeenCalled();
  });

  it('offers per-file downloads and a ZIP once files are done, and retries failures', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(
      <BatchQueue
        tool={TOOL_CONFIGS['audio-to-mp3']}
        items={[
          item({ name: 'a.wav', status: 'done', progress: 100, result: doneResult('a') }),
          item({ name: 'bad.wav', status: 'error', error: 'boom' }),
        ]}
        running={false}
        {...h}
      />,
    );

    const row = screen.getByText('a.wav').closest('li') as HTMLElement;
    const link = within(row).getByRole('link', { name: /download/i });
    expect(link).toHaveAttribute('href', 'blob:a');
    expect(link).toHaveAttribute('download', 'a.mp3');

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 done · 1 failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry 1 failed/i }));
    expect(h.onStart).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /download all/i }));
    expect(h.onDownloadZip).toHaveBeenCalled();
  });
});
