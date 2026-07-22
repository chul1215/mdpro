import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
let releaseFirst: (() => void) | undefined;

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn((config: { theme: string }) => calls.push(`init:${config.theme}`)),
    render: vi.fn(async (_id: string, text: string) => {
      calls.push(`start:${text}`);
      if (text === 'first') await new Promise<void>((resolve) => { releaseFirst = resolve; });
      calls.push(`end:${text}`);
      return { svg: `<svg data-source="${text}"></svg>` };
    }),
  },
}));

import { getMermaidThemeConfig, renderMermaidBlocks } from './mermaid';

beforeEach(() => {
  calls.length = 0;
  releaseFirst = undefined;
});

describe('getMermaidThemeConfig', () => {
  it('maps Game Boy mode to the LCD palette and pixel font', () => {
    const config = getMermaidThemeConfig('gameboy');

    expect(config.theme).toBe('base');
    expect(config.themeVariables).toMatchObject({
      fontFamily: 'Gulim, 굴림, Noto Sans KR, Arial, sans-serif',
      background: '#9bbc0f',
      primaryTextColor: '#0f380f',
      primaryBorderColor: '#306230',
      secondaryColor: '#8bac0f',
    });
  });
});

describe('renderMermaidBlocks serialization', () => {
  it('keeps initialize and every render for one request in a single queued block', async () => {
    const first = document.createElement('div');
    first.innerHTML = '<pre><code class="language-mermaid">first</code></pre>';
    const second = document.createElement('div');
    second.innerHTML = '<pre><code class="language-mermaid">second</code></pre>';

    const firstRun = renderMermaidBlocks(first, 'dark');
    await vi.waitFor(() => expect(calls).toContain('start:first'));
    const secondRun = renderMermaidBlocks(second, 'gameboy');
    await Promise.resolve();
    expect(calls).not.toContain('init:base');

    releaseFirst?.();
    await Promise.all([firstRun, secondRun]);
    expect(calls).toEqual([
      'init:dark', 'start:first', 'end:first',
      'init:base', 'start:second', 'end:second',
    ]);
  });
});
