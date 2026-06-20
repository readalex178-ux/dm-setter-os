import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { demoProspects, demoScripts } from "@/data/demo-data";

// Route mapping for navigation commands
const ROUTE_MAP: Record<string, string> = {
  "dashboard": "/app",
  "home": "/app",
  "inbox": "/app/inbox",
  "messages": "/app/inbox",
  "pipeline": "/app/pipeline",
  "prospects": "/app/prospects",
  "new followers": "/app/prospects",
  "followers": "/app/prospects",
  "scripts": "/app/scripts",
  "analytics": "/app/analytics",
  "coaching": "/app/coaching",
  "training": "/app/training",
  "settings": "/app/settings",
  "extension": "/app/extension",
  "kpi": "/app/kpi",
  "kpi tracker": "/app/kpi",
  "tracker": "/app/kpi",
};

// Action patterns
const ACTION_PATTERNS = [
  { pattern: /^(go to|open|navigate to|show me|take me to)\s+(.+)/i, type: "navigate" as const },
  { pattern: /^(type|write|enter|input)\s+(.+)/i, type: "dictate" as const },
  { pattern: /^(search|find|look up|look for)\s+(.+)/i, type: "search" as const },
  { pattern: /^what stage is\s+(.+?)(?:\s+at)?\??$/i, type: "analyze_stage_q" as const },
  { pattern: /^(analyze|analyse)\s+(.+)/i, type: "analyze_stage" as const },
  { pattern: /^(send message to|message|dm)\s+(.+)/i, type: "send_message" as const },
  { pattern: /^(send|use)\s+(.+?)\s+(?:to|for)\s+(.+)/i, type: "send_script" as const },
  { pattern: /^(reply to|respond to|open chat with)\s+(.+)/i, type: "reply_to" as const },
  { pattern: /^(mark|set|tag)\s+(.+)\s+as\s+(.+)/i, type: "mark" as const },
  { pattern: /^(call|schedule call with|book call with)\s+(.+)/i, type: "call" as const },
];

export type VoiceCommandStatus = "idle" | "listening" | "processing" | "error";

interface VoiceCommandResult {
  type: string;
  target?: string;
  value?: string;
  raw: string;
}

