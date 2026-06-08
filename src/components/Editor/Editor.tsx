import { useEffect, useRef } from 'react';
import { EditorState, Compartment, type Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore, type Theme } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import { lightTheme, darkTheme, focusModePlugin, type FocusModeConfig } from './cmTheme';
import { toggleBold, toggleItalic } from '../../lib/editor/commands';

function buildExtensions(
  themeCompartment: Compartment,
  theme: Theme,
  focusConfig: FocusModeConfig
): Extension[] {
  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    bracketMatching(),
    indentOnInput(),
    keymap.of([
      {
        key: 'Mod-b',
        run: (v) => {
          toggleBold(v);
          return true;
        },
      },
      {
        key: 'Mod-i',
        run: (v) => {
          toggleItalic(v);
          return true;
        },
      },
      ...defaultKeymap,
      ...historyKeymap,
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ 'aria-label': '마크다운 편집기' }),
    themeCompartment.of(theme === 'dark' ? darkTheme : lightTheme),
  ];

  // 포커스 모드 플러그인 추가
  if (focusConfig.enabled) {
    extensions.push(focusModePlugin(focusConfig));
  }

  extensions.push(
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString();
        const store = useDocumentStore.getState();
        if (value !== store.content) {
          store.setContent(value);
        }
      }
    })
  );

  return extensions;
}

export function Editor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const theme = useUIStore((s) => s.theme);
  const focusMode = useUIStore((s) => s.focusMode);

  const focusConfig: FocusModeConfig = {
    enabled: focusMode,
    fadeOthers: true,
    highlightCurrentLine: true,
  };

  useEffect(() => {
    if (!hostRef.current) return;

    const initialContent = useDocumentStore.getState().content;
    const state = EditorState.create({
      doc: initialContent,
      extensions: buildExtensions(
        themeCompartmentRef.current,
        useUIStore.getState().theme,
        focusConfig
      ),
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    useEditorStore.getState().setView(view);

    const unsub = useDocumentStore.subscribe((state, prev) => {
      // 문서 전환: undo 히스토리가 이전 문서와 섞이지 않도록 setState로 상태를 완전히 교체한다.
      if (state.activeId !== prev.activeId) {
        themeCompartmentRef.current = new Compartment();
        view.setState(
          EditorState.create({
            doc: state.content,
            extensions: buildExtensions(
              themeCompartmentRef.current,
              useUIStore.getState().theme,
              focusConfig
            ),
          }),
        );
        return;
      }

      // 같은 문서에서의 외부 content 변경: 히스토리를 유지해야 하므로 dispatch로 diff만 반영.
      if (state.content === prev.content) return;
      const current = view.state.doc.toString();
      if (state.content !== current) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: state.content },
        });
      }
    });

    return () => {
      unsub();
      useEditorStore.getState().setView(null);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(
        theme === 'dark' ? darkTheme : lightTheme,
      ),
    });
  }, [theme, focusMode]);

  return <div ref={hostRef} className="h-full w-full" data-testid="editor-host" />;
}
