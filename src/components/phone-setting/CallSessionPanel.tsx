import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneOff, ScreenShare, Volume2, Smartphone, Loader2,
  AlertTriangle, CheckCircle2, Captions, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { PhoneProspect } from "@/hooks/usePhoneSetting";

type CallMode = "voip" | "speakerphone" | "mobile";
type CallPhase = "idle" | "picking" | "connecting" | "active";

interface Props {
  prospect: PhoneProspect;
  onCallEnded: (transcript: string | null) => void;
}

const MODE_OPTIONS: { id: CallMode; title: string; description: string; icon: typeof Phone }[] = [
  {
    id: "voip",
    title: "VoIP / Softphone",
    description: "Mic + the call tab/app's audio. Chrome will ask you to pick a tab/window — check \"Share audio\".",
    icon: ScreenShare,
  },
  {
    id: "speakerphone",
    title: "Speakerphone + second device",
    description: "Mic only — works because your speaker plays both sides of the call out loud.",
    icon: Volume2,
  },
  {
    id: "mobile",
    title: "Mobile solo",
    description: "No live audio. Just the pre-call brief now, debrief after you hang up.",
    icon: Smartphone,
  },
];

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function lastNWords(text: string, n: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(-n).join(" ");
}

function buildProspectContext(p: PhoneProspect): string {
  const parts = [
    `Name: ${p.name}`,
    p.current_job ? `Job: ${p.current_job}` : null,
    p.motivation ? `Motivation: ${p.motivation}` : null,
    p.concerns ? `Concerns: ${p.concerns}` : null,
    p.lead_temperature ? `Temperature: ${p.lead_temperature}` : null,
    p.pre_call_brief?.qualifyOn?.length ? `Still need to qualify: ${p.pre_call_brief.qualifyOn.join("; ")}` : null,
  ].filter(Boolean) as string[];
  return parts.join(" | ");
}

interface Suggestion {
  id: string;
  text: string;
}

