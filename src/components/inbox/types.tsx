import { Instagram, Facebook, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

export interface DBProspect {
  id: string;
  name: string;
  handle: string | null;
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
  profile_url: string | null;
  last_contact_at: string | null;
  connected_account_id: string | null;
  // AI coach scoring (Phase 5)
  conversation_score: number | null;
  booking_probability: number | null;
  lead_temperature: string | null;
  stage_confidence: number | null;
  stage_suggested: string | null;
  suggested_action: string | null;
}

export interface DBMessage {
  id: string;
  prospect_id: string;
  sender: string;
  content: string;
  sent_at: string;
  platform_message_id: string | null;
}

export interface AISuggestion {
  type: string;
  content: string;
  coaching_note: string;
}

export interface NormalizedProspect {
  name: string;
  handle: string;
  stage: string;
  leadScore: number;
  callReadiness: number;
  intentLevel: string;
  intentConfidence: number;
  motivation: string;
  motivationConfidence: number;
  concerns: string;
  concernsConfidence: number;
  location: string;
  currentJob: string;
  incomeGoal: string;
  timeAvailability: string;
  source: string;
  platform: string | null;
  profileUrl: string | null;
  avatar: string;
  unread: boolean;
  conversationScore: number | null;
  bookingProbability: number | null;
  leadTemperature: string | null;
  stageConfidence: number | null;
  stageSuggested: string | null;
  suggestedAction: string | null;
}

export interface UIMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
}

export const STAGES = [
  "New Lead", "Discovery", "Qualification", "Interested",
  "Objection Handling", "Ready for Call", "Call Booked",
  "Cold Lead", "Not Qualified",
];

export const stageColor: Record<string, string> = {
  "New Lead": "secondary",
  "Discovery": "info",
  "Qualification": "warning",
  "Interested": "default",
  "Objection Handling": "destructive",
  "Ready for Call": "success",
  "Call Booked": "success",
  "Cold Lead": "secondary",
  "Not Qualified": "secondary",
};

export function platformIcon(platform: string | null): ReactNode {
  if (platform === "instagram") return <Instagram className="h-3 w-3 text-pink-500" />;
  if (platform === "facebook") return <Facebook className="h-3 w-3 text-blue-500" />;
  if (platform === "whatsapp") return <MessageCircle className="h-3 w-3 text-green-500" />;
  return null;
}

export function tempColor(temp: string | null): string {
  switch ((temp || "").toLowerCase()) {
    case "hot": return "destructive";
    case "warm": return "warning";
    case "cold": return "secondary";
    default: return "secondary";
  }
}
