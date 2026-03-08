import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Palette, Link2, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input defaultValue="Alex Morgan" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input defaultValue="alex@dmsetter.co" className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Team / Agency</Label>
            <Input defaultValue="Scale DM Agency" className="mt-1" />
          </div>
          <Button size="sm">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Follow-up reminders</p><p className="text-xs text-muted-foreground">Get notified when follow-ups are due</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Call readiness alerts</p><p className="text-xs text-muted-foreground">Alert when a prospect hits 80%+ readiness</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Momentum warnings</p><p className="text-xs text-muted-foreground">Alert when conversations are stalling</p></div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Manage your Instagram, Facebook, and WhatsApp connections.</p>
          <Link to="/app/integrations">
            <Button variant="outline" size="sm">Go to Integrations</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            DM Setter OS never sends messages automatically and never automates outreach. 
            All AI features are assistive only. Your conversation data is encrypted and never shared with third parties.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
