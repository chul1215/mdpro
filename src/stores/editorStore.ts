import { create } from 'zustand';
import type { EditorView } from '@codemirror/view';

type EditorState = {
  view: EditorView | null;
  setView: (view: EditorView | null) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  view: null,
  setView: (view) => set({ view }),
}));
