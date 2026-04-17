import { render, screen, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Editor } from './Editor';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';

describe('Editor', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
    useDocumentStore.getState().reset();
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
});
