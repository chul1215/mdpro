import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadMarkdown } from './markdown';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

type ClickSpy = ReturnType<typeof vi.fn>;

type DownloadCapture = {
  blob: Blob | null;
  filename: string | null;
  objectUrlCreated: number;
  objectUrlRevoked: number;
  clickSpy: ClickSpy;
};

function setupDownload(): DownloadCapture {
  const capture: DownloadCapture = {
    blob: null,
    filename: null,
    objectUrlCreated: 0,
    objectUrlRevoked: 0,
    clickSpy: vi.fn(),
  };

  // jsdom은 URL.createObjectURL/revokeObjectURL을 구현하지 않으므로 stub을 먼저 심는다.
  if (typeof URL.createObjectURL !== 'function') {
    (URL as unknown as { createObjectURL: (o: Blob) => string }).createObjectURL = () => '';
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }

  vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
    capture.objectUrlCreated += 1;
    if (obj instanceof Blob) capture.blob = obj;
    return 'blob:mock-url';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
    capture.objectUrlRevoked += 1;
  });

  // a.click()은 jsdom에서 no-op이지만 파일명 캡처를 위해 spy로 감싼다.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    capture.filename = this.getAttribute('download');
    capture.clickSpy();
  });

  return capture;
}

describe('downloadMarkdown', () => {
  let capture: DownloadCapture;

  beforeEach(() => {
    capture = setupDownload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads as <title>.md with text/markdown mime', async () => {
    downloadMarkdown({ title: '안녕', content: '# 안녕\n\n본문' });
    expect(capture.clickSpy).toHaveBeenCalledTimes(1);
    expect(capture.filename).toBe('안녕.md');
    expect(capture.blob).not.toBeNull();
    expect(capture.blob!.type).toBe('text/markdown;charset=utf-8');
    // jsdom은 Blob.text()/Response 변환을 제대로 지원하지 않으므로 FileReader로 읽는다.
    const text = await readBlobAsText(capture.blob!);
    expect(text).toBe('# 안녕\n\n본문');
    expect(capture.objectUrlCreated).toBe(1);
    expect(capture.objectUrlRevoked).toBe(1);
  });

  it('replaces forbidden filename characters with underscore', () => {
    downloadMarkdown({ title: 'a/b\\c:d*e?f"g<h>i|j', content: 'x' });
    expect(capture.filename).toBe('a_b_c_d_e_f_g_h_i_j.md');
  });

  it('falls back to "제목 없음.md" when title is empty', () => {
    downloadMarkdown({ title: '', content: 'x' });
    expect(capture.filename).toBe('제목 없음.md');
  });

  it('strips leading/trailing dots and whitespace', () => {
    downloadMarkdown({ title: '  ..안녕..  ', content: 'x' });
    expect(capture.filename).toBe('안녕.md');
  });

  it('truncates very long titles to keep filename manageable', () => {
    const long = 'a'.repeat(200);
    downloadMarkdown({ title: long, content: 'x' });
    // 본문 100자 + '.md'
    expect(capture.filename).toBe(`${'a'.repeat(100)}.md`);
  });

  it('removes <a> element from the DOM after click', () => {
    downloadMarkdown({ title: 'clean', content: 'x' });
    const leftover = document.querySelector('a[download]');
    expect(leftover).toBeNull();
  });
});
