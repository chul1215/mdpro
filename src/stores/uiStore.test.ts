import { beforeEach, describe, expect, it } from 'vitest';
import { getInitialViewMode, normalizeTheme, useUIStore } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({
      theme: 'light',
      viewMode: 'split',
      sidebarOpen: true,
      splitRatio: 50,
    });
  });

  it('cycles through light, dark, and Game Boy themes', () => {
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('gameboy');
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
    useUIStore.getState().setTheme('gameboy');
    const persisted = JSON.parse(localStorage.getItem('mdpro-ui') ?? '{}');
    expect(persisted.state.theme).toBe('gameboy');
    expect(persisted.version).toBe(1);
  });

  it.each(['system', 'neon', null, undefined])('normalizes invalid persisted theme %s', (theme) => {
    expect(normalizeTheme(theme, 'dark')).toBe('dark');
  });

  it.each(['light', 'dark', 'gameboy'] as const)('keeps valid persisted theme %s', (theme) => {
    expect(normalizeTheme(theme, 'light')).toBe(theme);
  });

  it('normalizes invalid theme during persist rehydration', async () => {
    localStorage.setItem('mdpro-ui', JSON.stringify({ state: { theme: 'neon' }, version: 0 }));
    await useUIStore.persist.rehydrate();
    expect(useUIStore.getState().theme).toBe('light');
    expect(() => useUIStore.getState().toggleTheme()).not.toThrow();
  });

  it('defaults to edit-only view on mobile-width screens', () => {
    expect(getInitialViewMode(true)).toBe('edit');
    expect(getInitialViewMode(false)).toBe('split');
  });

  it('stores a clamped split ratio for the editor and preview panes', () => {
    useUIStore.getState().setSplitRatio(65);
    expect(useUIStore.getState().splitRatio).toBe(65);

    useUIStore.getState().setSplitRatio(10);
    expect(useUIStore.getState().splitRatio).toBe(25);

    useUIStore.getState().setSplitRatio(90);
    expect(useUIStore.getState().splitRatio).toBe(75);

    const persisted = JSON.parse(localStorage.getItem('mdpro-ui') ?? '{}');
    expect(persisted.state.splitRatio).toBe(75);
  });
});
