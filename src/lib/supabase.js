import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://eyemmwjsfjebxzjzfqvi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZW1td2pzZmplYnh6anpmcXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjM4MTcsImV4cCI6MjEwMzY5OTgxN30.-5mkFK-8QkHBKnB8-PvfgQbQMXq4kcUHfr46X_OIbe8';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZW1td2pzZmplYnh6anpmcXZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODEyMzgxNywiZXhwIjoyMTAzNjk5ODE3fQ.BwR4C515keiQsoHPxtnoqbfmLS7YaIEXXfMex6iIk8Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin para operaciones privilegiadas (crear usuarios, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
