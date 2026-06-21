import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import {
  demoProspects, demoMessages, suggestedReplies,
  type Prospect as DemoProspect,
} from "@/data/demo-data";
import type {
  DBProspect, DBMessage, AISuggestion, NormalizedProspect, UIMessage,
} from "@/components/inbox/types";
import { useDeleteProspect, useDeleteMessage } from "@/hooks/useSetterData";

function normalize(useDemo: boolean, selected: any): NormalizedProspect | null {
  if (!selected) return null;
  if (useDemo) {
    const d = selected as DemoProspect;
    return {
      name: d.name, handle: d.handle, stage: d.stage, leadScore: d.leadScore,
      callReadiness: d.callReadiness, intentLevel: d.intentLevel, intentConfidence: d.intentConfidence,
      motivation: d.motivation, motivationConfidence: d.motivationConfidence, concerns: d.concerns,
      concernsConfidence: d.concernsConfidence, location: d.location, currentJob: d.currentJob,
      incomeGoal: d.incomeGoal, timeAvailability: d.timeAvailability, source: d.source,
      platform: null, profileUrl: null, avatar: d.avatar, unread: d.unread,
      conversationScore: null, bookingProbability: null, leadTemperature: null,
      stageConfidence: null, stageSuggested: null, suggestedAction: null,
    };
  }
  const p = selected as DBProspect;
  return {
    name: p.name, handle: p.handle || "", stage: p.stage, leadScore: p.lead_score,
    callReadiness: p.call_readiness, intentLevel: p.intent_level || "Unknown",
    intentConfidence: p.intent_confidence || 0, motivation: p.motivation || "Unknown",
    motivationConfidence: p.motivation_confidence || 0, concerns: p.concerns || "None",
    concernsConfidence: p.concerns_confidence || 0, location: p.location || "—",
    currentJob: p.current_job || "—", incomeGoal: p.income_goal || "—",
    timeAvailability: p.time_availability || "—", source: p.source || "—",
    platform: p.platform, profileUrl: p.profile_url, avatar: p.name.split(" ").map((w) => w[0]).join("").slice(0, 2),
    unread: false,
    conversationScore: p.conversation_score, bookingProbability: p.booking_probability,
    leadTemperature: p.lead_temperature, stageConfidence: p.stage_confidence,
    stageSuggested: p.stage_suggested, suggestedAction: p.suggested_action,
  };
}

