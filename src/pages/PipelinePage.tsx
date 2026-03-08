import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { demoProspects, type PipelineStage } from "@/data/demo-data";
import { Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const stages: PipelineStage[] = [
  "New Lead", "Discovery", "Qualification", "Interested",
  "Objection Handling", "Ready for Call", "Call Booked", "Not Qualified", "Cold Lead",
];

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

export default function PipelinePage() {
  const [view, setView] = useState<"kanban" | "table">("kanban");

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

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const prospects = demoProspects.filter((p) => p.stage === stage);
            return (
              <div key={stage} className="min-w-[240px] flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{stage}</h3>
                  <Badge variant="secondary" className="text-xs">{prospects.length}</Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {prospects.map((p) => (
                    <Card key={p.id} className={`${stageColors[stage]} border`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {p.avatar}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">{p.handle}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="score" className="text-[10px]">{p.leadScore}/10</Badge>
                          <Badge variant={p.callReadiness >= 70 ? "success" : "secondary"} className="text-[10px]">
                            <Phone className="h-2.5 w-2.5 mr-0.5" />{p.callReadiness}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {prospects.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
                      No prospects
                    </div>
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
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {demoProspects.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.avatar}</div>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.handle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{p.stage}</Badge></td>
                    <td className="p-3"><Badge variant="score">{p.leadScore}/10</Badge></td>
                    <td className="p-3"><Badge variant={p.callReadiness >= 70 ? "success" : "secondary"}>{p.callReadiness}%</Badge></td>
                    <td className="p-3">{p.intentLevel} {p.intentConfidence}%</td>
                    <td className="p-3 text-muted-foreground">{p.lastContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
