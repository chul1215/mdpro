import { describe, expect, it } from 'vitest';
import { extractTitleFromMarkdown } from './title';

describe('extractTitleFromMarkdown', () => {
  it('기본 H1을 추출한다', () => {
    expect(extractTitleFromMarkdown('# 안녕')).toBe('안녕');
  });

  it('멀티라인에서 첫 H1만 반환한다', () => {
    expect(extractTitleFromMarkdown('# 첫째\n# 둘째')).toBe('첫째');
  });

  it('H2는 무시하고 fallback을 반환한다', () => {
    expect(extractTitleFromMarkdown('## 서브')).toBe('제목 없음');
  });

  it('앞에 본문이 있어도 첫 H1을 선택한다', () => {
    expect(extractTitleFromMarkdown('본문\n# 제목')).toBe('제목');
  });

  it('코드 블록 내부의 H1은 무시한다', () => {
    expect(extractTitleFromMarkdown('```\n# 가짜\n```\n# 진짜')).toBe('진짜');
  });

  it('~~~ 펜스 코드 블록 내부도 무시한다', () => {
    expect(extractTitleFromMarkdown('~~~\n# 가짜\n~~~\n# 진짜')).toBe('진짜');
  });

  it('빈 헤딩은 fallback을 반환한다', () => {
    expect(extractTitleFromMarkdown('# ')).toBe('제목 없음');
  });

  it('빈 문자열 입력은 fallback을 반환한다', () => {
    expect(extractTitleFromMarkdown('')).toBe('제목 없음');
  });

  it('trailing # 기호는 제거한다', () => {
    expect(extractTitleFromMarkdown('# 제목 ##')).toBe('제목');
  });

  it('H1 라인이 없으면 fallback을 반환한다', () => {
    expect(extractTitleFromMarkdown('본문만 있음\n여러 줄\n- 목록')).toBe('제목 없음');
  });

  it('본문 중간의 # 문자는 보존한다', () => {
    expect(extractTitleFromMarkdown('# C# 노트')).toBe('C# 노트');
  });

  it('trailing # 제거 후 공백을 trim 한다', () => {
    expect(extractTitleFromMarkdown('#   여백 제목   ###   ')).toBe('여백 제목');
  });
});
