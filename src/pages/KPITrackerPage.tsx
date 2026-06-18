import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Send, MessageSquare, UserPlus, Phone, Clock,
  Flame, Target, Plus, ChevronUp,
  CheckCircle2, Trophy, Loader2, Save, Trash2,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useKPIs, useLogKPI, type DBDailyKPI } from "@/hooks/useSetterData";
import {
  kpiGoals, getStreak, getWeekTotal, getTodayKPI, todayStr, EMPTY_KPI,
  benchmark, benchmarkColor, correctiveTip,
} from "@/lib/kpi";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const metricIcons: Record<string, React.ElementType> = {
  dms_sent: Send,
  follow_ups_sent: MessageSquare,
  calls_booked: Phone,
  new_leads: UserPlus,
  hours_worked: Clock,
};

type FormState = Omit<DBDailyKPI, "id" | "date">;

export default function KPITrackerPage() {
  const { data: kpis = [], isLoading } = useKPIs();
  const logKPI = useLogKPI();
  const qc = useQueryClient();
  const [showLogForm, setShowLogForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_KPI);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const today = getTodayKPI(kpis);

  useEffect(() => {
    const { id, date, ...rest } = today;
    setForm(rest);
  }, [today.id]);

  const chartData = kpis.slice(0, 7).reverse().map((k) => ({
    date: new Date(k.date).toLocaleDateString("en-US", { weekday: "short" }),
    "DMs Sent": k.dms_sent,
    "Calls Booked": k.calls_booked,
    "Follow-Ups": k.follow_ups_sent,
    "New Leads": k.new_leads,
  }));

  const conversionRate = today.dms_sent > 0 ? ((today.calls_booked / today.dms_sent) * 100).toFixed(1) : "0";
  const weekCallsBooked = getWeekTotal(kpis, "calls_booked");
  const weekDmsSent = getWeekTotal(kpis, "dms_sent");
  const weekConversion = weekDmsSent > 0 ? ((weekCallsBooked / weekDmsSent) * 100).toFixed(1) : "0";

  async function save() {
    try {
      await logKPI.mutateAsync({ date: todayStr(), ...form });
      toast({ title: "Saved", description: "Today's numbers logged." });
      setShowLogForm(false);
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  async function deleteKPI(id: string, date: string) {
    const label = date === todayStr() ? "today's entry" : `entry for ${new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeletingIds((prev) => new Set(prev).add(id));
    const { error } = await supabase.from("daily_kpis").delete().eq("id", id);
    setDeletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    if (error) {
      toast({ title: "Could not delete entry", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry deleted" });
      qc.invalidateQueries({ queryKey: ["daily_kpis"] });
    }
  }

  const numField = (k: keyof FormState) => ({
    value: (form[k] as number) ?? 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: Number(e.target.value) })),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">KPI Tracker</h1>
          <p className="text-sm text-muted-foreground">Track your daily numbers and hit your targets</p>
        </div>
        <Button onClick={() => setShowLogForm(!showLogForm)} size="sm">
          {showLogForm ? <ChevronUp className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showLogForm ? "Close" : "Log Today"}
        </Button>
      </div>

      {showLogForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Log Today's Numbers</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "DMs Sent", key: "dms_sent" as const },
                { label: "DMs Received", key: "dms_received" as const },
                { label: "New Leads", key: "new_leads" as const },
                { label: "Follow-Ups Sent", key: "follow_ups_sent" as const },
                { label: "Calls Booked", key: "calls_booked" as const },
                { label: "Calls Completed", key: "calls_completed" as const },
                { label: "No-Shows", key: "no_shows" as const },
                { label: "Qualified", key: "conversions_to_qualified" as const },
                { label: "Objections Handled", key: "objections_handled" as const },
                { label: "Hours Worked", key: "hours_worked" as const },
              ].map((f) => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input type="number" className="mt-1" {...numField(f.key)} />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                className="mt-1 text-sm"
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="How did today go?"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={save} disabled={logKPI.isPending}>
                {logKPI.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiGoals.map((goal) => {
          const todayVal = today[goal.metric] as number;
          const pct = Math.min((todayVal / goal.dailyTarget) * 100, 100);
          const hit = todayVal >= goal.dailyTarget;
          const streak = getStreak(kpis, goal.metric, goal.dailyTarget);
          const band = benchmark(goal.metric, todayVal);
          const Icon = metricIcons[goal.metric] || Target;
          return (
            <Card key={goal.metric} className={hit ? "border-success/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${hit ? "text-success" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium text-muted-foreground">{goal.label}</span>
                  </div>
                  {hit && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold">{todayVal}</span>
                  <span className="text-xs text-muted-foreground">/ {goal.dailyTarget}</span>
                </div>
                <span className={`text-[10px] font-medium ${benchmarkColor[band]}`}>{band}</span>
                <Progress value={pct} className="h-1.5 my-2" />
                {streak > 1 ? (
                  <div className="flex items-center gap-1"><Flame className="h-3 w-3 text-warning" /><span className="text-xs text-warning font-medium">{streak} day streak</span></div>
                ) : !hit ? (
                  <p className="text-[10px] text-muted-foreground leading-tight">{correctiveTip(goal.metric)}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Today's Conversion</p><p className="text-2xl font-bold">{conversionRate}%</p><p className="text-xs text-muted-foreground">DM → Call</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Weekly Conversion</p><p className="text-2xl font-bold">{weekConversion}%</p><p className="text-xs text-muted-foreground">{weekCallsBooked} calls / {weekDmsSent} DMs</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Objections Handled</p><p className="text-2xl font-bold">{today.objections_handled}</p><p className="text-xs text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">No-Shows</p><p className="text-2xl font-bold">{today.no_shows}</p><p className="text-xs text-muted-foreground">{getWeekTotal(kpis, "no_shows")} this week</p></CardContent></Card>
      </div>

      {kpis.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No KPIs logged yet. Hit <span className="font-medium text-foreground">Log Today</span> to record your first day and start building streaks.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">DMs & Follow-Ups (7 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="DMs Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Follow-Ups" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Calls Booked & New Leads (7 days)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="Calls Booked" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="New Leads" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Daily Log (Last 30 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-center py-2 px-2">DMs</th>
                      <th className="text-center py-2 px-2">Follow-Ups</th>
                      <th className="text-center py-2 px-2">New Leads</th>
                      <th className="text-center py-2 px-2">Calls Booked</th>
                      <th className="text-center py-2 px-2">Completed</th>
                      <th className="text-center py-2 px-2">No-Shows</th>
                      <th className="text-center py-2 px-2">Hours</th>
                      <th className="text-left py-2 pl-4">Notes</th>
                      <th className="py-2 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.map((k) => {
                      const isToday = k.date === todayStr();
                      const isDeleting = deletingIds.has(k.id);
                      return (
                        <tr key={k.id} className={`border-b border-border/50 group ${isToday ? "bg-primary/5" : ""}`}>
                          <td className="py-2 pr-4 whitespace-nowrap font-medium">
                            {isToday ? <Badge variant="outline" className="text-xs">Today</Badge> : new Date(k.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="text-center py-2 px-2"><span className={k.dms_sent >= 20 ? "text-success font-medium" : ""}>{k.dms_sent}</span></td>
                          <td className="text-center py-2 px-2"><span className={k.follow_ups_sent >= 10 ? "text-success font-medium" : ""}>{k.follow_ups_sent}</span></td>
                          <td className="text-center py-2 px-2">{k.new_leads}</td>
                          <td className="text-center py-2 px-2"><span className={k.calls_booked >= 2 ? "text-success font-medium" : ""}>{k.calls_booked}</span></td>
                          <td className="text-center py-2 px-2">{k.calls_completed}</td>
                          <td className="text-center py-2 px-2">{k.no_shows > 0 ? <span className="text-destructive font-medium">{k.no_shows}</span> : <span className="text-muted-foreground">0</span>}</td>
                          <td className="text-center py-2 px-2">{k.hours_worked}h</td>
                          <td className="py-2 pl-4 text-muted-foreground text-xs max-w-[200px] truncate">{k.notes}</td>
                          <td className="py-2 pl-2">
                            <button
                              onClick={() => deleteKPI(k.id, k.date)}
                              disabled={isDeleting}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50"
                              title="Delete this entry"
                            >
                              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-warning" /> Weekly Summary</CardTitle>
                <Badge variant="secondary">This Week</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {kpiGoals.map((goal) => {
                  const weekVal = getWeekTotal(kpis, goal.metric);
                  const pct = Math.min((weekVal / goal.weeklyTarget) * 100, 100);
                  const hit = weekVal >= goal.weeklyTarget;
                  return (
                    <div key={goal.metric} className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">{goal.label}</p>
                      <p className={`text-xl font-bold ${hit ? "text-success" : ""}`}>{goal.metric === "hours_worked" ? weekVal.toFixed(1) : weekVal}</p>
                      <p className="text-xs text-muted-foreground">/ {goal.weeklyTarget} target</p>
                      <Progress value={pct} className="h-1 mt-1" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