export function CallSessionPanel({ prospect, onCallEnded }: Props) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [selectedMode, setSelectedMode] = useState<CallMode | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const [finalLines, setFinalLines] = useState<string[]>([]);
  const [interimText, setInterimText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isActiveRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const lastSentRef = useRef("");
  const requestIdRef = useRef(0);

  const speechSupported = !!getSpeechRecognitionCtor();

  useEffect(() => {
    transcriptRef.current = [...finalLines, interimText].filter(Boolean).join(" ");
  }, [finalLines, interimText]);

  // Auto-scroll the transcript box to the newest line.
  const transcriptBoxRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = transcriptBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [finalLines, interimText]);

  function cleanupAll() {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
    if (levelRafRef.current != null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    displayStreamRef.current?.getTracks().forEach((t) => t.stop());
    displayStreamRef.current = null;
  }

  useEffect(() => cleanupAll, []);

  function setupLevelMeter(streams: MediaStream[]) {
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      streams.forEach((s) => {
        if (s.getAudioTracks().length === 0) return;
        ctx.createMediaStreamSource(s).connect(analyser);
      });
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(1, avg / 80));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.error("Level meter setup failed:", e);
    }
  }

  function startRecognition() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text: string = res[0]?.transcript ?? "";
        if (res.isFinal) {
          if (text.trim()) setFinalLines((prev) => [...prev, text.trim()]);
        } else {
          interim += text;
        }
      }
      setInterimText(interim);
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.error("SpeechRecognition error:", e?.error);
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setConnectError("Microphone access was blocked — live transcription stopped.");
      }
    };
    recognition.onend = () => {
      // Chrome periodically ends recognition on silence/network hiccups; restart while still live.
      if (isActiveRef.current) {
        try { recognition.start(); } catch { /* may already be starting */ }
      }
    };
    recognition.start();
    recognitionRef.current = recognition;
  }

  async function beginActiveCall(mode: CallMode) {
    setConnectError(null);
    setPhase("connecting");
    try {
      if (mode === "voip") {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        } catch {
          micStream.getTracks().forEach((t) => t.stop());
          throw new Error("Screen/tab audio sharing was cancelled or denied.");
        }
        displayStream.getVideoTracks().forEach((t) => t.stop());
        micStreamRef.current = micStream;
        displayStreamRef.current = displayStream;
        setupLevelMeter([micStream, displayStream]);
      } else if (mode === "speakerphone") {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        setupLevelMeter([micStream]);
      }
      isActiveRef.current = true;
      if (speechSupported) startRecognition();
      setPhase("active");
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : "Could not get microphone/audio permission.");
      setPhase("picking");
    }
  }

  function applyNewSuggestions(texts: string[]) {
    const currentIds = suggestions.map((s) => s.id);
    if (currentIds.length) {
      setRemovingIds(new Set(currentIds));
      setTimeout(() => {
        setSuggestions(texts.slice(0, 3).map((t) => ({ id: crypto.randomUUID(), text: t })));
        setRemovingIds(new Set());
      }, 200);
    } else {
      setSuggestions(texts.slice(0, 3).map((t) => ({ id: crypto.randomUUID(), text: t })));
    }
  }

  function dismissSuggestion(id: string) {
    setRemovingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }

  async function fetchSuggestions() {
    const text = transcriptRef.current.trim();
    if (!text || text === lastSentRef.current) return;
    lastSentRef.current = text;
    const myRequestId = ++requestIdRef.current;
    try {
      const { data, error } = await supabase.functions.invoke("phone-live-suggestions", {
        body: { transcript: lastNWords(text, 300), prospectContext: buildProspectContext(prospect) },
      });
      if (error) throw error;
      if (myRequestId !== requestIdRef.current) return; // a newer call ended/restarted since this fired
      const texts = Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 3) : [];
      if (texts.length) applyNewSuggestions(texts);
    } catch (e) {
      console.error("phone-live-suggestions failed:", e);
    }
  }

  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(fetchSuggestions, 4500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function resetSessionState() {
    setSuggestions([]);
    setRemovingIds(new Set());
    setMicLevel(0);
    setFinalLines([]);
    setInterimText("");
    transcriptRef.current = "";
    lastSentRef.current = "";
    setSelectedMode(null);
    setConnectError(null);
  }

  function endCall() {
    const finalText = transcriptRef.current.trim();
    cleanupAll();
    setPhase("idle");
    resetSessionState();
    onCallEnded(finalText || null);
  }

  function finishMobileCall() {
    setPhase("idle");
    resetSessionState();
    onCallEnded(null);
  }

  function cancelPicking() {
    setPhase("idle");
    setSelectedMode(null);
    setConnectError(null);
  }

  // ---- Render ----

  if (phase === "idle") {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Phone className="h-4 w-4 text-primary" /> Call Listening
          </div>
          <Button size="sm" onClick={() => setPhase("picking")}>
            <Phone className="h-3.5 w-3.5 mr-1" /> Start Call
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (phase === "picking" || phase === "connecting") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> How are you taking this call?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!speechSupported && (
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Live transcription requires Chrome or Edge. VoIP/Speakerphone modes will still let you talk, but no transcript or AI suggestions will appear in this browser.</span>
            </div>
          )}
          {connectError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{connectError}</span>
            </div>
          )}

          <div className="grid gap-2">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = selectedMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={phase === "connecting"}
                  onClick={() => setSelectedMode(opt.id)}
                  className={cn(
                    "text-left rounded-lg border p-3 transition-colors disabled:opacity-60",
                    active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" /> {opt.title}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={cancelPicking} disabled={phase === "connecting"}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedMode || phase === "connecting"}
              onClick={() => {
                if (!selectedMode) return;
                if (selectedMode === "mobile") {
                  setPhase("active");
                } else {
                  beginActiveCall(selectedMode);
                }
              }}
            >
              {phase === "connecting" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Phone className="h-3.5 w-3.5 mr-1" />}
              {phase === "connecting" ? "Connecting…" : "Start"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // phase === "active"
  if (selectedMode === "mobile") {
    return (
      <Card>
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" /> Brief loaded — dial when ready
          </div>
          {prospect.pre_call_brief ? (
            <ul className="text-sm space-y-1 list-disc pl-4 text-muted-foreground">
              {prospect.pre_call_brief.talkingPoints.slice(0, 3).map((tp, i) => <li key={i}>{tp}</li>)}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No pre-call brief yet — generate one below before you dial.</p>
          )}
          <Button size="sm" onClick={finishMobileCall}>
            <PhoneOff className="h-3.5 w-3.5 mr-1" /> I finished the call
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full bg-success transition-opacity"
            style={{ opacity: 0.4 + micLevel * 0.6 }}
          />
          Live — {selectedMode === "voip" ? "VoIP / Softphone" : "Speakerphone"}
        </CardTitle>
        <Button size="sm" variant="destructive" onClick={endCall}>
          <PhoneOff className="h-3.5 w-3.5 mr-1" /> End Call
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{connectError}</span>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Live Suggestions
          </h4>
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Listening for enough to suggest something…</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => dismissSuggestion(s.id)}
                  title="Tap to dismiss"
                  className={cn(
                    "text-left rounded-full border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors max-w-full",
                    removingIds.has(s.id)
                      ? "animate-out fade-out-0 zoom-out-95 duration-200"
                      : "animate-in fade-in-0 zoom-in-95 duration-300",
                  )}
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Captions className="h-3.5 w-3.5" /> Transcript
          </h4>
          {!speechSupported ? (
            <p className="text-xs text-muted-foreground">Live transcription requires Chrome or Edge.</p>
          ) : (
            <div
              ref={transcriptBoxRef}
              className="rounded-md border border-border bg-muted/30 p-2.5 max-h-32 overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap"
            >
              {finalLines.length === 0 && !interimText ? (
                <span className="italic">Waiting for speech…</span>
              ) : (
                <>
                  {finalLines.join(" ")}
                  {interimText && <span className="opacity-60 italic"> {interimText}</span>}
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
