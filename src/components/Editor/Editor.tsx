import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';
import { lightTheme, darkTheme } from './cmTheme';

export function Editor() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (!hostRef.current) return;

    const themeCompartment = themeCompartmentRef.current;
    const initialContent = useDocumentStore.getState().content;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        bracketMatching(),
        indentOnInput(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        EditorView.lineWrapping,
        themeCompartment.of(
          useUIStore.getState().theme === 'dark' ? darkTheme : lightTheme,
        ),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            const store = useDocumentStore.getState();
            if (value !== store.content) {
              store.setContent(value);
            }
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;

    const unsub = useDocumentStore.subscribe((state, prev) => {
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
  }, [theme]);

  return <div ref={hostRef} className="h-full w-full" data-testid="editor-host" />;
}
