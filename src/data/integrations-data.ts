import {
  Instagram, Facebook, MessageCircle,
  Building2, BarChart3, Zap, Users, Target,
} from "lucide-react";
import type { PlatformDef } from "@/components/integrations/PlatformCard";

export const messagingPlatforms: PlatformDef[] = [
  {
    id: "instagram",
    name: "Instagram DMs",
    description: "Import and sync Instagram Direct Messages from your client's business account.",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    id: "facebook",
    name: "Facebook Messenger",
    description: "Import conversations from Facebook Pages you manage.",
    icon: Facebook,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Sync WhatsApp Business conversations via the Cloud API.",
    icon: MessageCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export const crmPlatforms: PlatformDef[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and pipeline data with HubSpot CRM. Auto-create contacts from conversations.",
    icon: Target,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Push leads and opportunities to Salesforce. Keep your enterprise CRM in sync with prospect data.",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  {
    id: "gohighlevel",
    name: "GoHighLevel",
    description: "Sync contacts and pipeline stages with GHL. Popular for coaches and agency workflows.",
    icon: Zap,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    description: "Connect Zoho CRM to manage leads, contacts, and deals from your conversations.",
    icon: BarChart3,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Sync deals and contacts with Pipedrive's sales-focused CRM pipeline.",
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];
