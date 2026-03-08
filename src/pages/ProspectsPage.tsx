import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { demoProspects, demoTimeline } from "@/data/demo-data";
import { Search, Phone, MapPin, Briefcase, DollarSign, Clock } from "lucide-react";
import { useState } from "react";

export default function ProspectsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(demoProspects[0]);
  const timeline = demoTimeline.filter((t) => t.prospectId === selected.id);
  const filtered = demoProspects.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.handle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* List */}
      <div className="w-80 border-r border-border flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search prospects..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${selected.id === p.id ? "bg-accent" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{p.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.handle}</div>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="score" className="text-[10px]">{p.leadScore}/10</Badge>
                    <Badge variant="outline" className="text-[10px]">{p.stage}</Badge>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">{selected.avatar}</div>
          <div>
            <h1 className="text-xl font-bold">{selected.name}</h1>
            <p className="text-sm text-muted-foreground">{selected.handle}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="score">{selected.leadScore}/10</Badge>
              <Badge variant={selected.callReadiness >= 70 ? "success" : "warning"}>
                <Phone className="h-3 w-3 mr-1" /> {selected.callReadiness}%
              </Badge>
              <Badge variant="outline">{selected.stage}</Badge>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Qualification Data</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Location:</span> {selected.location}</div>
              <div className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Job:</span> {selected.currentJob}</div>
              <div className="flex items-center gap-2"><DollarSign className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Income Goal:</span> {selected.incomeGoal}</div>
              <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-muted-foreground">Availability:</span> {selected.timeAvailability}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">AI Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Intent</span><Badge variant="score">{selected.intentLevel} {selected.intentConfidence}%</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Motivation</span><Badge variant="score">{selected.motivation} {selected.motivationConfidence}%</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Concern</span><Badge variant="warning">{selected.concerns} {selected.concernsConfidence}%</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span>{selected.source}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Tags */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tags</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selected.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Interaction Timeline</CardTitle></CardHeader>
          <CardContent>
            {timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((e) => (
                  <div key={e.id} className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <div className="text-sm">{e.description}</div>
                      <div className="text-xs text-muted-foreground">{e.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No timeline events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
