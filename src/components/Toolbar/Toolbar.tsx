import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ComponentType, SVGProps } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Link as LinkIcon,
  Code2,
  Quote,
} from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { useEditorStore } from '../../stores/editorStore';
import {
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleInlineCode,
  toggleHeading,
  toggleBulletList,
  toggleNumberedList,
  toggleCheckList,
  toggleQuote,
  insertLink,
  insertCodeBlock,
} from '../../lib/editor/commands';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type ToolbarItem = {
  id: string;
  label: string;
  shortcut?: string; // 플랫폼 prefix 없는 순수 키 (예: "B"). 빈 값이면 단축키 없음.
  icon: IconType;
  run: (view: EditorView) => void;
};

type ToolbarGroup = {
  id: string;
  items: ToolbarItem[];
};

// 단축키 표기를 OS에 맞게 포맷한다. macOS는 ⌘, 그 외는 Ctrl.
// SSR/jsdom에서 navigator가 없을 수 있어 typeof 가드를 둔다.
function useModKey(): string {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return 'Ctrl';
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? '⌘' : 'Ctrl';
  }, []);
}

const GROUPS: ToolbarGroup[] = [
  {
    id: 'inline',
    items: [
      { id: 'bold', label: '굵게', shortcut: 'B', icon: Bold, run: toggleBold },
      { id: 'italic', label: '기울임', shortcut: 'I', icon: Italic, run: toggleItalic },
      { id: 'strike', label: '취소선', icon: Strikethrough, run: toggleStrikethrough },
      { id: 'inline-code', label: '인라인 코드', icon: Code, run: toggleInlineCode },
    ],
  },
  {
    id: 'heading',
    items: [
      {
        id: 'h1',
        label: '제목 1',
        icon: Heading1,
        run: (view) => toggleHeading(view, 1),
      },
      {
        id: 'h2',
        label: '제목 2',
        icon: Heading2,
        run: (view) => toggleHeading(view, 2),
      },
      {
        id: 'h3',
        label: '제목 3',
        icon: Heading3,
        run: (view) => toggleHeading(view, 3),
      },
    ],
  },
  {
    id: 'list',
    items: [
      { id: 'bullet', label: '불릿 목록', icon: List, run: toggleBulletList },
      { id: 'numbered', label: '번호 목록', icon: ListOrdered, run: toggleNumberedList },
      { id: 'check', label: '체크리스트', icon: ListChecks, run: toggleCheckList },
    ],
  },
  {
    id: 'block',
    items: [
      { id: 'link', label: '링크', icon: LinkIcon, run: (view) => insertLink(view) },
      {
        id: 'code-block',
        label: '코드 블록',
        icon: Code2,
        run: (view) => insertCodeBlock(view),
      },
      { id: 'quote', label: '인용구', icon: Quote, run: toggleQuote },
    ],
  },
];

// 평면 리스트는 roving tabindex 인덱스 계산용. 그룹 구조는 시각적 구분만 담당.
const FLAT_ITEMS: ToolbarItem[] = GROUPS.flatMap((g) => g.items);

function formatTitle(label: string, shortcut: string | undefined, mod: string): string {
  if (!shortcut) return label;
  return `${label} (${mod}+${shortcut})`;
}

export function Toolbar() {
  const view = useEditorStore((s) => s.view);
  const mod = useModKey();
  const disabled = view === null;

  // roving tabindex: 툴바 내에서 오직 한 버튼만 tabIndex=0. 화살표로 이동.
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // disabled -> enabled 전환 시 인덱스를 리셋하여 첫 버튼에서 시작하도록 한다.
  useEffect(() => {
    if (disabled) setActiveIndex(0);
  }, [disabled]);

  const focusAt = useCallback((index: number) => {
    const total = FLAT_ITEMS.length;
    const next = ((index % total) + total) % total;
    setActiveIndex(next);
    buttonRefs.current[next]?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          focusAt(activeIndex + 1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          focusAt(activeIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusAt(0);
          break;
        case 'End':
          event.preventDefault();
          focusAt(FLAT_ITEMS.length - 1);
          break;
        default:
          break;
      }
    },
    [activeIndex, focusAt],
  );

  const handleClick = useCallback(
    (item: ToolbarItem, index: number) => {
      if (!view) return;
      setActiveIndex(index);
      item.run(view);
    },
    [view],
  );

  return (
    <div
      role="toolbar"
      aria-label="서식 도구"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto bg-apple-bg px-2 dark:bg-black"
    >
      {GROUPS.map((group, groupIndex) => {
        const groupStart = GROUPS.slice(0, groupIndex).reduce(
          (acc, g) => acc + g.items.length,
          0,
        );
        return (
          <div key={group.id} className="flex items-center gap-0.5">
            {groupIndex > 0 && (
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 bg-black/10 dark:bg-white/10"
              />
            )}
            {group.items.map((item, localIndex) => {
              const flatIndex = groupStart + localIndex;
              const Icon = item.icon;
              const title = formatTitle(item.label, item.shortcut, mod);
              return (
                <button
                  key={item.id}
                  ref={(el) => {
                    buttonRefs.current[flatIndex] = el;
                  }}
                  type="button"
                  aria-label={item.label}
                  title={title}
                  disabled={disabled}
                  tabIndex={flatIndex === activeIndex ? 0 : -1}
                  onClick={() => handleClick(item, flatIndex)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-apple-ink/70 transition-colors hover:bg-black/5 hover:text-apple-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-apple-ink/70 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:disabled:hover:bg-transparent dark:disabled:hover:text-white/70"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
