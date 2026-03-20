import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PlatformCard, { type ConnectedAccount } from "@/components/integrations/PlatformCard";
import { messagingPlatforms, crmPlatforms } from "@/data/integrations-data";

export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const { data } = await supabase
      .from("connected_accounts")
      .select("id, platform, platform_username, display_name, is_active, last_synced_at")
      .eq("is_active", true);
    if (data) setAccounts(data);
    setLoading(false);
  }

  function getAccountForPlatform(platform: string) {
    return accounts.find((a) => a.platform === platform);
  }

  async function handleConnect(platform: string) {
    setConnecting(platform);
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) {
      toast({ title: "Configuration error", description: "Project ID not found.", variant: "destructive" });
      setConnecting(null);
      return;
    }

    // CRM platforms — show coming soon toast for now
    const crmIds = crmPlatforms.map((c) => c.id);
    if (crmIds.includes(platform)) {
      toast({ title: "Coming Soon", description: `${platform} integration is under development. We'll notify you when it's ready!` });
      setConnecting(null);
      return;
    }

    const redirectUri = `${window.location.origin}/app/integrations/callback`;
    const scopes = platform === "instagram"
      ? "instagram_manage_messages,instagram_basic,pages_show_list,pages_manage_metadata"
      : platform === "facebook"
      ? "pages_messaging,pages_show_list,pages_read_engagement,pages_manage_metadata"
      : "whatsapp_business_management,whatsapp_business_messaging";

    const { data, error } = await supabase.functions.invoke("meta-oauth-start", {
      body: { platform, redirectUri, scopes },
    });

    if (error || !data?.url) {
      toast({ title: "Connection failed", description: error?.message || "Could not start OAuth flow.", variant: "destructive" });
      setConnecting(null);
      return;
    }
    window.location.href = data.url;
  }

  async function handleDisconnect(accountId: string) {
    const { error } = await supabase
      .from("connected_accounts")
      .update({ is_active: false })
      .eq("id", accountId);
    if (error) {
      toast({ title: "Error", description: "Failed to disconnect.", variant: "destructive" });
    } else {
      toast({ title: "Disconnected", description: "Account has been disconnected." });
      fetchAccounts();
    }
  }

  async function handleSync(accountId: string, platformName: string) {
    toast({ title: "Syncing...", description: `Pulling latest ${platformName} messages.` });
    const { data, error } = await supabase.functions.invoke("meta-sync-messages", { body: { accountId } });
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
          Connect messaging accounts and CRMs to centralize your sales workflow.
        </p>
      </div>

      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>How it works:</strong> Click connect, authorize via OAuth, and your data syncs automatically. <em>No passwords are shared.</em>
          </p>
        </CardContent>
      </Card>

      {/* Messaging Platforms */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Messaging</h2>
        <div className="space-y-4">
          {messagingPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={platform}
              account={getAccountForPlatform(platform.id)}
              isConnecting={connecting === platform.id}
              onConnect={() => handleConnect(platform.id)}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* CRM Platforms */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">CRM</h2>
        <div className="space-y-4">
          {crmPlatforms.map((platform) => (
            <PlatformCard
              key={platform.id}
              platform={{ ...platform, comingSoon: true }}
              isConnecting={connecting === platform.id}
              onConnect={() => handleConnect(platform.id)}
            />
          ))}
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" /> Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To connect messaging accounts, you need a <strong>Meta Developer App</strong> with these products enabled:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Instagram API</strong> — for Instagram DM access</li>
            <li><strong>Messenger</strong> — for Facebook Messenger access</li>
            <li><strong>WhatsApp Business</strong> — for WhatsApp access</li>
          </ul>
          <p className="mt-3">
            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              Go to Meta Developer Console <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
