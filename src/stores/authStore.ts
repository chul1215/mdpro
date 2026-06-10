import { create } from 'zustand';
import {
  signInWithGoogle,
  signOutOfGoogle,
  subscribeToAuthState,
  type AppUser,
} from '../lib/auth/authService';

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  start: () => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  loading: true,
  error: null,

  start: () => {
    set({ loading: true, error: null });
    try {
      return subscribeToAuthState((user) => {
        set({ user, loading: false, error: null });
      });
    } catch (error) {
      set({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : '로그인 초기화에 실패했습니다.',
      });
      return () => undefined;
    }
  },

  signIn: async () => {
    set({ loading: true, error: null });
    try {
      await signInWithGoogle();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '로그인에 실패했습니다.' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      await signOutOfGoogle();
      set({ user: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '로그아웃에 실패했습니다.' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
