import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Phone, AlertTriangle, Gauge, Sparkles, Loader2, MessageSquareText } from "lucide-react";
import { tempColor, type NormalizedProspect } from "@/components/inbox/types";
import { ProspectSidebar } from "@/components/inbox/ProspectSidebar";

interface Props {
  sel: NormalizedProspect;
  prospectId: string | null;
  useDemo: boolean;
  scoring: boolean;
  onScore: () => void;
  onReview: () => void;
}

export function ConversationInsights({ sel, prospectId, useDemo, scoring, onScore, onReview }: Props) {
  return (
    <div className="w-72 border-l border-border p-4 overflow-y-auto shrink-0 hidden xl:block">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" /> AI Insights
      </h3>

      <div className="space-y-4">
        {/* AI conversation scoring */}
        <Card className="border-primary/20">
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-primary" /> Conversation Score</span>
              {sel.conversationScore != null
                ? <Badge variant={sel.conversationScore >= 70 ? "success" : sel.conversationScore >= 40 ? "warning" : "secondary"}>{sel.conversationScore}/100</Badge>
                : <Badge variant="secondary">—</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] text-muted-foreground">Booking</div>
                <div className="text-sm font-bold">{sel.bookingProbability != null ? `${sel.bookingProbability}%` : "—"}</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-[10px] text-muted-foreground">Temperature</div>
                <div className="text-sm font-bold">
                  {sel.leadTemperature ? <Badge variant={tempColor(sel.leadTemperature) as any} className="text-[10px]">{sel.leadTemperature}</Badge> : "—"}
                </div>
              </div>
            </div>
            {sel.stageSuggested && (
              <div className="text-[11px] text-muted-foreground">
                Stage: <span className="text-foreground font-medium">{sel.stageSuggested}</span>
                {sel.stageConfidence != null && <span> ({sel.stageConfidence}%)</span>}
              </div>
            )}
            {sel.suggestedAction && (
              <div className="text-[11px] rounded-md bg-primary/5 border border-primary/10 p-2">
                <span className="font-medium text-primary">Next:</span> {sel.suggestedAction}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={onScore} disabled={scoring || useDemo}>
                {scoring ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />} Score
              </Button>
              <Button size="sm" variant="outline" className="text-[11px] h-7" onClick={onReview} disabled={useDemo}>
                <MessageSquareText className="h-3 w-3 mr-1" /> Review
              </Button>
            </div>
            {useDemo && <p className="text-[10px] text-muted-foreground text-center">Scoring needs a connected account</p>}
          </CardContent>
        </Card>

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
              <span className="text-sm font-semibold">{sel.concerns || "—"}</span>
              <Badge variant={sel.concerns ? "warning" : "score"}>{sel.concernsConfidence}%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Call Readiness</div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-primary rounded-full transition-all" style={{ width: `${sel.callReadiness}%` }} />
            </div>
            {sel.callReadiness >= 70 && (
              <div className="text-xs text-success flex items-center gap-1"><Phone className="h-3 w-3" /> Ready for call transition</div>
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
              <p className="text-xs text-muted-foreground">Prospect has raised objections. Address concerns before pushing for a call.</p>
            </CardContent>
          </Card>
        )}

        <ProspectSidebar sel={sel} prospectId={prospectId} useDemo={useDemo} />
      </div>
    </div>
  );
}
