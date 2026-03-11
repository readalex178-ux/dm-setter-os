export type PipelineStage = 
  | "New Lead" | "Discovery" | "Qualification" | "Interested" 
  | "Objection Handling" | "Ready for Call" | "Call Booked" 
  | "Not Qualified" | "Cold Lead";

export type IntentLevel = "Curious" | "Skeptical" | "Warm" | "High Intent";

export interface Prospect {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  stage: PipelineStage;
  leadScore: number;
  callReadiness: number;
  intentLevel: IntentLevel;
  intentConfidence: number;
  motivation: string;
  motivationConfidence: number;
  concerns: string;
  concernsConfidence: number;
  location: string;
  currentJob: string;
  incomeGoal: string;
  timeAvailability: string;
  lastContact: string;
  source: string;
  tags: string[];
  unread: boolean;
}

export interface Message {
  id: string;
  prospectId: string;
  sender: "prospect" | "setter";
  content: string;
  timestamp: string;
}

export interface TimelineEvent {
  id: string;
  prospectId: string;
  type: string;
  description: string;
  timestamp: string;
}

export interface Script {
  id: string;
  category: string;
  title: string;
  content: string;
  isFavorite: boolean;
}

export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  personaType: string;
}

export const demoProspects: Prospect[] = [
  {
    id: "p1", name: "Sarah Mitchell", handle: "@sarahmitchell_fit", avatar: "SM",
    stage: "Interested", leadScore: 8, callReadiness: 78,
    intentLevel: "Warm", intentConfidence: 84,
    motivation: "Career change", motivationConfidence: 88,
    concerns: "Legitimacy", concernsConfidence: 72,
    location: "Austin, TX", currentJob: "Marketing Manager",
    incomeGoal: "$5K/month", timeAvailability: "15-20 hrs/week",
    lastContact: "2 hours ago", source: "Lead magnet",
    tags: ["high-value", "guide-downloaded"], unread: true,
  },
  {
    id: "p2", name: "James Rodriguez", handle: "@jamesrod_23", avatar: "JR",
    stage: "Discovery", leadScore: 6, callReadiness: 42,
    intentLevel: "Curious", intentConfidence: 67,
    motivation: "Extra income", motivationConfidence: 75,
    concerns: "Time commitment", concernsConfidence: 80,
    location: "Miami, FL", currentJob: "Personal Trainer",
    incomeGoal: "$3K/month", timeAvailability: "10 hrs/week",
    lastContact: "5 hours ago", source: "Organic follow",
    tags: ["fitness-niche"], unread: true,
  },
  {
    id: "p3", name: "Emily Chen", handle: "@emilychen.co", avatar: "EC",
    stage: "Ready for Call", leadScore: 9, callReadiness: 92,
    intentLevel: "High Intent", intentConfidence: 94,
    motivation: "Lifestyle freedom", motivationConfidence: 91,
    concerns: "Cost", concernsConfidence: 45,
    location: "San Francisco, CA", currentJob: "Software Engineer",
    incomeGoal: "$10K/month", timeAvailability: "20+ hrs/week",
    lastContact: "30 min ago", source: "Referral",
    tags: ["high-value", "tech-background", "referral"], unread: false,
  },
  {
    id: "p4", name: "Marcus Johnson", handle: "@marcusj_life", avatar: "MJ",
    stage: "Objection Handling", leadScore: 7, callReadiness: 55,
    intentLevel: "Skeptical", intentConfidence: 78,
    motivation: "Extra income", motivationConfidence: 82,
    concerns: "Risk", concernsConfidence: 88,
    location: "Chicago, IL", currentJob: "Accountant",
    incomeGoal: "$4K/month", timeAvailability: "10-15 hrs/week",
    lastContact: "1 day ago", source: "Story reply",
    tags: ["cautious"], unread: false,
  },
  {
    id: "p5", name: "Ava Williams", handle: "@ava.w.coaching", avatar: "AW",
    stage: "New Lead", leadScore: 4, callReadiness: 15,
    intentLevel: "Curious", intentConfidence: 55,
    motivation: "Curiosity", motivationConfidence: 60,
    concerns: "Legitimacy", concernsConfidence: 65,
    location: "Denver, CO", currentJob: "Teacher",
    incomeGoal: "Not mentioned", timeAvailability: "Not mentioned",
    lastContact: "3 hours ago", source: "Cold follow",
    tags: ["new"], unread: true,
  },
  {
    id: "p6", name: "David Park", handle: "@dpark.digital", avatar: "DP",
    stage: "Call Booked", leadScore: 9, callReadiness: 100,
    intentLevel: "High Intent", intentConfidence: 96,
    motivation: "Career change", motivationConfidence: 93,
    concerns: "Time commitment", concernsConfidence: 30,
    location: "New York, NY", currentJob: "Freelance Designer",
    incomeGoal: "$8K/month", timeAvailability: "25+ hrs/week",
    lastContact: "1 hour ago", source: "Lead magnet",
    tags: ["high-value", "call-scheduled"], unread: false,
  },
  {
    id: "p7", name: "Natalie Brooks", handle: "@nat.brooks.life", avatar: "NB",
    stage: "Cold Lead", leadScore: 2, callReadiness: 5,
    intentLevel: "Skeptical", intentConfidence: 40,
    motivation: "Curiosity", motivationConfidence: 45,
    concerns: "Legitimacy", concernsConfidence: 90,
    location: "Portland, OR", currentJob: "Barista",
    incomeGoal: "Not mentioned", timeAvailability: "Not mentioned",
    lastContact: "5 days ago", source: "Organic follow",
    tags: ["cold", "re-engage"], unread: false,
  },
  {
    id: "p8", name: "Ryan Thompson", handle: "@ryanthompson.biz", avatar: "RT",
    stage: "Qualification", leadScore: 7, callReadiness: 60,
    intentLevel: "Warm", intentConfidence: 79,
    motivation: "Lifestyle freedom", motivationConfidence: 85,
    concerns: "Cost", concernsConfidence: 70,
    location: "Nashville, TN", currentJob: "Sales Rep",
    incomeGoal: "$6K/month", timeAvailability: "15 hrs/week",
    lastContact: "4 hours ago", source: "Lead magnet",
    tags: ["sales-background"], unread: true,
  },
];

