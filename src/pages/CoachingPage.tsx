import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MessageSquare, TrendingUp, Award, Target } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useTrainingAttempts } from "@/hooks/useKnowledge";

function gradeToPoints(grade: string | null): number | null {
  if (!grade) return null;
  const letter = grade.trim().charAt(0).toUpperCase();
  const base: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  if (!(letter in base)) return null;
  let pts = base[letter];
  if (grade.includes("+")) pts += 0.3;
  if (grade.includes("-")) pts -= 0.3;
  return Math.max(0, Math.min(4, pts));
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CoachingPage() {
  const { data: attempts = [], isLoading } = useTrainingAttempts();

  const graded = attempts.map((a) => gradeToPoints(a.grade)).filter((p): p is number => p !== null);
  const gpa = graded.length ? (graded.reduce((s, p) => s + p, 0) / graded.length) : null;
  const trend =
    graded.length >= 2 ? graded[0] - graded[graded.length - 1] : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Coaching</h1>
        <p className="text-sm text-muted-foreground">Real feedback from your practice sessions — track your growth over time</p>
      </div>

      {!isLoading && attempts.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No coaching history yet"
          description="Complete a Training Mode roleplay and the AI's grade and feedback will be saved here so you can track your improvement over time."
          actionLabel="Start a practice session"
          actionTo="/app/training"
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Award className="h-4 w-4 text-primary mb-2" />
                <div className="text-2xl font-bold">{gpa !== null ? gpa.toFixed(1) : "—"}</div>
                <p className="text-xs text-muted-foreground">Avg grade (4.0 scale)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <MessageSquare className="h-4 w-4 text-info mb-2" />
                <div className="text-2xl font-bold">{attempts.length}</div>
                <p className="text-xs text-muted-foreground">Sessions completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <TrendingUp className={`h-4 w-4 mb-2 ${trend >= 0 ? "text-success" : "text-warning"}`} />
                <div className="text-2xl font-bold">{trend >= 0 ? "+" : ""}{trend.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Recent trend</p>
              </CardContent>
            </Card>
          </div>

          {attempts.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{a.scenario_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(a.created_at)}{a.difficulty ? ` • ${a.difficulty}` : ""}
                      </p>
                    </div>
                  </div>
                  {a.grade && <Badge variant="score" className="text-lg px-3 py-1">{a.grade}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {a.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-success flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-4 w-4" /> What Went Well
                    </h4>
                    <ul className="space-y-1.5">
                      {a.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-success mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.improvements?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-warning flex items-center gap-1.5 mb-2">
                      <XCircle className="h-4 w-4" /> Areas to Improve
                    </h4>
                    <ul className="space-y-1.5">
                      {a.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-warning mt-0.5">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.summary && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm"><span className="font-semibold">Summary:</span> {a.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
