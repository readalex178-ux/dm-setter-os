import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DBProspect } from "@/hooks/useSetterData";

export const PHONE_STAGES = [
  "New Lead", "Pre-Call Prep", "Call Attempted", "Call Connected",
  "Follow Up", "Appointment Booked", "No Show", "Disqualified",
] as const;
export type PhoneStage = typeof PHONE_STAGES[number];

export const CALL_OUTCOMES = [
  "Connected", "Voicemail", "No Answer", "Appointment Booked", "Disqualified",
] as const;
export type CallOutcome = typeof CALL_OUTCOMES[number];

export interface PreCallBrief {
  talkingPoints: string[];
  likelyObjections: { objection: string; response: string }[];
  qualifyOn: string[];
  bant: {
    budget: { score: number; evidence: string };
    authority: { score: number; evidence: string };
    need: { score: number; evidence: string };
    timeline: { score: number; evidence: string };
  };
}

// Fields added by the phone-setting migration that don't yet exist on
// useSetterData's DBProspect type. Supabase always returns every column
// that exists in the table regardless of the TS type, so this interface
// plus the cast below give typed access without editing useSetterData.tsx.
export interface PhoneProspect extends DBProspect {
  phone_number: string | null;
  phone_stage: PhoneStage;
  in_call_notes: string | null;
  pre_call_brief: PreCallBrief | null;
  pre_call_brief_generated_at: string | null;
}

export function toPhoneProspect(p: DBProspect): PhoneProspect {
  const raw = p as unknown as PhoneProspect;
  return {
    ...p,
    phone_number: raw.phone_number ?? null,
    phone_stage: (raw.phone_stage as PhoneStage) || "New Lead",
    in_call_notes: raw.in_call_notes ?? null,
    pre_call_brief: raw.pre_call_brief ?? null,
    pre_call_brief_generated_at: raw.pre_call_brief_generated_at ?? null,
  };
}

export interface DBPhoneCall {
  id: string;
  prospect_id: string;
  outcome: string;
  notes: string | null;
  duration_minutes: number | null;
  ai_summary: string | null;
  ai_next_step: string | null;
  ai_follow_up_message: string | null;
  called_at: string;
  created_at: string;
}

export interface DBPhoneCommission {
  id: string;
  prospect_id: string | null;
  phone_call_id: string | null;
  amount: number;
  status: "pending" | "paid";
  booked_at: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

// ---- Prospect field updates (phone number, in-call notes, brief cache) ----

export function useUpdatePhoneProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PhoneProspect> & { id: string }) => {
      const { id, ...fields } = input;
      const { error } = await supabase.from("prospects").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useUpdatePhoneStage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      id, stage, previousStage,
    }: { id: string; stage: PhoneStage; previousStage?: string }) => {
      const { error } = await supabase.from("prospects").update({ phone_stage: stage }).eq("id", id);
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        user_id: user!.id,
        prospect_id: id,
        event_type: "phone_stage_change",
        description: `Phone stage: ${previousStage ?? "?"} → ${stage}`,
        occurred_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

// ---- Call history (phone_calls) ----

export function usePhoneCalls(prospectId: string | null) {
  return useQuery({
    queryKey: ["phone_calls", prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<DBPhoneCall[]> => {
      const { data, error } = await supabase
        .from("phone_calls")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("called_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DBPhoneCall[];
    },
  });
}

export function useAllPhoneCalls() {
  return useQuery({
    queryKey: ["phone_calls"],
    queryFn: async (): Promise<DBPhoneCall[]> => {
      const { data, error } = await supabase
        .from("phone_calls")
        .select("*")
        .order("called_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as DBPhoneCall[];
    },
  });
}

export function useLogPhoneCall() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      prospect_id: string;
      outcome: CallOutcome;
      notes?: string;
      duration_minutes?: number;
    }) => {
      const calledAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("phone_calls")
        .insert({ user_id: user!.id, called_at: calledAt, ...input })
        .select()
        .single();
      if (error) throw error;
      // A logged call is a real contact attempt — keep "last activity" accurate.
      await supabase.from("prospects").update({ last_contact_at: calledAt }).eq("id", input.prospect_id);
      return data as DBPhoneCall;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["phone_calls", vars.prospect_id] });
      qc.invalidateQueries({ queryKey: ["phone_calls"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
    },
  });
}

export function useUpdatePhoneCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DBPhoneCall> & { id: string }) => {
      const { id, ...fields } = input;
      const { error } = await supabase.from("phone_calls").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["phone_calls"] });
      if (vars.prospect_id) qc.invalidateQueries({ queryKey: ["phone_calls", vars.prospect_id] });
    },
  });
}

// ---- Commission tracker (phone_commissions) ----

export function usePhoneCommissions() {
  return useQuery({
    queryKey: ["phone_commissions"],
    queryFn: async (): Promise<DBPhoneCommission[]> => {
      const { data, error } = await supabase
        .from("phone_commissions")
        .select("*")
        .order("booked_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DBPhoneCommission[];
    },
  });
}

export function useAddPhoneCommission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      prospect_id?: string;
      phone_call_id?: string;
      amount: number;
      notes?: string;
      booked_at?: string;
    }) => {
      const { error } = await supabase.from("phone_commissions").insert({ user_id: user!.id, ...input });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phone_commissions"] }),
  });
}

export function useUpdatePhoneCommissionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "paid" }) => {
      const { error } = await supabase
        .from("phone_commissions")
        .update({ status, paid_at: status === "paid" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phone_commissions"] }),
  });
}

export function useDeletePhoneCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("phone_commissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["phone_commissions"] }),
  });
}

// ---- Pure KPI formula helpers (no React, easy to reason about/test) ----

export interface PhoneKpis {
  callsAttempted: number;
  callsConnected: number;
  connectionRate: number; // 0-100
  appointmentsBooked: number;
  bookingRate: number; // 0-100, booked / connected
  noShowRate: number; // 0-100, no-show stage / (no-show + appointment-booked stage)
}

const NOT_CONNECTED_OUTCOMES = new Set(["Voicemail", "No Answer"]);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computePhoneKpis(
  calls: DBPhoneCall[],
  prospects: PhoneProspect[]
): PhoneKpis {
  const callsAttempted = calls.length;
  const callsConnected = calls.filter((c) => !NOT_CONNECTED_OUTCOMES.has(c.outcome)).length;
  const appointmentsBooked = calls.filter((c) => c.outcome === "Appointment Booked").length;

  const noShowCount = prospects.filter((p) => p.phone_stage === "No Show").length;
  const appointmentBookedStageCount = prospects.filter((p) => p.phone_stage === "Appointment Booked").length;
  const noShowDenominator = noShowCount + appointmentBookedStageCount;

  return {
    callsAttempted,
    callsConnected,
    connectionRate: callsAttempted > 0 ? round1((callsConnected / callsAttempted) * 100) : 0,
    appointmentsBooked,
    bookingRate: callsConnected > 0 ? round1((appointmentsBooked / callsConnected) * 100) : 0,
    noShowRate: noShowDenominator > 0 ? round1((noShowCount / noShowDenominator) * 100) : 0,
  };
}

export interface CommissionTotals {
  totalEarned: number;
  pending: number;
  paidOut: number;
}

export function computeCommissionTotals(rows: DBPhoneCommission[]): CommissionTotals {
  const totalEarned = rows.reduce((sum, r) => sum + r.amount, 0);
  const pending = rows.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);
  const paidOut = rows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);
  return { totalEarned, pending, paidOut };
}