export const demoMessages: Record<string, Message[]> = {
  p1: [
    { id: "m1", prospectId: "p1", sender: "prospect", content: "Hey! I saw your post about the online business thing. What exactly is it?", timestamp: "Today 2:15 PM" },
    { id: "m2", prospectId: "p1", sender: "setter", content: "Hey Sarah! 👋 Thanks for reaching out. So basically we help people build their own online coaching or digital business from scratch. What made you curious about it?", timestamp: "Today 2:18 PM" },
    { id: "m3", prospectId: "p1", sender: "prospect", content: "Honestly I've been thinking about leaving my 9-5 for a while now. I'm in marketing and I feel like I could do something on my own but I don't know where to start", timestamp: "Today 2:22 PM" },
    { id: "m4", prospectId: "p1", sender: "setter", content: "That's a really common feeling, especially with a marketing background — you already have so many transferable skills. What would your ideal income look like if you went full time on your own thing?", timestamp: "Today 2:25 PM" },
    { id: "m5", prospectId: "p1", sender: "prospect", content: "I'd love to hit at least $5K a month to start. That would cover my expenses and give me some breathing room. Is that realistic?", timestamp: "Today 2:30 PM" },
    { id: "m6", prospectId: "p1", sender: "prospect", content: "Also, how do I know this is legit? I've seen so many scammy things online 😅", timestamp: "Today 2:31 PM" },
  ],
  p3: [
    { id: "m10", prospectId: "p3", sender: "prospect", content: "Hi! My friend David told me about your program. He's been raving about it", timestamp: "Today 4:00 PM" },
    { id: "m11", prospectId: "p3", sender: "setter", content: "Hey Emily! Oh awesome, David is crushing it 🔥 What did he share with you about it?", timestamp: "Today 4:02 PM" },
    { id: "m12", prospectId: "p3", sender: "prospect", content: "He said he's already making money online and it's flexible enough to do alongside his design work. I'm a software engineer and honestly burnt out. I want to build something of my own that gives me freedom", timestamp: "Today 4:05 PM" },
    { id: "m13", prospectId: "p3", sender: "setter", content: "I totally get that. A lot of people in tech feel the same way. With your skills, you could build something really powerful. What kind of income would make this feel worth pursuing for you?", timestamp: "Today 4:08 PM" },
    { id: "m14", prospectId: "p3", sender: "prospect", content: "Honestly $10K/month would be the dream. I make good money now but I want location freedom and to work on my own terms. I have 20+ hours a week I could dedicate to this", timestamp: "Today 4:12 PM" },
    { id: "m15", prospectId: "p3", sender: "prospect", content: "How does it actually work? Like what would the first steps look like?", timestamp: "Today 4:13 PM" },
  ],
};

