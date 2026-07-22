import { describe, expect, it } from 'vitest';
import { gameBoyTheme, getCodeMirrorTheme } from './cmTheme';

describe('CodeMirror theme selection', () => {
  it('selects the dedicated LCD theme for Game Boy mode', () => {
    expect(getCodeMirrorTheme('gameboy')).toBe(gameBoyTheme);
  });
});
