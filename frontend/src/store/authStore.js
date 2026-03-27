import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const ACCENT_COLORS = {
  blue: '#2563EB',
  slate: '#475569',
  violet: '#7C3AED',
  emerald: '#059669',
  rose: '#E11D48',
  amber: '#D97706',
  neutral: '#71717A',
};

function applyTheme(accent, mode) {
  const root = document.documentElement;
  root.setAttribute('data-accent', accent || 'blue');
  root.classList.remove('dark', 'light');
  root.classList.add(mode === 'light' ? 'light' : 'dark');
}

const useAuthStore = create((set, get) => ({
  session: null,
  user: null,
  profile: null,
  providerToken: null,
  loading: true,
  accent: 'blue',
  theme: 'dark',

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      set({ session, user: session.user, providerToken: session.provider_token });
      await get().loadProfile(session.user.id);
    }
    set({ loading: false });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null, providerToken: session?.provider_token ?? null });
      if (session?.user) {
        await get().loadProfile(session.user.id);
      } else {
        set({ profile: null });
        applyTheme('blue', 'dark');
      }
    });
  },

  loadProfile: async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        set({ profile: data, accent: data.accent_color || 'blue', theme: data.theme || 'dark' });
        applyTheme(data.accent_color || 'blue', data.theme || 'dark');
      } else {
        const user = get().user;
        if (user) {
          const newProfile = {
            id: user.id,
            username: user.email.split('@')[0] + Math.floor(Math.random() * 1000),
            display_name: user.user_metadata?.full_name || user.email.split('@')[0],
            email: user.email,
            avatar_color: '#2563EB',
            theme: 'dark',
            accent_color: 'blue'
          };
          await supabase.from('profiles').insert(newProfile);
          set({ profile: newProfile, accent: 'blue', theme: 'dark' });
          applyTheme('blue', 'dark');
        }
      }
    } catch (e) {
      console.warn('Profile load failed or empty:', e);
      // Fallback: silently attempt creation if it was a missing row error
      const user = get().user;
      if (user) {
        try {
          const newProfile = {
            id: user.id,
            username: user.email.split('@')[0] + Math.floor(Math.random() * 1000),
            display_name: user.user_metadata?.full_name || user.email.split('@')[0],
            email: user.email,
            avatar_color: '#2563EB',
            theme: 'dark',
            accent_color: 'blue'
          };
          await supabase.from('profiles').insert(newProfile);
          set({ profile: newProfile, accent: 'blue', theme: 'dark' });
          applyTheme('blue', 'dark');
        } catch (innerE) {
          console.warn('Recovery profile creation failed', innerE);
        }
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, providerToken: null });
  },

  setAccent: async (accent) => {
    set({ accent });
    applyTheme(accent, get().theme);
    const userId = get().user?.id;
    if (userId) {
      await supabase.from('profiles').update({ accent_color: accent }).eq('id', userId);
    }
    localStorage.setItem('accent', accent);
  },

  setTheme: async (theme) => {
    set({ theme });
    applyTheme(get().accent, theme);
    const userId = get().user?.id;
    if (userId) {
      await supabase.from('profiles').update({ theme }).eq('id', userId);
    }
    localStorage.setItem('theme', theme);
  },

  ACCENT_COLORS,
}));

export default useAuthStore;