export const demoTimeline: TimelineEvent[] = [
  { id: "t1", prospectId: "p1", type: "followed", description: "Followed account", timestamp: "3 days ago" },
  { id: "t2", prospectId: "p1", type: "guide", description: "Downloaded lead magnet guide", timestamp: "2 days ago" },
  { id: "t3", prospectId: "p1", type: "dm", description: "First DM received", timestamp: "Today 2:15 PM" },
  { id: "t4", prospectId: "p1", type: "income", description: "Income goal mentioned: $5K/month", timestamp: "Today 2:30 PM" },
  { id: "t5", prospectId: "p1", type: "objection", description: "Legitimacy concern raised", timestamp: "Today 2:31 PM" },
  { id: "t6", prospectId: "p3", type: "referral", description: "Referred by David Park", timestamp: "Today 4:00 PM" },
  { id: "t7", prospectId: "p3", type: "income", description: "Income goal mentioned: $10K/month", timestamp: "Today 4:12 PM" },
  { id: "t8", prospectId: "p3", type: "interest", description: "Asked how it works — high buying signal", timestamp: "Today 4:13 PM" },
];

export const demoScripts: Script[] = [
  { id: "s1", category: "New Follower Openers", title: "Warm Welcome", content: "Hey [Name]! 👋 Thanks for the follow! I noticed you're into [niche]. What got you interested in that?", isFavorite: true },
  { id: "s2", category: "New Follower Openers", title: "Story Engagement", content: "Hey! I saw you checked out my story about [topic]. Did that resonate with you?", isFavorite: false },
  { id: "s3", category: "Lead Magnet Openers", title: "Guide Follow-Up", content: "Hey [Name]! Did you get a chance to check out the guide? What stood out to you the most?", isFavorite: true },
  { id: "s4", category: "Discovery Questions", title: "Current Situation", content: "That's really interesting! So what are you doing right now — like job or business wise?", isFavorite: false },
  { id: "s5", category: "Discovery Questions", title: "Pain Point Discovery", content: "What would you say is the biggest thing holding you back from [goal] right now?", isFavorite: false },
  { id: "s6", category: "Income Goal Questions", title: "Income Target", content: "If you could build something on the side that replaced your income, what would that number need to look like for you?", isFavorite: true },
  { id: "s7", category: "Objection Responses", title: "Legitimacy Concern", content: "I totally get that — there's so much noise online. The best way to see if this is real is to hop on a quick call where I can show you exactly how it works and you can ask any questions. No pressure at all.", isFavorite: true },
  { id: "s8", category: "Objection Responses", title: "Time Concern", content: "That's a fair point. Most of our members started with just 10-15 hours a week alongside their day job. It's all about being consistent, not spending crazy hours.", isFavorite: false },
  { id: "s9", category: "Call Transition Messages", title: "Soft Call Transition", content: "The easiest way to explain everything properly is just a quick 10–15 minute call where we walk through how it works and see if it makes sense for you. Would you be open to that?", isFavorite: true },
  { id: "s10", category: "Call Transition Messages", title: "Direct Call CTA", content: "I think you'd really benefit from a quick call with [coach name] — they can break everything down and answer your questions way better than I can over text. Want me to set that up?", isFavorite: false },
  { id: "s11", category: "Follow-Up Messages", title: "Gentle Follow-Up", content: "Hey [Name]! Just checking in — I know life gets busy. Were you still thinking about what we chatted about?", isFavorite: true },
  { id: "s12", category: "Follow-Up Messages", title: "Value Follow-Up", content: "Hey! Thought of you when I saw this — [relevant content/result]. Still open to chatting more about how this could work for you?", isFavorite: false },
];

