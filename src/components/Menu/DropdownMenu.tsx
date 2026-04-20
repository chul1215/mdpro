import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  ComponentType,
  KeyboardEvent as ReactKeyboardEvent,
  SVGProps,
} from 'react';

export type DropdownIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type DropdownMenuItem = {
  label: string;
  icon?: DropdownIcon;
  onSelect: () => void;
  destructive?: boolean;
};

export type DropdownMenuProps = {
  triggerLabel: string;
  triggerIcon: DropdownIcon;
  items: DropdownMenuItem[];
};

// 접근성 드롭다운 메뉴. 트리거 버튼 + role="menu" 패널.
// - 외부 클릭/ESC로 닫힘
// - ArrowUp/Down/Home/End로 항목 간 이동
// - Enter/Space로 선택
// - 닫힐 때 트리거에 포커스 복원 (ESC 경로)
export function DropdownMenu({
  triggerLabel,
  triggerIcon: TriggerIcon,
  items,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // 열렸을 때만 전역 mousedown/keydown 리스너 등록.
  // mousedown 사용 이유: click보다 먼저 발생해 다른 요소의 click 핸들러 취소 전에 닫을 수 있다.
  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  // 열릴 때 첫 항목에 포커스. 지연 없이 effect에서 포커스를 주면
  // 동일 tick의 click(document) 리스너와 충돌이 없다 (mousedown만 구독하므로).
  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    itemRefs.current[0]?.focus();
  }, [open]);

  const focusAt = useCallback(
    (index: number) => {
      const total = items.length;
      if (total === 0) return;
      const next = ((index % total) + total) % total;
      setActiveIndex(next);
      itemRefs.current[next]?.focus();
    },
    [items.length],
  );

  const onMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusAt(activeIndex + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusAt(activeIndex - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusAt(0);
          break;
        case 'End':
          event.preventDefault();
          focusAt(items.length - 1);
          break;
        case 'Tab':
          // 메뉴 바깥으로 포커스가 빠지면 닫는다. 트리거에 포커스는 복원하지 않음(자연스러운 Tab).
          setOpen(false);
          break;
        default:
          break;
      }
    },
    [activeIndex, focusAt, items.length],
  );

  const handleSelect = useCallback(
    (item: DropdownMenuItem) => {
      // 먼저 닫고(리렌더 안정화) 콜백 실행.
      setOpen(false);
      item.onSelect();
    },
    [],
  );

  const onTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (!open && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        setOpen(true);
      }
    },
    [open],
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className="shrink-0 rounded p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <TriggerIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-1 min-w-[12rem] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex flex-col py-1">
            {items.map((item, index) => {
              const Icon = item.icon;
              const destructiveClass = item.destructive
                ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700';
              return (
                <button
                  key={item.label}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => handleSelect(item)}
                  className={
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ' +
                    destructiveClass
                  }
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
