import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { Layout } from './Layout';
import { useUIStore } from '../../stores/uiStore';

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
  });

  it('shows both editor and preview in split mode', () => {
    render(<Layout />);
    expect(screen.getByRole('region', { name: '에디터' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '프리뷰' })).toBeInTheDocument();
  });

  it('hides preview in edit-only mode', () => {
    useUIStore.setState({ viewMode: 'edit' });
    render(<Layout />);
    expect(screen.getByRole('region', { name: '에디터' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '프리뷰' })).not.toBeInTheDocument();
  });

  it('hides editor in preview-only mode', () => {
    useUIStore.setState({ viewMode: 'preview' });
    render(<Layout />);
    expect(screen.queryByRole('region', { name: '에디터' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '프리뷰' })).toBeInTheDocument();
  });

  it('hides sidebar when sidebarOpen is false', () => {
    useUIStore.setState({ sidebarOpen: false });
    render(<Layout />);
    expect(screen.queryByRole('complementary', { name: '문서 목록' })).not.toBeInTheDocument();
  });
});
