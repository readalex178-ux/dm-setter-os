import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  to: string;
  hint: string;
}

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = supabase.from(table as any).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

export function useReadiness() {
  return useQuery({
    queryKey: ["readiness"],
    queryFn: async (): Promise<ReadinessItem[]> => {
      const [offer, icp, objections, faqs, scripts, convos, prospects, kpis, accounts] = await Promise.all([
        count("offer_profiles", (q) => q.eq("is_active", true)),
        count("icp_profiles", (q) => q.eq("is_active", true)),
        count("objection_entries"),
        count("faq_entries"),
        count("scripts"),
        count("conversation_examples"),
        count("prospects"),
        count("daily_kpis"),
        count("connected_accounts"),
      ]);

      return [
        { key: "offer", label: "Define your Offer", done: offer > 0, to: "/app/offer", hint: "The AI grounds every reply in your real offer." },
        { key: "icp", label: "Build your ICP Bible", done: icp > 0, to: "/app/knowledge", hint: "Describe who you're speaking to." },
        { key: "objections", label: "Add 3+ objection responses", done: objections >= 3, to: "/app/knowledge", hint: "Handle price, time, and trust your way." },
        { key: "faq", label: "Add at least one FAQ", done: faqs > 0, to: "/app/knowledge", hint: "Approved answers stop the AI improvising." },
        { key: "scripts", label: "Save a script", done: scripts > 0, to: "/app/scripts", hint: "Keep your best openers one click away." },
        { key: "conversations", label: "Add a winning conversation", done: convos > 0, to: "/app/knowledge", hint: "Give the AI a proven thread to model." },
        { key: "prospects", label: "Add your first prospect", done: prospects > 0, to: "/app/prospects", hint: "Start tracking real conversations." },
        { key: "kpis", label: "Log your first KPIs", done: kpis > 0, to: "/app/kpi", hint: "Track daily output from Day 1." },
        { key: "platform", label: "Connect the Chrome extension", done: accounts > 0, to: "/app/extension", hint: "Sync DMs from Instagram, Facebook, or TikTok via the browser extension." },
      ];
    },
  });
}