export function useInbox() {
  const isMobile = useIsMobile();
  const [dbProspects, setDbProspects] = useState<DBProspect[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [localDemoMessages, setLocalDemoMessages] = useState<Record<string, UIMessage[]>>({});
  const [hiddenDemoMessageIds, setHiddenDemoMessageIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [search, setSearch] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [useDemo, setUseDemo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [contentMatchIds, setContentMatchIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoAnalyzeCooldown = useRef<Record<string, number>>({});
  const deleteProspectMutation = useDeleteProspect();
  const deleteMessageMutation = useDeleteMessage();

  const selectProspect = useCallback((id: string) => {
    setSelectedId(id);
    setAiSuggestions([]);
    setAiError(null);
    if (isMobile) setShowChat(true);
  }, [isMobile]);

  const autoAnalyzeStage = useCallback(async (prospectId: string) => {
    const last = autoAnalyzeCooldown.current[prospectId] || 0;
    if (Date.now() - last < 30_000) return;
    autoAnalyzeCooldown.current[prospectId] = Date.now();
    try {
      const [{ data: msgs }, { data: pData }] = await Promise.all([
        supabase.from("messages").select("sender, content").eq("prospect_id", prospectId).order("sent_at", { ascending: true }),
        supabase.from("prospects").select("*").eq("id", prospectId).maybeSingle(),
      ]);
      if (!pData) return;
      const { data, error } = await supabase.functions.invoke("analyze-stage", {
        body: {
          messages: (msgs || []).map((m: any) => ({ sender: m.sender, content: m.content })),
          prospect: {
            name: pData.name, stage: pData.stage, currentJob: pData.current_job,
            incomeGoal: pData.income_goal, motivation: pData.motivation, concerns: pData.concerns,
          },
        },
      });
      if (error || data?.error) return;
      const analysis = data?.analysis;
      if (!analysis) return;
      if (analysis.suggestedStage !== pData.stage && analysis.confidence >= 65) {
        toast({
          title: `🎯 Stage suggestion: ${pData.name}`,
          description: `${pData.stage} → ${analysis.suggestedStage} (${analysis.confidence}%) — open "Analyze Stage" to review & apply`,
        });
      }
    } catch (e) {
      console.error("Auto-analyze error:", e);
    }
  }, []);

  // voice prefill
  useEffect(() => {
    const raw = sessionStorage.getItem("voice_prefill");
    if (!raw) return;
    sessionStorage.removeItem("voice_prefill");
    try {
      const prefill = JSON.parse(raw);
      if (prefill.prospectId) selectProspect(prefill.prospectId);
      if (prefill.message) setTimeout(() => setMessageInput(prefill.message), 300);
    } catch { /* ignore */ }
  }, [selectProspect]);

  // load prospects
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prospects").select("*").order("last_contact_at", { ascending: false });
      setUseDemo(false);
      if (data && data.length > 0) {
        setDbProspects(data as DBProspect[]);
        setSelectedId(data[0].id);
      }
      setLoaded(true);
    })();
  }, []);

  // load messages + realtime
  useEffect(() => {
    if (!selectedId || useDemo) return;
    (async () => {
      const { data } = await supabase.from("messages").select("*").eq("prospect_id", selectedId).order("sent_at", { ascending: true });
      if (data) setDbMessages(data as DBMessage[]);
    })();
    const channel = supabase
      .channel(`messages-${selectedId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `prospect_id=eq.${selectedId}` },
        (payload) => {
          const newMsg = payload.new as DBMessage;
          setDbMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender !== "setter") autoAnalyzeStage(selectedId);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId, useDemo, autoAnalyzeStage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dbMessages, localDemoMessages, selectedId]);

  // derived data
  const prospects = useDemo ? demoProspects : dbProspects;
  const selectedRaw = useDemo
    ? demoProspects.find((p) => p.id === selectedId) || demoProspects[0]
    : dbProspects.find((p) => p.id === selectedId) || dbProspects[0];
  const sel = normalize(useDemo, selectedRaw);

  const messages: UIMessage[] = useMemo(() => {
    if (useDemo) {
      const base = (demoMessages[selectedId || "p1"] || [])
        .filter((m: any) => !hiddenDemoMessageIds.has(m.id))
        .map((m: any) => ({
          id: m.id, sender: m.sender, content: m.content, time: m.timestamp,
        }));
      const local = localDemoMessages[selectedId || "p1"] || [];
      return [...base, ...local];
    }
    return dbMessages.map((m) => ({
      id: m.id, sender: m.sender, content: m.content,
      time: new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }));
  }, [useDemo, selectedId, dbMessages, localDemoMessages, hiddenDemoMessageIds]);

  const replies = useDemo
    ? (suggestedReplies as Record<string, { type: string; content: string }[]>)[selectedId || "p1"] || []
    : [];

  // Search message content (DB mode only) so search also matches text inside
  // conversations, not just prospect name/handle.
  useEffect(() => {
    const term = search.trim();
    if (useDemo || !term) {
      setContentMatchIds(new Set());
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("messages")
        .select("prospect_id")
        .ilike("content", `%${term}%`)
        .limit(200);
      if (active) setContentMatchIds(new Set((data || []).map((m: any) => m.prospect_id)));
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [search, useDemo]);

  const filtered = prospects.filter((p: any) => {
    const term = search.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const handle = (p.handle || "").toLowerCase();
    if (!term || name.includes(term) || handle.includes(term)) return true;
    if (useDemo) {
      const msgs = demoMessages[p.id] || [];
      return msgs.some((m: any) => (m.content || "").toLowerCase().includes(term));
    }
    return contentMatchIds.has(p.id);
  });

  async function handleSend() {
    if (!messageInput.trim() || !selectedId) return;
    if (useDemo) {
      const newMsg: UIMessage = {
        id: `local-${Date.now()}`, sender: "setter", content: messageInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setLocalDemoMessages((prev) => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), newMsg] }));
      setMessageInput("");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-message", {
        body: { prospectId: selectedId, content: messageInput.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessageInput("");
      // Message will appear via realtime subscription (deduplication handled in handler above)
    } catch (e: any) {
      console.error("Send error:", e);
      toast({ title: "Could not send message", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function fetchAiSuggestions() {
    if (!selectedId || messages.length === 0 || !sel) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      const msgPayload = messages.map((m) => ({ sender: m.sender, content: m.content }));
      const prospectPayload = {
        name: sel.name, stage: sel.stage, intentLevel: sel.intentLevel,
        intentConfidence: sel.intentConfidence, motivation: sel.motivation, concerns: sel.concerns,
        callReadiness: sel.callReadiness, leadScore: sel.leadScore, currentJob: sel.currentJob,
        incomeGoal: sel.incomeGoal,
      };
      const { data, error } = await supabase.functions.invoke("suggest-replies", {
        body: { messages: msgPayload, prospect: prospectPayload, prospectId: useDemo ? undefined : selectedId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.suggestions) setAiSuggestions(data.suggestions);
    } catch (e: any) {
      console.error("AI suggestion error:", e);
      setAiError(e.message || "Failed to get AI suggestions");
    } finally {
      setAiLoading(false);
    }
  }

  // Phase 5: AI conversation scoring + memory extraction
  async function scoreConversation() {
    if (!selectedId || useDemo || messages.length === 0) return;
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-conversation", {
        body: { prospectId: selectedId, mode: "score" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const s = data?.scoring;
      if  (s) {
        setDbProspects((prev) => prev.map((p) => p.id === selectedId ? {
          ...p,
          conversation_score: s.conversationScore ?? p.conversation_score,
          booking_probability: s.bookingProbability ?? p.booking_probability,
          lead_temperature: s.leadTemperature ?? p.lead_temperature,
          stage_confidence: s.stageConfidence ?? p.stage_confidence,
          stage_suggested: s.suggestedStage ?? p.stage_suggested,
          suggested_action: s.suggestedAction ?? p.suggested_action,
        } : p));
        toast({ title: "Conversation scored", description: `Score ${s.conversationScore}/100 • ${s.leadTemperature} • ${s.bookingProbability}% booking` });
      }
    } catch (e: any) {
      console.error("Scoring error:", e);
      toast({ title: "Could not score conversation", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setScoring(false);
    }
  }

  async function applyStage(newStage: string) {
    if (useDemo || !selectedId) return;
    const { error } = await supabase.from("prospects").update({ stage: newStage }).eq("id", selectedId);
    if (error) throw error;
    setDbProspects((prev) => prev.map((p) => (p.id === selectedId ? { ...p, stage: newStage } : p)));
  }

  function deleteProspect() {
    if (useDemo || !selectedId) return;
    setShowDeleteConfirm(true);
  }

  function cancelDelete() {
    setShowDeleteConfirm(false);
  }

  async function confirmDelete() {
    if (!selectedId) return;
    try {
      await deleteProspectMutation.mutateAsync(selectedId);
      setDbProspects((prev) => prev.filter((p) => p.id !== selectedId));
      setSelectedId(null);
      setShowDeleteConfirm(false);
      toast({ title: "Prospect deleted" });
    } catch (e: any) {
      console.error("Delete prospect error:", e);
      toast({ title: "Could not delete prospect", description: e.message || "Try again", variant: "destructive" });
    }
  }

  // Delete a single message. In demo mode this is in-memory only (there's no
  // demo backend), elsewhere it deletes the row in Supabase (scoped to the
  // current user) and removes it from local state immediately — messages
  // aren't on a React Query cache here, and there's no realtime DELETE
  // subscription, so we update dbMessages directly rather than relying on
  // invalidation.
  async function deleteMessage(messageId: string) {
    if (useDemo) {
      setHiddenDemoMessageIds((prev) => new Set(prev).add(messageId));
      if (selectedId) {
        setLocalDemoMessages((prev) => {
          const list = prev[selectedId];
          if (!list) return prev;
          return { ...prev, [selectedId]: list.filter((m) => m.id !== messageId) };
        });
      }
      toast({ title: "Message deleted" });
      return;
    }
    try {
      await deleteMessageMutation.mutateAsync(messageId);
      setDbMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast({ title: "Message deleted" });
    } catch (e: any) {
      console.error("Delete message error:", e);
      toast({ title: "Could not delete message", description: e.message || "Try again", variant: "destructive" });
    }
  }

  function handleProspectAdded(prospect: DBProspect) {
    setDbProspects((prev) => [prospect, ...prev]);
    setSelectedId(prospect.id);
    setShowAddProspect(false);
    if (isMobile) setShowChat(true);
  }

  return {
    isMobile, showChat, setShowChat, search, setSearch, messageInput, setMessageInput,
    sending, useDemo, loaded, aiSuggestions, aiLoading, aiError, scoring,
    messagesEndRef, selectedId, selectProspect, prospects, filtered, sel, messages, replies,
    dbProspectsEmpty: !useDemo && dbProspects.length === 0,
    handleSend, fetchAiSuggestions, scoreConversation, applyStage,
    deleteProspect, confirmDelete, cancelDelete, showDeleteConfirm, deleteMessage,
    showAddProspect, setShowAddProspect, handleProspectAdded,
  };
}
