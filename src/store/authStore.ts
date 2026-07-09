import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institutionId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

const TOKEN_KEY = 'yhanko_teacher_token';
const USER_KEY = 'yhanko_teacher_user';

// Helper to initialize state from cookies
const getInitialState = () => {
  const token = Cookies.get(TOKEN_KEY) || null;
  const userStr = Cookies.get(USER_KEY);
  let user = null;

  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user from cookie', e);
    }
  }

  return { token, user };
};

export const useAuthStore = create<AuthState>((set) => ({
  ...getInitialState(),

  setAuth: (user, token) => {
    Cookies.set(TOKEN_KEY, token, { expires: 7, path: '/' });
    Cookies.set(USER_KEY, JSON.stringify(user), { expires: 7, path: '/' });
    set({ user, token });
  },

  logout: () => {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_KEY, { path: '/' });
    set({ user: null, token: null });
  },
}));
