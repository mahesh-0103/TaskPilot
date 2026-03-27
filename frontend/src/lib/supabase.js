import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://svnpdtwyoottsxzbqbnl.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2bnBkdHd5b290dHN4emJxYm5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjE1NDcsImV4cCI6MjA4OTM5NzU0N30.4R_WfF83QfuN5LLv5vkh01TO_mkfHtbYT4RwX-o6-Ow';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
