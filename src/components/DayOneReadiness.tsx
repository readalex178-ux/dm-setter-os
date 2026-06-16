import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Rocket, ArrowRight } from "lucide-react";
import { useReadiness } from "@/hooks/useReadiness";

export function DayOneReadiness() {
  const { data: items = [], isLoading } = useReadiness();
  if (isLoading || items.length === 0) return null;

  const done = items.filter((i) => i.done).length;
  const score = Math.round((done / items.length) * 10);
  const complete = done === items.length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Day-1 Readiness
          </CardTitle>
          <Badge variant={complete ? "success" : score >= 6 ? "warning" : "secondary"} className="text-sm px-3 py-1">
            {score}/10
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(done / items.length) * 100} className="h-1.5" />
        {complete ? (
          <p className="text-sm text-success">You're fully set up. Go perform like a top 1% setter.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {items.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-colors ${
                  item.done ? "border-transparent bg-muted/40" : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.done
                    ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className={`text-sm truncate ${item.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                    {item.label}
                  </span>
                </div>
                {!item.done && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
