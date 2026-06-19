import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { useScripts, useSaveScript, useDeleteScript, SCRIPT_CATEGORIES, type ScriptEntry } from "@/hooks/useKnowledge";
import { Search, Star, Copy, Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const empty = { title: "", category: "opener", body: "" };

export default function ScriptsPage() {
  const { data: scripts = [], isLoading } = useScripts();
  const save = useSaveScript();
  const del = useDeleteScript();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const filtered = scripts.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.body.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !activeCategory || s.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (s: ScriptEntry) => { setForm(s); setOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Title and script body are required", variant: "destructive" });
      return;
    }
    await save.mutateAsync(form);
    toast({ title: "Script saved" });
    setOpen(false);
  };

  const toggleFav = (s: ScriptEntry) => save.mutate({ id: s.id, is_favorite: !s.is_favorite });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scripts Library</h1>
          <p className="text-sm text-muted-foreground">Your proven DM scripts, saved and reusable</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Script</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search scripts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={!activeCategory ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(null)}>All</Button>
          {SCRIPT_CATEGORIES.map((c) => (
            <Button key={c} variant={activeCategory === c ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(c)}>
              {c}
            </Button>
          ))}
        </div>
      </div>

      {!isLoading && scripts.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No scripts yet"
          description="Save your best openers, follow-ups, and objection responses so they're always one click away."
          actionLabel="Add your first script"
          actionTo="#"
        />
      ) : (
        <div className="grid gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{s.title}</h3>
                    <Badge variant="secondary" className="text-[10px]">{s.category}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleFav(s)}>
                      <Star className={`h-3.5 w-3.5 ${s.is_favorite ? "fill-primary text-primary" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigator.clipboard.writeText(s.body)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(s.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-muted-foreground bg-muted/50 rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit Script" : "New Script"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCRIPT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Textarea rows={6} placeholder="Script text..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
