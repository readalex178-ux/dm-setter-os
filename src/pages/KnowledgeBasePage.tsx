import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import {
  useICP, useSaveICP,
  useObjections, useSaveObjection, useDeleteObjection,
  useFAQs, useSaveFAQ, useDeleteFAQ,
  useWinLoss, useSaveWinLoss, useDeleteWinLoss,
  OBJECTION_CATEGORIES,
  type ObjectionEntry, type FAQEntry, type WinLossLog,
} from "@/hooks/useKnowledge";
import { Plus, Pencil, Trash2, Target, MessageSquareWarning, HelpCircle, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          Everything the AI uses to ground its suggestions — your ideal client, objection responses, FAQs, and lessons learned.
        </p>
      </div>
      <Tabs defaultValue="icp">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="icp"><Target className="h-4 w-4 mr-1" /> ICP Bible</TabsTrigger>
          <TabsTrigger value="objections"><MessageSquareWarning className="h-4 w-4 mr-1" /> Objections</TabsTrigger>
          <TabsTrigger value="faq"><HelpCircle className="h-4 w-4 mr-1" /> FAQ</TabsTrigger>
          <TabsTrigger value="wins"><Trophy className="h-4 w-4 mr-1" /> Wins & Losses</TabsTrigger>
        </TabsList>
        <TabsContent value="icp" className="mt-4"><ICPTab /></TabsContent>
        <TabsContent value="objections" className="mt-4"><ObjectionsTab /></TabsContent>
        <TabsContent value="faq" className="mt-4"><FAQTab /></TabsContent>
        <TabsContent value="wins" className="mt-4"><WinsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

const ICP_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "demographics", label: "Demographics", placeholder: "Age, role, industry, income level, location..." },
  { key: "goals", label: "Goals & desires", placeholder: "What do they want to achieve?" },
  { key: "pains", label: "Pains & frustrations", placeholder: "What keeps them stuck or frustrated?" },
  { key: "buying_triggers", label: "Buying triggers", placeholder: "What events make them ready to buy?" },
  { key: "objections_common", label: "Common objections", placeholder: "Typical hesitations they raise..." },
  { key: "language_patterns", label: "Language patterns", placeholder: "Words & phrases they use to describe their problem..." },
  { key: "where_they_hang_out", label: "Where they hang out", placeholder: "Platforms, groups, communities..." },
];

function ICPTab() {
  const { data: icp } = useICP();
  const save = useSaveICP();
  const [form, setForm] = useState<any>({ name: "My Ideal Client" });

  useEffect(() => { if (icp) setForm(icp); }, [icp]);

  const handleSave = async () => {
    await save.mutateAsync(form);
    toast.success("ICP saved — the AI will now speak to this person");
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Persona name</Label>
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        {ICP_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <Textarea rows={2} placeholder={f.placeholder} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
        <Button onClick={handleSave} disabled={save.isPending}>Save ICP</Button>
      </CardContent>
    </Card>
  );
}

function ObjectionsTab() {
  const { data: list = [], isLoading } = useObjections();
  const save = useSaveObjection();
  const del = useDeleteObjection();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ category: "price", objection: "", framework: "", response: "" });

  const handleSave = async () => {
    if (!form.objection.trim() || !form.response.trim()) { toast.error("Objection and response are required"); return; }
    await save.mutateAsync(form);
    toast.success("Objection saved");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({ category: "price", objection: "", framework: "", response: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Objection
        </Button>
      </div>
      {!isLoading && list.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="No objections logged" description="Build your objection bible so the AI handles price, time, and trust objections exactly how you would." />
      ) : (
        <div className="grid gap-3">
          {list.map((o: ObjectionEntry) => (
            <Card key={o.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">{o.category}</Badge>
                    <span className="font-medium text-sm">"{o.objection}"</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm(o); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(o.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                {o.framework && <p className="text-xs text-muted-foreground">Framework: {o.framework}</p>}
                <p className="text-sm bg-muted/50 rounded-lg p-3">{o.response}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} Objection</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OBJECTION_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Objection (e.g. too expensive)" value={form.objection} onChange={(e) => setForm({ ...form, objection: e.target.value })} />
            <Input placeholder="Framework (optional, e.g. Feel-Felt-Found)" value={form.framework ?? ""} onChange={(e) => setForm({ ...form, framework: e.target.value })} />
            <Textarea rows={4} placeholder="Your best response..." value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FAQTab() {
  const { data: list = [], isLoading } = useFAQs();
  const save = useSaveFAQ();
  const del = useDeleteFAQ();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ question: "", answer: "" });

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) { toast.error("Question and answer are required"); return; }
    await save.mutateAsync(form);
    toast.success("FAQ saved");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({ question: "", answer: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add FAQ
        </Button>
      </div>
      {!isLoading && list.length === 0 ? (
        <EmptyState icon={HelpCircle} title="No FAQs yet" description="Add approved answers to common questions so the AI never improvises on facts." />
      ) : (
        <div className="grid gap-3">
          {list.map((f: FAQEntry) => (
            <Card key={f.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{f.question}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm(f); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{f.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Add"} FAQ</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            <Textarea rows={4} placeholder="Approved answer..." value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WinsTab() {
  const { data: list = [], isLoading } = useWinLoss();
  const save = useSaveWinLoss();
  const del = useDeleteWinLoss();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ outcome: "win", prospect_name: "", summary: "", lesson: "" });

  const handleSave = async () => {
    await save.mutateAsync(form);
    toast.success("Logged");
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setForm({ outcome: "win", prospect_name: "", summary: "", lesson: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Log Outcome
        </Button>
      </div>
      {!isLoading && list.length === 0 ? (
        <EmptyState icon={Trophy} title="No wins or losses logged" description="Track what worked and what didn't, with the lesson learned, to compound your skill over time." />
      ) : (
        <div className="grid gap-3">
          {list.map((w: WinLossLog) => (
            <Card key={w.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={w.outcome === "win" ? "default" : "destructive"} className="text-[10px] capitalize">{w.outcome}</Badge>
                    {w.prospect_name && <span className="font-medium text-sm">{w.prospect_name}</span>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm(w); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del.mutate(w.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                {w.summary && <p className="text-sm text-muted-foreground">{w.summary}</p>}
                {w.lesson && <p className="text-sm"><span className="font-medium">Lesson: </span>{w.lesson}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit" : "Log"} Outcome</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Prospect name (optional)" value={form.prospect_name ?? ""} onChange={(e) => setForm({ ...form, prospect_name: e.target.value })} />
            <Textarea rows={3} placeholder="What happened?" value={form.summary ?? ""} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            <Textarea rows={2} placeholder="Lesson learned..." value={form.lesson ?? ""} onChange={(e) => setForm({ ...form, lesson: e.target.value })} />
          </div>
          <DialogFooter><Button onClick={handleSave} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
