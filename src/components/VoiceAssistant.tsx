import { useVoiceCommand, VoiceCommandStatus } from "@/hooks/use-voice-command";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<VoiceCommandStatus, { color: string; pulse: boolean; label: string }> = {
  idle: { color: "bg-primary hover:bg-primary/90", pulse: false, label: "Voice Command" },
  listening: { color: "bg-red-500 hover:bg-red-600", pulse: true, label: "Listening…" },
  processing: { color: "bg-amber-500", pulse: false, label: "Processing…" },
  error: { color: "bg-destructive", pulse: false, label: "Error" },
};

export function VoiceAssistant() {
  const { isSupported, status, transcript, startListening, stopListening } = useVoiceCommand();

  if (!isSupported) return null;

  const config = statusConfig[status];
  const isActive = status === "listening";

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col items-end gap-2">
      {/* Transcript bubble */}
      {(status === "listening" || status === "processing") && transcript && (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg max-w-[240px] animate-in fade-in slide-in-from-bottom-2">
          <p className="text-xs text-muted-foreground mb-0.5">{config.label}</p>
          <p className="text-sm font-medium text-foreground">"{transcript}"</p>
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={isActive ? stopListening : startListening}
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all",
          config.color,
          config.pulse && "animate-pulse"
        )}
        title={config.label}
      >
        {status === "processing" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isActive ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
