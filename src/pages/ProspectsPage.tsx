import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Briefcase, DollarSign, Clock, Users, Loader2, Save, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useProspects, useTimeline } from "@/hooks/useSetterData";
import { EmptyState } from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProspectsPage() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { data: prospects = [], isLoading } = useProspects();
  const qc = useQueryClient();

  const selected = prospects.find((p) => p.id === selectedId) ?? prospects[0] ?? null;
  const { data: timeline = [] } = useTimeline(selected?.id ?? null);

  useEffect(() => {
    setNotes(selected?.notes ?? "");
  }, [selected?.id, selected?.notes]);

  const filtered = prospects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.handle ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function saveNotes() {
    if (!selected) return;
    setSavingNotes(true);
    const { error } = await supabase.from("prospects").update({ notes }).eq("id", selected.id);
    setSavingNotes(false);
    if (error) {
      toast({ title: "Could not save notes", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Notes saved" });
      qc.invalidateQueries({ queryKey: ["prospects"] });
    }
  }

  async function deleteProspect() {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("prospects").delete().eq("id", selected.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Could not delete prospect", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Prospect deleted" });
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["prospects"] });
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (prospects.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Prospects</h1>
        <EmptyState
          icon={Users}
          title="No prospects yet"
          description="Add prospects from the Dashboard, connect a platform, or sync via the Chrome extension to build your prospect database."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* List */}
      <div className="w-80 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search prospects..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${selected?.id === p.id ? "bg-accent" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{p.name.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.handle || "—"}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="score" className="text-[10px]">{p.lead_score}/10</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.stage}</Badge>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      {selected && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">{selected.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h1 className="text-xl font-bold">{selected.name}</h1>
                <p className="text-sm text-muted-foreground">{selected.handle || "—"}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="score">{selected.lead_score}/10</Badge>
                  <Badge variant={selected.call_readiness >= 70 ? "success" : "warning"}>{selected.call_readiness}%</Badge>
                  <Badge variant="outline">{selected.stage}</Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteProspect}
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Delete</span>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Qualification Data</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Location:</span> {selected.location || "—"}</div>
                <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Job:</span> {selected.current_job || "—"}</div>
                <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Income Goal:</span> {selected.income_goal || "—"}</div>
                <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Availability:</span> {selected.time_availability || "—"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">AI Analysis</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Intent</span><Badge variant="score">{selected.intent_level || "—"} {selected.intent_confidence ? `${selected.intent_confidence}%` : ""}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Motivation</span><Badge variant="score">{selected.motivation || "—"} {selected.motivation_confidence ? `${selected.motivation_confidence}%` : ""}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Concern</span><Badge variant="warning">{selected.concerns || "—"} {selected.concerns_confidence ? `${selected.concerns_confidence}%` : ""}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{selected.source || "—"}</span></div>
              </CardContent>
            </Card>
          </div>

          {selected.tags && selected.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">{selected.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this prospect..." className="min-h-[80px] text-sm" />
              <Button size="sm" onClick={saveNotes} disabled={savingNotes || notes === (selected.notes ?? "")}>
                {savingNotes ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save Notes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Interaction Timeline</CardTitle></CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-3">
                  {timeline.map((e) => (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <div className="text-sm">{e.description || e.event_type}</div>
                        <div className="text-xs text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No timeline events recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
