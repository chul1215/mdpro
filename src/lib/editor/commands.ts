import type { EditorView } from '@codemirror/view';
import { EditorSelection, type ChangeSpec, type SelectionRange } from '@codemirror/state';

// 모든 커맨드는 하나의 트랜잭션에 changes + selection을 함께 담아 dispatch한다.
// 이유: 분리해서 dispatch하면 중간 상태가 undo 히스토리에 남고, 다중 selection에서
// changes가 서로의 좌표를 이동시키기 때문에 CodeMirror의 좌표 매핑에 일관되게 의존해야 한다.

type InlineRangeResult = {
  changes: ChangeSpec;
  range: SelectionRange;
};

function buildInlineToggle(
  view: EditorView,
  marker: string,
): { changes: ChangeSpec[]; ranges: SelectionRange[] } {
  const doc = view.state.doc;
  const markerLen = marker.length;
  const changes: ChangeSpec[] = [];
  const ranges: SelectionRange[] = [];

  for (const range of view.state.selection.ranges) {
    const result = inlineRangeChange(doc.sliceString(range.from, range.to), range, marker, markerLen);
    changes.push(result.changes);
    ranges.push(result.range);
  }

  return { changes, ranges };
}

function inlineRangeChange(
  selected: string,
  range: SelectionRange,
  marker: string,
  markerLen: number,
): InlineRangeResult {
  if (range.empty) {
    const insert = marker + marker;
    return {
      changes: { from: range.from, to: range.from, insert },
      range: EditorSelection.cursor(range.from + markerLen),
    };
  }

  if (
    selected.length >= markerLen * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const stripped = selected.slice(markerLen, selected.length - markerLen);
    return {
      changes: { from: range.from, to: range.to, insert: stripped },
      range: EditorSelection.range(range.from, range.from + stripped.length),
    };
  }

  const wrapped = marker + selected + marker;
  return {
    changes: { from: range.from, to: range.to, insert: wrapped },
    range: EditorSelection.range(range.from + markerLen, range.from + markerLen + selected.length),
  };
}

function dispatchInline(view: EditorView, marker: string): void {
  const { changes, ranges } = buildInlineToggle(view, marker);
  view.dispatch({
    changes,
    selection: EditorSelection.create(ranges),
  });
  view.focus();
}

export function toggleBold(view: EditorView): void {
  dispatchInline(view, '**');
}

export function toggleItalic(view: EditorView): void {
  dispatchInline(view, '*');
}

export function toggleStrikethrough(view: EditorView): void {
  dispatchInline(view, '~~');
}

export function toggleInlineCode(view: EditorView): void {
  dispatchInline(view, '`');
}

// 블록 프리픽스 패턴: 기존 블록 서식을 감지해 교체하기 위해 사용한다.
// 체크리스트는 `- [ ] ` / `- [x] ` 두 형태, 번호 리스트는 숫자 변동을 허용한다.
const BLOCK_PATTERNS: RegExp[] = [
  /^#{1,6} /,
  /^- \[[ xX]\] /,
  /^- /,
  /^\d+\. /,
  /^> /,
];

type BlockPrefixFn = (index: number) => string;

function stripBlockPrefix(line: string): string {
  for (const pattern of BLOCK_PATTERNS) {
    if (pattern.test(line)) {
      return line.replace(pattern, '');
    }
  }
  return line;
}

