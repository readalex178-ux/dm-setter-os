import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Send, MessageSquare, UserPlus, PhoneCall, Phone, Clock,
  Flame, Target, TrendingUp, Plus, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Trophy,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { demoKPIs, kpiGoals, getStreak, getWeekTotal, type DailyKPI } from "@/data/kpi-data";

const metricIcons: Record<string, React.ElementType> = {
  dmsSent: Send,
  followUpsSent: MessageSquare,
  callsBooked: Phone,
  newLeads: UserPlus,
  hoursWorked: Clock,
};

export default function KPITrackerPage() {
  const [kpis] = useState<DailyKPI[]>(demoKPIs);
  const [showLogForm, setShowLogForm] = useState(false);
  const today = kpis[0];

  // Chart data (last 7 days, reversed for left-to-right chronological)
  const chartData = kpis.slice(0, 7).reverse().map((k) => ({
    date: new Date(k.date).toLocaleDateString("en-US", { weekday: "short" }),
    "DMs Sent": k.dmsSent,
    "Calls Booked": k.callsBooked,
    "Follow-Ups": k.followUpsSent,
    "New Leads": k.newLeads,
  }));

  const conversionRate = today.dmsSent > 0
    ? ((today.callsBooked / today.dmsSent) * 100).toFixed(1)
    : "0";

  const weekCallsBooked = getWeekTotal(kpis, "callsBooked");
  const weekDmsSent = getWeekTotal(kpis, "dmsSent");
  const weekConversion = weekDmsSent > 0 ? ((weekCallsBooked / weekDmsSent) * 100).toFixed(1) : "0";

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

      {/* Quick Log Form */}
      {showLogForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Log Today's Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "DMs Sent", key: "dmsSent", val: today.dmsSent },
                { label: "DMs Received", key: "dmsReceived", val: today.dmsReceived },
                { label: "New Leads", key: "newLeads", val: today.newLeads },
                { label: "Follow-Ups Sent", key: "followUpsSent", val: today.followUpsSent },
                { label: "Calls Booked", key: "callsBooked", val: today.callsBooked },
                { label: "Hours Worked", key: "hoursWorked", val: today.hoursWorked },
              ].map((f) => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input type="number" defaultValue={f.val} className="mt-1" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Goal Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiGoals.map((goal) => {
          const todayVal = today[goal.metric] as number;
          const pct = Math.min((todayVal / goal.dailyTarget) * 100, 100);
          const hit = todayVal >= goal.dailyTarget;
          const streak = getStreak(kpis, goal.metric, goal.dailyTarget);
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
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold">{todayVal}</span>
                  <span className="text-xs text-muted-foreground">/ {goal.dailyTarget}</span>
                </div>
                <Progress value={pct} className="h-1.5 mb-2" />
                {streak > 1 && (
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-warning" />
                    <span className="text-xs text-warning font-medium">{streak} day streak</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Today's Conversion</p>
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">DM → Call</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Weekly Conversion</p>
            <p className="text-2xl font-bold">{weekConversion}%</p>
            <p className="text-xs text-muted-foreground">{weekCallsBooked} calls / {weekDmsSent} DMs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Objections Handled</p>
            <p className="text-2xl font-bold">{today.objectionsHandled}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">No-Shows</p>
            <p className="text-2xl font-bold">{today.noShows}</p>
            <p className="text-xs text-muted-foreground">
              {getWeekTotal(kpis, "noShows")} this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">DMs & Follow-Ups (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="DMs Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Follow-Ups" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Calls Booked & New Leads (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="Calls Booked" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="New Leads" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Summary Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Daily Log (Last 14 Days)</CardTitle>
        </CardHeader>
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
                </tr>
              </thead>
              <tbody>
                {kpis.map((k, i) => {
                  const isToday = i === 0;
                  return (
                    <tr key={k.id} className={`border-b border-border/50 ${isToday ? "bg-primary/5" : ""}`}>
                      <td className="py-2 pr-4 whitespace-nowrap font-medium">
                        {isToday ? (
                          <Badge variant="outline" className="text-xs">Today</Badge>
                        ) : (
                          new Date(k.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        )}
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={k.dmsSent >= 20 ? "text-success font-medium" : ""}>{k.dmsSent}</span>
                      </td>
                      <td className="text-center py-2 px-2">
                        <span className={k.followUpsSent >= 10 ? "text-success font-medium" : ""}>{k.followUpsSent}</span>
                      </td>
                      <td className="text-center py-2 px-2">{k.newLeads}</td>
                      <td className="text-center py-2 px-2">
                        <span className={k.callsBooked >= 2 ? "text-success font-medium" : ""}>{k.callsBooked}</span>
                      </td>
                      <td className="text-center py-2 px-2">{k.callsCompleted}</td>
                      <td className="text-center py-2 px-2">
                        {k.noShows > 0 ? (
                          <span className="text-destructive font-medium">{k.noShows}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-2">{k.hoursWorked}h</td>
                      <td className="py-2 pl-4 text-muted-foreground text-xs max-w-[200px] truncate">{k.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Totals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-warning" /> Weekly Summary
            </CardTitle>
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
                  <p className={`text-xl font-bold ${hit ? "text-success" : ""}`}>{goal.metric === "hoursWorked" ? weekVal.toFixed(1) : weekVal}</p>
                  <p className="text-xs text-muted-foreground">/ {goal.weeklyTarget} target</p>
                  <Progress value={pct} className="h-1 mt-1" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
