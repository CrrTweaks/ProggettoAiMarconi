// ════════════════════════════════════════════════════════════════
//  Zustand · auth store
// ════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, tokens } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export const useAuth = create(persist(
  (set, get) => ({
    user: null,
    loading: false,
    initialised: false,

    init: async () => {
      if (get().initialised) return;
      set({ loading: true });
      try {
        if (tokens.access) {
          const { data } = await api.get('/auth/me');
          set({ user: data.user });
          connectSocket();
        }
      } catch { tokens.clear(); set({ user: null }); }
      finally { set({ loading: false, initialised: true }); }
    },

    login: async (email, password) => {
      set({ loading: true });
      try {
        const { data } = await api.post('/auth/login', { email, password });
        tokens.set(data.access_token, data.refresh_token);
        set({ user: data.user });
        connectSocket();
        return data.user;
      } finally { set({ loading: false }); }
    },

    register: async (payload) => {
      set({ loading: true });
      try {
        const { data } = await api.post('/auth/register', payload);
        tokens.set(data.access_token, data.refresh_token);
        set({ user: data.user });
        connectSocket();
        return data.user;
      } finally { set({ loading: false }); }
    },

    logout: async () => {
      try { await api.post('/auth/logout'); } catch {}
      tokens.clear();
      disconnectSocket();
      set({ user: null });
    },

    refreshMe: async () => {
      try {
        const { data } = await api.get('/auth/me');
        set({ user: data.user });
      } catch {}
    },
  }),
  {
    name: 'aiws-auth',
    partialize: (state) => ({ user: state.user }),
  },
));
