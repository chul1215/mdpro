import { EditorView } from '@codemirror/view';

export const lightTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Mono", Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '12px 0' },
    '.cm-gutters': {
      backgroundColor: '#f8fafc',
      color: '#94a3b8',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: '#f1f5f9' },
    '.cm-activeLineGutter': { backgroundColor: '#e2e8f0' },
    '.cm-cursor': { borderLeftColor: '#0f172a' },
  },
  { dark: false },
);

export const darkTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0f172a',
      color: '#e2e8f0',
      height: '100%',
    },
    '.cm-scroller': {
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, "Cascadia Mono", Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '.cm-content': { padding: '12px 0' },
    '.cm-gutters': {
      backgroundColor: '#0b1220',
      color: '#475569',
      border: 'none',
    },
    '.cm-activeLine': { backgroundColor: '#111c33' },
    '.cm-activeLineGutter': { backgroundColor: '#152036' },
    '.cm-cursor': { borderLeftColor: '#e2e8f0' },
  },
  { dark: true },
);
