import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// TopBar가 documentStore에서 title/setTitle을 읽으므로 스토어를 모킹해 IDB 접근을 우회한다.
const setTitle = vi.fn();
let mockDoc = { title: '', setTitle };

vi.mock('../../stores/documentStore', () => ({
  useDocumentStore: <T,>(selector: (s: typeof mockDoc) => T) => selector(mockDoc),
}));

import { TopBar } from './TopBar';
import { useUIStore } from '../../stores/uiStore';

describe('TopBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ theme: 'light', viewMode: 'split', sidebarOpen: true });
    setTitle.mockClear();
    mockDoc = { title: '', setTitle };
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

  it('renders title input with aria-label 문서 제목', () => {
    mockDoc = { title: 'My Doc', setTitle };
    render(<TopBar />);
    const input = screen.getByRole('textbox', { name: '문서 제목' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('My Doc');
  });

  it('calls setTitle when title input changes', async () => {
    const user = userEvent.setup();
    render(<TopBar />);
    const input = screen.getByRole('textbox', { name: '문서 제목' });
    await user.type(input, 'A');
    expect(setTitle).toHaveBeenCalled();
    // 마지막 인자가 'A'인지 확인 (controlled input + 빈 초기값).
    expect(setTitle).toHaveBeenLastCalledWith('A');
  });
});
