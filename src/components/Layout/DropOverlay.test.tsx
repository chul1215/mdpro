import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/export/import', () => ({
  readMarkdownFiles: vi.fn(async () => ({
    imported: [{ title: '드롭 문서', content: '# 드롭' }],
    errors: [],
  })),
}));

const createDocument = vi.fn(async () => 'drop-id');
const switchTo = vi.fn(async () => undefined);
const mockDoc = { createDocument, switchTo };
vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: typeof mockDoc) => T) => selector(mockDoc),
}));

import { DropOverlay } from './DropOverlay';
import { readMarkdownFiles } from '../../lib/export/import';

// jsdom은 DragEvent + DataTransfer를 완전 구현하지 않으므로 Event에 수동으로 dataTransfer를 주입한다.
function makeDragEvent(type: string, files: File[] = []): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const dataTransfer = {
    types: ['Files'],
    files: {
      length: files.length,
      item: (i: number) => files[i] ?? null,
      [Symbol.iterator]: function* () {
        for (const f of files) yield f;
      },
    } as unknown as FileList,
    dropEffect: 'none',
  };
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  return event;
}

describe('DropOverlay', () => {
  beforeEach(() => {
    vi.mocked(readMarkdownFiles).mockClear();
    vi.mocked(readMarkdownFiles).mockResolvedValue({
      imported: [{ title: '드롭 문서', content: '# 드롭' }],
      errors: [],
    });
    createDocument.mockClear();
    switchTo.mockClear();
  });

  it('does not render overlay initially', () => {
    render(<DropOverlay />);
    expect(screen.queryByText('마크다운 파일을 놓으세요')).not.toBeInTheDocument();
  });

  it('shows overlay on dragenter with Files type', async () => {
    render(<DropOverlay />);
    act(() => {
      window.dispatchEvent(makeDragEvent('dragenter'));
    });
    await waitFor(() => {
      expect(screen.getByText('마크다운 파일을 놓으세요')).toBeInTheDocument();
    });
  });

  it('hides overlay when dragleave counter reaches zero', async () => {
    render(<DropOverlay />);
    act(() => {
      window.dispatchEvent(makeDragEvent('dragenter'));
    });
    await waitFor(() => expect(screen.getByText('마크다운 파일을 놓으세요')).toBeInTheDocument());
    act(() => {
      window.dispatchEvent(makeDragEvent('dragleave'));
    });
    await waitFor(() => {
      expect(screen.queryByText('마크다운 파일을 놓으세요')).not.toBeInTheDocument();
    });
  });

  it('calls createDocument on drop with imported file', async () => {
    render(<DropOverlay />);
    const file = new File(['# 드롭'], 'dropped.md', { type: 'text/markdown' });
    act(() => {
      window.dispatchEvent(makeDragEvent('dragenter', [file]));
    });
    await act(async () => {
      window.dispatchEvent(makeDragEvent('drop', [file]));
    });
    await waitFor(() => {
      expect(readMarkdownFiles).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(createDocument).toHaveBeenCalledWith({
        title: '드롭 문서',
        content: '# 드롭',
      });
    });
    expect(switchTo).toHaveBeenCalledWith('drop-id');
  });
});
