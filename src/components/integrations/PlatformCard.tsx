import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, RefreshCw, ExternalLink, Loader2, Unplug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface PlatformDef {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  comingSoon?: boolean;
}

export interface ConnectedAccount {
  id: string;
  platform: string;
  platform_username: string | null;
  display_name: string | null;
  is_active: boolean;
  last_synced_at: string | null;
}

interface PlatformCardProps {
  platform: PlatformDef;
  account?: ConnectedAccount;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect?: (accountId: string) => void;
  onSync?: (accountId: string, platformName: string) => void;
}

export default function PlatformCard({
  platform,
  account,
  isConnecting,
  onConnect,
  onDisconnect,
  onSync,
}: PlatformCardProps) {
  const isConnected = !!account;

  return (
    <Card className={isConnected ? "border-success/30" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-xl ${platform.bgColor} flex items-center justify-center shrink-0`}>
            <platform.icon className={`h-6 w-6 ${platform.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{platform.name}</h3>
              {platform.comingSoon ? (
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              ) : isConnected ? (
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
              {platform.comingSoon ? (
                <Button size="sm" variant="outline" disabled>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Notify Me
                </Button>
              ) : isConnected ? (
                <>
                  {onSync && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSync(account!.id, platform.name)}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Sync Now
                    </Button>
                  )}
                  {onDisconnect && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDisconnect(account!.id)}
                    >
                      <Unplug className="h-3.5 w-3.5 mr-1" /> Disconnect
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={onConnect}
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
}
