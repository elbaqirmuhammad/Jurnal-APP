import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yunaztumwnmbyuxvdelz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bmF6dHVtd25tYnl1eHZkZWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTk5NTUsImV4cCI6MjA5ODM3NTk1NX0.bPHWIyDkcC1Bay46YpKQjUmdTQIfU22houkLlf0sYTk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
