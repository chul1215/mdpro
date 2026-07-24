import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signIn = vi.fn(async () => undefined);
const signOut = vi.fn(async () => undefined);
let mockAuth = {
  user: null as null | { uid: string; email: string; displayName: string | null; photoURL: string | null },
  loading: false,
  error: null as string | null,
  signIn,
  signOut,
};

vi.mock('../../stores/authStore', () => ({
  useAuthStore: <T,>(selector: (state: typeof mockAuth) => T) => selector(mockAuth),
}));

import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  beforeEach(() => {
    signIn.mockClear();
    signOut.mockClear();
    mockAuth = { user: null, loading: false, error: null, signIn, signOut };
  });

  it('shows Google login when signed out', async () => {
    render(<AccountMenu />);

    await userEvent.click(screen.getByRole('button', { name: 'Google 로그인' }));

    expect(signIn).toHaveBeenCalled();
  });

  it('shows signed-in email and signs out', async () => {
    mockAuth = {
      ...mockAuth,
      user: { uid: 'uid-1', email: 'user@example.com', displayName: '사용자', photoURL: null },
    };
    render(<AccountMenu />);

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그아웃' })).toHaveClass('h-11', 'w-11');
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(signOut).toHaveBeenCalled();
  });
});