export function useVoiceCommand() {
  const [status, setStatus] = useState<VoiceCommandStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

  const isSupported = typeof window !== "undefined" && 
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const processCommand = useCallback((text: string): VoiceCommandResult => {
    const trimmed = text.trim().toLowerCase();
    
    // Check action patterns
    for (const { pattern, type } of ACTION_PATTERNS) {
      const match = trimmed.match(pattern);
      if (match) {
        if (type === "navigate") {
          const target = match[2].trim();
          const route = ROUTE_MAP[target];
          if (route) {
            navigate(route);
            return { type: "navigate", target, raw: text };
          }
          // Fuzzy match
          const fuzzy = Object.entries(ROUTE_MAP).find(([key]) => 
            key.includes(target) || target.includes(key)
          );
          if (fuzzy) {
            navigate(fuzzy[1]);
            return { type: "navigate", target: fuzzy[0], raw: text };
          }
          return { type: "navigate_failed", target, raw: text };
        }
        if (type === "search") {
          navigate("/app/prospects");
          // Small delay then focus search
          setTimeout(() => {
            const searchInput = document.querySelector<HTMLInputElement>(
              'input[type="search"], input[placeholder*="earch"], input[placeholder*="filter"]'
            );
            if (searchInput) {
              searchInput.focus();
              searchInput.value = match[2].trim();
              searchInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }, 500);
          return { type: "search", value: match[2].trim(), raw: text };
        }
        if (type === "dictate") {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
            const input = activeEl as HTMLInputElement;
            input.value += match[2].trim();
            input.dispatchEvent(new Event("input", { bubbles: true }));
            return { type: "dictate", value: match[2].trim(), raw: text };
          }
          return { type: "dictate_no_focus", value: match[2].trim(), raw: text };
        }
        if (type === "send_script") {
          const scriptQuery = match[2].trim().toLowerCase();
          const targetName = match[3].trim().toLowerCase();
          const script = demoScripts.find(s =>
            s.title.toLowerCase().includes(scriptQuery) ||
            s.category.toLowerCase().includes(scriptQuery)
          );
          const prospect = demoProspects.find(p =>
            p.name.toLowerCase().includes(targetName)
          );
          if (script && prospect) {
            navigate("/app/inbox");
            // Store in sessionStorage for the inbox to pick up
            sessionStorage.setItem("voice_prefill", JSON.stringify({
              prospectId: prospect.id,
              message: script.content.replace("[Name]", prospect.name.split(" ")[0]),
            }));
            return { type: "send_script", target: prospect.name, value: script.title, raw: text };
          }
          if (script) {
            navigate("/app/inbox");
            sessionStorage.setItem("voice_prefill", JSON.stringify({ message: script.content }));
            return { type: "send_script", value: script.title, raw: text };
          }
          return { type: "send_script_failed", raw: text };
        }
        if (type === "reply_to") {
          const targetName = match[2].trim().toLowerCase();
          const prospect = demoProspects.find(p =>
            p.name.toLowerCase().includes(targetName)
          );
          if (prospect) {
            navigate("/app/inbox");
            sessionStorage.setItem("voice_prefill", JSON.stringify({ prospectId: prospect.id }));
            return { type: "reply_to", target: prospect.name, raw: text };
          }
          return { type: "reply_to_failed", target: match[2].trim(), raw: text };
        }
        if (type === "analyze_stage" || type === "analyze_stage_q") {
          const targetName = (type === "analyze_stage_q" ? match[1] : match[2]).trim().toLowerCase();
          const prospect = demoProspects.find(p => p.name.toLowerCase().includes(targetName));
          if (prospect) {
            navigate("/app/inbox");
            sessionStorage.setItem("voice_prefill", JSON.stringify({
              prospectId: prospect.id,
              analyze: true,
            }));
            return { type: "analyze_stage", target: prospect.name, raw: text };
          }
          return { type: "analyze_stage_failed", target: targetName, raw: text };
        }
        if (type === "send_message") {
          navigate("/app/inbox");
          return { type: "send_message", target: match[2].trim(), raw: text };
        }
        if (type === "mark") {
          return { type: "mark", target: match[2]?.trim(), value: match[3]?.trim(), raw: text };
        }
        if (type === "call") {
          return { type: "call", target: match[2].trim(), raw: text };
        }
      }
    }

    // Direct route name fallback
    const route = ROUTE_MAP[trimmed];
    if (route) {
      navigate(route);
      return { type: "navigate", target: trimmed, raw: text };
    }

    // Fuzzy fallback
    const fuzzy = Object.entries(ROUTE_MAP).find(([key]) => 
      key.includes(trimmed) || trimmed.includes(key)
    );
    if (fuzzy) {
      navigate(fuzzy[1]);
      return { type: "navigate", target: fuzzy[0], raw: text };
    }

    return { type: "unknown", raw: text };
  }, [navigate]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast({ title: "Voice not supported", description: "Your browser doesn't support speech recognition.", variant: "destructive" });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
      setLastResult(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      setTranscript(final || interim);

      if (final) {
        setStatus("processing");
        const result = processCommand(final);
        setLastResult(result);

        if (result.type === "navigate") {
          toast({ title: "🎙️ Navigating", description: `Going to ${result.target}` });
        } else if (result.type === "search") {
          toast({ title: "🔍 Searching", description: `Looking for "${result.value}"` });
        } else if (result.type === "dictate") {
          toast({ title: "✏️ Typed", description: `"${result.value}"` });
        } else if (result.type === "send_message") {
          toast({ title: "💬 Message", description: `Opening inbox for ${result.target}` });
        } else if (result.type === "navigate_failed") {
          toast({ title: "🤔 Not found", description: `Couldn't find "${result.target}". Try: inbox, pipeline, prospects, scripts…`, variant: "destructive" });
        } else if (result.type === "send_script") {
          toast({ title: "📝 Script loaded", description: `"${result.value}" ready for ${result.target || "selected prospect"}` });
        } else if (result.type === "reply_to") {
          toast({ title: "💬 Opening chat", description: `Opening conversation with ${result.target}` });
        } else if (result.type === "send_script_failed") {
          toast({ title: "🤔 Script not found", description: `Try "send warm welcome to Sarah"`, variant: "destructive" });
        } else if (result.type === "reply_to_failed") {
          toast({ title: "🤔 Contact not found", description: `Couldn't find "${result.target}"`, variant: "destructive" });
        } else if (result.type === "analyze_stage") {
          toast({ title: "🎯 Analyzing", description: `AI analyzing ${result.target}'s stage…` });
        } else if (result.type === "analyze_stage_failed") {
          toast({ title: "🤔 Contact not found", description: `Couldn't find "${result.target}" to analyze`, variant: "destructive" });
        } else if (result.type === "unknown") {
          toast({ title: "🎙️ Heard you", description: `"${result.raw}" — try "go to inbox" or "search John"` });
        }

        setTimeout(() => setStatus("idle"), 2000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error !== "aborted") {
        setStatus("error");
        toast({ title: "Voice error", description: event.error === "not-allowed" ? "Microphone access denied" : `Error: ${event.error}`, variant: "destructive" });
        setTimeout(() => setStatus("idle"), 2000);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (status === "listening") {
        setStatus("idle");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, processCommand, status]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isSupported,
    status,
    transcript,
    lastResult,
    startListening,
    stopListening,
  };
}
