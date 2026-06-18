import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DBProspect {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  stage: string;
  lead_score: number;
  call_readiness: number;
  intent_level: string | null;
  intent_confidence: number | null;
  motivation: string | null;
  motivation_confidence: number | null;
  concerns: string | null;
  concerns_confidence: number | null;
  location: string | null;
  current_job: string | null;
  income_goal: string | null;
  time_availability: string | null;
  source: string | null;
  platform: string | null;
  tags: string[] | null;
  notes: string | null;
  last_contact_at: string | null;
  created_at: string;
  connected_account_id: string | null;
  conversation_score: number | null;
  booking_probability: number | null;
  lead_temperature: string | null;
  stage_confidence: number | null;
  stage_suggested: string | null;
  suggested_action: string | null;
}

export interface DBTimelineEvent {
  id: string;
  prospect_id: string;
  event_type: string;
  description: string | null;
  occurred_at: string;
}

export interface DBDailyKPI {
  id: string;
  date: string;
  dms_sent: number;
  dms_received: number;
  new_leads: number;
  follow_ups_sent: number;
  calls_booked: number;
  calls_completed: number;
  no_shows: number;
  conversions_to_qualified: number;
  objections_handled: number;
  hours_worked: number;
  notes: string | null;
}

export const PIPELINE_STAGES = [
  "New Lead", "Discovery", "Qualification", "Interested",
  "Objection Handling", "Ready for Call", "Call Booked",
  "Not Qualified", "Cold Lead",
] as const;

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: async (): Promise<DBProspect[]> => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("last_contact_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DBProspect[];
    },
  });
}

export function useTimeline(prospectId: string | null) {
  return useQuery({
    queryKey: ["timeline", prospectId],
    enabled: !!prospectId,
    queryFn: async (): Promise<DBTimelineEvent[]> => {
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("prospect_id", prospectId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DBTimelineEvent[];
    },
  });
}

export function useKPIs() {
  return useQuery({
    queryKey: ["daily_kpis"],
    queryFn: async (): Promise<DBDailyKPI[]> => {
      const { data, error } = await supabase
        .from("daily_kpis")
        .select("*")
        .order("date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as DBDailyKPI[];
    },
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAddProspect() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; handle?: string; source?: string }) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert({
          user_id: user!.id,
          name: input.name,
          handle: input.handle || null,
          source: input.source || "manual",
          stage: "New Lead",
          last_contact_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prospects"] }),
  });
}

export function useUpdateProspectStage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("prospects")
        .update({ stage })
        .eq("id", id);
      if (error) throw error;
      // log timeline event
      await supabase.from("timeline_events").insert({
        user_id: user!.id,
        prospect_id: id,
        event_type: "stage_change",
        description: `Moved to ${stage}`,
        occurred_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}

export function useMarkContacted() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const ts = new Date().toISOString();
      const { error } = await supabase
        .from("prospects")
        .update({ last_contact_at: ts })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("timeline_events").insert({
        user_id: user!.id,
        prospect_id: id,
        event_type: "follow_up",
        description: note || "Followed up",
        occurred_at: ts,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}


export function useLogKPI() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<DBDailyKPI> & { date: string }) => {
      const { error } = await supabase
        .from("daily_kpis")
        .upsert(
          { user_id: user!.id, ...input },
          { onConflict: "user_id,date" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily_kpis"] }),
  });
}
