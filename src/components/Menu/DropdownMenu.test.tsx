import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { File, FileUp, FileDown } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';

function renderMenu(onSelectA = vi.fn(), onSelectB = vi.fn()) {
  const items = [
    { label: '가져오기', icon: FileUp, onSelect: onSelectA },
    { label: '내보내기', icon: FileDown, onSelect: onSelectB },
  ];
  render(
    <div>
      <button type="button">바깥</button>
      <DropdownMenu triggerLabel="파일 메뉴" triggerIcon={File} items={items} />
    </div>,
  );
  return { onSelectA, onSelectB };
}

describe('DropdownMenu', () => {
  it('renders trigger with aria-haspopup=menu and aria-expanded=false', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: '파일 메뉴' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens menu on trigger click and sets aria-expanded=true', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: '파일 메뉴' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: '파일 메뉴' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('closes menu on outside mousedown', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: '파일 메뉴' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // mousedown을 직접 디스패치해 외부 클릭을 재현. userEvent.click은 둘 다 발생시키지만 명시성을 위해 분리.
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('closes menu on Escape and restores focus to trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: '파일 메뉴' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it('invokes onSelect and closes when menu item is clicked', async () => {
    const user = userEvent.setup();
    const { onSelectA } = renderMenu();
    await user.click(screen.getByRole('button', { name: '파일 메뉴' }));
    await user.click(screen.getByRole('menuitem', { name: '가져오기' }));
    expect(onSelectA).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('moves focus to next item on ArrowDown', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: '파일 메뉴' }));
    // 첫 항목에 자동 포커스 — ArrowDown 누르면 두 번째 항목으로 이동.
    const items = screen.getAllByRole('menuitem');
    await waitFor(() => expect(document.activeElement).toBe(items[0]));
    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    await waitFor(() => expect(document.activeElement).toBe(items[1]));
  });
});
