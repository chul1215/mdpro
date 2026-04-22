import { useEffect, useId, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // 열린 동안 ESC 전역 리스너 + 바디 스크롤 잠금. cleanup에서 모두 복원.
  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // confirm 버튼에 초기 포커스: 가장 자주 쓰는 동작을 즉시 선택 가능하게 한다.
    confirmRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  // confirm/cancel 두 버튼 사이만 순환하는 최소 focus trap.
  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const active = document.activeElement;
    if (event.shiftKey) {
      if (active === cancelRef.current) {
        event.preventDefault();
        confirmRef.current?.focus();
      } else if (active === confirmRef.current) {
        event.preventDefault();
        cancelRef.current?.focus();
      } else {
        // 외부에서 들어온 포커스는 우선 confirm으로 끌어온다.
        event.preventDefault();
        confirmRef.current?.focus();
      }
    } else {
      if (active === confirmRef.current) {
        event.preventDefault();
        cancelRef.current?.focus();
      } else if (active === cancelRef.current) {
        event.preventDefault();
        confirmRef.current?.focus();
      } else {
        event.preventDefault();
        confirmRef.current?.focus();
      }
    }
  };

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    // 다이얼로그 내부 클릭이 백드롭으로 버블링되어 닫히지 않도록.
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  const confirmClass = destructive
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-blue-500 hover:bg-blue-400 text-white';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
      data-testid="confirm-dialog-backdrop"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={handleDialogKeyDown}
        className="w-full max-w-sm rounded-xl bg-white shadow-apple ring-1 ring-black/5 dark:bg-surface-1 dark:ring-white/10"
      >
        <div className="px-6 pb-4 pt-6">
          <h2
            id={titleId}
            className="font-display text-[17px] font-semibold tracking-tight text-apple-ink dark:text-white"
          >
            {title}
          </h2>
          <p
            id={messageId}
            className="mt-2 text-[13px] leading-relaxed text-apple-ink/70 dark:text-white/70"
          >
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium text-apple-ink transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white dark:hover:bg-white/10"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              'rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ' +
              confirmClass
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
