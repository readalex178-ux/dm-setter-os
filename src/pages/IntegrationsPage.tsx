import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Instagram, Facebook, MessageCircle, Link2, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink, Loader2, Unplug,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConnectedAccount {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp";
  platform_username: string | null;
  display_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

const platforms = [
  {
    id: "instagram" as const,
    name: "Instagram DMs",
    description: "Import and sync Instagram Direct Messages from your client's business account.",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    available: true,
  },
  {
    id: "facebook" as const,
    name: "Facebook Messenger",
    description: "Import conversations from Facebook Pages you manage.",
    icon: Facebook,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    available: true,
  },
  {
    id: "whatsapp" as const,
    name: "WhatsApp Business",
    description: "Sync WhatsApp Business conversations via the Cloud API.",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    available: true,
  },
];

export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("id, platform, platform_username, display_name, is_active, last_synced_at")
      .eq("is_active", true);

    if (data) setAccounts(data);
    setLoading(false);
  }

  function getAccountForPlatform(platform: string) {
    return accounts.find((a) => a.platform === platform);
  }

  async function handleConnect(platform: "instagram" | "facebook" | "whatsapp") {
    setConnecting(platform);

    // Build the Meta OAuth URL
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) {
      toast({
        title: "Configuration error",
        description: "Supabase project ID not found. Check your environment.",
        variant: "destructive",
      });
      setConnecting(null);
      return;
    }

    const redirectUri = `${window.location.origin}/app/integrations/callback`;
    const scopes = platform === "instagram"
      ? "instagram_manage_messages,instagram_basic,pages_show_list,pages_manage_metadata"
      : platform === "facebook"
      ? "pages_messaging,pages_show_list,pages_read_engagement,pages_manage_metadata"
      : "whatsapp_business_management,whatsapp_business_messaging";

    // Call edge function to get the OAuth URL
    const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
      body: { platform, redirectUri, scopes },
    });

    if (error || !data?.url) {
      toast({
        title: "Connection failed",
        description: error?.message || "Could not start OAuth flow. Make sure Meta API credentials are configured.",
        variant: "destructive",
      });
      setConnecting(null);
      return;
    }

    // Redirect to Meta OAuth
    window.location.href = data.url;
  }

  async function handleDisconnect(accountId: string) {
    const { error } = await supabase
      .from("connected_accounts")
      .update({ is_active: false })
      .eq("id", accountId);

    if (error) {
      toast({ title: "Error", description: "Failed to disconnect account.", variant: "destructive" });
    } else {
      toast({ title: "Disconnected", description: "Account has been disconnected." });
      fetchAccounts();
    }
  }

  async function handleSync(accountId: string, platform: string) {
    toast({ title: "Syncing...", description: `Pulling latest ${platform} messages.` });

    const { data, error } = await supabase.functions.invoke("meta-sync-messages", {
      body: { accountId },
    });

    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sync complete", description: `${data?.count || 0} new messages imported.` });
      fetchAccounts();
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your client's messaging accounts to import and sync conversations.
        </p>
      </div>

      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>How it works:</strong> Your coach/client clicks a connect button, authorizes their account via Meta's secure OAuth, and you get read access to their DMs. <em>No passwords are shared.</em>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {platforms.map((platform) => {
          const account = getAccountForPlatform(platform.id);
          const isConnected = !!account;
          const isConnecting = connecting === platform.id;

          return (
            <Card key={platform.id} className={isConnected ? "border-success/30" : ""}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl ${platform.bgColor} flex items-center justify-center shrink-0`}>
                    <platform.icon className={`h-6 w-6 ${platform.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{platform.name}</h3>
                      {isConnected ? (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Connected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{platform.description}</p>

                    {isConnected && account && (
                      <div className="text-xs text-muted-foreground space-y-1 mb-3">
                        <p>
                          <span className="font-medium text-foreground">
                            {account.display_name || account.platform_username}
                          </span>
                          {account.platform_username && ` (${account.platform_username})`}
                        </p>
                        {account.last_synced_at && (
                          <p>Last synced: {new Date(account.last_synced_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(account!.id, platform.name)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync Now
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDisconnect(account!.id)}
                          >
                            <Unplug className="h-3.5 w-3.5 mr-1" /> Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(platform.id)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          )}
                          Connect {platform.name}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" /> Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To connect accounts, you need a <strong>Meta Developer App</strong> with these products enabled:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Instagram API</strong> — for Instagram DM access</li>
            <li><strong>Messenger</strong> — for Facebook Messenger access</li>
            <li><strong>WhatsApp Business</strong> — for WhatsApp access</li>
          </ul>
          <p className="mt-3">
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Go to Meta Developer Console <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
