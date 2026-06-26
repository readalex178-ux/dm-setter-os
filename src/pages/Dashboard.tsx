import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  MessageSquare, Users, UserCheck, Phone, PhoneCall,
  Snowflake, TrendingUp, Clock, ArrowRight, AlertCircle,
  Flame, Plus, UserPlus, CheckCircle2,
  Target, Activity, Loader2, Inbox as InboxIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useProspects, useKPIs, useAddProspect } from "@/hooks/useSetterData";
import { kpiGoals, getTodayKPI, getStreak } from "@/lib/kpi";
import { EmptyState } from "@/components/EmptyState";
import { DayOneReadiness } from "@/components/DayOneReadiness";
import { DailyBriefing } from "@/components/DailyBriefing";

const QUALIFIED_STAGES = ["Qualification", "Interested", "Objection Handling", "Ready for Call"];

export default function Dashboard() {
  const [quickName, setQuickName] = useState("");
  const [quickHandle, setQuickHandle] = useState("");
  const { data: prospects = [], isLoading } = useProspects();
  const { data: kpis = [] } = useKPIs();
  const addProspect = useAddProspect();

  const today = getTodayKPI(kpis);

  const activeLeads = prospects.filter((p) => !["Call Booked", "Not Qualified", "Cold Lead"].includes(p.stage)).length;
  const qualified = prospects.filter((p) => QUALIFIED_STAGES.includes(p.stage)).length;
  const readyForCall = prospects.filter((p) => p.stage === "Ready for Call").length;
  const booked = prospects.filter((p) => p.stage === "Call Booked").length;
  const cold = prospects.filter((p) => p.stage === "Cold Lead").length;
  const conversionRate = prospects.length ? Math.round((booked / prospects.length) * 100) : 0;

  // Follow-ups due: active prospects untouched for 2+ days
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  const followUpsDue = prospects.filter((p) => {
    if (["Call Booked", "Not Qualified", "Cold Lead"].includes(p.stage)) return false;
    if (!p.last_contact_at) return true;
    return Date.now() - new Date(p.last_contact_at).getTime() > TWO_DAYS;
  }).length;
  const hotLeads = prospects.filter((p) => (p.lead_score ?? 0) >= 7).length;

  const focusItems = [
    { label: "Follow-ups due", value: followUpsDue, icon: Clock, to: "/app/followups", tone: followUpsDue > 0 ? "text-warning" : "text-muted-foreground" },
    { label: "Hot leads", value: hotLeads, icon: Flame, to: "/app/inbox", tone: hotLeads > 0 ? "text-destructive" : "text-muted-foreground" },
    { label: "Active conversations", value: activeLeads, icon: MessageSquare, to: "/app/inbox", tone: "text-info" },
    { label: "Ready for call", value: readyForCall, icon: Phone, to: "/app/pipeline", tone: readyForCall > 0 ? "text-success" : "text-muted-foreground" },
    { label: "Calls booked", value: booked, icon: PhoneCall, to: "/app/pipeline", tone: "text-success" },
  ];

  const kpiCards = [
    { label: "Total Prospects", value: prospects.length, icon: MessageSquare, color: "text-primary" },
    { label: "Active Leads", value: activeLeads, icon: Users, color: "text-info" },
    { label: "Qualified", value: qualified, icon: UserCheck, color: "text-success" },
    { label: "Ready for Call", value: readyForCall, icon: Phone, color: "text-warning" },
    { label: "Calls Booked", value: booked, icon: PhoneCall, color: "text-success" },
    { label: "Cold Leads", value: cold, icon: Snowflake, color: "text-muted-foreground" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
    { label: "DMs Today", value: today.dms_sent, icon: Clock, color: "text-warning" },
  ];

  const hotProspects = [...prospects]
    .filter((p) => (p.lead_score ?? 0) >= 7)
    .sort((a, b) => (b.lead_score ?? 0) - (a.lead_score ?? 0))
    .slice(0, 4);

  const newLeadCount = prospects.filter((p) => p.stage === "New Lead").length;
  const readyCount = prospects.filter((p) => p.stage === "Ready for Call").length;

  async function handleQuickAdd() {
    if (!quickName.trim()) return;
    try {
      await addProspect.mutateAsync({ name: quickName.trim(), handle: quickHandle.trim() || undefined });
      toast({ title: "Prospect added", description: `${quickName} added to New Leads.` });
      setQuickName("");
      setQuickHandle("");
    } catch (e) {
      toast({ title: "Could not add prospect", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

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

      {/* Focus Now — what to act on right now */}
      {prospects.length > 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-primary" /> Focus Now
              <span className="text-xs font-normal text-muted-foreground">— what to act on right now</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {focusItems.map((f) => (
                <Link key={f.label} to={f.to} className="rounded-lg border border-border bg-card p-3 hover:bg-muted/60 transition-colors">
                  <f.icon className={`h-4 w-4 mb-2 ${f.tone}`} />
                  <div className="text-2xl font-bold">{f.value}</div>
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day-1 Readiness */}
      <DayOneReadiness />


      {/* Daily AI Briefing */}
      <DailyBriefing />

      {/* Today's Goal Progress */}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {kpiGoals.map((goal) => {
              const val = today[goal.metric] as number;
              const pct = Math.min((val / goal.dailyTarget) * 100, 100);
              const hit = val >= goal.dailyTarget;
              const streak = getStreak(kpis, goal.metric, goal.dailyTarget);
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
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 lg:gap-4">
        {kpiCards.map((kpi) => (
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

      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {/* Daily Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today's Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/app/inbox" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3"><AlertCircle className="h-4 w-4 text-info" /><span className="text-sm font-medium">Respond to new leads</span></div>
              <div className="flex items-center gap-2"><Badge variant="secondary">{newLeadCount}</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>
            </Link>
            <Link to="/app/pipeline" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-success" /><span className="text-sm font-medium">Transition to call</span></div>
              <div className="flex items-center gap-2"><Badge variant="secondary">{readyCount}</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>
            </Link>
            <Link to="/app/prospects" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3"><Snowflake className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Re-engage cold leads</span></div>
              <div className="flex items-center gap-2"><Badge variant="secondary">{cold}</Badge><ArrowRight className="h-3 w-3 text-muted-foreground" /></div>
            </Link>
          </CardContent>
        </Card>

        {/* Hot Prospects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Hot Prospects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hotProspects.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No hot prospects yet. Score climbs as conversations progress.</p>
            )}
            {hotProspects.map((p) => (
              <Link key={p.id} to="/app/inbox" className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.handle || "—"} • {p.stage}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.lead_score != null ? `${p.lead_score}/10` : '—'}/10` : '—'}</Badge>
                  <Badge variant={p.call_readiness != null && p.call_readiness >= 70 ? "success" : p.call_readiness != null && p.call_readiness >= 40 ? "warning" : "secondary"}>
                    {p.call_readiness != null ? `${p.call_readiness}%` : '\u2014'}
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
              <Input placeholder="e.g. Sarah Mitchell" value={quickName} onChange={(e) => setQuickName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Handle</label>
              <Input placeholder="e.g. @sarahmitchell_fit" value={quickHandle} onChange={(e) => setQuickHandle(e.target.value)} className="mt-1" />
            </div>
            <Button className="w-full" size="sm" disabled={!quickName.trim() || addProspect.isPending} onClick={handleQuickAdd}>
              {addProspect.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add to New Leads
            </Button>
          </CardContent>
        </Card>
      </div>

      {prospects.length === 0 && (
        <EmptyState
          icon={InboxIcon}
          title="No prospects yet"
          description="Add your first prospect above, connect a platform, or use the Chrome extension to sync conversations. Then set up your Offer so the AI can ground every reply."
          actionLabel="Set up My Offer"
          actionTo="/app/offer"
        />
      )}
    </div>
  );
}
