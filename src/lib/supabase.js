import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

// On n'initialise que si les clés sont présentes pour éviter le crash au boot
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

