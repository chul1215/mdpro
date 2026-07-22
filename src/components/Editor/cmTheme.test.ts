import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { gameBoyTheme, getCodeMirrorTheme } from './cmTheme';

describe('CodeMirror theme selection', () => {
  it('selects the dedicated LCD theme for Game Boy mode', () => {
    expect(getCodeMirrorTheme('gameboy')).toBe(gameBoyTheme);
  });

  it('uses Gulim throughout the Game Boy editor', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/Editor/cmTheme.ts'), 'utf8');

    expect(source).toContain("fontFamily: 'Gulim, \"굴림\", \"Noto Sans KR\", Arial, sans-serif'");
  });
});
