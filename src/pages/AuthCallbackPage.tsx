import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Handles the Supabase Google OAuth callback.
 * Supabase JS client automatically exchanges the code/hash for a session
 * when it initialises on this page. We just wait for it and redirect.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase handles the session exchange from the URL params automatically.
    // Listen for the auth state change and redirect once we have a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        navigate("/app", { replace: true });
      } else if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        subscription.unsubscribe();
        navigate("/auth", { replace: true });
      }
    });

    // Fallback: if session already exists (e.g. already processed), redirect now.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        navigate("/app", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0b0f1a]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e5ff]" />
        <p className="text-sm text-[#7a8aa3]">Signing you in…</p>
      </div>
    </div>
  );
}
