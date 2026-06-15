import { useUIStore } from '../../stores/uiStore';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { EditorPane } from './EditorPane';
import { PreviewPane } from './PreviewPane';
import { Toolbar } from '../Toolbar/Toolbar';
import { DropOverlay } from './DropOverlay';

export function Layout() {
  const viewMode = useUIStore((s) => s.viewMode);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <div className="relative flex h-full w-full flex-row bg-apple-bg text-apple-ink dark:bg-black dark:text-white">
      {sidebarOpen && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <Toolbar />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
            {viewMode !== 'preview' && <EditorPane />}
            {viewMode !== 'edit' && <PreviewPane />}
          </main>
        </div>
      </div>
      <DropOverlay />
    </div>
  );
}
