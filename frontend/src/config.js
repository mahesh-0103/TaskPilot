export const CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  BACKEND_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
};
