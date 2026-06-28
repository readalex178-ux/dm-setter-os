import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronUp, Loader2, Save, Trash2, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { useProspects } from "@/hooks/useSetterData";
import {
  usePhoneCommissions, useAddPhoneCommission, useUpdatePhoneCommissionStatus,
  useDeletePhoneCommission, computeCommissionTotals,
} from "@/hooks/usePhoneSetting";
import { toast } from "@/hooks/use-toast";

export function PhoneCommissionTracker() {
  const { data: prospects = [] } = useProspects();
  const { data: commissions = [], isLoading } = usePhoneCommissions();
  const addCommission = useAddPhoneCommission();
  const updateStatus = useUpdatePhoneCommissionStatus();
  const deleteCommission = useDeletePhoneCommission();

  const [showLogForm, setShowLogForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [prospectId, setProspectId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => computeCommissionTotals(commissions), [commissions]);
  const prospectName = (id: string | null) => prospects.find((p) => p.id === id)?.name ?? "—";

  async function save() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    try {
      await addCommission.mutateAsync({
        amount: value,
        prospect_id: prospectId || undefined,
        notes: notes || undefined,
      });
      toast({ title: "Commission logged" });
      setAmount("");
      setProspectId("");
      setNotes("");
      setShowLogForm(false);
    } catch (e) {
      toast({ title: "Could not save", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  async function toggleStatus(id: string, current: "pending" | "paid") {
    try {
      await updateStatus.mutateAsync({ id, status: current === "pending" ? "paid" : "pending" });
    } catch (e) {
      toast({ title: "Could not update", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  async function remove(id: string) {
    try {
      await deleteCommission.mutateAsync(id);
      toast({ title: "Commission deleted" });
    } catch (e) {
      toast({ title: "Could not delete", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Commission Tracker</h2>
        <Button onClick={() => setShowLogForm(!showLogForm)} size="sm">
          {showLogForm ? <ChevronUp className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showLogForm ? "Close" : "Log Commission"}
        </Button>
      </div>

      {showLogForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Log a Commission</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                <Input type="number" className="mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prospect (optional)</Label>
                <Select value={prospectId} onValueChange={setProspectId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select prospect" /></SelectTrigger>
                  <SelectContent>
                    {prospects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea className="mt-1 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={addCommission.isPending}>
                {addCommission.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground"><DollarSign className="h-4 w-4" /><span className="text-xs font-medium">Total Earned</span></div>
          <span className="text-2xl font-bold">${totals.totalEarned.toFixed(2)}</span>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Clock className="h-4 w-4" /><span className="text-xs font-medium">Pending</span></div>
          <span className="text-2xl font-bold text-warning">${totals.pending.toFixed(2)}</span>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1 text-muted-foreground"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Paid Out</span></div>
          <span className="text-2xl font-bold text-success">${totals.paidOut.toFixed(2)}</span>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : commissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No commissions logged yet. Hit <span className="font-medium text-foreground">Log Commission</span> after a booking pays out.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Prospect</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="p-3 text-muted-foreground">{new Date(c.booked_at).toLocaleDateString()}</td>
                    <td className="p-3">{prospectName(c.prospect_id)}</td>
                    <td className="p-3 font-medium">${c.amount.toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant={c.status === "paid" ? "success" : "warning"} className="text-xs">{c.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleStatus(c.id, c.status)}>
                          Mark {c.status === "pending" ? "Paid" : "Pending"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
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
