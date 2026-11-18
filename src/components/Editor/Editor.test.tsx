import { render, screen, act, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { undo } from '@codemirror/commands';
import { Editor } from './Editor';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true, focusMode: false });
    // documentStore는 IDB 기반이라 reset이 없다. 테스트용 초기 content/activeId만 주입한다.
    useDocumentStore.setState({
      activeId: null,
      title: '새 문서',
      content: '새 문서',
      titleManual: false,
    });
  });

  it('mounts a CodeMirror host with initial document content', () => {
    render(<Editor />);
    const host = screen.getByTestId('editor-host');
    expect(host).toBeInTheDocument();
    expect(host.querySelector('.cm-editor')).not.toBeNull();
    expect(host.textContent).toContain('새 문서');
  });

  it('reflects external store content updates inside the editor', () => {
    render(<Editor />);
    act(() => {
      useDocumentStore.getState().setContent('# Hello MDPro');
    });
    const host = screen.getByTestId('editor-host');
    expect(host.textContent).toContain('Hello MDPro');
  });

  it('replaces document state on activeId switch and isolates undo history', () => {
    render(<Editor />);

    act(() => {
      useDocumentStore.setState({ activeId: 'doc-a', content: '# A 문서' });
    });
    const viewAfterFirst = useEditorStore.getState().view;
    expect(viewAfterFirst?.state.doc.toString()).toContain('A 문서');

    act(() => {
      useDocumentStore.setState({ activeId: 'doc-b', content: '# B 문서' });
    });

    const view = useEditorStore.getState().view;
    expect(view).not.toBeNull();
    if (!view) throw new Error('view missing');
    expect(view.state.doc.toString()).toContain('B 문서');

    // 문서 전환 시 undo 히스토리가 리셋되어야 하므로 undo 해도 A로 돌아가지 않는다.
    act(() => {
      undo(view);
    });
    expect(view.state.doc.toString()).toContain('B 문서');
    expect(view.state.doc.toString()).not.toContain('A 문서');
  });

  it('indents selected lines with Tab and outdents them with Shift+Tab', () => {
    useDocumentStore.setState({ content: '첫 줄\n둘째 줄' });
    render(<Editor />);
    const view = useEditorStore.getState().view;
    if (!view) throw new Error('view missing');

    act(() => {
      view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
      fireEvent.keyDown(view.contentDOM, { key: 'Tab' });
    });
    expect(view.state.doc.toString()).toBe('  첫 줄\n  둘째 줄');

    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: 'Tab', shiftKey: true });
    });
    expect(view.state.doc.toString()).toBe('첫 줄\n둘째 줄');
  });

  it('continues an indented Markdown list with Enter and exits one level on an empty item', () => {
    useDocumentStore.setState({ content: '- 상위\n  - 하위' });
    render(<Editor />);
    const view = useEditorStore.getState().view;
    if (!view) throw new Error('view missing');

    act(() => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
    });
    expect(view.state.doc.toString()).toBe('- 상위\n  - 하위\n  - ');

    act(() => {
      fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
    });
    expect(view.state.doc.toString()).toBe('- 상위\n  - 하위\n- ');
  });

  it('moves an empty nested Markdown item outward with Backspace', () => {
    useDocumentStore.setState({ content: '- 상위\n  - ' });
    render(<Editor />);
    const view = useEditorStore.getState().view;
    if (!view) throw new Error('view missing');

    act(() => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      fireEvent.keyDown(view.contentDOM, { key: 'Backspace' });
    });

    expect(view.state.doc.toString()).toBe('- 상위\n- ');
  });

  it('exits a top-level empty task list item with Enter', () => {
    useDocumentStore.setState({ content: '- [ ] ' });
    render(<Editor />);
    const view = useEditorStore.getState().view;
    if (!view) throw new Error('view missing');

    act(() => {
      view.dispatch({ selection: { anchor: view.state.doc.length } });
      fireEvent.keyDown(view.contentDOM, { key: 'Enter' });
    });

    expect(view.state.doc.toString()).toBe('');
  });

  it('toggles focus mode decorations without remounting the editor', () => {
    useDocumentStore.setState({ content: '첫 줄\n둘째 줄\n셋째 줄' });
    render(<Editor />);
    const host = screen.getByTestId('editor-host');
    const initialView = useEditorStore.getState().view;
    expect(host.querySelector('.cm-focus-mode-dimmed-line')).toBeNull();

    act(() => {
      useUIStore.setState({ focusMode: true });
    });

    expect(useEditorStore.getState().view).toBe(initialView);
    expect(host.querySelector('.cm-focus-mode-dimmed-line')).not.toBeNull();
  });
});
