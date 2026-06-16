import { useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInbox } from "@/hooks/useInbox";
import { EmptyState } from "@/components/EmptyState";
import { StageAnalysisDialog } from "@/components/StageAnalysisDialog";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationView } from "@/components/inbox/ConversationView";
import { ConversationInsights } from "@/components/inbox/ConversationInsights";
import { ConversationReviewDialog } from "@/components/inbox/ConversationReviewDialog";

export default function InboxPage() {
  const inbox = useInbox();
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const {
    isMobile, showChat, setShowChat, search, setSearch, messageInput, setMessageInput,
    sending, useDemo, loaded, aiSuggestions, aiLoading, aiError, scoring, messagesEndRef,
    selectedId, selectProspect, filtered, sel, messages, replies, dbProspectsEmpty,
    handleSend, fetchAiSuggestions, scoreConversation, applyStage,
  } = inbox;

  if (!loaded) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (dbProspectsEmpty) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Connect Instagram/Facebook, sync with the Chrome extension, or add a prospect from the Dashboard. Your live conversations and AI reply suggestions will appear here."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
      </div>
    );
  }

  if (!sel) return null;

  const mobileShowList = isMobile && !showChat;
  const mobileShowChat = isMobile && showChat;

  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row overflow-hidden bg-background">
      <ConversationList
        search={search}
        setSearch={setSearch}
        filtered={filtered}
        useDemo={useDemo}
        selectedId={selectedId}
        onSelect={selectProspect}
        hidden={mobileShowChat}
      />

      <ConversationView
        sel={sel}
        messages={messages}
        isMobile={isMobile}
        useDemo={useDemo}
        hidden={mobileShowList}
        messageInput={messageInput}
        setMessageInput={setMessageInput}
        sending={sending}
        onSend={handleSend}
        onBack={() => setShowChat(false)}
        onAnalyzeStage={() => setStageDialogOpen(true)}
        onChangeStage={(s) => applyStage(s)}
        aiSuggestions={aiSuggestions}
        aiLoading={aiLoading}
        aiError={aiError}
        demoReplies={replies}
        onRequestAi={fetchAiSuggestions}
        messagesEndRef={messagesEndRef}
      />

      <ConversationInsights
        sel={sel}
        prospectId={selectedId}
        useDemo={useDemo}
        scoring={scoring}
        onScore={scoreConversation}
        onReview={() => setReviewOpen(true)}
      />

      <StageAnalysisDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        prospectId={selectedId}
        prospectName={sel.name}
        currentStage={sel.stage}
        prospect={{
          name: sel.name, stage: sel.stage, currentJob: sel.currentJob,
          incomeGoal: sel.incomeGoal, motivation: sel.motivation, concerns: sel.concerns,
        }}
        messages={messages.map((m) => ({ sender: m.sender || "prospect", content: m.content || "" }))}
        onApply={async (newStage) => {
          if (useDemo || !selectedId) return;
          const { error } = await supabase.from("prospects").update({ stage: newStage }).eq("id", selectedId);
          if (error) throw error;
          await applyStage(newStage);
        }}
      />

      <ConversationReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        prospectId={selectedId}
        prospectName={sel.name}
      />
    </div>
  );
}
