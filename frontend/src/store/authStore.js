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
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("USER:", session.user.id);
        console.log("TOKEN:", session.provider_token?.slice(0, 10) + "...");
        set({ 
          session, 
          user: session.user, 
          providerToken: session.provider_token,
          providerRefreshToken: session.provider_refresh_token 
        });
        await get().loadProfile(session.user.id);
      }
    } finally {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ 
        session, 
        user: session?.user ?? null, 
        providerToken: session?.provider_token ?? null,
        providerRefreshToken: session?.provider_refresh_token ?? null 
      });
      if (session?.user) {
        console.log("TOKEN:", session.provider_token?.slice(0, 10) + "...");
        await get().loadProfile(session.user.id);
      } else {
        set({ profile: null });
        applyTheme('blue', 'dark');
      }
    });
  },

  loginWithGoogle: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.send',
          queryParams: {
            access_type: 'offline', // Essential for refresh tokens
            prompt: 'consent'       // Force consent to get refresh token every time
          }
        }
      });
      if (error) throw error;
    } catch (e) {
      console.error('Login error:', e.message);
      set({ loading: false });
    }
  },

  loadProfile: async (userId) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const user = get().user;
      const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
      const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name;

      if (data) {
        // Update local state with DB profile, but fallback to Google avatar if DB's is missing
        const profileWithAvatar = {
            ...data,
            avatar_url: data.avatar_url || googleAvatar,
            display_name: data.display_name || googleName || data.username
        };
        set({ 
          profile: profileWithAvatar, 
          accent: data.accent_color || 'blue', 
          theme: data.theme || 'dark' 
        });
        applyTheme(data.accent_color || 'blue', data.theme || 'dark');
      } else {
        // If profile doesn't exist in DB yet (trigger might be slow), show Google data
        set({ 
          profile: { 
            id: userId, 
            display_name: googleName || 'Pilot', 
            avatar_url: googleAvatar,
            username: user.email,
            avatar_color: '#2563EB'
          } 
        });
      }
    } catch (e) {
      console.error('Profile Error:', e);
    }
  },

  updateProfile: async (updates) => {
    const userId = get().user?.id;
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        set({ profile: { ...get().profile, ...data } });
      }
      return { success: true };
    } catch (e) {
      console.error('Update Profile Error:', e);
      return { success: false, error: e.message };
    }
  },

  signout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null, providerToken: null, providerRefreshToken: null });
    applyTheme('blue', 'dark');
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
