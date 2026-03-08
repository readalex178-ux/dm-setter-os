import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dashboardStats } from "@/data/demo-data";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

const stageData = [
  { name: "New Lead", count: 12 },
  { name: "Discovery", count: 8 },
  { name: "Qualification", count: 7 },
  { name: "Interested", count: 6 },
  { name: "Objection", count: 4 },
  { name: "Ready", count: 5 },
  { name: "Booked", count: 8 },
  { name: "Cold", count: 9 },
];

const objections = [
  { name: "Legitimacy", value: 35 },
  { name: "Time", value: 25 },
  { name: "Cost", value: 20 },
  { name: "Risk", value: 15 },
  { name: "Other", value: 5 },
];

const weeklyData = [
  { day: "Mon", conversations: 8, booked: 1 },
  { day: "Tue", conversations: 12, booked: 2 },
  { day: "Wed", conversations: 10, booked: 1 },
  { day: "Thu", conversations: 15, booked: 3 },
  { day: "Fri", conversations: 11, booked: 2 },
  { day: "Sat", conversations: 6, booked: 1 },
  { day: "Sun", conversations: 4, booked: 0 },
];

const COLORS = ["hsl(186, 100%, 42%)", "hsl(210, 100%, 52%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(215, 15%, 55%)"];

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance tracking and insights</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dashboardStats.totalConversations}</div><p className="text-xs text-muted-foreground">Conversations Started</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dashboardStats.qualifiedProspects}</div><p className="text-xs text-muted-foreground">Qualified Prospects</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dashboardStats.callsBooked}</div><p className="text-xs text-muted-foreground">Calls Booked</p></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{dashboardStats.conversionRate}%</div><p className="text-xs text-muted-foreground">Conversion Rate</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Weekly Activity</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 18%, 16%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 55%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 55%)" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                <Line type="monotone" dataKey="conversations" stroke="hsl(186, 100%, 50%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="booked" stroke="hsl(152, 70%, 45%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Pipeline Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stageData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(215, 15%, 55%)" angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 55%)" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
                <Bar dataKey="count" fill="hsl(186, 100%, 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Common Objections</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={objections} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {objections.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(222, 25%, 10%)", border: "1px solid hsl(222, 18%, 16%)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">AI Usage Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Suggestions Generated</span><span className="font-semibold">284</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary rounded-full" style={{ width: "100%" }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Suggestions Used</span><span className="font-semibold">156 (55%)</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary rounded-full" style={{ width: "55%" }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Avg Conversation Length</span><span className="font-semibold">12 messages</span></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Stage Conversion Rate</span><span className="font-semibold">68%</span></div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary rounded-full" style={{ width: "68%" }} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
