import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardStats, demoProspects } from "@/data/demo-data";
import {
  MessageSquare, Users, UserCheck, Phone, PhoneCall,
  Snowflake, TrendingUp, Clock, ArrowRight, AlertCircle,
  RefreshCw, Flame,
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
  const hotProspects = demoProspects.filter(p => p.leadScore >= 7).slice(0, 4);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your daily DM setting overview</p>
      </div>

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

      <div className="grid lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
}
