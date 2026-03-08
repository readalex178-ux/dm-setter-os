export interface DailyKPI {
  id: string;
  date: string;
  dmsSent: number;
  dmsReceived: number;
  newLeads: number;
  followUpsSent: number;
  callsBooked: number;
  callsCompleted: number;
  noShows: number;
  conversionsToQualified: number;
  objectionsHandled: number;
  hoursWorked: number;
  notes: string;
}

export interface KPIGoal {
  metric: keyof Omit<DailyKPI, "id" | "date" | "notes">;
  label: string;
  dailyTarget: number;
  weeklyTarget: number;
}

export const kpiGoals: KPIGoal[] = [
  { metric: "dmsSent", label: "DMs Sent", dailyTarget: 20, weeklyTarget: 100 },
  { metric: "followUpsSent", label: "Follow-Ups", dailyTarget: 10, weeklyTarget: 50 },
  { metric: "callsBooked", label: "Calls Booked", dailyTarget: 2, weeklyTarget: 10 },
  { metric: "newLeads", label: "New Leads", dailyTarget: 5, weeklyTarget: 25 },
  { metric: "hoursWorked", label: "Hours Worked", dailyTarget: 4, weeklyTarget: 20 },
];

// Demo data — last 14 days
const today = new Date();
function dateStr(daysAgo: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

export const demoKPIs: DailyKPI[] = [
  { id: "k1", date: dateStr(0), dmsSent: 18, dmsReceived: 12, newLeads: 4, followUpsSent: 8, callsBooked: 2, callsCompleted: 1, noShows: 0, conversionsToQualified: 3, objectionsHandled: 5, hoursWorked: 3.5, notes: "Good momentum today. Sarah close to booking." },
  { id: "k2", date: dateStr(1), dmsSent: 22, dmsReceived: 15, newLeads: 6, followUpsSent: 11, callsBooked: 3, callsCompleted: 2, noShows: 1, conversionsToQualified: 4, objectionsHandled: 7, hoursWorked: 4.5, notes: "Strong day. Hit all targets." },
  { id: "k3", date: dateStr(2), dmsSent: 15, dmsReceived: 9, newLeads: 3, followUpsSent: 7, callsBooked: 1, callsCompleted: 1, noShows: 0, conversionsToQualified: 2, objectionsHandled: 3, hoursWorked: 3, notes: "Slow start but picked up." },
  { id: "k4", date: dateStr(3), dmsSent: 25, dmsReceived: 18, newLeads: 7, followUpsSent: 14, callsBooked: 4, callsCompleted: 3, noShows: 0, conversionsToQualified: 5, objectionsHandled: 8, hoursWorked: 5, notes: "Best day this week! 🔥" },
  { id: "k5", date: dateStr(4), dmsSent: 12, dmsReceived: 8, newLeads: 2, followUpsSent: 5, callsBooked: 1, callsCompleted: 1, noShows: 0, conversionsToQualified: 1, objectionsHandled: 4, hoursWorked: 2.5, notes: "Short session." },
  { id: "k6", date: dateStr(5), dmsSent: 20, dmsReceived: 14, newLeads: 5, followUpsSent: 10, callsBooked: 2, callsCompleted: 2, noShows: 0, conversionsToQualified: 3, objectionsHandled: 6, hoursWorked: 4, notes: "" },
  { id: "k7", date: dateStr(6), dmsSent: 19, dmsReceived: 11, newLeads: 4, followUpsSent: 9, callsBooked: 2, callsCompleted: 1, noShows: 1, conversionsToQualified: 2, objectionsHandled: 5, hoursWorked: 3.5, notes: "One no-show, need to confirm better." },
  { id: "k8", date: dateStr(7), dmsSent: 21, dmsReceived: 16, newLeads: 6, followUpsSent: 12, callsBooked: 3, callsCompleted: 3, noShows: 0, conversionsToQualified: 4, objectionsHandled: 6, hoursWorked: 4.5, notes: "" },
  { id: "k9", date: dateStr(8), dmsSent: 17, dmsReceived: 10, newLeads: 3, followUpsSent: 8, callsBooked: 1, callsCompleted: 1, noShows: 0, conversionsToQualified: 2, objectionsHandled: 4, hoursWorked: 3, notes: "" },
  { id: "k10", date: dateStr(9), dmsSent: 24, dmsReceived: 17, newLeads: 5, followUpsSent: 13, callsBooked: 3, callsCompleted: 2, noShows: 1, conversionsToQualified: 3, objectionsHandled: 7, hoursWorked: 5, notes: "" },
  { id: "k11", date: dateStr(10), dmsSent: 14, dmsReceived: 7, newLeads: 2, followUpsSent: 6, callsBooked: 1, callsCompleted: 0, noShows: 0, conversionsToQualified: 1, objectionsHandled: 3, hoursWorked: 2, notes: "Off day." },
  { id: "k12", date: dateStr(11), dmsSent: 23, dmsReceived: 15, newLeads: 6, followUpsSent: 11, callsBooked: 2, callsCompleted: 2, noShows: 0, conversionsToQualified: 4, objectionsHandled: 5, hoursWorked: 4, notes: "" },
  { id: "k13", date: dateStr(12), dmsSent: 16, dmsReceived: 9, newLeads: 3, followUpsSent: 7, callsBooked: 1, callsCompleted: 1, noShows: 0, conversionsToQualified: 2, objectionsHandled: 4, hoursWorked: 3, notes: "" },
  { id: "k14", date: dateStr(13), dmsSent: 20, dmsReceived: 13, newLeads: 5, followUpsSent: 10, callsBooked: 2, callsCompleted: 2, noShows: 0, conversionsToQualified: 3, objectionsHandled: 6, hoursWorked: 4, notes: "" },
];

export function getStreak(kpis: DailyKPI[], metric: keyof Omit<DailyKPI, "id" | "date" | "notes">, target: number): number {
  let streak = 0;
  for (const kpi of kpis) {
    if ((kpi[metric] as number) >= target) streak++;
    else break;
  }
  return streak;
}

export function getWeekTotal(kpis: DailyKPI[], metric: keyof Omit<DailyKPI, "id" | "date" | "notes">): number {
  return kpis.slice(0, 7).reduce((sum, k) => sum + (k[metric] as number), 0);
}
