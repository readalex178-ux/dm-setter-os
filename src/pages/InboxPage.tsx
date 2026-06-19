import { useState } from "react";
import { Loader2, MessageCircle, UserPlus } from "lucide-react";

import { useInbox } from "@/hooks/useInbox";
import { AddProspectDialog } from "@/components/AddProspectDialog";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { StageAnalysisDialog } from "@/components/StageAnalysisDialog";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ConversationView } from "@/components/inbox/ConversationView";
import { ConversationInsights } from "@/components/inbox/ConversationInsights";
import { ConversationReviewDialog } from "@/components/inbox/ConversationReviewDialog";
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

export default function InboxPage() {
  const inbox = useInbox();
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const {
    isMobile, showChat, setShowChat, search, setSearch, messageInput, setMessageInput,
    sending, useDemo, loaded, aiSuggestions, aiLoading, aiError, scoring, messagesEndRef,
    selectedId, selectProspect, filtered, sel, messages, replies, dbProspectsEmpty,
    handleSend, deleteProspect, confirmDelete, cancelDelete, showDeleteConfirm,
    fetchAiSuggestions, scoreConversation, applyStage,
    showAddProspect, setShowAddProspect, handleProspectAdded,
  } = inbox;

  if (!loaded) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (dbProspectsEmpty) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <Button size="sm" variant="outline" onClick={() => setShowAddProspect(true)}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Prospect
          </Button>
        </div>
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Connect Instagram/Facebook, sync with the Chrome extension, or add a prospect from the Dashboard. Your live conversations and AI reply suggestions will appear here."
          actionLabel="Go to Dashboard"
          actionTo="/app"
        />
        <AddProspectDialog open={showAddProspect} onOpenChange={setShowAddProspect} onAdded={handleProspectAdded} />
      </div>
    );
  }

  if (!sel) return null;

  const mobileShowList = isMobile && !showChat;
  const mobileShowChat = isMobile && showChat;

  return (
    <>
      <div className="flex h-full min-h-0 flex-col lg:flex-row overflow-hidden bg-background">
        <ConversationList
          search={search}
          setSearch={setSearch}
          filtered={filtered}
          useDemo={useDemo}
          selectedId={selectedId}
          onSelect={selectProspect}
          hidden={mobileShowChat}
          onAddProspect={() => setShowAddProspect(true)}
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
          onDelete={deleteProspect}
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
          onApply={async (newStage) => { await applyStage(newStage); }}
        />

        <ConversationReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          prospectId={selectedId}
          prospectName={sel.name}
        />

        <AddProspectDialog open={showAddProspect} onOpenChange={setShowAddProspect} onAdded={handleProspectAdded} />
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {sel?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this prospect and all their messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
