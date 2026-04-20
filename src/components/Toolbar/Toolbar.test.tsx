import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// 모듈 레벨 모킹: Toolbar가 import하는 commands 함수들을 스파이로 치환한다.
vi.mock('../../lib/editor/commands', () => ({
  toggleBold: vi.fn(),
  toggleItalic: vi.fn(),
  toggleStrikethrough: vi.fn(),
  toggleInlineCode: vi.fn(),
  toggleHeading: vi.fn(),
  toggleBulletList: vi.fn(),
  toggleNumberedList: vi.fn(),
  toggleCheckList: vi.fn(),
  toggleQuote: vi.fn(),
  insertLink: vi.fn(),
  insertCodeBlock: vi.fn(),
}));

import { Toolbar } from './Toolbar';
import { useEditorStore } from '../../stores/editorStore';
import * as commands from '../../lib/editor/commands';

function createView(): EditorView {
  return new EditorView({ state: EditorState.create({ doc: 'hello' }) });
}

describe('Toolbar', () => {
  beforeEach(() => {
    useEditorStore.getState().setView(null);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // view 구독자(Toolbar)가 여전히 마운트된 상태에서 스토어를 리셋하므로 act로 감싼다.
    act(() => {
      useEditorStore.getState().setView(null);
    });
  });

  it('renders toolbar landmark with core formatting buttons', () => {
    render(<Toolbar />);
    expect(screen.getByRole('toolbar', { name: '서식 도구' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '굵게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기울임' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소선' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '인라인 코드' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제목 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제목 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '제목 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '불릿 목록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '번호 목록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '체크리스트' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '링크' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '코드 블록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '인용구' })).toBeInTheDocument();
  });

  it('disables every button when no editor view is registered', () => {
    render(<Toolbar />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }
  });

  it('enables buttons and invokes the matching command on click', async () => {
    const view = createView();
    useEditorStore.getState().setView(view);
    const user = userEvent.setup();

    render(<Toolbar />);
    const boldButton = screen.getByRole('button', { name: '굵게' });
    expect(boldButton).toBeEnabled();

    await user.click(boldButton);
    expect(commands.toggleBold).toHaveBeenCalledTimes(1);
    expect(commands.toggleBold).toHaveBeenCalledWith(view);

    view.destroy();
  });

  it('calls toggleHeading with the correct level argument', async () => {
    const view = createView();
    useEditorStore.getState().setView(view);
    const user = userEvent.setup();

    render(<Toolbar />);
    await user.click(screen.getByRole('button', { name: '제목 2' }));
    expect(commands.toggleHeading).toHaveBeenCalledWith(view, 2);

    view.destroy();
  });

  it('moves focus to the next button when ArrowRight is pressed', async () => {
    const view = createView();
    useEditorStore.getState().setView(view);
    const user = userEvent.setup();

    render(<Toolbar />);
    const bold = screen.getByRole('button', { name: '굵게' });
    const italic = screen.getByRole('button', { name: '기울임' });

    bold.focus();
    expect(bold).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(italic).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(bold).toHaveFocus();

    view.destroy();
  });

  it('uses roving tabindex so only one button is in the tab sequence', () => {
    render(<Toolbar />);
    const buttons = screen.getAllByRole('button');
    const tabbables = buttons.filter((b) => b.getAttribute('tabindex') === '0');
    expect(tabbables).toHaveLength(1);
  });
});
