import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Sparkles, Loader2, Quote, Phone, Save, Send, Copy, Check, History, Captions,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  CALL_OUTCOMES, usePhoneCalls, useLogPhoneCall, useUpdatePhoneCall, useUpdatePhoneProspect,
  type CallOutcome, type PhoneProspect, type PhoneStage, type PreCallBrief,
} from "@/hooks/usePhoneSetting";
import { CallSessionPanel } from "@/components/phone-setting/CallSessionPanel";

interface Props {
  prospect: PhoneProspect | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMove: (id: string, stage: PhoneStage) => void;
}

const outcomeBadgeVariant: Record<string, "success" | "info" | "secondary" | "destructive"> = {
  "Connected": "info",
  "Appointment Booked": "success",
  "Voicemail": "secondary",
  "No Answer": "secondary",
  "Disqualified": "destructive",
};

export function ProspectDetailDialog({ prospect, open, onOpenChange, onMove }: Props) {
  const updateProspect = useUpdatePhoneProspect();
  const logCall = useLogPhoneCall();
  const updateCall = useUpdatePhoneCall();
  const { data: calls = [] } = usePhoneCalls(prospect?.id ?? null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [inCallNotes, setInCallNotes] = useState("");
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [brief, setBrief] = useState<PreCallBrief | null>(null);
  const [briefGeneratedAt, setBriefGeneratedAt] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [debriefNotes, setDebriefNotes] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastDebrief, setLastDebrief] = useState<{ summary: string; nextStep: string; followUpMessage: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debriefRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!prospect) return;
    setPhoneNumber(prospect.phone_number ?? "");
    setInCallNotes(prospect.in_call_notes ?? "");
    setBrief(prospect.pre_call_brief ?? null);
    setBriefGeneratedAt(prospect.pre_call_brief_generated_at ?? null);
    setBriefError(null);
    setOutcome("");
    setDebriefNotes("");
    setDurationMinutes("");
    setLastDebrief(null);
    setPendingTranscript(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospect?.id]);

  function handleCallEnded(transcript: string | null) {
    setPendingTranscript(transcript);
    toast({ title: "Call ended", description: "Log the outcome below to save it to this prospect's history." });
    requestAnimationFrame(() => {
      debriefRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function savePhoneNumber() {
    if (!prospect || phoneNumber === (prospect.phone_number ?? "")) return;
    updateProspect.mutate({ id: prospect.id, phone_number: phoneNumber || null });
  }

  function handleNotesChange(value: string) {
    setInCallNotes(value);
    if (!prospect) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      updateProspect.mutate({ id: prospect.id, in_call_notes: value });
    }, 1200);
  }

  async function generateBrief() {
    if (!prospect) return;
    setBriefLoading(true);
    setBriefError(null);
    try {
      const { data, error } = await supabase.functions.invoke("phone-generate-brief", {
        body: { prospect },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newBrief = data?.brief as PreCallBrief;
      if (!newBrief) throw new Error("No brief returned");
      const generatedAt = new Date().toISOString();
      setBrief(newBrief);
      setBriefGeneratedAt(generatedAt);
      updateProspect.mutate({ id: prospect.id, pre_call_brief: newBrief, pre_call_brief_generated_at: generatedAt });
    } catch (e: any) {
      setBriefError(e.message || "Failed to generate brief");
    } finally {
      setBriefLoading(false);
    }
  }

  async function submitDebrief() {
    if (!prospect || !outcome) return;
    setSubmitting(true);
    try {
      const duration = durationMinutes.trim() ? Number(durationMinutes) : undefined;
      const inserted = await logCall.mutateAsync({
        prospect_id: prospect.id,
        outcome,
        notes: debriefNotes || undefined,
        duration_minutes: Number.isFinite(duration) ? duration : undefined,
        transcript: pendingTranscript || undefined,
      });

      if (outcome === "Appointment Booked") {
        onMove(prospect.id, "Appointment Booked");
      }

      toast({ title: "Call logged", description: `Outcome: ${outcome}` });
      setDebriefNotes("");
      setDurationMinutes("");
      setOutcome("");
      setPendingTranscript(null);

      try {
        const { data, error } = await supabase.functions.invoke("phone-debrief-summary", {
          body: { prospect, outcome, notes: inserted.notes || "" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const debrief = data?.debrief as { summary: string; nextStep: string; followUpMessage: string } | undefined;
        if (debrief) {
          setLastDebrief(debrief);
          await updateCall.mutateAsync({
            id: inserted.id,
            prospect_id: prospect.id,
            ai_summary: debrief.summary,
            ai_next_step: debrief.nextStep,
            ai_follow_up_message: debrief.followUpMessage,
          });
        }
      } catch (e: any) {
        toast({ title: "Call logged, but AI summary failed", description: e.message || "Try again later.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Failed to log call", description: e.message || "Try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function copyFollowUp() {
    if (!lastDebrief) return;
    navigator.clipboard.writeText(lastDebrief.followUpMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
              {prospect.name.slice(0, 2).toUpperCase()}
            </div>
            {prospect.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Phone stage: <strong>{prospect.phone_stage}</strong></p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-6">
            {/* Phone number */}
            <div>
              <Label className="text-xs text-muted-foreground">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="No number on file"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={savePhoneNumber}
                />
              </div>
            </div>

            {/* Live call listening */}
            <CallSessionPanel prospect={prospect} onCallEnded={handleCallEnded} />

            {/* Pre-call AI brief */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Pre-Call Brief
                </CardTitle>
                <Button size="sm" variant="outline" onClick={generateBrief} disabled={briefLoading}>
                  {briefLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                  {brief ? "Regenerate" : "Generate Brief"}
                </Button>
              </CardHeader>
              <CardContent>
                {briefGeneratedAt && (
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Generated {new Date(briefGeneratedAt).toLocaleString()}
                  </p>
                )}
                {briefError && <p className="text-sm text-destructive">{briefError}</p>}
                {!brief && !briefError && !briefLoading && (
                  <p className="text-sm text-muted-foreground">No brief yet. Click Generate Brief before the call.</p>
                )}
                {brief && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Talking Points</h4>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        {brief.talkingPoints.map((tp, i) => <li key={i}>{tp}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Likely Objections</h4>
                      <div className="space-y-2">
                        {brief.likelyObjections.map((o, i) => (
                          <div key={i} className="rounded-md border border-border p-2">
                            <p className="text-sm font-medium">"{o.objection}"</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{o.response}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Qualify On This Call</h4>
                      <ul className="text-sm space-y-1 list-disc pl-4">
                        {brief.qualifyOn.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">BANT</h4>
                      {(["budget", "authority", "need", "timeline"] as const).map((key) => {
                        const item = brief.bant[key];
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium capitalize">{key}</span>
                              <span className="text-xs text-muted-foreground">{item.score}/100</span>
                            </div>
                            <Progress value={item.score} className="h-1.5" />
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground italic pl-1">
                              <Quote className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{item.evidence}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* In-call notes */}
            <div>
              <Label className="text-xs text-muted-foreground">In-Call Notes</Label>
              <Textarea
                className="mt-1 min-h-[160px] text-sm"
                placeholder="Jot down whatever you hear, live..."
                value={inCallNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><Save className="h-2.5 w-2.5" /> Autosaves as you type</p>
            </div>

            {/* Post-call debrief */}
            <Card ref={debriefRef}>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Post-Call Debrief</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pendingTranscript && (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 max-h-28 overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground mb-1">Captured transcript (will be saved with this call)</p>
                    {pendingTranscript}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Outcome</Label>
                    <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
                      <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select outcome" /></SelectTrigger>
                      <SelectContent>
                        {CALL_OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Duration (minutes, optional)</Label>
                    <Input
                      type="number"
                      className="mt-1 h-9 text-sm"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="—"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Debrief Notes</Label>
                  <Textarea
                    className="mt-1 text-sm"
                    value={debriefNotes}
                    onChange={(e) => setDebriefNotes(e.target.value)}
                    placeholder="What happened on the call?"
                  />
                </div>
                <Button size="sm" onClick={submitDebrief} disabled={!outcome || submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Submit Debrief
                </Button>

                {lastDebrief && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                    <div>
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Summary</h4>
                      <p className="text-sm">{lastDebrief.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Next Step</h4>
                      <p className="text-sm">{lastDebrief.nextStep}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider">Follow-Up Message</h4>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={copyFollowUp}>
                          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <p className="text-sm">{lastDebrief.followUpMessage}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Call history */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Call History
              </h4>
              {calls.length === 0 ? (
                <p className="text-sm text-muted-foreground">No calls logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {calls.map((c) => (
                    <div key={c.id} className="rounded-md border border-border p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{new Date(c.called_at).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          {c.duration_minutes != null && (
                            <span className="text-[10px] text-muted-foreground">{c.duration_minutes} min</span>
                          )}
                          <Badge variant={outcomeBadgeVariant[c.outcome] ?? "secondary"} className="text-[10px]">{c.outcome}</Badge>
                        </div>
                      </div>
                      {c.notes && <p className="text-sm">{c.notes}</p>}
                      {c.ai_summary && <p className="text-xs text-muted-foreground mt-1 italic">AI: {c.ai_summary}</p>}
                      {c.transcript && (
                        <Collapsible>
                          <CollapsibleTrigger className="text-[10px] text-primary mt-1.5 flex items-center gap-1 hover:underline">
                            <Captions className="h-3 w-3" /> View transcript
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap rounded-md bg-muted/30 border border-border p-2">
                              {c.transcript}
                            </p>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
