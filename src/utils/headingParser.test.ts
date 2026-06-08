import { describe, it, expect } from 'vitest';
import { parseHeadings, findCurrentHeading, getHeadingIndentClass, Heading } from '../utils/headingParser';

describe('parseHeadings', () => {
  it('단일 헤딩을 파싱한다', () => {
    const text = '# Hello World';
    const headings = parseHeadings(text);
    expect(headings).toHaveLength(1);
    expect(headings[0]).toEqual({ level: 1, text: 'Hello World', position: 0, line: 0 });
  });

  it('다양한 레벨의 헤딩을 파싱한다', () => {
    const text = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    const headings = parseHeadings(text);
    expect(headings).toHaveLength(6);
    expect(headings.map(h => h.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('헤딩이 아닌 줄은 무시한다', () => {
    const text = 'plain text\n# Heading\nmore text';
    const headings = parseHeadings(text);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Heading');
    expect(headings[0].line).toBe(1);
  });

  it('공백으로 시작하는 헤딩은 무시한다 (ATX 스타일만)', () => {
    const text = '  # Not a heading\n# Real heading';
    const headings = parseHeadings(text);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Real heading');
  });

  it('헤딩 텍스트의 앞뒤 공백을 제거한다', () => {
    const text = '#   Hello World   ';
    const headings = parseHeadings(text);
    expect(headings[0].text).toBe('Hello World');
  });

  it('빈 문서에서 빈 배열을 반환한다', () => {
    const headings = parseHeadings('');
    expect(headings).toHaveLength(0);
  });

  it('위치가 올바르게 계산된다 (줄바꿈 포함)', () => {
    const text = 'line 1\n# Heading on line 2\nline 3';
    const headings = parseHeadings(text);
    // "line 1\n" = 7 chars, position should be 7
    expect(headings[0].position).toBe(7);
    expect(headings[0].line).toBe(1);
  });

  it('연속된 헤딩의 위치가 누적된다', () => {
    const text = '# H1\n## H2\n### H3';
    const headings = parseHeadings(text);
    // H1: position 0, length 4 ("# H1\n") = 5
    // H2: position 5, length 5 ("## H2\n") = 6
    // H3: position 11, length 5 ("### H3") = 5 (no trailing newline)
    expect(headings[0].position).toBe(0);
    expect(headings[1].position).toBe(5);
    expect(headings[2].position).toBe(11);
  });
});

describe('findCurrentHeading', () => {
  const headings: Heading[] = [
    { level: 1, text: 'H1', position: 0, line: 0 },
    { level: 2, text: 'H2', position: 10, line: 1 },
    { level: 3, text: 'H3', position: 20, line: 2 },
  ];

  it('커서가 첫 헤딩 전에 있으면 null', () => {
    expect(findCurrentHeading(headings, -1)).toBeNull();
    expect(findCurrentHeading(headings, 0)).toEqual(headings[0]); // at start
  });

  it('커서가 헤딩 위치와 정확히 일치하면 그 헤딩', () => {
    expect(findCurrentHeading(headings, 10)).toEqual(headings[1]);
  });

  it('커서가 헤딩 사이에 있으면 이전 헤딩', () => {
    expect(findCurrentHeading(headings, 15)).toEqual(headings[1]);
  });

  it('커서가 마지막 헤딩 이후면 마지막 헤딩', () => {
    expect(findCurrentHeading(headings, 100)).toEqual(headings[2]);
  });

  it('빈 헤딩 배열이면 null', () => {
    expect(findCurrentHeading([], 10)).toBeNull();
  });
});

describe('getHeadingIndentClass', () => {
  it('레벨별 들여쓰기 클래스를 반환한다', () => {
    expect(getHeadingIndentClass(1)).toBe('outline-indent-1');
    expect(getHeadingIndentClass(2)).toBe('outline-indent-2');
    expect(getHeadingIndentClass(6)).toBe('outline-indent-6');
  });

  it('레벨 6 초과는 6으로 클램핑된다', () => {
    expect(getHeadingIndentClass(7)).toBe('outline-indent-6');
    expect(getHeadingIndentClass(10)).toBe('outline-indent-6');
  });
});