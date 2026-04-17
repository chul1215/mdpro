import { Editor } from '../Editor/Editor';

export function EditorPane() {
  return (
    <section
      aria-label="에디터"
      className="flex min-h-0 min-w-0 flex-1 flex-col border-b border-slate-200 bg-white last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span>에디터</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <Editor />
      </div>
    </section>
  );
}
