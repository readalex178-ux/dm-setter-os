import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, TrendingUp, AlertCircle, ListChecks, MessageSquareWarning } from "lucide-react";
import { toast } from "sonner";

interface Briefing {
  headline: string;
  wins: string[];
  concerns: string[];
  priority_actions: string[];
  objection_insight: string;
  followUpCount?: number;
}

export function DailyBriefing() {
  const [loading, setLoading] = useState(false);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  async function run() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-briefing", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBriefing(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate briefing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Daily AI Briefing
          </CardTitle>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {briefing ? "Refresh" : "Generate"}
          </Button>
        </div>
      </CardHeader>
      {briefing && (
        <CardContent className="space-y-4">
          <p className="text-sm font-medium">{briefing.headline}</p>
          <div className="grid md:grid-cols-2 gap-4">
            <Section icon={TrendingUp} color="text-success" title="Wins" items={briefing.wins} />
            <Section icon={AlertCircle} color="text-warning" title="Needs Attention" items={briefing.concerns} />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <ListChecks className="h-4 w-4 text-primary" /> Tomorrow's Priorities
            </h4>
            <ol className="space-y-1.5">
              {briefing.priority_actions.map((a, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="font-bold text-primary">{i + 1}.</span> {a}
                </li>
              ))}
            </ol>
          </div>
          {briefing.objection_insight && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm flex items-start gap-2">
                <MessageSquareWarning className="h-4 w-4 text-info mt-0.5 shrink-0" />
                <span><span className="font-semibold">Objection insight: </span>{briefing.objection_insight}</span>
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Section({ icon: Icon, color, title, items }: { icon: any; color: string; title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className={`text-sm font-semibold flex items-center gap-1.5 mb-2 ${color}`}>
        <Icon className="h-4 w-4" /> {title}
      </h4>
      <ul className="space-y-1">
        {items.map((s, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className={color}>•</span> {s}</li>
        ))}
      </ul>
    </div>
  );
}
