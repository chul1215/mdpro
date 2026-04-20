import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadHtml, inlineImages } from './html';

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

type HtmlCapture = {
  blob: Blob | null;
  filename: string | null;
  clickSpy: ReturnType<typeof vi.fn>;
};

function setupDownload(): HtmlCapture {
  const capture: HtmlCapture = { blob: null, filename: null, clickSpy: vi.fn() };
  if (typeof URL.createObjectURL !== 'function') {
    (URL as unknown as { createObjectURL: (o: Blob) => string }).createObjectURL = () => '';
  }
  if (typeof URL.revokeObjectURL !== 'function') {
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  }
  vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
    if (obj instanceof Blob) capture.blob = obj;
    return 'blob:mock-url';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    capture.filename = this.getAttribute('download');
    capture.clickSpy();
  });
  return capture;
}

describe('downloadHtml', () => {
  let capture: HtmlCapture;

  beforeEach(() => {
    capture = setupDownload();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a standalone HTML document with charset and title', async () => {
    await downloadHtml({ title: '안녕', content: '# 안녕\n\n본문' });
    expect(capture.clickSpy).toHaveBeenCalledTimes(1);
    expect(capture.filename).toBe('안녕.html');
    expect(capture.blob).not.toBeNull();
    expect(capture.blob!.type).toBe('text/html;charset=utf-8');
    const html = await readBlobAsText(capture.blob!);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<title>안녕</title>');
    expect(html).toContain('<style>');
    // 렌더된 본문이 body 내부에 포함
    expect(html).toMatch(/<h1[^>]*>안녕<\/h1>/);
  });

  it('escapes special characters in document title', async () => {
    await downloadHtml({ title: 'a<b>&"c', content: '# x\n' });
    const html = await readBlobAsText(capture.blob!);
    expect(html).toContain('<title>a&lt;b&gt;&amp;&quot;c</title>');
  });

  it('falls back to "제목 없음" when title is empty', async () => {
    await downloadHtml({ title: '', content: '# x\n' });
    expect(capture.filename).toBe('제목 없음.html');
    const html = await readBlobAsText(capture.blob!);
    expect(html).toContain('<title>제목 없음</title>');
  });

  it('removes offscreen container from DOM after writing', async () => {
    const before = document.querySelectorAll('body > div').length;
    await downloadHtml({ title: 't', content: '# t\n' });
    const after = document.querySelectorAll('body > div').length;
    expect(after).toBe(before);
  });
});

describe('inlineImages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('replaces http(s) <img src> with data URLs on success', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const blob = new Blob([pngBytes], { type: 'image/png' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) } as unknown as Response);

    const container = document.createElement('div');
    container.innerHTML = '<img src="https://example.com/a.png">';
    await inlineImages(container);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
  });

  it('keeps original src when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('CORS'));
    const container = document.createElement('div');
    container.innerHTML = '<img src="https://example.com/b.png">';
    await inlineImages(container);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/b.png');
  });

  it('keeps original src on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as unknown as Response);
    const container = document.createElement('div');
    container.innerHTML = '<img src="https://example.com/c.png">';
    await inlineImages(container);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://example.com/c.png');
  });

  it('leaves data: URLs untouched and does not fetch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) } as unknown as Response);
    const container = document.createElement('div');
    container.innerHTML = '<img src="data:image/png;base64,AAAA">';
    await inlineImages(container);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(spy).not.toHaveBeenCalled();
  });

  it('skips relative URLs', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob()) } as unknown as Response);
    const container = document.createElement('div');
    container.innerHTML = '<img src="./local.png">';
    await inlineImages(container);
    expect(spy).not.toHaveBeenCalled();
  });
});
