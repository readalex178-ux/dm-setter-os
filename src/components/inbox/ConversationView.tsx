import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { ConversationHeader } from "@/components/inbox/ConversationHeader";
import { AIReplyPanel } from "@/components/inbox/AIReplyPanel";
import type { NormalizedProspect, UIMessage, AISuggestion } from "@/components/inbox/types";

interface Props {
  sel: NormalizedProspect;
  messages: UIMessage[];
  isMobile: boolean;
  useDemo: boolean;
  hidden?: boolean;
  messageInput: string;
  setMessageInput: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onBack: () => void;
  onAnalyzeStage: () => void;
  onChangeStage: (s: string) => void;
  onDelete: () => void;
  aiSuggestions: AISuggestion[];
  aiLoading: boolean;
  aiError: string | null;
  demoReplies: { type: string; content: string }[];
  onRequestAi: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ConversationView(props: Props) {
  const {
    sel, messages, isMobile, useDemo, hidden, messageInput, setMessageInput, sending,
    onSend, onBack, onAnalyzeStage, onChangeStage, onDelete, aiSuggestions, aiLoading, aiError,
    demoReplies, onRequestAi, messagesEndRef,
  } = props;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${hidden ? "hidden" : ""} lg:flex`}>
      <ConversationHeader sel={sel} isMobile={isMobile} useDemo={useDemo} onBack={onBack} onAnalyzeStage={onAnalyzeStage} onChangeStage={onChangeStage} onDelete={onDelete} />

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender === "setter" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.sender === "setter" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                {m.content}
                <div className={`text-[10px] mt-1 ${m.sender === "setter" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <AIReplyPanel
        suggestions={aiSuggestions}
        loading={aiLoading}
        error={aiError}
        canRequest={messages.length > 0}
        useDemo={useDemo}
        demoReplies={demoReplies}
        onRequest={onRequestAi}
        onPick={setMessageInput}
      />

      <div className="border-t border-border p-2 lg:p-4 shrink-0">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Textarea
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[42px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <DictateButton onText={setMessageInput} />
          <Button onClick={onSend} disabled={!messageInput.trim() || sending} size="icon" className="shrink-0 h-[42px] w-[42px]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {!useDemo && sel.platform && (
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">Sends via {sel.platform} • You are in control of every message</p>
        )}
        {useDemo && (
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">Demo mode — connect an account in Integrations to send real messages</p>
        )}
      </div>
    </div>
  );
}

function DictateButton({ onText }: { onText: (text: string) => void }) {
  const { isListening, start, stop, isSupported } = useSpeechToText(onText);
  if (!isSupported) return null;
  return (
    <Button type="button" size="icon" variant={isListening ? "destructive" : "outline"}
      className={`shrink-0 h-[42px] w-[42px] ${isListening ? "animate-pulse" : ""}`}
      onClick={isListening ? stop : start}>
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
