import { useMemo, useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { useProspects } from "@/hooks/useSetterData";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/hooks/use-toast";
import {
  toPhoneProspect, useAllPhoneCalls, useUpdatePhoneStage, computePhoneKpis,
  type PhoneStage,
} from "@/hooks/usePhoneSetting";
import { PhoneKpiBar } from "@/components/phone-setting/PhoneKpiBar";
import { PhoneKanbanBoard } from "@/components/phone-setting/PhoneKanbanBoard";
import { ProspectDetailDialog } from "@/components/phone-setting/ProspectDetailDialog";
import { PhoneCommissionTracker } from "@/components/phone-setting/PhoneCommissionTracker";

export default function PhoneSettingPage() {
  const { data: rawProspects = [], isLoading } = useProspects();
  const { data: calls = [] } = useAllPhoneCalls();
  const updateStage = useUpdatePhoneStage();
  const [detailId, setDetailId] = useState<string | null>(null);

  const prospects = useMemo(() => rawProspects.map(toPhoneProspect), [rawProspects]);
  const kpis = useMemo(() => computePhoneKpis(calls, prospects), [calls, prospects]);
  const detailProspect = detailId ? prospects.find((p) => p.id === detailId) ?? null : null;

  async function move(id: string, stage: PhoneStage) {
    const previousStage = prospects.find((p) => p.id === id)?.phone_stage;
    try {
      await updateStage.mutateAsync({ id, stage, previousStage });
      toast({ title: "Stage updated", description: `Moved to ${stage}.` });
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Phone Setting</h1>
        <p className="text-sm text-muted-foreground">Run your outbound calling pipeline, brief yourself before every call, and track commissions.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : prospects.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No prospects to call yet"
          description="Add prospects from the Dashboard or Prospects page first — they'll show up here ready to work through the calling pipeline."
          actionLabel="Go to Prospects"
          actionTo="/app/prospects"
        />
      ) : (
        <>
          <PhoneKpiBar kpis={kpis} />
          <PhoneKanbanBoard prospects={prospects} onCardClick={(p) => setDetailId(p.id)} onMove={move} />
          <PhoneCommissionTracker />
        </>
      )}

      <ProspectDetailDialog
        prospect={detailProspect}
        open={!!detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        onMove={move}
      />
    </div>
  );
}
