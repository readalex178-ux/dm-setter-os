import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Check, X, Quote } from "lucide-react";

interface BantItem {
  score: number;
  evidence: string;
}

export interface StageAnalysis {
  suggestedStage: string;
  confidence: number;
  reasoning: string;
  bant: {
    budget: BantItem;
    authority: BantItem;
    need: BantItem;
    timeline: BantItem;
  };
  nextAction: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospectId: string | null;
  prospectName: string;
  currentStage: string;
  prospect: any;
  messages: { sender: string; content: string }[];
  /** Called when user approves the suggested stage. If async, parent updates the DB/state. */
  onApply?: (stage: string) => void | Promise<void>;
  /** Auto-run analysis when dialog opens. */
  autoRun?: boolean;
}

export function StageAnalysisDialog({
  open,
  onOpenChange,
  prospectId,
  prospectName,
  currentStage,
  prospect,
  messages,
  onApply,
  autoRun = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<StageAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("analyze-stage", {
        body: { messages, prospect },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      if (data?.analysis) setAnalysis(data.analysis as StageAnalysis);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to analyze stage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && autoRun && !analysis && !loading) {
      runAnalysis();
    }
    if (!open) {
      // reset when closed
      setTimeout(() => {
        setAnalysis(null);
        setError(null);
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleApply() {
    if (!analysis || !onApply) return;
    setApplying(true);
    try {
      await onApply(analysis.suggestedStage);
      toast({ title: "Stage updated", description: `${prospectName} → ${analysis.suggestedStage}` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to update stage", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  const stageChanged = analysis && analysis.suggestedStage !== currentStage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Stage Analysis
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{prospectName} • currently <strong>{currentStage}</strong></p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Reading the conversation…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-destructive mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={runAnalysis}>Retry</Button>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              {/* Suggested Stage */}
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Stage</span>
                  <Badge variant="score" className="text-xs">{analysis.confidence}% confident</Badge>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={stageChanged ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {analysis.suggestedStage}
                  </Badge>
                  {stageChanged && (
                    <span className="text-xs text-muted-foreground">↑ change from {currentStage}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{analysis.reasoning}</p>
              </div>

              {/* BANT */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">BANT Breakdown</h4>
                {(["budget", "authority", "need", "timeline"] as const).map((key) => {
                  const item = analysis.bant[key];
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

              {/* Next Action */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Next Action</h4>
                <p className="text-sm">{analysis.nextAction}</p>
              </div>
            </div>
          )}
        </ScrollArea>

        {analysis && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenChange(false)}>
              <X className="h-3.5 w-3.5 mr-1" /> Dismiss
            </Button>
            {stageChanged && onApply && (
              <Button size="sm" className="flex-1" onClick={handleApply} disabled={applying}>
                {applying ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Apply: {analysis.suggestedStage}
              </Button>
            )}
            {!stageChanged && (
              <Button size="sm" className="flex-1" disabled>
                <Check className="h-3.5 w-3.5 mr-1" /> Already {analysis.suggestedStage}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
