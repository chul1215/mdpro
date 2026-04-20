import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { undo } from '@codemirror/commands';
import { Editor } from './Editor';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
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
});
