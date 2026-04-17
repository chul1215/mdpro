import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { TopBar } from './TopBar';
import { useUIStore } from '../../stores/uiStore';

describe('TopBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
  });

  it('renders view mode radio group with three options', () => {
    render(<TopBar />);
    const group = screen.getByRole('radiogroup', { name: '뷰 모드' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '편집만' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '분할' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '프리뷰만' })).toBeInTheDocument();
  });

  it('marks current view mode as checked', () => {
    render(<TopBar />);
    expect(screen.getByRole('radio', { name: '분할' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('changes view mode on click', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('radio', { name: '편집만' }));
    expect(useUIStore.getState().viewMode).toBe('edit');
  });

  it('toggles theme when theme button clicked', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('button', { name: /다크 모드로 전환/ }));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('toggles sidebar via sidebar button', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    await user.click(screen.getByRole('button', { name: '사이드바 토글' }));
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });
});
