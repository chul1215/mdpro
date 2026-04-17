import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
  });

  it('toggles theme between light and dark', () => {
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('sets view mode', () => {
    useUIStore.getState().setViewMode('edit');
    expect(useUIStore.getState().viewMode).toBe('edit');
    useUIStore.getState().setViewMode('preview');
    expect(useUIStore.getState().viewMode).toBe('preview');
  });

  it('toggles sidebar', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('persists theme to localStorage', () => {
    useUIStore.getState().setTheme('dark');
    const persisted = JSON.parse(localStorage.getItem('mdpro-ui') ?? '{}');
    expect(persisted.state.theme).toBe('dark');
  });
});
