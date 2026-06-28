import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  PHONE_STAGES, useUpdatePhoneProspect, type PhoneProspect, type PhoneStage,
} from "@/hooks/usePhoneSetting";

const stageColors: Record<PhoneStage, string> = {
  "New Lead": "bg-muted",
  "Pre-Call Prep": "bg-info/10 border-info/20",
  "Call Attempted": "bg-warning/10 border-warning/20",
  "Call Connected": "bg-primary/10 border-primary/20",
  "Follow Up": "bg-warning/10 border-warning/20",
  "Appointment Booked": "bg-success/20 border-success/30",
  "No Show": "bg-destructive/10 border-destructive/20",
  "Disqualified": "bg-muted",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "No activity yet";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Inline phone number editor used on both the kanban card and the table row.
// Editing happens in place — no number is required to keep working a prospect,
// so the empty state reads as an invitation rather than a blocker.
function PhoneNumberInline({ prospect, compact }: { prospect: PhoneProspect; compact?: boolean }) {
  const updateProspect = useUpdatePhoneProspect();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(prospect.phone_number ?? "");

  useEffect(() => {
    if (!editing) setValue(prospect.phone_number ?? "");
  }, [prospect.phone_number, editing]);

  function save() {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed === (prospect.phone_number ?? "")) return;
    updateProspect.mutate({ id: prospect.id, phone_number: trimmed || null });
  }

  if (editing) {
    return (
      <Input
        autoFocus
        className={compact ? "h-6 text-[10px] px-1.5" : "h-8 text-xs w-[160px]"}
        value={value}
        placeholder="(555) 555-5555"
        onChange={(e) => setValue(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setValue(prospect.phone_number ?? ""); setEditing(false); }
        }}
      />
    );
  }

  if (!prospect.phone_number) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        className={cn(
          "flex items-center gap-1 text-warning hover:underline truncate",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        <Pencil className={compact ? "h-2.5 w-2.5 shrink-0" : "h-3 w-3 shrink-0"} />
        Add phone number to start a call
      </button>
    );
  }

  return (
    <button
      type="button"
      title="Click to edit"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={cn(
        "flex items-center gap-1 text-muted-foreground hover:text-foreground truncate",
        compact ? "text-[10px]" : "text-xs"
      )}
    >
      <Phone className={compact ? "h-2.5 w-2.5 shrink-0" : "h-3 w-3 shrink-0"} />
      <span className="truncate">{prospect.phone_number}</span>
    </button>
  );
}

// Searchable combobox over the prospects already loaded for this page (the
// Phone Setting kanban is driven by the same `prospects` table, so "adding"
// one here means surfacing it and parking it at the front of the pipeline).
function AddExistingProspectCombobox({
  prospects, onSelect,
}: { prospects: PhoneProspect[]; onSelect: (p: PhoneProspect) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-3.5 w-3.5 mr-1" /> Add Existing Prospect
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search prospects by name..." />
          <CommandList>
            <CommandEmpty>No prospects found.</CommandEmpty>
            <CommandGroup>
              {prospects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.name}
                  onSelect={() => { onSelect(p); setOpen(false); }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{p.name}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{p.phone_stage}</Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  prospects: PhoneProspect[];
  onCardClick: (p: PhoneProspect) => void;
  onMove: (id: string, stage: PhoneStage) => void;
}

export function PhoneKanbanBoard({ prospects, onCardClick, onMove }: Props) {
  const [view, setView] = useState<"kanban" | "table">(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches ? "table" : "kanban"
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  function handleAddExisting(p: PhoneProspect) {
    if (p.phone_stage !== "New Lead") onMove(p.id, "New Lead");
    onCardClick(p);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "table" ? "default" : "outline"} size="sm" onClick={() => setView("table")}>Table</Button>
        </div>
        <AddExistingProspectCombobox prospects={prospects} onSelect={handleAddExisting} />
      </div>

      {view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PHONE_STAGES.map((stage) => {
            const list = prospects.filter((p) => p.phone_stage === stage);
            return (
              <div
                key={stage}
                className={`min-w-[240px] flex flex-col rounded-lg transition-colors ${dragOverStage === stage ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
                onDragLeave={() => setDragOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/prospect-id");
                  setDragOverStage(null);
                  setDraggedId(null);
                  if (id) onMove(id, stage);
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold">{stage}</h3>
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </div>
                <div className="space-y-2 flex-1">
                  {list.map((p) => (
                    <Card
                      key={p.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(p.id);
                        e.dataTransfer.setData("text/prospect-id", p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => { setDraggedId(null); setDragOverStage(null); }}
                      onClick={() => onCardClick(p)}
                      className={`${stageColors[stage]} border group relative cursor-grab active:cursor-grabbing ${draggedId === p.id ? "opacity-40" : ""}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.name}</div>
                            <PhoneNumberInline prospect={p} compact />
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground mb-2">{timeAgo(p.last_contact_at)}</div>
                        <Select value={p.phone_stage} onValueChange={(v) => onMove(p.id, v as PhoneStage)}>
                          <SelectTrigger
                            className="h-7 text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PHONE_STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                  {list.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">No prospects</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Phone</th>
                  <th className="text-left p-3 font-medium">Stage</th>
                  <th className="text-left p-3 font-medium">Last Activity</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{p.name.slice(0, 2).toUpperCase()}</div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3"><PhoneNumberInline prospect={p} /></td>
                    <td className="p-3">
                      <Select value={p.phone_stage} onValueChange={(v) => onMove(p.id, v as PhoneStage)}>
                        <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PHONE_STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{timeAgo(p.last_contact_at)}</td>
                    <td className="p-3">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onCardClick(p)}>
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
