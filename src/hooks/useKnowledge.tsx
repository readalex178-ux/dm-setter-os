import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ICPProfile {
  id: string;
  name: string;
  is_active: boolean;
  demographics: string | null;
  goals: string | null;
  pains: string | null;
  buying_triggers: string | null;
  objections_common: string | null;
  language_patterns: string | null;
  where_they_hang_out: string | null;
}

export interface ObjectionEntry {
  id: string;
  category: string;
  objection: string;
  framework: string | null;
  response: string;
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
}

export interface ScriptEntry {
  id: string;
  title: string;
  category: string;
  body: string;
  is_favorite: boolean;
}

export interface WinLossLog {
  id: string;
  outcome: string;
  prospect_name: string | null;
  summary: string | null;
  lesson: string | null;
  created_at: string;
}

export const OBJECTION_CATEGORIES = [
  "price", "time", "trust", "partner", "thinking", "bad-experience", "not-interested", "other",
] as const;

export const SCRIPT_CATEGORIES = [
  "opener", "follow-up", "qualifying", "objection", "booking", "re-engage", "other",
] as const;

// ---- ICP (single active profile) ----
export function useICP() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["icp_profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ICPProfile | null> => {
      const { data, error } = await supabase
        .from("icp_profiles")
        .select("*")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ICPProfile | null;
    },
  });
}

export function useSaveICP() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<ICPProfile>) => {
      if (input.id) {
        const { error } = await supabase.from("icp_profiles").update(input).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("icp_profiles").insert({ ...input, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["icp_profile"] }),
  });
}

// ---- Generic list table helpers ----
function useList<T>(table: string) {
  return useQuery({
    queryKey: [table],
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase.from(table as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

function useUpsert(table: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: any) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from(table as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert({ ...input, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

function useDelete(table: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export const useObjections = () => useList<ObjectionEntry>("objection_entries");
export const useSaveObjection = () => useUpsert("objection_entries");
export const useDeleteObjection = () => useDelete("objection_entries");

export const useFAQs = () => useList<FAQEntry>("faq_entries");
export const useSaveFAQ = () => useUpsert("faq_entries");
export const useDeleteFAQ = () => useDelete("faq_entries");

export const useScripts = () => useList<ScriptEntry>("scripts");
export const useSaveScript = () => useUpsert("scripts");
export const useDeleteScript = () => useDelete("scripts");

export const useWinLoss = () => useList<WinLossLog>("win_loss_logs");
export const useSaveWinLoss = () => useUpsert("win_loss_logs");
export const useDeleteWinLoss = () => useDelete("win_loss_logs");
