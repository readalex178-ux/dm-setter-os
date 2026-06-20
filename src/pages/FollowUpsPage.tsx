import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, CheckCircle2, Inbox, AlertTriangle } from "lucide-react";
import { useProspects, useMarkContacted } from "@/hooks/useSetterData";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";

const ACTIVE_STAGES = ["New Lead", "Discovery", "Qualification", "Interested", "Objection Handling", "Ready for Call"];

function daysSince(iso: string | null): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function FollowUpsPage() {
  const { data: prospects = [], isLoading } = useProspects();
  const markContacted = useMarkContacted();
  const { toast } = useToast();

  const queue = useMemo(() => {
    return prospects
      .filter((p) => ACTIVE_STAGES.includes(p.stage) && daysSince(p.last_contact_at) >= 2)
      .map((p) => ({ ...p, idle: daysSince(p.last_contact_at) }))
      .sort((a, b) => b.idle - a.idle);
  }, [prospects]);

  const urgent = queue.filter((p) => p.idle >= 5).length;

  async function handleMark(id: string, name: string) {
    try {
      await markContacted.mutateAsync({ id });
      toast({ title: `Marked ${name} as followed up` });
    } catch (e) {
      toast({ title: "Could not update", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Follow-Up Queue</h1>
        <p className="text-sm text-muted-foreground">
          Active prospects going cold. Following up consistently is where most bookings are won or lost.
        </p>
      </div>

      {queue.length > 0 && (
        <div className="flex gap-4">
          <Card className="flex-1"><CardContent className="p-4">
            <Clock className="h-4 w-4 text-warning mb-2" />
            <div className="text-2xl font-bold">{queue.length}</div>
            <p className="text-xs text-muted-foreground">Need a follow-up</p>
          </CardContent></Card>
          <Card className="flex-1"><CardContent className="p-4">
            <AlertTriangle className="h-4 w-4 text-destructive mb-2" />
            <div className="text-2xl font-bold">{urgent}</div>
            <p className="text-xs text-muted-foreground">Going cold (5+ days)</p>
          </CardContent></Card>
        </div>
      )}

      {queue.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          description="No active prospects are overdue for a follow-up. Keep the conversations moving and check back tomorrow."
          actionLabel="Go to Inbox"
          actionTo="/app/inbox"
        />
      ) : (
        <div className="grid gap-3">
          {queue.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{p.handle || "—"} • {p.stage}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={p.idle >= 5 ? "destructive" : "warning"}>{p.idle === 999 ? "never" : `${p.idle}d`}</Badge>
                  <Link to="/app/inbox"><Button variant="outline" size="sm"><Inbox className="h-3.5 w-3.5 mr-1" /> Open</Button></Link>
                  <Button size="sm" variant="ghost" disabled={markContacted.isPending} onClick={() => handleMark(p.id, p.name)}>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
