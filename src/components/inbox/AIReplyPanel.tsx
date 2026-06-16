import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, Loader2, Info } from "lucide-react";
import type { AISuggestion } from "@/components/inbox/types";

interface Props {
  suggestions: AISuggestion[];
  loading: boolean;
  error: string | null;
  canRequest: boolean;
  useDemo: boolean;
  demoReplies: { type: string; content: string }[];
  onRequest: () => void;
  onPick: (content: string) => void;
}

export function AIReplyPanel({ suggestions, loading, error, canRequest, useDemo, demoReplies, onRequest, onPick }: Props) {
  return (
    <div className="border-t border-border p-2 lg:p-4 shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Coaching</span>
        <span className="text-[10px] text-muted-foreground ml-auto"><Info className="h-3 w-3 inline mr-0.5" /> Never auto-sent</span>
      </div>

      {suggestions.length === 0 && !loading && (
        <Button variant="outline" size="sm" className="w-full mb-2 text-xs" onClick={onRequest} disabled={!canRequest}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Get AI Reply Suggestions
        </Button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-3 gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing conversation...
        </div>
      )}

      {error && (
        <div className="text-xs text-destructive text-center py-2 mb-1">
          {error}
          <Button variant="ghost" size="sm" className="ml-2 text-xs h-6" onClick={onRequest}>Retry</Button>
        </div>
      )}

      {suggestions.length > 0 && (
        <>
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-1">
            {suggestions.map((r, i) => (
              <button key={i} className="shrink-0 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium hover:bg-muted/50 transition-colors" onClick={() => onPick(r.content)}>
                {r.type}
              </button>
            ))}
          </div>
          <div className="hidden lg:grid gap-2">
            {suggestions.map((r, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors group cursor-pointer" onClick={() => onPick(r.content)}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" title="Copy"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.content); }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-foreground">{r.content}</p>
                <p className="text-[10px] text-muted-foreground mt-1 italic">💡 {r.coaching_note}</p>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-1.5 text-[10px] h-6" onClick={onRequest} disabled={loading}>
            <Sparkles className="h-3 w-3 mr-1" /> Regenerate
          </Button>
        </>
      )}

      {useDemo && suggestions.length === 0 && !loading && demoReplies.length > 0 && (
        <div className="hidden lg:grid gap-2 mt-2">
          {demoReplies.map((r, i) => (
            <div key={i} className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => onPick(r.content)}>
              <Badge variant="outline" className="text-[10px] mb-1">{r.type}</Badge>
              <p className="text-xs text-foreground">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
