import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';

export function useTheme() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('gameboy', theme === 'gameboy');
    root.dataset.theme = theme;
  }, [theme]);

  return theme;
}
