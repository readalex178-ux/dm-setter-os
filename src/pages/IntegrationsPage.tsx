import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PlatformCard, { type ConnectedAccount } from "@/components/integrations/PlatformCard";
import { messagingPlatforms, crmPlatforms } from "@/data/integrations-data";

// All integrations are pending build-out â none are live yet.
// To enable: add Edge Functions (hubspot-oauth-start, meta-oauth-start, etc.)
// and add the platform ID to LIVE_CRM_IDS / LIVE_MESSAGING_IDS.
const LIVE_CRM_IDS: string[] = [];
const LIVE_MESSAGING_IDS: string[] = [];

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
    // All integrations are coming soon â show info toast, no API call
    toast({
      title: "Coming Soon",
      description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} integration is under development. Use the Chrome extension in the meantime.`,
    });
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
    toast({ title: "Coming Soon", description: "Sync will be available once the integration is live." });
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
            <strong>Chrome Extension:</strong> The fastest way to capture leads right now is the Chrome extension â it works with Instagram, Facebook, and any DM platform directly in your browser.
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
              platform={{
                ...platform,
                comingSoon: !LIVE_MESSAGING_IDS.includes(platform.id),
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
            <AlertCircle className="h-4 w-4 text-warning" /> What's Coming
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Native integrations require developer credentials and platform approval. These are in progress:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Meta (Instagram/FB/WhatsApp)</strong> â Requires Meta App Review (weeks-long process)</li>
            <li><strong>HubSpot</strong> â Requires HubSpot Developer App with OAuth credentials</li>
          </ul>
          <p className="mt-2">In the meantime, the Chrome extension covers Instagram, Facebook, and WhatsApp natively.</p>
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
