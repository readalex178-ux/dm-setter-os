import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Brain } from "lucide-react";
import type { NormalizedProspect } from "@/components/inbox/types";

interface MemoryRow { id: string; category: string; detail: string; }

const CATEGORY_EMOJI: Record<string, string> = {
  goal: "🎯", pain: "😣", budget: "💰", family: "👨‍👩‍👧", availability: "🕒",
  objection: "🛑", interest: "✨",
};

export function ProspectSidebar({ sel, prospectId, useDemo }: { sel: NormalizedProspect; prospectId: string | null; useDemo: boolean }) {
  const [memory, setMemory] = useState<MemoryRow[]>([]);

  useEffect(() => {
    if (!prospectId || useDemo) { setMemory([]); return; }
    (async () => {
      const { data } = await supabase
        .from("prospect_memory")
        .select("id, category, detail")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false });
      setMemory((data as MemoryRow[]) || []);
    })();
  }, [prospectId, useDemo]);

  return (
    <>
      <Card>
        <CardHeader className="p-3 pb-2"><CardTitle className="text-xs text-muted-foreground">Profile</CardTitle></CardHeader>
        <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>{sel.location}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Job</span><span>{sel.currentJob}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Income Goal</span><span>{sel.incomeGoal}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Availability</span><span>{sel.timeAvailability}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{sel.source}</span></div>
        </CardContent>
      </Card>

      {!useDemo && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-primary" /> Prospect Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
            {memory.length === 0 && (
              <p className="text-muted-foreground">No memory captured yet. Run “Score & Remember” to extract goals, pains, budget and more.</p>
            )}
            {memory.map((m) => (
              <div key={m.id} className="flex gap-1.5">
                <span>{CATEGORY_EMOJI[m.category] || "•"}</span>
                <span className="text-foreground">{m.detail}</span>
              </div>
            ))}
            {memory.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {Array.from(new Set(memory.map((m) => m.category))).map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px] capitalize">{c}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
