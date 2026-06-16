import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Save, Sparkles, Package } from "lucide-react";

interface Objection {
  objection: string;
  response: string;
}

interface OfferProfile {
  id?: string;
  offer_name: string;
  description: string;
  ideal_client: string;
  price: string;
  core_promise: string;
  value_props: string[];
  proof: string;
  guarantee: string;
  objections: Objection[];
  tone: string;
  cta_goal: string;
  industry: string;
  competitors: string;
  market_sophistication: string;
  market_awareness: string;
}

const EMPTY: OfferProfile = {
  offer_name: "",
  description: "",
  ideal_client: "",
  price: "",
  core_promise: "",
  value_props: [""],
  proof: "",
  guarantee: "",
  objections: [{ objection: "", response: "" }],
  tone: "casual",
  cta_goal: "book a call",
  industry: "",
  competitors: "",
  market_sophistication: "",
  market_awareness: "",
};

export default function OfferPage() {
  const { user } = useAuth();
  const [offer, setOffer] = useState<OfferProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("offer_profiles")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setOffer({
          id: data.id,
          offer_name: data.offer_name || "",
          description: data.description || "",
          ideal_client: data.ideal_client || "",
          price: data.price || "",
          core_promise: data.core_promise || "",
          value_props: (data.value_props as string[])?.length ? (data.value_props as string[]) : [""],
          proof: data.proof || "",
          guarantee: data.guarantee || "",
          objections: ((data.objections as unknown as Objection[])?.length
            ? (data.objections as unknown as Objection[])
            : [{ objection: "", response: "" }]),
          tone: data.tone || "casual",
          cta_goal: data.cta_goal || "book a call",
          industry: (data as any).industry || "",
          competitors: (data as any).competitors || "",
          market_sophistication: (data as any).market_sophistication || "",
          market_awareness: (data as any).market_awareness || "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  function set<K extends keyof OfferProfile>(key: K, value: OfferProfile[K]) {
    setOffer((o) => ({ ...o, [key]: value }));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        offer_name: offer.offer_name,
        description: offer.description,
        ideal_client: offer.ideal_client,
        price: offer.price,
        core_promise: offer.core_promise,
        value_props: offer.value_props.filter((v) => v.trim()),
        proof: offer.proof,
        guarantee: offer.guarantee,
        objections: offer.objections.filter((o) => o.objection.trim() || o.response.trim()) as unknown as never,
        tone: offer.tone,
        cta_goal: offer.cta_goal,
      };
      let error;
      if (offer.id) {
        ({ error } = await supabase.from("offer_profiles").update(payload).eq("id", offer.id));
      } else {
        const res = await supabase.from("offer_profiles").insert(payload).select("id").single();
        error = res.error;
        if (res.data) set("id", res.data.id);
      }
      if (error) throw error;
      toast({ title: "Offer saved", description: "The AI will now use this in every suggestion." });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Your Offer</h1>
          <p className="text-sm text-muted-foreground">
            Tell the AI exactly what you're selling. It uses this in every reply suggestion, stage analysis, and training session.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Offer name</Label>
            <Input value={offer.offer_name} onChange={(e) => set("offer_name", e.target.value)} placeholder="e.g. 12-Week Coaching Accelerator" />
          </div>
          <div className="space-y-1">
            <Label>What is it / how does it work?</Label>
            <Textarea value={offer.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the offer, the deliverables, and how it works." rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Who is it for? (ideal client)</Label>
              <Textarea value={offer.ideal_client} onChange={(e) => set("ideal_client", e.target.value)} placeholder="e.g. Coaches doing 5-10k/mo wanting to scale" rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Price / payment options</Label>
              <Textarea value={offer.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. $3,000 one-time or 3x $1,100" rows={2} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Core promise / outcome</Label>
            <Textarea value={offer.core_promise} onChange={(e) => set("core_promise", e.target.value)} placeholder="The #1 result a client gets. e.g. Add 20k/mo in 90 days." rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Value Props</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => set("value_props", [...offer.value_props, ""])}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {offer.value_props.map((vp, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={vp}
                onChange={(e) => {
                  const next = [...offer.value_props];
                  next[i] = e.target.value;
                  set("value_props", next);
                }}
                placeholder={`Value prop ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => set("value_props", offer.value_props.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proof & Guarantee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Proof / results / testimonials</Label>
            <Textarea value={offer.proof} onChange={(e) => set("proof", e.target.value)} placeholder="Case studies, numbers, social proof the AI can reference." rows={2} />
          </div>
          <div className="space-y-1">
            <Label>Guarantee</Label>
            <Input value={offer.guarantee} onChange={(e) => set("guarantee", e.target.value)} placeholder="e.g. Results in 90 days or we work for free" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Objection Handling</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => set("objections", [...offer.objections, { objection: "", response: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {offer.objections.map((ob, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Objection {i + 1}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => set("objections", offer.objections.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={ob.objection}
                onChange={(e) => {
                  const next = [...offer.objections];
                  next[i] = { ...next[i], objection: e.target.value };
                  set("objections", next);
                }}
                placeholder="e.g. It's too expensive"
              />
              <Textarea
                value={ob.response}
                onChange={(e) => {
                  const next = [...offer.objections];
                  next[i] = { ...next[i], response: e.target.value };
                  set("objections", next);
                }}
                placeholder="Your preferred way to handle it"
                rows={2}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Behavior
          </CardTitle>
          <CardDescription>How the AI should write on your behalf.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Tone / voice</Label>
            <Select value={offer.tone} onValueChange={(v) => set("tone", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual & friendly</SelectItem>
                <SelectItem value="direct">Direct & confident</SelectItem>
                <SelectItem value="premium">Premium & polished</SelectItem>
                <SelectItem value="empathetic">Warm & empathetic</SelectItem>
                <SelectItem value="energetic">High-energy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Call-to-action goal</Label>
            <Input value={offer.cta_goal} onChange={(e) => set("cta_goal", e.target.value)} placeholder="e.g. book a 15-min call" />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Offer
        </Button>
      </div>
    </div>
  );
}
