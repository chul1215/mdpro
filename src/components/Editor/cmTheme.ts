import { EditorView, Decoration, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSet, RangeSetBuilder } from '@codemirror/state';

export type FocusModeConfig = {
  enabled: boolean;
  fadeOthers?: boolean; // 비활성 줄 흐리게 하기
  highlightCurrentLine?: boolean; // 현재 줄 강조
};

export type DecorationSet = RangeSet<Decoration>;

// 포커스 모드용 데코레이션 플러그인
export function focusModePlugin(config: FocusModeConfig) {
  return ViewPlugin.fromClass(
    class {
      decorations: RangeSet<Decoration>;

      constructor(view: EditorView) {
        this.decorations = this.buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = this.buildDecorations(update.view);
        }
      }

      buildDecorations(view: EditorView): RangeSet<Decoration> {
        if (!config.enabled) return Decoration.none;

        const builder = new RangeSetBuilder();
        const { state } = view;

        // 현재 커서 위치의 줄 번호 찾기
        const selection = state.selection.main;
        const currentLine = state.doc.lineAt(selection.head).number;
        const totalLines = state.doc.lines;

        // 현재 줄 강조 데코레이션
        if (config.highlightCurrentLine !== false) {
          const line = state.doc.line(currentLine);
          builder.add(
            line.from,
            line.to,
            Decoration.line({ class: 'cm-focus-mode-current-line' })
          );
        }

        // 다른 줄 흐리게 하기 (현재 줄 제외)
        if (config.fadeOthers !== false) {
          for (let i = 1; i <= totalLines; i++) {
            if (i === currentLine) continue;
            const line = state.doc.line(i);
            builder.add(
              line.from,
              line.to,
              Decoration.line({ class: 'cm-focus-mode-dimmed-line' })
            );
          }
        }

        return builder.finish() as RangeSet<Decoration>;
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  );
}

// Apple 팔레트에 맞춘 CodeMirror 테마.
// 라이트: 전 영역 #f5f5f7 (구분선 대신 배경 단일화)
// 다크: 순수 #000 + 미세한 surface 계열로 활성 라인만 구분
export const lightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#f5f5f7',
      color: '#1d1d1f',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '16px 0', caretColor: '#0071e3' },
    '.cm-gutters': {
      backgroundColor: '#f5f5f7',
      color: 'rgba(0, 0, 0, 0.32)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(0, 0, 0, 0.03)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
    '.cm-cursor': { borderLeftColor: '#0071e3', borderLeftWidth: '2px' },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(0, 113, 227, 0.2)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(0, 113, 227, 0.28)',
    },
    // 포커스 모드 스타일
    '.cm-focus-mode-current-line': {
      backgroundColor: 'rgba(0, 113, 227, 0.08)',
    },
    '.cm-focus-mode-dimmed-line': {
      opacity: '0.35',
      transition: 'opacity 0.15s ease',
    },
  },
  { dark: false }
);

export const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#000000',
      color: '#f5f5f7',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, "Cascadia Mono", Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '16px 0', caretColor: '#2997ff' },
    '.cm-gutters': {
      backgroundColor: '#000000',
      color: 'rgba(255, 255, 255, 0.32)',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
    '.cm-cursor': { borderLeftColor: '#2997ff', borderLeftWidth: '2px' },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(41, 151, 255, 0.25)',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(41, 151, 255, 0.35)',
    },
    // 포커스 모드 스타일
    '.cm-focus-mode-current-line': {
      backgroundColor: 'rgba(41, 151, 255, 0.12)',
    },
    '.cm-focus-mode-dimmed-line': {
      opacity: '0.35',
      transition: 'opacity 0.15s ease',
    },
  },
  { dark: true }
);