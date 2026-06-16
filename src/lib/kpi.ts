import type { DBDailyKPI } from "@/hooks/useSetterData";

export interface KPIGoal {
  metric: keyof Pick<
    DBDailyKPI,
    "dms_sent" | "follow_ups_sent" | "calls_booked" | "new_leads" | "hours_worked"
  >;
  label: string;
  dailyTarget: number;
  weeklyTarget: number;
}

export const kpiGoals: KPIGoal[] = [
  { metric: "dms_sent", label: "DMs Sent", dailyTarget: 20, weeklyTarget: 100 },
  { metric: "follow_ups_sent", label: "Follow-Ups", dailyTarget: 10, weeklyTarget: 50 },
  { metric: "calls_booked", label: "Calls Booked", dailyTarget: 2, weeklyTarget: 10 },
  { metric: "new_leads", label: "New Leads", dailyTarget: 5, weeklyTarget: 25 },
  { metric: "hours_worked", label: "Hours Worked", dailyTarget: 4, weeklyTarget: 20 },
];

export const EMPTY_KPI: Omit<DBDailyKPI, "id" | "date"> = {
  dms_sent: 0,
  dms_received: 0,
  new_leads: 0,
  follow_ups_sent: 0,
  calls_booked: 0,
  calls_completed: 0,
  no_shows: 0,
  conversions_to_qualified: 0,
  objections_handled: 0,
  hours_worked: 0,
  notes: "",
};

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Returns the KPI row for today, or a zeroed placeholder. */
export function getTodayKPI(kpis: DBDailyKPI[]): DBDailyKPI {
  const t = todayStr();
  return (
    kpis.find((k) => k.date === t) ?? { id: "today", date: t, ...EMPTY_KPI }
  );
}

export function getStreak(
  kpis: DBDailyKPI[],
  metric: KPIGoal["metric"],
  target: number
): number {
  let streak = 0;
  for (const kpi of kpis) {
    if ((kpi[metric] as number) >= target) streak++;
    else break;
  }
  return streak;
}

export function getWeekTotal(kpis: DBDailyKPI[], metric: keyof DBDailyKPI): number {
  return kpis.slice(0, 7).reduce((sum, k) => sum + ((k[metric] as number) || 0), 0);
}

export type Benchmark = "Poor" | "Average" | "Good" | "Elite";

/** Benchmark bands for a daily metric value. */
export function benchmark(metric: KPIGoal["metric"], value: number): Benchmark {
  const bands: Record<KPIGoal["metric"], [number, number, number]> = {
    dms_sent: [10, 20, 35],
    follow_ups_sent: [5, 10, 20],
    calls_booked: [1, 2, 4],
    new_leads: [2, 5, 8],
    hours_worked: [2, 4, 6],
  };
  const [poor, avg, elite] = bands[metric];
  if (value >= elite) return "Elite";
  if (value >= avg) return "Good";
  if (value >= poor) return "Average";
  return "Poor";
}

export const benchmarkColor: Record<Benchmark, string> = {
  Poor: "text-destructive",
  Average: "text-warning",
  Good: "text-info",
  Elite: "text-success",
};

/** A corrective tip when a metric is below target. */
export function correctiveTip(metric: KPIGoal["metric"]): string {
  const tips: Record<KPIGoal["metric"], string> = {
    dms_sent: "Block 2x focused outreach sprints. Lead with a personalized observation, not a pitch.",
    follow_ups_sent: "Work your follow-up queue first thing — most booked calls come from follow-up 3-7.",
    calls_booked: "Qualify harder before transitioning, then book on the same thread momentum.",
    new_leads: "Engage on more relevant content/comments before DMing to warm leads first.",
    hours_worked: "Protect deep-work blocks; batch admin so prime hours go to conversations.",
  };
  return tips[metric];
}