export const demoTrainingScenarios: TrainingScenario[] = [
  { id: "ts1", name: "Cold Follower", description: "A new follower with zero context. They followed after seeing a reel but haven't engaged further.", difficulty: "Beginner", personaType: "Cold" },
  { id: "ts2", name: "Guide Downloader", description: "Someone who downloaded your free guide and replied to the thank-you DM. They're somewhat interested but cautious.", difficulty: "Beginner", personaType: "Warm" },
  { id: "ts3", name: "Skeptical Prospect", description: "Has been burned by online programs before. Very direct, asks tough questions, needs proof and transparency.", difficulty: "Advanced", personaType: "Skeptical" },
  { id: "ts4", name: "Busy Professional", description: "High earner with limited time. Interested but constantly says they're too busy. Needs to see ROI clearly.", difficulty: "Intermediate", personaType: "Time-pressed" },
  { id: "ts5", name: "Curious but Hesitant", description: "Asks lots of questions but avoids commitment. Says things like 'I'll think about it' and 'Maybe later'.", difficulty: "Intermediate", personaType: "Hesitant" },
  { id: "ts6", name: "BANT Phone Qualification", description: "Practice qualifying a prospect on a call using the BANT framework (Need → Timeline → Authority → Budget). The prospect is interested but you must uncover all four pillars naturally before closing.", difficulty: "Advanced", personaType: "Phone Prospect" },
  { id: "ts7", name: "BANT: Weak Budget Signal", description: "The prospect has strong need and urgency but limited budget. Practice increasing perceived cost of inaction to justify the investment without dropping price.", difficulty: "Advanced", personaType: "Budget-Conscious" },
  { id: "ts8", name: "BANT: Partner Approval Needed", description: "The prospect is interested but needs partner sign-off. Practice uncovering authority early and handling the 'I need to ask my partner' response.", difficulty: "Intermediate", personaType: "Dependent Decision-Maker" },
];

export const suggestedReplies = {
  p1: [
    { type: "Discovery", content: "That's a great question, Sarah. A lot of successful members felt the same way at first. Can I ask — what's your biggest concern about making a change like this?" },
    { type: "Rapport", content: "I totally understand the skepticism — honestly, that shows you're smart about it 😊 The fact that you're even exploring this tells me you're serious. What would it mean for you if you could actually make that $5K happen?" },
    { type: "Call Transition", content: "Great question! Honestly the best way to see how it all works is a quick 10-15 min call where we can walk through everything and you can ask anything. Want me to set that up?" },
  ],
  p3: [
    { type: "Discovery", content: "Love that clarity! With your engineering background and 20+ hours a week, you're actually in a really strong position. What kind of business model appeals to you most — coaching, digital products, or something else?" },
    { type: "Rapport", content: "$10K/month is totally doable, especially with your work ethic. David started at a similar level and hit that within 4 months. What excites you most about building your own thing?" },
    { type: "Call Transition", content: "The easiest way to explain the full roadmap is a quick 10-15 min call where we walk through exactly how it works step by step. David can even vouch for the process. Want me to set something up?" },
  ],
};

export const dashboardStats = {
  totalConversations: 47,
  activeLeads: 23,
  qualifiedProspects: 12,
  readyForCall: 5,
  callsBooked: 8,
  coldLeads: 9,
  conversionRate: 17,
  followUpsDue: 7,
};
