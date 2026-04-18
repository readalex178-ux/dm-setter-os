import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  demoProspects, demoMessages, suggestedReplies,
  type Prospect as DemoProspect,
} from "@/data/demo-data";
import {
  Search, Copy, Phone, Heart, AlertTriangle, Info, Sparkles,
  Brain, Send, Loader2, Instagram, Facebook, MessageCircle, ArrowLeft, Mic, MicOff, Target,
} from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { StageAnalysisDialog } from "@/components/StageAnalysisDialog";

interface DBProspect {
  id: string;
  name: string;
  handle: string | null;
  stage: string;
  lead_score: number;
  call_readiness: number;
  intent_level: string | null;
  intent_confidence: number | null;
  motivation: string | null;
  motivation_confidence: number | null;
  concerns: string | null;
  concerns_confidence: number | null;
  location: string | null;
  current_job: string | null;
  income_goal: string | null;
  time_availability: string | null;
  source: string | null;
  platform: string | null;
  last_contact_at: string | null;
  connected_account_id: string | null;
}

interface DBMessage {
  id: string;
  prospect_id: string;
  sender: string;
  content: string;
  sent_at: string;
  platform_message_id: string | null;
}

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

const platformIcon = (platform: string | null) => {
  if (platform === "instagram") return <Instagram className="h-3 w-3 text-pink-500" />;
  if (platform === "facebook") return <Facebook className="h-3 w-3 text-blue-500" />;
  if (platform === "whatsapp") return <MessageCircle className="h-3 w-3 text-green-500" />;
  return null;
};

interface AISuggestion {
  type: string;
  content: string;
  coaching_note: string;
}

