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
    <div className="flex h-full w-full flex-col bg-apple-bg text-apple-ink dark:bg-black dark:text-white">
      <TopBar />
      <Toolbar />
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && <Sidebar />}
        <main className="flex min-w-0 flex-1 flex-col md:flex-row">
          {viewMode !== 'preview' && <EditorPane />}
          {viewMode !== 'edit' && <PreviewPane />}
        </main>
      </div>
      <DropOverlay />
    </div>
  );
}
