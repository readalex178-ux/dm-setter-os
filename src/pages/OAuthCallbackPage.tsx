import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing authorization...");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setMessage(`Authorization denied: ${searchParams.get("error_description") || errorParam}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("No authorization code received.");
      return;
    }

    // Exchange code for token via edge function
    async function exchangeCode() {
      const { data, error } = await supabase.functions.invoke("meta-oauth-callback", {
        body: { code, state },
      });

      if (error || !data?.success) {
        setStatus("error");
        setMessage(error?.message || data?.error || "Failed to complete authorization.");
      } else {
        setStatus("success");
        setMessage(`Successfully connected ${data.platform || "account"}!`);
        setTimeout(() => navigate("/app/integrations"), 2000);
      }
    }

    exchangeCode();
  }, [searchParams, navigate]);

  return (
    <div className="p-6 flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">{message}</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-foreground font-medium">{message}</p>
              <p className="text-xs text-muted-foreground">Redirecting to integrations...</p>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-foreground font-medium">Connection Failed</p>
              <p className="text-sm text-muted-foreground">{message}</p>
              <Button variant="outline" onClick={() => navigate("/app/integrations")}>
                Back to Integrations
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
