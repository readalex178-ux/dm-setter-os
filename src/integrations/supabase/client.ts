import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://mtvtzwxymlfgiffuvlzp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dnR6d3h5bWxmZ2lmZnV2bHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjUzODEsImV4cCI6MjA5NzMwMTM4MX0.B2oaaXGMUptlJQJO8_pe3cdCK-rXKZLjAxREE-DAyVI";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
    }
});
