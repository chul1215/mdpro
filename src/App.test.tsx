import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { useUIStore } from './stores/uiStore';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
  });

  it('renders top bar and editor/preview panes', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '에디터' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '프리뷰' })).toBeInTheDocument();
  });

  it('applies dark class on documentElement when theme is dark', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<App />);
    expect(document.documentElement).toHaveClass('dark');
  });
});
