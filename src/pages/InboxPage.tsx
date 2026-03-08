import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  demoProspects, demoMessages, suggestedReplies,
  type Prospect, type Message,
} from "@/data/demo-data";
import {
  Search, Copy, MessageSquare, Brain, Phone,
  Heart, AlertTriangle, Info, Sparkles,
} from "lucide-react";

const stageColor: Record<string, string> = {
  "New Lead": "secondary",
  "Discovery": "info",
  "Qualification": "warning",
  "Interested": "default",
  "Objection Handling": "destructive",
  "Ready for Call": "success",
  "Call Booked": "success",
  "Cold Lead": "secondary",
  "Not Qualified": "secondary",
};

export default function InboxPage() {
  const [selected, setSelected] = useState<Prospect>(demoProspects[0]);
  const [search, setSearch] = useState("");
  const messages = demoMessages[selected.id] || [];
  const replies = (suggestedReplies as Record<string, { type: string; content: string }[]>)[selected.id] || [];

  const filtered = demoProspects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Left: Conversation List */}
      <div className="w-80 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${
                selected.id === p.id ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {p.avatar}
                  </div>
                  {p.unread && (
                    <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse-glow" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{p.lastContact}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p.handle}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant={stageColor[p.stage] as any} className="text-[10px] px-1.5 py-0">
                      {p.stage}
                    </Badge>
                    <Badge variant="score" className="text-[10px] px-1.5 py-0">
                      {p.leadScore}/10
                    </Badge>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Center: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{selected.name}</h2>
            <p className="text-xs text-muted-foreground">{selected.handle} • {selected.stage}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="score">{selected.intentLevel} {selected.intentConfidence}%</Badge>
            <Badge variant={selected.callReadiness >= 70 ? "success" : "warning"}>
              <Phone className="h-3 w-3 mr-1" /> {selected.callReadiness}%
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "setter" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                    m.sender === "setter"
                      ? "gradient-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                  <div className={`text-[10px] mt-1 ${m.sender === "setter" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {m.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Suggested Replies */}
        {replies.length > 0 && (
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Suggestions</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                <Info className="h-3 w-3 inline mr-0.5" /> Never auto-sent
              </span>
            </div>
            <div className="grid gap-2">
              {replies.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" title="Favorite">
                        <Heart className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-foreground">{r.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: AI Insights */}
      <div className="w-72 border-l border-border p-4 overflow-y-auto shrink-0 hidden xl:block">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> AI Insights
        </h3>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Intent Level</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{selected.intentLevel}</span>
                <Badge variant="score">{selected.intentConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Main Motivation</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{selected.motivation}</span>
                <Badge variant="score">{selected.motivationConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Main Concern</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{selected.concerns}</span>
                <Badge variant="warning">{selected.concernsConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Lead Score</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{selected.leadScore}/10</span>
                <Badge variant={selected.leadScore >= 7 ? "success" : selected.leadScore >= 4 ? "warning" : "secondary"}>
                  {selected.leadScore >= 7 ? "High Potential" : selected.leadScore >= 4 ? "Medium" : "Low"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Call Readiness</div>
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>{selected.callReadiness}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all"
                    style={{ width: `${selected.callReadiness}%` }}
                  />
                </div>
              </div>
              {selected.callReadiness >= 70 && (
                <div className="text-xs text-success flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Ready for call transition
                </div>
              )}
            </CardContent>
          </Card>

          {/* Momentum Alert */}
          {selected.stage === "Objection Handling" && (
            <Card className="border-warning/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-xs font-semibold text-warning">Momentum Alert</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prospect has raised objections. Focus on addressing concerns before pushing for a call.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Prospect Quick Info */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs text-muted-foreground">Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{selected.location}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Job</span><span>{selected.currentJob}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Income Goal</span><span>{selected.incomeGoal}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span>{selected.timeAvailability}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{selected.source}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
