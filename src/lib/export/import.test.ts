import { describe, expect, it } from 'vitest';
import { readMarkdownFiles, MAX_FILE_SIZE } from './import';

function makeFile(content: string, name: string, overrides: { size?: number } = {}): File {
  const file = new File([content], name, { type: 'text/markdown' });
  if (overrides.size !== undefined) {
    Object.defineProperty(file, 'size', { value: overrides.size, configurable: true });
  }
  return file;
}

describe('readMarkdownFiles', () => {
  it('imports a .md file and extracts H1 as title', async () => {
    const file = makeFile('# 안녕\n\n본문', 'hello.md');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0]).toEqual({ title: '안녕', content: '# 안녕\n\n본문' });
    expect(result.errors).toHaveLength(0);
  });

  it('imports .markdown extension as well', async () => {
    const file = makeFile('# 제목\n', 'note.markdown');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].title).toBe('제목');
  });

  it('treats extension case-insensitively', async () => {
    const file = makeFile('# 제목\n', 'UPPER.MD');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(1);
  });

  it('falls back to filename (without extension) when no H1 present', async () => {
    const file = makeFile('no heading here\njust text', 'my-notes.md');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].title).toBe('my-notes');
    expect(result.imported[0].content).toBe('no heading here\njust text');
  });

  it('rejects files with unsupported extensions', async () => {
    const file = makeFile('stuff', 'readme.txt');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].fileName).toBe('readme.txt');
    expect(result.errors[0].reason).toMatch(/마크다운/);
  });

  it('rejects files larger than MAX_FILE_SIZE', async () => {
    const file = makeFile('x', 'big.md', { size: MAX_FILE_SIZE + 1 });
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toMatch(/5MB/);
  });

  it('processes multiple files in parallel, preserving success/error partition', async () => {
    const files = [
      makeFile('# A\n', 'a.md'),
      makeFile('oops', 'b.txt'),
      makeFile('# C\n', 'c.markdown'),
    ];
    const result = await readMarkdownFiles(files);
    expect(result.imported.map((d) => d.title).sort()).toEqual(['A', 'C']);
    expect(result.errors.map((e) => e.fileName)).toEqual(['b.txt']);
  });

  it('handles empty file list', async () => {
    const result = await readMarkdownFiles([]);
    expect(result.imported).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('treats files with no extension as unsupported', async () => {
    const file = makeFile('# A\n', 'noext');
    const result = await readMarkdownFiles([file]);
    expect(result.imported).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
