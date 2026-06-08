import { describe, it, expect } from 'vitest';
import { 
  calculateStatistics, 
  formatReadingTime, 
  formatStatisticsSummary,
  TextStatistics 
} from '../utils/textStatistics';

describe('calculateStatistics', () => {
  it('빈 텍스트에서 기본값을 반환한다', () => {
    const stats = calculateStatistics('');
    expect(stats).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      readingTimeMinutes: 0,
      readingTimeSeconds: 0,
    });
  });

  it('단일 단어의 통계를 계산한다', () => {
    const stats = calculateStatistics('Hello');
    expect(stats.characters).toBe(5);
    expect(stats.charactersNoSpaces).toBe(5);
    expect(stats.words).toBe(1);
    expect(stats.lines).toBe(1);
    expect(stats.readingTimeMinutes).toBe(1); // 최소 1분
    expect(stats.readingTimeSeconds).toBe(1); // 최소 1초
  });

  it('공백을 포함한 텍스트의 통계를 계산한다', () => {
    const stats = calculateStatistics('Hello World');
    expect(stats.characters).toBe(11);
    expect(stats.charactersNoSpaces).toBe(10);
    expect(stats.words).toBe(2);
    expect(stats.lines).toBe(1);
  });

  it('여러 줄의 통계를 계산한다', () => {
    const stats = calculateStatistics('Line 1\nLine 2\nLine 3');
    expect(stats.lines).toBe(3);
    expect(stats.words).toBe(6);
  });

  it('한글 텍스트의 통계를 계산한다 (글자 단위)', () => {
    const stats = calculateStatistics('안녕하세요 반갑습니다');
    // 한글은 공백으로 분할되므로 2단어
    expect(stats.words).toBe(2);
    expect(stats.characters).toBe(11); // 공백 포함 (한글 10자 + 공백 1자)
    expect(stats.charactersNoSpaces).toBe(10); // 공백 제외
  });

  it('혼합 텍스트(한글+영문+숫자)의 통계를 계산한다', () => {
    const stats = calculateStatistics('Hello 안녕 123');
    expect(stats.words).toBe(3);
    expect(stats.characters).toBe(12); // "Hello 안녕 123" = 5+1+2+1+3 = 12
    expect(stats.charactersNoSpaces).toBe(10); // 공백 2개 제외
  });

  it('200단어일 때 읽기 시간이 1분이다', () => {
    const text = 'word '.repeat(200).trim(); // 200 words
    const stats = calculateStatistics(text);
    expect(stats.words).toBe(200);
    expect(stats.readingTimeMinutes).toBe(1);
    expect(stats.readingTimeSeconds).toBe(60);
  });

  it('400단어일 때 읽기 시간이 2분이다', () => {
    const text = 'word '.repeat(400).trim(); // 400 words
    const stats = calculateStatistics(text);
    expect(stats.words).toBe(400);
    expect(stats.readingTimeMinutes).toBe(2);
    expect(stats.readingTimeSeconds).toBe(120);
  });

  it('100단어일 때 읽기 시간이 30초(0.5분 → 올림 1분) 하지만 초 단위로는 30초', () => {
    const text = 'word '.repeat(100).trim(); // 100 words
    const stats = calculateStatistics(text);
    expect(stats.words).toBe(100);
    expect(stats.readingTimeMinutes).toBe(1); // 올림
    expect(stats.readingTimeSeconds).toBe(30); // 정확한 초
  });

  it('앞뒤 공백이 있어도 단어 수가 정확하다', () => {
    const stats = calculateStatistics('  Hello  World  ');
    expect(stats.words).toBe(2);
  });

  it('탭과 다양한 공백 문자를 처리한다', () => {
    const stats = calculateStatistics('Hello\tWorld\nNew\tLine');
    expect(stats.words).toBe(4);
    expect(stats.lines).toBe(2);
  });
});

describe('formatReadingTime', () => {
  it('0단어면 0초를 반환한다', () => {
    const stats: TextStatistics = {
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      lines: 0,
      readingTimeMinutes: 0,
      readingTimeSeconds: 0,
    };
    expect(formatReadingTime(stats)).toBe('0초');
  });

  it('1분 미만은 초 단위로 표시한다', () => {
    const stats: TextStatistics = {
      characters: 100,
      charactersNoSpaces: 80,
      words: 50,
      lines: 1,
      readingTimeMinutes: 1,
      readingTimeSeconds: 15,
    };
    expect(formatReadingTime(stats)).toBe('15초');
  });

  it('정확히 N분은 분만 표시한다', () => {
    const stats: TextStatistics = {
      characters: 1000,
      charactersNoSpaces: 800,
      words: 200,
      lines: 10,
      readingTimeMinutes: 1,
      readingTimeSeconds: 60,
    };
    expect(formatReadingTime(stats)).toBe('1분');
  });

  it('분과 초를 함께 표시한다', () => {
    const stats: TextStatistics = {
      characters: 1000,
      charactersNoSpaces: 800,
      words: 300,
      lines: 10,
      readingTimeMinutes: 2,
      readingTimeSeconds: 90,
    };
    expect(formatReadingTime(stats)).toBe('1분 30초');
  });
});

describe('formatStatisticsSummary', () => {
  it('기본 요약 형식을 반환한다', () => {
    const stats = calculateStatistics('Hello World\nThis is a test');
    const summary = formatStatisticsSummary(stats);
    // 예: "22자 · 6단어 · 2줄 · 1분 읽기"
    expect(summary).toMatch(/^\d+자 · \d+단어 · \d+줄 · .+ 읽기$/);
  });

  it('천 단위 구분자가 포함된다', () => {
    const text = 'word '.repeat(1500).trim();
    const stats = calculateStatistics(text);
    const summary = formatStatisticsSummary(stats);
    expect(summary).toContain('1,500');
  });
});