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
  Target, Activity, Loader2, Inbox as InboxIcon, Zap,
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

  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
  const followUpsDue = prospects.filter((p) => {
    if (["Call Booked", "Not Qualified", "Cold Lead"].includes(p.stage)) return false;
    if (!p.last_contact_at) return true;
    return Date.now() - new Date(p.last_contact_at).getTime() > TWO_DAYS;
  }).length;
  const hotLeads = prospects.filter((p) => (p.conversation_score ?? 0) >= 70).length;

  const focusItems = [
    { label: "Follow-ups due", value: followUpsDue, icon: Clock, to: "/app/followups", accent: "text-warning", border: "border-warning/40", bg: "bg-warning/5" },
    { label: "Hot leads", value: hotLeads, icon: Flame, to: "/app/inbox", accent: "text-destructive", border: "border-destructive/40", bg: "bg-destructive/5" },
    { label: "Active conversations", value: activeLeads, icon: MessageSquare, to: "/app/inbox", accent: "text-info", border: "border-info/40", bg: "bg-info/5" },
    { label: "Ready for call", value: readyForCall, icon: Phone, to: "/app/pipeline", accent: "text-success", border: "border-success/40", bg: "bg-success/5" },
    { label: "Calls booked", value: booked, icon: PhoneCall, to: "/app/pipeline", accent: "text-success", border: "border-success/30", bg: "bg-success/5" },
  ];

  const kpiCards = [
    { label: "Total Prospects", value: prospects.length, icon: MessageSquare, color: "text-primary" },
    { label: "Active Leads", value: activeLeads, icon: Users, olor: "text-info" },
    { label: "Qualified", value: qualified, icon: UserCheck, color: "text-success" },
    { label: "Ready for Call", value: readyForCall, icon: Phone, color: "text-warning" },
    { label: "Calls Booked", value: booked, icon: PhoneCall, color: "text-success" },
    { label: "Cold Leads", value: cold, icon: Snowflake, color: "text-muted-foreground" },
    { label: "Conversion", value: `${conversionRate}%`, icon: TrendingUp, color: "text-primary" },
    { label: "DMs Today", value: today.dms_sent, icon: Clock, color: "text-warning" },
  ];

  const hotProspects = [...prospects]
    .filter((p) => (p.conversation_score ?? 0) >= 70)
    .sort((a, b) => (b.conversation_score ?? 0) - (a.conversation_score ?? 0))
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

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link to="/app/kpi">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> KPI Tracker
          </Button>
        </Link>
      </div>

      {/* Focus Now */}
      {prospects.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Focus Now</span>
            <span className="text-xs text-muted-foreground">â highest priority actions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {focusItems.map((f) => (
              <Link key={f.label} to={f.to}
                className={`group rounded-xl border ${f.border} ${f.bg} p-4 hover:brightness-110 transition-all duration-150 flex flex-col gap-2`}>
                <f.icon className={`h-4 w-4 ${f.accent}`} />
                <div className={`text-3xl font-bold tabular-nums ${f.value > 0 ? f.accent : "text-muted-foreground"}`}>
                  {f.value}
                </div>
                <div className="text-xs text-muted-foreground leading-tight">{f.label}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Day-1 Readiness + Daily Briefing */}
      <DayOneReadiness />
      <DailyBriefing />

      {/* Today's KPI Targets */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Today's Targets
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
            {kpiGoals.map((goal) => {
              const val = today[goal.metric] as number;
              const pct = Math.min((val / goal.dailyTarget) * 100, 100);
              const hit = val >= goal.dailyTarget;
              const streak = getStreak(kpis, goal.metric, goal.dailyTarget);
              return (
                <div key={goal.metric} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{goal.label}</span>
                    {hit && <CheckCircle2 className="h-3 w-3 text-success" />}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tabular-nums ${hit ? "text-success" : ""}`}>{val}</span>
                    <span className="text-xs text-muted-foreground">/ {goal.dailyTarget}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  {streak > 1 && (
                    <span className="text-xs text-warning flex items-center gap-0.5">
                      <Flame className="h-2.5 w-2.5" /> {streak}d streak
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="hover:bg-muted/40 transition-colors">
            <CardContent className="p-4">
              <kpi.icon className={`h-3.5 w-3.5 ${kpi.color} mb-2.5`} />
              <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kipi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom 3-col grid */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">

        {/* Today's Actions */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base">Today's Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {[
              { to: "/app/inbox", icon: AlertCircle, iconColor: "text-info", label: "Respond to new leads", count: newLeadCount },
              { to: "/app/pipeline", icon: Phone, iconColor: "text-success", label: "Transition to call", count: readyCount },
              { to: "/app/prospects", icon: Snowflake, iconColor: "text-muted-foreground", label: "Re-engage cold leads", count: cold },
            ].map((a) => (
              <Link key={a.label} to={a.to}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors group">
                <div className="flex items-center gap-3">
                  <a.icon className={`h-4 w-4 ${a.iconColor}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tabular-nums">{a.count}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Hot Prospects */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" /> Hot Prospects
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-1">
            {hotProspects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No hot prospects yet â score climbs as conversations progress.
              </p>
            ) : hotProspects.map((p) => {
              const score = p.conversation_score ?? 0;
              const initials = p.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Link key={p.id} to="/app/inbox"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/60 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold leading-tight">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.stage}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-bold tabular-nums ${score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-muted-foreground"}`}>
                        {score}
                      </div>
                      <div className="text-xs text-muted-foreground">score</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Add Prospect */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Quick Add Prospect
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input placeholder="e.g. Sarah Mitchell" value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Handle <span className="text-muted-foreground/60">(optional)</span></label>
              <Input placeholder="@handle" value={quickHandle}
                onChange={(e) => setQuickHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()} />
            </div>
            <Button className="w-full" size="sm"
              disabled={!quickName.trim() || addProspect.isPending}
              onClick={handleQuickAdd}>
              {addProspect.isPending
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Addingâ¦</>
                : <><Plus className="h-4 w-4 mr-1.5" /> Add to New Leads</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      {prospects.length === 0 && (
        <EmptyState
          icon={InboxIcon}
          title="No prospects yet"
          description="Add your first prospect above, connect a platform, or use the Chrome extension to sync conversations."
          actionLabel="Set up My Offer"
          actionTo="/app/offer"
        />
      )}
    </div>
  );
}
