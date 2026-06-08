export interface Heading {
  level: number;
  text: string;
  position: number; // document position (offset from start)
  line: number; // 0-indexed line number
}

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

/**
 * 마크다운 텍스트에서 헤딩들을 추출합니다.
 * ATX 스타일 헤딩만 지원 (#, ##, ### ...)
 */
export function parseHeadings(text: string): Heading[] {
  const headings: Heading[] = [];
  const lines = text.split('\n');
  let currentPosition = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const match = line.match(HEADING_REGEX);

    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({
        level,
        text,
        position: currentPosition,
        line: lineIndex,
      });
    }

    currentPosition += line.length + 1; // +1 for newline
  }

  return headings;
}

/**
 * 주어진 커서 위치에 해당하는 현재 헤딩을 찾습니다.
 * 커서가 헤딩 내에 있거나 헤딩 다음에 있으면 그 헤딩을 반환합니다.
 */
export function findCurrentHeading(headings: Heading[], cursorPosition: number): Heading | null {
  let current: Heading | null = null;

  for (const heading of headings) {
    if (heading.position <= cursorPosition) {
      current = heading;
    } else {
      break;
    }
  }

  return current;
}

/**
 * 헤딩 레벨에 따른 들여쓰기 클래스명을 반환합니다.
 */
export function getHeadingIndentClass(level: number): string {
  return `outline-indent-${Math.min(level, 6)}`;
}