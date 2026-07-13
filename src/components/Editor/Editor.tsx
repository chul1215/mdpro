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

function makeFocusConfig(enabled: boolean): FocusModeConfig {
  return {
    enabled,
    fadeOthers: true,
    highlightCurrentLine: true,
  };
}

function focusExtension(focusConfig: FocusModeConfig): Extension {
  return focusConfig.enabled ? focusModePlugin(focusConfig) : [];
}

function buildExtensions(
  themeCompartment: Compartment,
  focusCompartment: Compartment,
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
    focusCompartment.of(focusExtension(focusConfig)),
  ];

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

type EditorProps = {
  onScrollContainerReady?: (element: HTMLElement | null) => void;
  onScroll?: (element: HTMLElement) => void;
};

export function Editor({ onScrollContainerReady, onScroll }: EditorProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const focusCompartmentRef = useRef(new Compartment());
  const theme = useUIStore((s) => s.theme);
  const focusMode = useUIStore((s) => s.focusMode);

  useEffect(() => {
    if (!hostRef.current) return;

    const initialContent = useDocumentStore.getState().content;
    const state = EditorState.create({
      doc: initialContent,
      extensions: buildExtensions(
        themeCompartmentRef.current,
        focusCompartmentRef.current,
        useUIStore.getState().theme,
        makeFocusConfig(useUIStore.getState().focusMode)
      ),
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    useEditorStore.getState().setView(view);
    const scrollElement = view.scrollDOM;
    const handleScroll = () => onScroll?.(scrollElement);
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    onScrollContainerReady?.(scrollElement);

    const unsub = useDocumentStore.subscribe((state, prev) => {
      // 문서 전환: undo 히스토리가 이전 문서와 섞이지 않도록 setState로 상태를 완전히 교체한다.
      if (state.activeId !== prev.activeId) {
        themeCompartmentRef.current = new Compartment();
        view.setState(
          EditorState.create({
            doc: state.content,
            extensions: buildExtensions(
              themeCompartmentRef.current,
              focusCompartmentRef.current,
              useUIStore.getState().theme,
              makeFocusConfig(useUIStore.getState().focusMode)
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
      scrollElement.removeEventListener('scroll', handleScroll);
      onScrollContainerReady?.(null);
      useEditorStore.getState().setView(null);
      view.destroy();
      viewRef.current = null;
    };
  }, [onScroll, onScrollContainerReady]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const focusConfig = makeFocusConfig(focusMode);
    view.dispatch({
      effects: [
        themeCompartmentRef.current.reconfigure(
          theme === 'dark' ? darkTheme : lightTheme,
        ),
        focusCompartmentRef.current.reconfigure(focusExtension(focusConfig)),
      ],
    });
  }, [theme, focusMode]);

  return <div ref={hostRef} className="h-full w-full" data-testid="editor-host" />;
}
