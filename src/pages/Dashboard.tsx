import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { dashboardStats, demoProspects } from "@/data/demo-data";
import { demoKPIs, kpiGoals, getStreak } from "@/data/kpi-data";
import {
  MessageSquare, Users, UserCheck, Phone, PhoneCall,
  Snowflake, TrendingUp, Clock, ArrowRight, AlertCircle,
  RefreshCw, Flame, Plus, Send, UserPlus, CheckCircle2,
  Target, Activity,
} from "lucide-react";
import { Link } from "react-router-dom";

const kpis = [
  { label: "Total Conversations", value: dashboardStats.totalConversations, icon: MessageSquare, color: "text-primary" },
  { label: "Active Leads", value: dashboardStats.activeLeads, icon: Users, color: "text-info" },
  { label: "Qualified Prospects", value: dashboardStats.qualifiedProspects, icon: UserCheck, color: "text-success" },
  { label: "Ready for Call", value: dashboardStats.readyForCall, icon: Phone, color: "text-warning" },
  { label: "Calls Booked", value: dashboardStats.callsBooked, icon: PhoneCall, color: "text-success" },
  { label: "Cold Leads", value: dashboardStats.coldLeads, icon: Snowflake, color: "text-muted-foreground" },
  { label: "Conversion Rate", value: `${dashboardStats.conversionRate}%`, icon: TrendingUp, color: "text-primary" },
  { label: "Follow-Ups Due", value: dashboardStats.followUpsDue, icon: Clock, color: "text-warning" },
];

const actions = [
  { icon: AlertCircle, label: "Respond to new leads", count: 4, color: "text-info", link: "/app/inbox" },
  { icon: Flame, label: "Follow up warm prospects", count: 3, color: "text-warning", link: "/app/inbox" },
  { icon: Phone, label: "Transition qualified leads to call", count: 2, color: "text-success", link: "/app/pipeline" },
  { icon: RefreshCw, label: "Re-engage cold leads", count: 5, color: "text-muted-foreground", link: "/app/prospects" },
];

export default function Dashboard() {
  const [quickName, setQuickName] = useState("");
  const [quickHandle, setQuickHandle] = useState("");
  const hotProspects = demoProspects.filter(p => p.leadScore >= 7).slice(0, 4);
  const today = demoKPIs[0];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your daily DM setting overview</p>
        </div>
        <Link to="/app/kpi">
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-1" /> Full KPI Tracker
          </Button>
        </Link>
      </div>

      {/* Today's Goal Progress — compact */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Today's Targets
            </h3>
            <Badge variant="outline" className="text-xs">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {kpiGoals.map((goal) => {
              const val = today[goal.metric] as number;
              const pct = Math.min((val / goal.dailyTarget) * 100, 100);
              const hit = val >= goal.dailyTarget;
              const streak = getStreak(demoKPIs, goal.metric, goal.dailyTarget);
              return (
                <div key={goal.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{goal.label}</span>
                    {hit && <CheckCircle2 className="h-3 w-3 text-success" />}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{val}</span>
                    <span className="text-xs text-muted-foreground">/ {goal.dailyTarget}</span>
                  </div>
                  <Progress value={pct} className="h-1 mt-1" />
                  {streak > 1 && (
                    <span className="text-xs text-warning flex items-center gap-0.5 mt-1">
                      <Flame className="h-2.5 w-2.5" /> {streak}d
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-2xl font-bold">{kpi.value}</span>
              </div>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.map((a) => (
              <Link key={a.label} to={a.link} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <a.icon className={`h-4 w-4 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{a.count}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Hot Prospects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Hot Prospects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hotProspects.map((p) => (
              <Link key={p.id} to="/app/inbox" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {p.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.handle} • {p.stage}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="score">{p.leadScore}/10</Badge>
                  <Badge variant={p.callReadiness >= 70 ? "success" : p.callReadiness >= 40 ? "warning" : "secondary"}>
                    {p.callReadiness}%
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Quick Add Prospect */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Quick Add Prospect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                placeholder="e.g. Sarah Mitchell"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Instagram Handle</label>
              <Input
                placeholder="e.g. @sarahmitchell_fit"
                value={quickHandle}
                onChange={(e) => setQuickHandle(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button className="w-full" size="sm" disabled={!quickName.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Add to New Leads
            </Button>
            <p className="text-xs text-muted-foreground text-center">Opens in inbox for conversation paste</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
