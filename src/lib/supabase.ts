import { createClient } from "@supabase/supabase-js";

// Production credentials with safe fallbacks
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://qlxxrpochdgqoyfketrf.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseHhycG9jaGRncW95ZmtldHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTAyOTQsImV4cCI6MjEwMzQ4NjI5NH0.SFtQufyQArDiAVwbIAiFNr6KBGAHvERxRqvoeI4Pp-c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