export default function InboxPage() {
  const isMobile = useIsMobile();
  const [dbProspects, setDbProspects] = useState<DBProspect[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [localDemoMessages, setLocalDemoMessages] = useState<Record<string, { id: string; prospectId: string; sender: string; content: string; timestamp: string }[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [useDemo, setUseDemo] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Pick up voice_prefill from voice commands
  useEffect(() => {
    const raw = sessionStorage.getItem("voice_prefill");
    if (!raw) return;
    sessionStorage.removeItem("voice_prefill");
    try {
      const prefill = JSON.parse(raw);
      if (prefill.prospectId) {
        selectProspect(prefill.prospectId);
      }
      if (prefill.message) {
        setTimeout(() => setMessageInput(prefill.message), 300);
      }
      if (prefill.analyze) {
        setTimeout(() => setStageDialogOpen(true), 500);
      }
    } catch {}
  }, []);

  function selectProspect(id: string) {
    setSelectedId(id);
    setAiSuggestions([]);
    setAiError(null);
    if (isMobile) setShowChat(true);
  }

  // Load DB prospects
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .order("last_contact_at", { ascending: false });

      if (data && data.length > 0) {
        setDbProspects(data as DBProspect[]);
        setUseDemo(false);
        setSelectedId(data[0].id);
      } else {
        setUseDemo(true);
        setSelectedId(demoProspects[0].id);
      }
    }
    load();
  }, []);

  // Load messages for selected prospect
  useEffect(() => {
    if (!selectedId || useDemo) return;

    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("prospect_id", selectedId)
        .order("sent_at", { ascending: true });

      if (data) setDbMessages(data as DBMessage[]);
    }
    loadMessages();

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `prospect_id=eq.${selectedId}`,
        },
        (payload) => {
          setDbMessages((prev) => [...prev, payload.new as DBMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, useDemo]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages, localDemoMessages, selectedId]);

  // Send message
  async function handleSend() {
    if (!messageInput.trim() || !selectedId) return;

    if (useDemo) {
      const newMsg = {
        id: `local-${Date.now()}`,
        prospectId: selectedId,
        sender: "setter",
        content: messageInput.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setLocalDemoMessages((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), newMsg],
      }));
      setMessageInput("");
      return;
    }

    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-message", {
      body: { prospectId: selectedId, content: messageInput.trim() },
    });

    if (error) {
      console.error("Send error:", error);
    } else if (data?.message) {
      // Message will arrive via realtime subscription, but add immediately for responsiveness
      setDbMessages((prev) => [...prev, data.message]);
    }

    setMessageInput("");
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Determine which data to use
  const prospects = useDemo ? demoProspects : dbProspects;
  const selected = useDemo
    ? demoProspects.find((p) => p.id === selectedId) || demoProspects[0]
    : dbProspects.find((p) => p.id === selectedId) || dbProspects[0];

  const messages = useDemo
    ? [...(demoMessages[selectedId || "p1"] || []), ...(localDemoMessages[selectedId || "p1"] || [])]
    : dbMessages;

  const replies = useDemo
    ? (suggestedReplies as Record<string, { type: string; content: string }[]>)[selectedId || "p1"] || []
    : [];

  const filtered = prospects.filter((p) => {
    const name = ("name" in p ? p.name : "").toLowerCase();
    const handle = ("handle" in p ? (p.handle || "") : "").toLowerCase();
    return name.includes(search.toLowerCase()) || handle.includes(search.toLowerCase());
  });

  if (!selected) return null;

  // Normalize selected fields for both demo and DB
  const sel = useDemo
    ? {
        name: (selected as DemoProspect).name,
        handle: (selected as DemoProspect).handle,
        stage: (selected as DemoProspect).stage,
        leadScore: (selected as DemoProspect).leadScore,
        callReadiness: (selected as DemoProspect).callReadiness,
        intentLevel: (selected as DemoProspect).intentLevel,
        intentConfidence: (selected as DemoProspect).intentConfidence,
        motivation: (selected as DemoProspect).motivation,
        motivationConfidence: (selected as DemoProspect).motivationConfidence,
        concerns: (selected as DemoProspect).concerns,
        concernsConfidence: (selected as DemoProspect).concernsConfidence,
        location: (selected as DemoProspect).location,
        currentJob: (selected as DemoProspect).currentJob,
        incomeGoal: (selected as DemoProspect).incomeGoal,
        timeAvailability: (selected as DemoProspect).timeAvailability,
        source: (selected as DemoProspect).source,
        platform: null as string | null,
        avatar: (selected as DemoProspect).avatar,
        unread: (selected as DemoProspect).unread,
      }
    : {
        name: (selected as DBProspect).name,
        handle: (selected as DBProspect).handle || "",
        stage: (selected as DBProspect).stage,
        leadScore: (selected as DBProspect).lead_score,
        callReadiness: (selected as DBProspect).call_readiness,
        intentLevel: (selected as DBProspect).intent_level || "Unknown",
        intentConfidence: (selected as DBProspect).intent_confidence || 0,
        motivation: (selected as DBProspect).motivation || "Unknown",
        motivationConfidence: (selected as DBProspect).motivation_confidence || 0,
        concerns: (selected as DBProspect).concerns || "None",
        concernsConfidence: (selected as DBProspect).concerns_confidence || 0,
        location: (selected as DBProspect).location || "—",
        currentJob: (selected as DBProspect).current_job || "—",
        incomeGoal: (selected as DBProspect).income_goal || "—",
        timeAvailability: (selected as DBProspect).time_availability || "—",
        source: (selected as DBProspect).source || "—",
        platform: (selected as DBProspect).platform,
        avatar: (selected as DBProspect).name.split(" ").map(w => w[0]).join("").slice(0, 2),
        unread: false,
      };

  async function fetchAiSuggestions() {
    if (!selectedId || messages.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);

    try {
      const msgPayload = messages.map((m: any) => ({
        sender: m.sender || (m.role === "setter" ? "setter" : "prospect"),
        content: m.content || m.text || "",
      }));

      const prospectPayload = {
        name: sel.name,
        stage: sel.stage,
        intentLevel: sel.intentLevel,
        intentConfidence: sel.intentConfidence,
        motivation: sel.motivation,
        concerns: sel.concerns,
        callReadiness: sel.callReadiness,
        leadScore: sel.leadScore,
        currentJob: sel.currentJob,
        incomeGoal: sel.incomeGoal,
      };

      const { data, error } = await supabase.functions.invoke("suggest-replies", {
        body: { messages: msgPayload, prospect: prospectPayload },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
      }
    } catch (e: any) {
      console.error("AI suggestion error:", e);
      setAiError(e.message || "Failed to get AI suggestions");
    } finally {
      setAiLoading(false);
    }
  }

  const mobileShowList = isMobile && !showChat;
  const mobileShowChat = isMobile && showChat;

  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left: Conversation List */}
      <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 lg:h-full ${mobileShowChat ? "hidden" : "flex-1"} lg:flex`}>
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
          {filtered.map((p) => {
            const id = p.id;
            const name = "name" in p ? p.name : "";
            const handle = "handle" in p ? (p.handle || "") : "";
            const stage = "stage" in p ? p.stage : "";
            const score = useDemo ? (p as DemoProspect).leadScore : (p as DBProspect).lead_score;
            const avatar = useDemo
              ? (p as DemoProspect).avatar
              : name.split(" ").map(w => w[0]).join("").slice(0, 2);
            const unread = useDemo ? (p as DemoProspect).unread : false;
            const plat = useDemo ? null : (p as DBProspect).platform;

            return (
              <button
                key={id}
                onClick={() => selectProspect(id)}
                className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${
                  selectedId === id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {avatar}
                    </div>
                    {unread && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex items-center gap-1">
                        {platformIcon(plat)} {name}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{handle}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant={stageColor[stage] as any} className="text-[10px] px-1.5 py-0">
                        {stage}
                      </Badge>
                      <Badge variant="score" className="text-[10px] px-1.5 py-0">
                        {score}/10
                      </Badge>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Center: Chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileShowList ? "hidden" : ""} lg:flex`}>
        <div className="p-3 lg:p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowChat(false)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="font-semibold text-sm lg:text-base flex items-center gap-1.5">
                {platformIcon(sel.platform)} {sel.name}
              </h2>
              <p className="text-xs text-muted-foreground">{sel.handle} • {sel.stage}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStageDialogOpen(true)}
              title="AI analyzes this prospect's stage"
            >
              <Target className="h-3 w-3 mr-1" /> Analyze Stage
            </Button>
            <Badge variant="score" className="text-xs">{sel.intentLevel} {sel.intentConfidence}%</Badge>
            <Badge variant={sel.callReadiness >= 70 ? "success" : "warning"} className="text-xs">
              <Phone className="h-3 w-3 mr-1" /> {sel.callReadiness}%
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 max-w-2xl mx-auto">
            {messages.map((m) => {
              const content = "content" in m ? m.content : "";
              const sender = "sender" in m ? m.sender : "";
              const time = useDemo
                ? (m as any).timestamp
                : new Date((m as DBMessage).sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

              return (
                <div key={m.id} className={`flex ${sender === "setter" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                      sender === "setter"
                        ? "gradient-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {content}
                    <div className={`text-[10px] mt-1 ${sender === "setter" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {time}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* AI-Powered Suggestions */}
        <div className="border-t border-border p-2 lg:p-4 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Coaching</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              <Info className="h-3 w-3 inline mr-0.5" /> Never auto-sent
            </span>
          </div>

          {/* AI Suggest Button */}
          {aiSuggestions.length === 0 && !aiLoading && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-2 text-xs"
              onClick={fetchAiSuggestions}
              disabled={messages.length === 0}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Get AI Reply Suggestions
            </Button>
          )}

          {aiLoading && (
            <div className="flex items-center justify-center py-3 gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analyzing conversation...
            </div>
          )}

          {aiError && (
            <div className="text-xs text-destructive text-center py-2 mb-1">
              {aiError}
              <Button variant="ghost" size="sm" className="ml-2 text-xs h-6" onClick={fetchAiSuggestions}>
                Retry
              </Button>
            </div>
          )}

          {/* Mobile: horizontal scroll chips */}
          {aiSuggestions.length > 0 && (
            <>
              <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
                {aiSuggestions.map((r, i) => (
                  <button
                    key={i}
                    className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:bg-muted/50 transition-colors"
                    onClick={() => setMessageInput(r.content)}
                  >
                    {r.type}
                  </button>
                ))}
              </div>
              {/* Desktop: full cards with coaching notes */}
              <div className="hidden lg:grid gap-2">
                {aiSuggestions.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group cursor-pointer"
                    onClick={() => setMessageInput(r.content)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Copy"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(r.content);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground">{r.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">💡 {r.coaching_note}</p>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1.5 text-[10px] h-6"
                onClick={fetchAiSuggestions}
                disabled={aiLoading}
              >
                <Sparkles className="h-3 w-3 mr-1" /> Regenerate
              </Button>
            </>
          )}

          {/* Demo static suggestions fallback */}
          {useDemo && aiSuggestions.length === 0 && !aiLoading && replies.length > 0 && (
            <div className="hidden lg:grid gap-2 mt-2">
              {replies.map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setMessageInput(r.content)}
                >
                  <Badge variant="outline" className="text-[10px] mb-1">{r.type}</Badge>
                  <p className="text-xs text-foreground">{r.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="border-t border-border p-2 lg:p-4 shrink-0">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Textarea
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[42px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <DictateButton onText={(t) => setMessageInput(t)} />
            <Button
              onClick={handleSend}
              disabled={!messageInput.trim() || sending}
              size="icon"
              className="shrink-0 h-[42px] w-[42px]"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {!useDemo && sel.platform && (
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Sends via {sel.platform} • You are in control of every message
            </p>
          )}
          {useDemo && (
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              Demo mode — connect an account in Integrations to send real messages
            </p>
          )}
        </div>
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
                <span className="text-sm font-semibold">{sel.intentLevel}</span>
                <Badge variant="score">{sel.intentConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Main Motivation</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{sel.motivation}</span>
                <Badge variant="score">{sel.motivationConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Main Concern</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{sel.concerns}</span>
                <Badge variant="warning">{sel.concernsConfidence}%</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Lead Score</div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{sel.leadScore}/10</span>
                <Badge variant={sel.leadScore >= 7 ? "success" : sel.leadScore >= 4 ? "warning" : "secondary"}>
                  {sel.leadScore >= 7 ? "High Potential" : sel.leadScore >= 4 ? "Medium" : "Low"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Call Readiness</div>
              <div className="mb-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full gradient-primary rounded-full transition-all"
                    style={{ width: `${sel.callReadiness}%` }}
                  />
                </div>
              </div>
              {sel.callReadiness >= 70 && (
                <div className="text-xs text-success flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Ready for call transition
                </div>
              )}
            </CardContent>
          </Card>

          {sel.stage === "Objection Handling" && (
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

          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs text-muted-foreground">Profile</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{sel.location}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Job</span><span>{sel.currentJob}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Income Goal</span><span>{sel.incomeGoal}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span>{sel.timeAvailability}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{sel.source}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DictateButton({ onText }: { onText: (text: string) => void }) {
  const { isListening, start, stop, isSupported } = useSpeechToText(onText);
  if (!isSupported) return null;
  return (
    <Button
      type="button"
      size="icon"
      variant={isListening ? "destructive" : "outline"}
      className={`shrink-0 h-[42px] w-[42px] ${isListening ? "animate-pulse" : ""}`}
      onClick={isListening ? stop : start}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
