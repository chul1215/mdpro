import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('web app branding', () => {
  it('uses mdONE as the browser document title', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

    expect(html).toContain('<title>mdONE</title>');
    expect(html).not.toContain('MD Practice');
    expect(html).not.toContain('SMC AI실무도입전환 프로젝트');
  });
});
