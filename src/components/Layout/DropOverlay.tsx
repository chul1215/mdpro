import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { readMarkdownFiles } from '../../lib/export/import';

// window 레벨 드래그 앤 드롭 오버레이.
// dragenter/leave는 자식 요소 전환 시마다 쌍으로 발생하므로 counter로 흡수해
// 깜빡임 없이 최상위 진입/이탈만 감지한다.
export function DropOverlay() {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const createDocument = useDocumentStore((s) => s.createDocument);
  const switchTo = useDocumentStore((s) => s.switchTo);

  useEffect(() => {
    const hasFiles = (dt: DataTransfer | null): boolean => {
      if (!dt) return false;
      return Array.from(dt.types).includes('Files');
    };

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragCounterRef.current += 1;
      setIsDragging(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      // preventDefault 없으면 drop이 발동되지 않는다.
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      dragCounterRef.current -= 1;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setIsDragging(false);
      }
    };

    const onDrop = async (event: DragEvent) => {
      if (!hasFiles(event.dataTransfer)) return;
      event.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;
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
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [createDocument, switchTo]);

  if (!isDragging) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/15 backdrop-blur-sm"
    >
      <div className="rounded-2xl bg-white/95 px-12 py-10 shadow-apple ring-1 ring-blue-500 dark:bg-surface-1/95">
        <p className="text-center font-display text-[21px] font-semibold tracking-tight text-apple-ink dark:text-white">
          마크다운 파일을 놓으세요
        </p>
        <p className="mt-2 text-center text-[13px] text-apple-ink/60 dark:text-white/60">
          .md / .markdown 파일을 지원합니다
        </p>
      </div>
    </div>
  );
}
