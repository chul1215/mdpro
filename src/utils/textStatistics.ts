export interface TextStatistics {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  readingTimeMinutes: number;
  readingTimeSeconds: number;
}

/**
 * 텍스트 통계를 계산합니다.
 * - 문자 수: 전체 문자 (공백 포함)
 * - 공백 제외 문자 수
 * - 단어 수: 공백으로 구분된 토큰 수 (한글은 글자 단위 고려)
 * - 줄 수: 개행 문자 기준 + 1
 * - 읽기 시간: 분당 200단어 기준 (초 단위도 제공)
 */
export function calculateStatistics(text: string): TextStatistics {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  
  // 단어 수 계산: 공백으로 구분된 토큰 수
  // trim()으로 앞뒤 공백 제거 후 split
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  
  // 줄 수: 개행 문자 수 + 1 (빈 문서면 0)
  const lines = text === '' ? 0 : text.split('\n').length;

  // 읽기 시간: 분당 200단어 = 초당 200/60 ≈ 3.33단어
  const wordsPerMinute = 200;
  const readingTimeMinutesExact = words / wordsPerMinute;
  const readingTimeSeconds = Math.round(readingTimeMinutesExact * 60);

  // 최소 1초는 표시 (0단어면 0)
  const displaySeconds = words === 0 ? 0 : Math.max(1, readingTimeSeconds);
  const displayMinutes = Math.ceil(displaySeconds / 60);

  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    readingTimeMinutes: displayMinutes,
    readingTimeSeconds: displaySeconds,
  };
}

/**
 * 읽기 시간을 사람이 읽기 쉬운 문자열로 포맷합니다.
 * 예: "1분", "30초", "2분 30초"
 */
export function formatReadingTime(stats: TextStatistics): string {
  if (stats.words === 0) return '0초';
  
  const totalSeconds = stats.readingTimeSeconds;
  
  if (totalSeconds < 60) {
    return `${totalSeconds}초`;
  }
  
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  if (seconds === 0) {
    return `${minutes}분`;
  }
  
  return `${minutes}분 ${seconds}초`;
}

/**
 * 통계를 간단한 요약 문자열로 포맷합니다.
 * 예: "1,234자 · 234단어 · 12줄 · 1분 읽기"
 */
export function formatStatisticsSummary(stats: TextStatistics): string {
  const chars = stats.characters.toLocaleString();
  const words = stats.words.toLocaleString();
  const lines = stats.lines.toLocaleString();
  const readingTime = formatReadingTime(stats);
  
  return `${chars}자 · ${words}단어 · ${lines}줄 · ${readingTime} 읽기`;
}