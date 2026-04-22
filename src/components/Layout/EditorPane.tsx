import { Editor } from '../Editor/Editor';

export function EditorPane() {
  return (
    <section
      aria-label="에디터"
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-apple-bg dark:bg-black"
    >
      <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-apple-ink/70 dark:text-white/70">
        <span>에디터</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor />
      </div>
    </section>
  );
}
