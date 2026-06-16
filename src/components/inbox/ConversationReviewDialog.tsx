import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2, ThumbsUp, ThumbsDown, Target, AlertCircle, Lightbulb } from "lucide-react";

interface Review {
  overallNote?: string;
  strengths?: string[];
  weaknesses?: string[];
  missedQualification?: string[];
  missedObjections?: string[];
  improvements?: string[];
  alternativeResponses?: { context: string; suggestion: string }[];
  grade?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospectId: string | null;
  prospectName: string;
}

function Section({ icon: Icon, title, items, tone }: { icon: any; title: string; items?: string[]; tone: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 ${tone}`}><Icon className="h-3.5 w-3.5" /> {title}</h4>
      <ul className="space-y-1">
        {items.map((it, i) => <li key={i} className="text-xs text-muted-foreground flex gap-1.5"><span>•</span><span>{it}</span></li>)}
      </ul>
    </div>
  );
}

export function ConversationReviewDialog({ open, onOpenChange, prospectId, prospectName }: Props) {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!prospectId) return;
    setLoading(true); setError(null); setReview(null);
    try {
      const { data, error } = await supabase.functions.invoke("score-conversation", {
        body: { prospectId, mode: "review" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReview(data?.review || {});
    } catch (e: any) {
      setError(e.message || "Failed to review conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setReview(null); setError(null); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /> AI DM Coach</DialogTitle>
          <DialogDescription>Full conversation review for {prospectName}</DialogDescription>
        </DialogHeader>

        {!review && !loading && (
          <div className="py-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Get an honest review of how this conversation was handled — strengths, missed opportunities, and exactly how to improve.</p>
            <Button onClick={run}><GraduationCap className="h-4 w-4 mr-1.5" /> Review this conversation</Button>
          </div>
        )}

        {loading && (
          <div className="py-10 flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /> Coaching in progress...
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-sm text-destructive">
            {error}<div><Button variant="outline" size="sm" className="mt-2" onClick={run}>Retry</Button></div>
          </div>
        )}

        {review && (
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-4">
              {review.grade && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm px-3 py-1">Grade: {review.grade}</Badge>
                </div>
              )}
              {review.overallNote && <p className="text-sm text-foreground bg-muted/50 rounded-md p-3">{review.overallNote}</p>}
              <Section icon={ThumbsUp} title="Strengths" items={review.strengths} tone="text-success" />
              <Section icon={ThumbsDown} title="Weaknesses" items={review.weaknesses} tone="text-destructive" />
              <Section icon={Target} title="Missed Qualification" items={review.missedQualification} tone="text-warning" />
              <Section icon={AlertCircle} title="Missed Objections" items={review.missedObjections} tone="text-warning" />
              <Section icon={Lightbulb} title="Suggested Improvements" items={review.improvements} tone="text-primary" />
              {review.alternativeResponses && review.alternativeResponses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1.5"><Lightbulb className="h-3.5 w-3.5" /> Alternative Responses</h4>
                  <div className="space-y-2">
                    {review.alternativeResponses.map((a, i) => (
                      <div key={i} className="rounded-md border border-border p-2.5">
                        <p className="text-[11px] text-muted-foreground italic mb-1">{a.context}</p>
                        <p className="text-xs text-foreground">{a.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full" onClick={run}>Re-run review</Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
