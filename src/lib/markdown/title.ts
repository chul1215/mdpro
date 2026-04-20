const FALLBACK_TITLE = '제목 없음';

// ATX H1만 인정한다. `## ` 이상은 문서의 "대표 제목"으로 쓰기에 과도하게 세분화된 섹션이므로
// 파일 이름/탭 라벨 후보로 부적절하다고 판단.
const H1_PATTERN = /^#\s+(.*)$/;
const FENCE_PATTERN = /^(`{3,}|~{3,})/;

export function extractTitleFromMarkdown(content: string): string {
  if (!content) return FALLBACK_TITLE;

  const lines = content.split('\n');
  let fence: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');

    if (fence) {
      // 같은 종류(` 또는 ~)의 같은 길이 이상 펜스를 만나면 닫힘으로 본다.
      const closing = line.match(FENCE_PATTERN);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }

    const opening = line.match(FENCE_PATTERN);
    if (opening) {
      fence = opening[1];
      continue;
    }

    const match = line.match(H1_PATTERN);
    if (!match) continue;

    const stripped = stripTrailingHashes(match[1]).trim();
    if (stripped.length === 0) return FALLBACK_TITLE;
    return stripped;
  }

  return FALLBACK_TITLE;
}

// ATX closing sequence: 본문 뒤 공백 + `#` 반복. 본문 중간의 `#`은 보존.
function stripTrailingHashes(text: string): string {
  return text.replace(/\s+#+\s*$/, '').replace(/\s+$/, '');
}
