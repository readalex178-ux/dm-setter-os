import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";
import { BarChart3, Loader2 } from "lucide-react";
import { useProspects, useKPIs, type DBDailyKPI } from "@/hooks/useSetterData";
import { PIPELINE_STAGES } from "@/hooks/useSetterData";
import { EmptyState } from "@/components/EmptyState";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--info))", "hsl(var(--warning))",
  "hsl(var(--destructive))", "hsl(var(--muted-foreground))",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

const QUALIFIED_STAGES = ["Qualification", "Interested", "Objection Handling", "Ready for Call"];

type Range = "30d" | "90d" | "all";
type Granularity = "day" | "week" | "month";

// How many buckets a given range should ever try to chart, regardless of
// how much history is in `kpis`. Keeps long histories readable.
const MAX_BUCKETS = 26;

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Picks a sensible bucket size for the activity chart based on the
 * selected range and how much history is actually available. This avoids
 * dividing by an unbounded/zero date range and keeps 30d vs 90d vs All
 * time visibly distinct. */
function pickGranularity(range: Range, kpis: DBDailyKPI[]): Granularity {
  if (range === "30d") return "day";
  if (range === "90d") return "week";

  if (!kpis.length) return "week";
  const times = kpis.map((k) => new Date(k.date).getTime());
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000;
  if (spanDays <= 45) return "day";
  if (spanDays <= 365) return "week";
  return "month";
}

function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === "day") {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (granularity === "week") return startOfWeek(date);
  return startOfMonth(date);
}

function bucketLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (granularity === "week") return `Wk of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function AnalyticsPage() {
  const { data: allProspects = [], isLoading } = useProspects();
  const { data: allKpis = [] } = useKPIs();
  const [range, setRange] = useState<Range>("all");

  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const days = range === "30d" ? 30 : 90;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [range]);

  const prospects = useMemo(() => {
    if (!cutoff) return allProspects;
    return allProspects.filter((p) => new Date(p.created_at) >= cutoff);
  }, [allProspects, cutoff]);

  const kpis = useMemo(() => {
    if (!cutoff) return allKpis;
    return allKpis.filter((k) => new Date(k.date) >= cutoff);
  }, [allKpis, cutoff]);

  const totalConversations = prospects.length;
  const qualified = prospects.filter((p) => QUALIFIED_STAGES.includes(p.stage)).length;
  const booked = prospects.filter((p) => p.stage === "Call Booked").length;
  const conversionRate = totalConversations ? Math.round((booked / totalConversations) * 100) : 0;

  const stageData = PIPELINE_STAGES.map((stage) => ({
    name: stage.replace(" Lead", "").replace("Objection Handling", "Objection").replace("Ready for Call", "Ready").replace("Not Qualified", "Not Qual"),
    count: prospects.filter((p) => p.stage === stage).length,
  }));

  const objectionCounts: Record<string, number> = {};
  prospects.forEach((p) => {
    if (p.concerns) {
      const key = p.concerns.trim();
      objectionCounts[key] = (objectionCounts[key] || 0) + 1;
    }
  });
  const objections = Object.entries(objectionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Bucket granularity adapts to the selected range so 30d, 90d, and All
  // time produce visibly different charts instead of the same fixed
  // 7-day window every time.
  const granularity = useMemo(() => pickGranularity(range, kpis), [range, kpis]);

  const weeklyData = useMemo(() => {
    if (!kpis.length) return [];
    const buckets = new Map<string, { date: Date; conversations: number; booked: number }>();
    for (const k of kpis) {
      const start = bucketStart(new Date(k.date), granularity);
      const key = start.toISOString();
      const existing = buckets.get(key);
      if (existing) {
        existing.conversations += k.dms_sent + k.follow_ups_sent;
        existing.booked += k.calls_booked;
      } else {
        buckets.set(key, {
          date: start,
          conversations: k.dms_sent + k.follow_ups_sent,
          booked: k.calls_booked,
        });
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-MAX_BUCKETS)
      .map((b) => ({
        day: bucketLabel(b.date, granularity),
        conversations: b.conversations,
        booked: b.booked,
      }));
  }, [kpis, granularity]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance tracking and insights from your real activity</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["30d", "90d", "all"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setRange(r)}
            >
              {r === "all" ? "All time" : r}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{totalConversations}</div><p className="text-xs text-muted-foreground">Total Prospects</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{qualified}</div><p className="text-xs text-muted-foreground">Qualified Prospects</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{booked}</div><p className="text-xs text-muted-foreground">Calls Booked</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{conversionRate}%</div><p className="text-xs text-muted-foreground">Conversion Rate</p></CardContent></Card>
      </div>

      {totalConversations === 0 && kpis.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Once you add prospects and log KPIs, your funnel, objections, and weekly activity will appear here from real data."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Activity Over Time</CardTitle></CardHeader>
            <CardContent>
              {weeklyData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Log daily KPIs to see activity trends.</p>
              ) : (
                <ResponsiveContainer key={`${range}-${granularity}`} width="100%" height={250}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={weeklyData.length > 9 ? -45 : 0} textAnchor={weeklyData.length > 9 ? "end" : "middle"} height={weeklyData.length > 9 ? 50 : 30} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="conversations" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="booked" stroke="hsl(var(--success))" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Pipeline Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer key={range} width="100%" height={250}>
                <BarChart data={stageData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Common Objections</CardTitle></CardHeader>
            <CardContent>
              {objections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">Run AI stage analysis on prospects to surface objection patterns.</p>
              ) : (
                <ResponsiveContainer key={range} width="100%" height={250}>
                  <PieChart>
                    <Pie data={objections} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" isAnimationActive={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {objections.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Funnel Conversion</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Prospects → Qualified", value: totalConversations ? Math.round((qualified / totalConversations) * 100) : 0 },
                { label: "Qualified → Booked", value: qualified ? Math.round((booked / qualified) * 100) : 0 },
                { label: "Prospects → Booked", value: conversionRate },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">{row.label}</span><span className="font-semibold">{row.value}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary rounded-full" style={{ width: `${row.value}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
