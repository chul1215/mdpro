import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Game Boy visual theme assets', () => {
  it('defines the four-tone LCD palette and Galmuri pixel font', () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

    expect(css).toContain("font-family: 'Galmuri11'");
    expect(css).toContain('html.gameboy');
    expect(css).toContain('#0f380f');
    expect(css).toContain('#306230');
    expect(css).toContain('#8bac0f');
    expect(css).toContain('#9bbc0f');
  });

  it('self-hosts regular and bold Korean pixel font files', () => {
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/Galmuri11.woff2'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/Galmuri11-Bold.woff2'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'src/assets/fonts/OFL.txt'))).toBe(true);
  });
});
