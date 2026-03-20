import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PlatformCard, { type ConnectedAccount } from "@/components/integrations/PlatformCard";
import { messagingPlatforms, crmPlatforms } from "@/data/integrations-data";

const LIVE_CRM_IDS = ["hubspot"]; // CRMs with working integrations

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

    // Coming soon CRMs
    if (!LIVE_CRM_IDS.includes(platform) && !["instagram", "facebook", "whatsapp"].includes(platform)) {
      toast({ title: "Coming Soon", description: `${platform} integration is under development.` });
      setConnecting(null);
      return;
    }

    const redirectUri = `${window.location.origin}/app/integrations/callback`;

    if (platform === "hubspot") {
      const { data, error } = await supabase.functions.invoke("hubspot-oauth-start", {
        body: { redirectUri },
      });
      if (error || !data?.url) {
        toast({ title: "Connection failed", description: error?.message || "Could not start HubSpot OAuth. Make sure HubSpot credentials are configured.", variant: "destructive" });
        setConnecting(null);
        return;
      }
      window.location.href = data.url;
      return;
    }

    // Meta platforms
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
    // Determine which sync function to call based on the account's platform
    const account = accounts.find((a) => a.id === accountId);
    const isHubSpot = account?.platform === "hubspot";

    toast({ title: "Syncing...", description: `Pulling latest ${platformName} data.` });

    const functionName = isHubSpot ? "hubspot-sync-contacts" : "meta-sync-messages";
    const { data, error } = await supabase.functions.invoke(functionName, { body: { accountId } });

    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    } else {
      const label = isHubSpot ? "contacts" : "messages";
      toast({ title: "Sync complete", description: `${data?.count || 0} ${label} synced.` });
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
              platform={{
                ...platform,
                comingSoon: !LIVE_CRM_IDS.includes(platform.id),
              }}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" /> Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>To connect integrations, you need developer credentials for each platform:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Meta (Instagram/FB/WhatsApp)</strong> — Meta Developer App</li>
            <li><strong>HubSpot</strong> — HubSpot Developer App with OAuth</li>
          </ul>
          <div className="flex gap-4 mt-3">
            <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
              Meta Console <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://developers.hubspot.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
              HubSpot Developer <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
