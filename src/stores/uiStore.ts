import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'gameboy';
export type ViewMode = 'edit' | 'split' | 'preview';
export type SidebarTab = 'documents' | 'outline' | 'inbox' | 'addressBook';

const THEMES: readonly Theme[] = ['light', 'dark', 'gameboy'];

export function normalizeTheme(value: unknown, fallback: Theme = 'light'): Theme {
  return typeof value === 'string' && THEMES.includes(value as Theme)
    ? (value as Theme)
    : fallback;
}

type UIState = {
  theme: Theme;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  focusMode: boolean;
  sidebarTab: SidebarTab;
  splitRatio: number;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSplitRatio: (ratio: number) => void;
};

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches;

// md 미만에서는 사이드바가 오버레이로 렌더되므로 첫 방문 시 닫힘이 UX상 자연스럽다.
const prefersMobile = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(max-width: 767px)').matches;

export function getInitialViewMode(isMobile = prefersMobile()): ViewMode {
  return isMobile ? 'edit' : 'split';
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: prefersDark() ? 'dark' : 'light',
      viewMode: getInitialViewMode(),
      sidebarOpen: !prefersMobile(),
      focusMode: false,
      sidebarTab: 'documents',
      splitRatio: 50,
      setTheme: (theme) => set({ theme: normalizeTheme(theme) }),
      toggleTheme: () =>
        set((state) => ({
          theme:
            state.theme === 'light'
              ? 'dark'
              : state.theme === 'dark'
                ? 'gameboy'
                : 'light',
        })),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setFocusMode: (focusMode) => set({ focusMode }),
      toggleFocusMode: () =>
        set((state) => ({ focusMode: !state.focusMode })),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      setSplitRatio: (splitRatio) =>
        set({ splitRatio: Math.min(75, Math.max(25, Math.round(splitRatio))) }),
    }),
    {
      name: 'mdpro-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => persistedState,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<UIState>;
        return {
          ...currentState,
          ...persisted,
          theme: normalizeTheme(persisted.theme, currentState.theme),
        };
      },
      partialize: (state) => ({
        theme: state.theme,
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
        focusMode: state.focusMode,
        sidebarTab: state.sidebarTab,
        splitRatio: state.splitRatio,
      }),
    },
  ),
);
