import { useState } from "react";
import { Download, Chrome, Puzzle, Bell, Layout, MessageSquare, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  "Click the extension icon → open Account → sign in with the SAME email & password you use here",
  "Open a DM on Instagram/TikTok/X/Facebook → analyse → Save. It syncs straight to your Inbox.",
];

type DownloadState = "idle" | "loading" | "success" | "error";

export default function ExtensionPage() {
  const [dlState, setDlState] = useState<DownloadState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleDownload = () => {
    setDlState("loading");
    setErrorMsg("");
    fetch("/dm-setter-os-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "dm-setter-os-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
        setDlState("success");
      })
      .catch((err) => {
        setDlState("error");
        setErrorMsg(err.message);
      });
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

      {/* Download section */}
      <Card className="bg-card border-primary/20">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Button size="lg" onClick={handleDownload} disabled={dlState === "loading"} className="gap-2">
            {dlState === "loading" ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Downloading…</>
            ) : dlState === "success" ? (
              <><CheckCircle2 className="h-5 w-5" /> Downloaded!</>
            ) : (
              <><Download className="h-5 w-5" /> Download Extension</>
            )}
          </Button>

          {dlState === "error" && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Download failed: {errorMsg}</span>
            </div>
          )}

          {dlState === "success" && (
            <p className="text-xs text-emerald-500">Check your Downloads folder for <strong>dm-setter-os-extension.zip</strong></p>
          )}

          <p className="text-xs text-muted-foreground">v2.0.0 · Syncs to your account · No API keys needed</p>

          {/* Fallback direct link */}
          <a
            href="/dm-setter-os-extension.zip"
            download="dm-setter-os-extension.zip"
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Trouble downloading? Try this direct link
          </a>

          <p className="text-xs text-muted-foreground text-center max-w-md">
            This is a private install — no Chrome Web Store needed. Just unzip and load it in Developer Mode.
          </p>
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
          <p className="text-xs text-amber-500 mt-2">
            ⚠️ Already installed an earlier version? Remove it from <code className="text-xs">chrome://extensions</code> first, then load the newly unzipped folder.
          </p>
          <p className="text-xs text-muted-foreground">
            💡 If the download doesn't start, try opening this page in desktop Chrome, Edge, or Brave and use the direct link above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
