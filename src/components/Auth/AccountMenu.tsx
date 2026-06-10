import { LogIn, LogOut, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        {error ? <span className="hidden text-[11px] text-red-200 sm:inline">{error}</span> : null}
        <button
          type="button"
          onClick={() => void signIn()}
          disabled={loading}
          aria-label="Google 로그인"
          className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-8 sm:min-w-8"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">Google 로그인</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-11 min-w-0 shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-1.5 py-1 sm:min-h-0">
      <UserCircle className="h-4 w-4 text-white/70" aria-hidden="true" />
      <div className="hidden min-w-0 flex-col leading-tight lg:flex">
        <span className="truncate text-[11px] font-medium text-white">
          {user.displayName ?? 'Google 계정'}
        </span>
        <span className="truncate text-[10px] text-white/60">{user.email}</span>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={loading}
        aria-label="로그아웃"
        title="로그아웃"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-7 sm:w-7"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
