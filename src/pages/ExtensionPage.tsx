import { Download, Chrome, Puzzle, Bell, Layout, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: MessageSquare, title: "Quick Inbox", desc: "See recent DM conversations and unread counts at a glance" },
  { icon: Layout, title: "Full App Access", desc: "Open the complete DM Setter OS dashboard in a new tab" },
  { icon: Puzzle, title: "Page Overlay", desc: "Floating widget on Instagram, Facebook & Messenger with AI insights" },
  { icon: Bell, title: "Notifications", desc: "Get alerts when hot leads reply or prospects are call-ready" },
];

const steps = [
  "Download the ZIP file below",
  "Unzip the downloaded file",
  "Open chrome://extensions in your browser",
  "Enable Developer mode (toggle top-right)",
  "Click Load unpacked and select the unzipped folder",
];

export default function ExtensionPage() {
  const handleDownload = () => {
    fetch("/dm-setter-os-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dm-setter-os-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err) => alert(err.message));
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Chrome className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Chrome Extension</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Take DM Setter OS everywhere — get AI-powered prospect insights right inside Instagram, Facebook & Messenger.
        </p>
        <Badge variant="secondary" className="text-xs">Works on Chrome, Edge, Brave & Arc</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="bg-card border-border">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-primary/20">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Button size="lg" onClick={handleDownload} className="gap-2">
            <Download className="h-5 w-5" /> Download Extension
          </Button>
          <p className="text-xs text-muted-foreground">v1.0.0 · ~50 KB · No account required</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <h2 className="font-semibold">Installation Steps</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
