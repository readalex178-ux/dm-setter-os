import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus } from "lucide-react";
import { stageColor, platformIcon, type DBProspect } from "@/components/inbox/types";
import type { Prospect as DemoProspect } from "@/data/demo-data";

interface Props {
  search: string;
  setSearch: (v: string) => void;
  filtered: any[];
  useDemo: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  hidden?: boolean;
  onAddProspect?: () => void;
}

export function ConversationList({ search, setSearch, filtered, useDemo, selectedId, onSelect, hidden, onAddProspect }: Props) {
  return (
    <div className={`w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-border flex flex-col shrink-0 lg:h-full ${hidden ? "hidden" : "flex-1"} lg:flex`}>
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-9 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {onAddProspect && (
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={onAddProspect}>
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Prospect
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {filtered.map((p) => {
          const name = p.name || "";
          const handle = p.handle || "";
          const stage = p.stage || "";
          const score = useDemo ? (p as DemoProspect).leadScore : (p as DBProspect).lead_score;
          const avatar = useDemo ? (p as DemoProspect).avatar : name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
          const unread = useDemo ? (p as DemoProspect).unread : false;
          const plat = useDemo ? null : (p as DBProspect).platform;
          const temp = useDemo ? null : (p as DBProspect).lead_temperature;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted transition-colors ${selectedId === p.id ? "bg-accent" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{avatar}</div>
                  {unread && <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate flex items-center gap-1">{platformIcon(plat)} {name}</span>
                  <div className="text-xs text-muted-foreground truncate">{handle}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <Badge variant={stageColor[stage] as any} className="text-[10px] px-1.5 py-0">{stage}</Badge>
                    <Badge variant="score" className="text-[10px] px-1.5 py-0">{score}/10</Badge>
                    {temp && <Badge variant={temp.toLowerCase() === "hot" ? "destructive" : temp.toLowerCase() === "warm" ? "warning" : "secondary"} className="text-[10px] px-1.5 py-0">{temp}</Badge>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}
