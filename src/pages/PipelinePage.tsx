import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Sparkles, GitBranch, Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StageAnalysisDialog } from "@/components/StageAnalysisDialog";
import { useProspects, useUpdateProspectStage, PIPELINE_STAGES } from "@/hooks/useSetterData";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const stageColors: Record<string, string> = {
  "New Lead": "bg-muted",
  "Discovery": "bg-info/10 border-info/20",
  "Qualification": "bg-warning/10 border-warning/20",
  "Interested": "bg-primary/10 border-primary/20",
  "Objection Handling": "bg-destructive/10 border-destructive/20",
  "Ready for Call": "bg-success/10 border-success/20",
  "Call Booked": "bg-success/20 border-success/30",
  "Not Qualified": "bg-muted",
  "Cold Lead": "bg-muted",
};

// Consistent red/amber/green scale for every row, instead of only ever
// coloring values above ~75% and leaving everything else looking unstyled.
function callReadyVariant(value: number): "destructive" | "warning" | "success" {
  if (value >= 70) return "success";
  if (value >= 40) return "warning";
  return "destructive";
}

export default function PipelinePage() {
  // Kanban needs heavy horizontal scrolling through 9 stage columns on
  // phone-width screens, where Table view already adapts well. Default to
  // Table below the `lg` breakpoint, but only as the *initial* choice —
  // users can still switch back to Kanban manually at any time.
  const [view, setView] = useState<"kanban" | "table">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches ? "table" : "kanban"
  );
  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const { data: prospects = [], isLoading } = useProspects();
  const updateStage = useUpdateProspectStage();

  const analyzeTarget = analyzeId ? prospects.find((p) => p.id === analyzeId) : null;
  const [analyzeMessages, setAnalyzeMessages] = useState<{ sender: string; content: string }[]>([]);

  useEffect(() => {
    if (!analyzeId) {
      setAnalyzeMessages([]);
      return;
    }
    let active = true;
    supabase
    .from("messages")
    .select("sender, content")
    .eq("prospect_id", analyzeId)
    .order("sent_at", { ascending: true })
    .then(({ data }) => {
      if (active) setAnalyzeMessages((data || []).map((m: any) => ({ sender: m.sender, content: m.content })));
    });
    return () => { active = false; };
  }, [analyzeId]);

  const filteredProspects = prospects.filter((p) => {
    const term = search.toLowerCase();
    return !term || p.name.toLowerCase().includes(term) || (p.handle ?? "").toLowerCase().includes(term);
  });

  async function move(id: string, stage: string) {
    try {
      await updateStage.mutateAsync({ id, stage });
      toast({ title: "Stage updated", description: `Moved to ${stage}.` });
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Manage prospect stages. AI suggests moves — you confirm.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
        </div>
      </div>

      {prospects.length > 0 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or handle..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : prospects.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Your pipeline is empty"
          description="Add prospects from the Dashboard, connect a platform, or sync via the Chrome extension. They'll flow through your pipeline stages here."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const list = filteredProspects.filter((p) => p.stage === stage);
            return (
              <div
                key={stage}
                className={`min-w-[240px] flex flex-col rounded-lg transition-colors ${dragOverStage === stage ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/prospect-id");
                  setDragOverStage(null);
                  setDraggedId(null);
                  if (id) move(id, stage);
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{stage}</h3>
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {list.map((p) => (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(p.id);
                        e.dataTransfer.setData("text/prospect-id", p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                      className={`${stageColors[stage]} border group relative cursor-grab active:cursor-grabbing ${draggedId === p.id ? "opacity-40" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{p.handle || "—"}</div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" title="AI: Analyze stage" onClick={() => setAnalyzeId(p.id)}>
                            <Sparkles className="h-3 w-3 text-primary" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Badge variant="score" className="text-[10px]">{p.lead_score}/10</Badge>
                          <Badge variant={callReadyVariant(p.call_readiness)} className="text-[10px]">
                            <Phone className="h-2.5 w-2.5 mr-0.5" />{p.call_readiness}%
                          </Badge>
                        </div>
                        <Select value={p.stage} onValueChange={(v) => move(p.id, v)}>
                          <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                  {list.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">No prospects</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Score</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Call Ready</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Intent</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProspects.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.handle || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Select value={p.stage} onValueChange={(v) => move(p.id, v)}>
                        <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3"><Badge variant="score">{p.lead_score}/10</Badge></td>
                    <td className="p-3"><Badge variant={callReadyVariant(p.call_readiness)}>{p.call_readiness}%</Badge></td>
                    <td className="p-3">{p.intent_level || "—"} {p.intent_confidence ? `${p.intent_confidence}%` : ""}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAnalyzeId(p.id)}>
                        <Sparkles className="h-3 w-3 mr-1 text-primary" /> Analyze
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <StageAnalysisDialog
        open={!!analyzeId}
        onOpenChange={(v) => !v && setAnalyzeId(null)}
        prospectId={analyzeId}
        prospectName={analyzeTarget?.name || ""}
        currentStage={analyzeTarget?.stage || ""}
        prospect={analyzeTarget || {}}
        messages={analyzeMessages}
        onApply={(stage) => analyzeId && move(analyzeId, stage)}
      />
    </div>
  );
}
