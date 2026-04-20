import { useCallback, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { File, FileUp, FileDown, FileCode } from 'lucide-react';
import { DropdownMenu, type DropdownMenuItem } from '../Menu/DropdownMenu';
import { useDocumentStore } from '../../stores/documentStore';
import { useUIStore } from '../../stores/uiStore';

// HTML 내보내기 경로는 unified 파이프라인 + KaTeX/hljs CSS를 끌어오므로
// 사용자가 실제로 메뉴를 눌렀을 때 지연 로드해서 메인 번들 용량을 억제한다.

// 파일 메뉴. 가져오기는 숨은 input을 트리거하고, 내보내기는 현재 문서를 직접 export 모듈에 넘긴다.
export function FileMenu() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const title = useDocumentStore((s) => s.title);
  const content = useDocumentStore((s) => s.content);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const switchTo = useDocumentStore((s) => s.switchTo);
  const theme = useUIStore((s) => s.theme);

  const handleImportClick = useCallback(() => {
    // 같은 파일을 연속 선택해도 change가 발생하도록 value를 비운다.
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }, []);

  const handleFilesChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const { readMarkdownFiles } = await import('../../lib/export/import');
      const result = await readMarkdownFiles(files);
      let lastId: string | null = null;
      for (const item of result.imported) {
        const id = await createDocument({ title: item.title, content: item.content });
        lastId = id;
      }
      if (lastId) {
        await switchTo(lastId);
      }
      if (result.errors.length > 0) {
        const message = result.errors
          .map((err) => `${err.fileName}: ${err.reason}`)
          .join('\n');
        window.alert(`다음 파일을 가져오지 못했습니다.\n${message}`);
      }
      // 리셋: 다음 같은 파일을 다시 선택할 수 있도록.
      if (inputRef.current) inputRef.current.value = '';
    },
    [createDocument, switchTo],
  );

  const handleExportMarkdown = useCallback(async () => {
    const { downloadMarkdown } = await import('../../lib/export/markdown');
    downloadMarkdown({ title, content });
  }, [title, content]);

  const handleExportHtml = useCallback(async () => {
    const { downloadHtml } = await import('../../lib/export/html');
    await downloadHtml({ title, content }, { theme });
  }, [title, content, theme]);

  const items: DropdownMenuItem[] = [
    { label: '가져오기 (.md)', icon: FileUp, onSelect: handleImportClick },
    { label: '내보내기 (.md)', icon: FileDown, onSelect: handleExportMarkdown },
    { label: '내보내기 (.html)', icon: FileCode, onSelect: handleExportHtml },
  ];

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        multiple
        onChange={handleFilesChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <DropdownMenu triggerLabel="파일 메뉴" triggerIcon={File} items={items} />
    </>
  );
}
