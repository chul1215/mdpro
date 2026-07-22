import { describe, expect, it } from 'vitest';
import { getMermaidThemeConfig } from './mermaid';

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