function applyBlockToggle(
  view: EditorView,
  prefix: BlockPrefixFn,
  matches: (line: string) => boolean,
): void {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  const processedLines = new Set<number>();
  let lastOriginalLineTo: number | null = null;

  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from);
    const endLine = state.doc.lineAt(range.to);
    let prefixIndex = 0;

    for (let n = startLine.number; n <= endLine.number; n += 1) {
      if (processedLines.has(n)) {
        prefixIndex += 1;
        continue;
      }
      processedLines.add(n);

      const line = state.doc.line(n);
      const text = line.text;

      if (text.length === 0) {
        prefixIndex += 1;
        continue;
      }

      const alreadyApplied = matches(text);
      const stripped = stripBlockPrefix(text);
      const nextText = alreadyApplied ? stripped : prefix(prefixIndex) + stripped;

      if (nextText !== text) {
        changes.push({ from: line.from, to: line.to, insert: nextText });
      }
      lastOriginalLineTo = line.to;
      prefixIndex += 1;
    }
  }

  if (changes.length === 0) {
    view.focus();
    return;
  }

  // mapPos에 넘기는 위치는 반드시 변경 전 문서 좌표여야 한다. 마지막으로 손댄 원본 라인의
  // 끝을 추적했다가 changeset으로 매핑하여 새 문서 상의 대응 위치를 얻는다.
  const tr = state.update({ changes });
  const mappedPos =
    lastOriginalLineTo !== null ? tr.changes.mapPos(lastOriginalLineTo) : state.selection.main.head;

  view.dispatch({
    changes,
    selection: EditorSelection.cursor(mappedPos),
  });
  view.focus();
}

export function toggleHeading(view: EditorView, level: 1 | 2 | 3): void {
  const marker = '#'.repeat(level) + ' ';
  applyBlockToggle(
    view,
    () => marker,
    (line) => line.startsWith(marker),
  );
}

export function toggleBulletList(view: EditorView): void {
  applyBlockToggle(
    view,
    () => '- ',
    (line) => /^- (?!\[[ xX]\] )/.test(line),
  );
}

export function toggleNumberedList(view: EditorView): void {
  applyBlockToggle(
    view,
    (index) => `${index + 1}. `,
    (line) => /^\d+\. /.test(line),
  );
}

export function toggleCheckList(view: EditorView): void {
  applyBlockToggle(
    view,
    () => '- [ ] ',
    (line) => /^- \[[ xX]\] /.test(line),
  );
}

export function toggleQuote(view: EditorView): void {
  applyBlockToggle(
    view,
    () => '> ',
    (line) => line.startsWith('> '),
  );
}

export function insertLink(
  view: EditorView,
  opts: { url?: string; text?: string } = {},
): void {
  const url = opts.url ?? 'https://';
  const placeholder = opts.text ?? '링크 텍스트';
  const range = view.state.selection.main;
  const selected = view.state.doc.sliceString(range.from, range.to);

  if (selected.length > 0) {
    const insert = `[${selected}](${url})`;
    // URL 부분을 선택 상태로 두어 사용자가 바로 URL을 교체할 수 있게 한다.
    const urlStart = range.from + selected.length + 3; // `[` + selected + `](`
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.range(urlStart, urlStart + url.length),
    });
    view.focus();
    return;
  }

  const insert = `[${placeholder}](${url})`;
  const textStart = range.from + 1;
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: EditorSelection.range(textStart, textStart + placeholder.length),
  });
  view.focus();
}

export function insertCodeBlock(view: EditorView, language?: string): void {
  const fenceOpen = '```' + (language ?? '');
  const fenceClose = '```';
  const { state } = view;
  const range = state.selection.main;

  if (range.empty) {
    // 빈 선택은 새 코드블록을 삽입하고 커서를 내부에 놓는다.
    const insert = `${fenceOpen}\n\n${fenceClose}\n`;
    const cursorPos = range.from + fenceOpen.length + 1;
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: EditorSelection.cursor(cursorPos),
    });
    view.focus();
    return;
  }

  const startLine = state.doc.lineAt(range.from);
  const endLine = state.doc.lineAt(range.to);
  const block = state.doc.sliceString(startLine.from, endLine.to);
  const insert = `${fenceOpen}\n${block}\n${fenceClose}`;
  const newFrom = startLine.from + fenceOpen.length + 1;
  const newTo = newFrom + block.length;

  view.dispatch({
    changes: { from: startLine.from, to: endLine.to, insert },
    selection: EditorSelection.range(newFrom, newTo),
  });
  view.focus();
}
