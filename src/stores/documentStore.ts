import { create } from 'zustand';

const DEFAULT_CONTENT = `# 새 문서

여기에 **마크다운**을 작성하세요.

- 목록 항목 1
- 목록 항목 2

\`\`\`ts
const hello = 'world';
\`\`\`
`;

type DocumentState = {
  title: string;
  content: string;
  setTitle: (title: string) => void;
  setContent: (content: string) => void;
  reset: () => void;
};

export const useDocumentStore = create<DocumentState>((set) => ({
  title: '새 문서',
  content: DEFAULT_CONTENT,
  setTitle: (title) => set({ title }),
  setContent: (content) => set({ content }),
  reset: () => set({ title: '새 문서', content: DEFAULT_CONTENT }),
}));
