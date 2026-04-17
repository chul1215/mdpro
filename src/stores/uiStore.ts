import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type ViewMode = 'edit' | 'split' | 'preview';

type UIState = {
  theme: Theme;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: prefersDark() ? 'dark' : 'light',
      viewMode: 'split',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    {
      name: 'mdpro-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
      }),
    },
  ),
);
