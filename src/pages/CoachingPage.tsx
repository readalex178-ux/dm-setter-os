import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, MessageSquare } from "lucide-react";

const reviews = [
  {
    id: "r1",
    prospectName: "Sarah Mitchell",
    date: "Today",
    score: "B+",
    strengths: [
      "Good use of open-ended discovery questions",
      "Smooth acknowledgement of prospect's career frustration",
      "Effective income goal extraction",
    ],
    improvements: [
      "Missed opportunity to address legitimacy concern immediately",
      "Could have used a softer call transition after income goal mention",
      "Three consecutive questions without acknowledgement — add validation between questions",
    ],
    summary: "Solid conversation with good discovery flow. Address objections faster and avoid stacking questions without acknowledgement.",
  },
  {
    id: "r2",
    prospectName: "Marcus Johnson",
    date: "Yesterday",
    score: "C+",
    strengths: [
      "Good rapport-building opener",
      "Correctly identified skepticism early",
    ],
    improvements: [
      "Pushed for call too early — prospect wasn't qualified yet",
      "Missed asking about income goals before transition",
      "Didn't address risk concerns directly",
      "Conversation stalled after objection — needed a pivot",
    ],
    summary: "Rushed to call transition without enough qualification. Spend more time on discovery before suggesting a call.",
  },
];

export default function CoachingPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Coaching</h1>
        <p className="text-sm text-muted-foreground">Review past conversations and improve your approach</p>
      </div>

      {reviews.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">{r.prospectName}</CardTitle>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
              </div>
              <Badge variant="score" className="text-lg px-3 py-1">{r.score}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-success flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-4 w-4" /> What Went Well
              </h4>
              <ul className="space-y-1.5">
                {r.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-warning flex items-center gap-1.5 mb-2">
                <XCircle className="h-4 w-4" /> Areas to Improve
              </h4>
              <ul className="space-y-1.5">
                {r.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm"><span className="font-semibold">Summary:</span> {r.summary}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
