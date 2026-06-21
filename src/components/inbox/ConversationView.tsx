import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Mic, MicOff, Copy, Trash2 } from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  onDeleteMessage: (id: string) => void;
  aiSuggestions: AISuggestion[];
  aiLoading: boolean;
  aiError: string | null;
  demoReplies: { type: string; content: string }[];
  onRequestAi: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const COMPOSER_MAX_HEIGHT = 150;

export function ConversationView(props: Props) {
  const {
    sel, messages, isMobile, useDemo, hidden, messageInput, setMessageInput, sending,
    onSend, onBack, onAnalyzeStage, onChangeStage, onDelete, onDeleteMessage, aiSuggestions, aiLoading, aiError,
    demoReplies, onRequestAi, messagesEndRef,
  } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the composer to fit its content (e.g. a long AI-suggested reply),
  // capped at COMPOSER_MAX_HEIGHT, beyond which it scrolls internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [messageInput]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  }

  return (
    <div className={`flex-1 flex flex-col min-w-0 ${hidden ? "hidden" : ""} lg:flex`}>
      <ConversationHeader sel={sel} isMobile={isMobile} useDemo={useDemo} onBack={onBack} onAnalyzeStage={onAnalyzeStage} onChangeStage={onChangeStage} onDelete={onDelete} />

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} isMobile={isMobile} onDelete={onDeleteMessage} />
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
        <div className="flex gap-2 max-w-2xl mx-auto items-end">
          <Textarea
            ref={textareaRef}
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[42px] max-h-[150px] resize-none text-sm overflow-y-auto"
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
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">Demo mode — connect a platform via the Chrome extension to send real messages</p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isMobile, onDelete }: { message: UIMessage; isMobile: boolean; onDelete: (id: string) => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isSetter = message.sender === "setter";

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    toast({ title: "Copied to clipboard" });
  }

  return (
    <>
      <div className={`flex ${isSetter ? "justify-end" : "justify-start"}`}>
        <div className={`group relative max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${isSetter ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {message.content}
          <div className="flex items-center justify-between gap-3 mt-1">
            <span className={`text-[10px] ${isSetter ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{message.time}</span>
            <div className={`flex items-center gap-0.5 transition-opacity ${isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Copy message"
                aria-label="Copy message"
                onClick={handleCopy}
                className={`h-5 w-5 ${isSetter ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/15" : "text-muted-foreground hover:text-foreground hover:bg-black/5"}`}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Delete message"
                aria-label="Delete message"
                onClick={() => setConfirmOpen(true)}
                className={`h-5 w-5 ${isSetter ? "text-primary-foreground/70 hover:text-red-200 hover:bg-white/15" : "text-muted-foreground hover:text-destructive hover:bg-black/5"}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the conversation. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete(message.id); setConfirmOpen(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialog>
    </>
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
