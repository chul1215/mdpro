import { EditorView } from '@codemirror/view';

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
    '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(0, 113, 227, 0.2)' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(0, 113, 227, 0.28)' },
  },
  { dark: false },
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
    '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(41, 151, 255, 0.25)' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(41, 151, 255, 0.35)' },
  },
  { dark: true },
);
