import { afterEach, describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useEditorStore } from './editorStore';

describe('editorStore', () => {
  afterEach(() => {
    useEditorStore.getState().setView(null);
  });

  it('starts with no view', () => {
    expect(useEditorStore.getState().view).toBeNull();
  });

  it('registers and clears a view', () => {
    const view = new EditorView({ state: EditorState.create({ doc: 'hi' }) });
    useEditorStore.getState().setView(view);
    expect(useEditorStore.getState().view).toBe(view);
    useEditorStore.getState().setView(null);
    expect(useEditorStore.getState().view).toBeNull();
    view.destroy();
  });
});
