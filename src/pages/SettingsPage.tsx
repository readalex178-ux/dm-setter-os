import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Link2, Shield, Loader2, Target, Download, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useProspects, useKPIs } from "@/hooks/useSetterData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { kpiGoals, type KPIGoal } from "@/lib/kpi";

// KPI goals are stored in localStorage under this key
const KPI_GOALS_KEY = "dm_setter_kpi_goals";

function loadStoredGoals(): KPIGoal[] {
  try {
    const raw = localStorage.getItem(KPI_GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return kpiGoals;
}

export function getActiveKPIGoals(): KPIGoal[] {
  return loadStoredGoals();
}

// --- CSV Helpers ---
function downloadCSV(filename: string, rows: string[][], headers: string[]) {
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Seed Data ---
const SEED_PROSPECTS = [
  { name: "Sarah Johnson", handle: "@sarah_fitness", platform: "instagram", stage: "Interested", location: "Austin, TX", current_job: "Personal Trainer", income_goal: "$5k/month", lead_score: 8, call_readiness: 75 },
  { name: "Marcus Reid", handle: "@marcuscoaching", platform: "instagram", stage: "Qualification", location: "London, UK", current_job: "Online Coach", income_goal: "$10k/month", lead_score: 7, call_readiness: 60 },
  { name: "Emma Clarke", handle: "@emma.wellness", platform: "facebook", stage: "New Lead", location: "Sydney, AU", current_job: "Nutritionist", income_goal: "$3k/month", lead_score: 5, call_readiness: 30 },
  { name: "Jake Thompson", handle: "@jakethompsonfit", platform: "instagram", stage: "Ready for Call", location: "New York, NY", current_job: "Gym Owner", income_goal: "$20k/month", lead_score: 9, call_readiness: 90 },
  { name: "Priya Sharma", handle: "@priya_wellness", platform: "instagram", stage: "Objection Handling", location: "Toronto, CA", current_job: "Yoga Instructor", income_goal: "$6k/month", lead_score: 6, call_readiness: 55 },
  { name: "Luis Fernandez", handle: "@luisfitness", platform: "instagram", stage: "Call Booked", location: "Miami, FL", current_job: "PT Trainer", income_goal: "$8k/month", lead_score: 9, call_readiness: 95 },
  { name: "Amy Chen", handle: "@amychen_health", platform: "facebook", stage: "Discovery", location: "San Francisco, CA", current_job: "Dietitian", income_goal: "$4k/month", lead_score: 4, call_readiness: 25 },
  { name: "Ryan O'Brien", handle: "@ryanobrienpro", platform: "instagram", stage: "Cold Lead", location: "Dublin, IE", current_job: "Sports Coach", income_goal: "$7k/month", lead_score: 3, call_readiness: 10 },
];

const today = new Date();
const SEED_KPIS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  return {
    date: d.toISOString().split("T")[0],
    dms_sent: 15 + Math.floor(Math.random() * 20),
    dms_received: 5 + Math.floor(Math.random() * 10),
    new_leads: 2 + Math.floor(Math.random() * 6),
    follow_ups_sent: 8 + Math.floor(Math.random() * 10),
    calls_booked: Math.floor(Math.random() * 4),
    calls_completed: Math.floor(Math.random() * 3),
    no_shows: Math.floor(Math.random() * 2),
    conversions_to_qualified: Math.floor(Math.random() * 4),
    objections_handled: Math.floor(Math.random() * 5),
    hours_worked: 3 + Math.floor(Math.random() * 4),
    notes: i === 0 ? "Great day â lots of engagement on the new reel" : null,
  };
});

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { data: prospects = [] } = useProspects();
  const { data: kpis = [] } = useKPIs();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  // KPI goals state â loaded from localStorage, saved back on change
  const [goalDrafts, setGoalDrafts] = useState<KPIGoal[]>(loadStoredGoals);
  const [goalsSaved, setGoalsSaved] = useState(false);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Your profile has been updated." });
    }
  }

  function saveGoals() {
    localStorage.setItem(KPI_GOALS_KEY, JSON.stringify(goalDrafts));
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 2000);
    toast({ title: "KPI targets saved", description: "Your goals will take effect on the KPI Tracker." });
  }

  function resetGoals() {
    setGoalDrafts(kpiGoals);
    localStorage.removeItem(KPI_GOALS_KEY);
    toast({ title: "Goals reset to defaults" });
  }

  function updateGoal(metric: string, field: "dailyTarget" | "weeklyTarget", value: number) {
    setGoalDrafts((prev) =>
      prev.map((g) => g.metric === metric ? { ...g, [field]: value } : g)
    );
  }

  function exportProspects() {
    const headers = ["Name", "Handle", "Platform", "Stage", "Lead Score", "Call Readiness", "Location", "Job", "Income Goal", "Availability", "Source", "Notes", "Created At"];
    const rows = prospects.map((p) => [
      p.name, p.handle ?? "", p.platform ?? "", p.stage,
      String(p.lead_score), String(p.call_readiness),
      p.location ?? "", p.current_job ?? "", p.income_goal ?? "",
      p.time_availability ?? "", p.source ?? "", p.notes ?? "",
      p.created_at,
    ]);
    downloadCSV("prospects.csv", rows, headers);
    toast({ title: "Prospects exported" });
  }

  function exportKPIs() {
    const headers = ["Date", "DMs Sent", "DMs Received", "New Leads", "Follow-Ups Sent", "Calls Booked", "Calls Completed", "No-Shows", "Qualified", "Objections Handled", "Hours Worked", "Notes"];
    const rows = kpis.map((k) => [
      k.date, String(k.dms_sent), String(k.dms_received), String(k.new_leads),
      String(k.follow_ups_sent), String(k.calls_booked), String(k.calls_completed),
      String(k.no_shows), String(k.conversions_to_qualified),
      String(k.objections_handled), String(k.hours_worked), k.notes ?? "",
    ]);
    downloadCSV("kpi-history.csv", rows, headers);
    toast({ title: "KPI history exported" });
  }

  async function seedData() {
    if (!user) return;
    setSeeding(true);
    try {
      // Insert prospects
      const prospectData = SEED_PROSPECTS.map((p) => ({
        ...p,
        user_id: user.id,
        source: "seed",
        last_contact_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      }));
      const { error: pErr } = await supabase.from("prospects").insert(prospectData);
      if (pErr) throw pErr;

      // Insert KPIs
      const kpiData = SEED_KPIS.map((k) => ({ ...k, user_id: user.id }));
      const { error: kErr } = await supabase
        .from("daily_kpis")
        .upsert(kpiData, { onConflict: "user_id,date" });
      if (kErr) throw kErr;

      toast({ title: "Test data seeded", description: `${SEED_PROSPECTS.length} prospects + 7 days of KPIs added.` });
    } catch (e) {
      toast({ title: "Seed failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={user?.email ?? ""} disabled className="mt-1" />
                </div>
              </div>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Changes
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* KPI Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Daily KPI Targets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Set your personal daily and weekly targets. These replace the defaults in the KPI Tracker.</p>
          <div className="space-y-3">
            {goalDrafts.map((goal) => (
              <div key={goal.metric} className="grid grid-cols-3 items-center gap-3">
                <Label className="text-xs font-medium">{goal.label}</Label>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Daily</Label>
                  <Input
                    type="number"
                    className="mt-0.5 h-8 text-sm"
                    min={0}
                    value={goal.dailyTarget}
                    onChange={(e) => updateGoal(goal.metric, "dailyTarget", Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Weekly</Label>
                  <Input
                    type="number"
                    className="mt-0.5 h-8 text-sm"
                    min={0}
                    value={goal.weeklyTarget}
                    onChange={(e) => updateGoal(goal.metric, "weeklyTarget", Number(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveGoals}>{goalsSaved ? "Saved â" : "Save Targets"}</Button>
            <Button size="sm" variant="outline" onClick={resetGoals}>Reset to Defaults</Button>
          </div>
        </CardContent>
      </Card>

      {/* CSV Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" /> Export Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Download your data as CSV files you can open in Excel or Google Sheets.</p>
          <div className="flex gap-3 flex-wrap">
            <Button size="sm" variant="outline" onClick={exportProspects} disabled={prospects.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> Prospects ({prospects.length})
            </Button>
            <Button size="sm" variant="outline" onClick={exportKPIs} disabled={kpis.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> KPI History ({kpis.length} days)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4" /> Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Sync Instagram, Facebook, and TikTok DMs via the Chrome extension.</p>
          <Link to="/app/extension">
            <Button variant="outline" size="sm">Go to Extension</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Seed Test Data */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Sprout className="h-4 w-4 text-success" /> Seed Test Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Populate your account with {SEED_PROSPECTS.length} sample prospects across all pipeline stages and 7 days of KPI history.
            Useful for exploring the app or demoing to clients.
          </p>
          <Button size="sm" variant="outline" onClick={seedData} disabled={seeding}>
            {seeding ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sprout className="h-3.5 w-3.5 mr-1" />}
            {seeding ? "Seeding..." : "Add Test Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Privacy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            DM Setter OS never sends messages automatically and never automates outreach.
            All AI features are assistive only. Your conversation data is private to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
