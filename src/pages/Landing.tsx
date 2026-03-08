import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  MessageSquare, Brain, TrendingUp, Phone, Shield, BarChart3,
  Users, Target, ArrowRight, CheckCircle2, Zap, Eye,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const features = [
  { icon: Brain, title: "AI Conversation Analysis", description: "Real-time intent detection, motivation analysis, and concern identification with confidence scores." },
  { icon: MessageSquare, title: "Smart Reply Suggestions", description: "3 AI-generated response options per message — discovery, rapport, and call transition. Never auto-sent." },
  { icon: TrendingUp, title: "Dynamic Lead Scoring", description: "Automatic 1-10 scoring based on interest, income goals, availability, and engagement signals." },
  { icon: Phone, title: "Call Readiness Detection", description: "0-100% readiness score tracking buying signals to help you transition at the perfect moment." },
  { icon: Shield, title: "Conversation Momentum Alerts", description: "Detects stalling patterns, missed opportunities, and engagement drops before you lose the lead." },
  { icon: BarChart3, title: "Performance Analytics", description: "Track conversion rates, objection patterns, stage transitions, and AI suggestion effectiveness." },
];

const steps = [
  { num: "01", title: "Import Conversations", description: "Paste DM threads, import transcripts, or connect your Instagram account for automatic sync." },
  { num: "02", title: "AI Analyzes Everything", description: "Instant prospect profiling, intent detection, lead scoring, and qualification tracking." },
  { num: "03", title: "Get Smart Suggestions", description: "Receive contextual reply suggestions, call transition cues, and follow-up reminders." },
  { num: "04", title: "Book More Calls", description: "Close more qualified prospects with data-driven insights and proven conversation frameworks." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/50 sticky top-0 z-50 glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">
              <span className="gradient-text">DM Setter</span>{" "}
              <span className="text-muted-foreground">OS</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/app">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/app">
              <Button variant="hero" size="sm">Start Free Demo</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-24 text-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
            <Eye className="h-3 w-3 mr-1" /> AI-Powered • Human-Controlled
          </Badge>
        </motion.div>
        <motion.h1
          className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 max-w-4xl mx-auto leading-tight"
          initial="hidden" animate="visible" variants={fadeUp} custom={1}
        >
          The AI Co-Pilot for{" "}
          <span className="gradient-text">DM Setters</span>{" "}
          Who Book Calls
        </motion.h1>
        <motion.p
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          initial="hidden" animate="visible" variants={fadeUp} custom={2}
        >
          Analyze conversations, qualify prospects, detect call readiness, and get smart reply suggestions — 
          all without ever automating a single message. You stay in control.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial="hidden" animate="visible" variants={fadeUp} custom={3}
        >
          <Link to="/app">
            <Button variant="hero" size="lg" className="text-base px-8">
              Explore Live Demo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="text-base px-8">
            Watch How It Works
          </Button>
        </motion.div>

        {/* Mock UI preview */}
        <motion.div
          className="mt-16 max-w-5xl mx-auto rounded-xl border border-border overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <div className="bg-card p-1">
            <div className="flex gap-1.5 p-3 border-b border-border">
              <div className="h-3 w-3 rounded-full bg-destructive/60" />
              <div className="h-3 w-3 rounded-full bg-warning/60" />
              <div className="h-3 w-3 rounded-full bg-success/60" />
            </div>
            <div className="grid grid-cols-12 min-h-[320px]">
              <div className="col-span-3 border-r border-border p-4 space-y-3">
                {["Sarah Mitchell", "James Rodriguez", "Emily Chen"].map((n, i) => (
                  <div key={n} className={`p-3 rounded-lg text-left text-sm ${i === 0 ? "bg-accent" : "hover:bg-muted"}`}>
                    <div className="font-medium text-foreground">{n}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {i === 0 ? "Warm • Score 8/10" : i === 1 ? "Curious • Score 6/10" : "High Intent • Score 9/10"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="col-span-5 border-r border-border p-4 space-y-3">
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[80%] text-foreground">How do I know this is legit? 😅</div>
                </div>
                <div className="flex justify-end">
                  <div className="gradient-primary rounded-lg px-3 py-2 text-sm max-w-[80%] text-primary-foreground">Great question! The best way to see...</div>
                </div>
              </div>
              <div className="col-span-4 p-4 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Insights</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Intent</span><Badge variant="score">Warm 84%</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Concern</span><Badge variant="warning">Legitimacy 72%</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Call Ready</span><Badge variant="info">78%</Badge></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lead Score</span><Badge variant="success">8/10</Badge></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">Features</Badge>
          <h2 className="text-3xl font-bold mb-3">Everything a DM Setter Needs</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Powerful AI assistance that keeps you in control of every conversation.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="p-6 rounded-xl border border-border bg-card hover:glow-sm transition-all"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary">How It Works</Badge>
          <h2 className="text-3xl font-bold mb-3">From DM to Booked Call in 4 Steps</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="text-center"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <div className="text-4xl font-black gradient-text mb-3">{s.num}</div>
              <h3 className="font-semibold mb-2 text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Built For</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {[
            { icon: Users, title: "Coaches & Course Creators", desc: "Convert followers into coaching clients with intelligent DM workflows." },
            { icon: Target, title: "DM Setting Agencies", desc: "Scale your team's performance with AI insights and coaching tools." },
            { icon: TrendingUp, title: "Online Businesses", desc: "Turn social media conversations into predictable revenue." },
          ].map((uc, i) => (
            <motion.div
              key={uc.title}
              className="p-6 rounded-xl border border-border bg-card text-center"
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            >
              <uc.icon className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2 text-foreground">{uc.title}</h3>
              <p className="text-sm text-muted-foreground">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">FAQ</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-6">
          {[
            { q: "Does the AI send messages automatically?", a: "Never. DM Setter OS is an assistive tool only. Every message is reviewed and sent by the human setter. AI provides suggestions that you can copy, edit, or ignore." },
            { q: "Does this automate outreach?", a: "No. There is zero outreach automation. The tool helps you analyze existing conversations and respond smarter." },
            { q: "What channels does it support?", a: "Instagram DMs is the primary channel. Support for Facebook Messenger, WhatsApp, and LinkedIn DMs is on the roadmap as import/sync integrations." },
            { q: "Is my data secure?", a: "Yes. All conversation data is encrypted and stored securely. We never share your data with third parties." },
          ].map((faq) => (
            <div key={faq.q} className="p-5 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> {faq.q}
              </h3>
              <p className="text-sm text-muted-foreground ml-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center p-12 rounded-2xl border border-primary/20 bg-primary/5">
          <h2 className="text-3xl font-bold mb-4 text-foreground">Ready to Close More Calls?</h2>
          <p className="text-muted-foreground mb-8">Start exploring DM Setter OS with demo data — no signup required.</p>
          <Link to="/app">
            <Button variant="hero" size="lg" className="text-base px-10">
              Launch Demo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <div className="h-6 w-6 rounded gradient-primary flex items-center justify-center">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">DM Setter OS</span>
          </div>
          <p>© 2026 DM Setter OS. AI-powered, human-controlled.</p>
        </div>
      </footer>
    </div>
  );
}
