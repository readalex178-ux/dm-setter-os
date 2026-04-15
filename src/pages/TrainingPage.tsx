import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { demoTrainingScenarios } from "@/data/demo-data";
import { Target, Send, Bot, User, Sparkles, Loader2, ArrowLeft, RotateCcw, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@/hooks/use-speech-to-text";

interface ChatMsg {
  role: "user" | "ai-prospect";
  content: string;
}

export default function TrainingPage() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    grade: string;
    strengths: string[];
    improvements: string[];
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  const scenario = demoTrainingScenarios.find((s) => s.id === activeScenario);

  async function getAiReply(conversationHistory: ChatMsg[]) {
    setAiThinking(true);
    setError(null);
    try {
      const aiMessages = conversationHistory.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

      const { data, error: fnError } = await supabase.functions.invoke("training-chat", {
        body: {
          messages: aiMessages,
          scenario: scenario
            ? {
                name: scenario.name,
                description: scenario.description,
                difficulty: scenario.difficulty,
                personaType: scenario.personaType,
              }
            : null,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return data?.reply || "...";
    } catch (e: any) {
      console.error("Training AI error:", e);
      setError(e.message || "Failed to get AI response");
      return null;
    } finally {
      setAiThinking(false);
    }
  }

  async function getFeedback(conversationHistory: ChatMsg[]) {
    setFeedbackLoading(true);
    try {
      const convoText = conversationHistory
        .map((m) => `${m.role === "user" ? "Setter" : "Prospect"}: ${m.content}`)
        .join("\n");

      const { data, error: fnError } = await supabase.functions.invoke("suggest-replies", {
        body: {
          messages: conversationHistory.map((m) => ({
            sender: m.role === "user" ? "setter" : "prospect",
            content: m.content,
          })),
          prospect: {
            name: "Training Prospect",
            stage: scenario?.personaType || "Unknown",
            intentLevel: scenario?.difficulty || "Unknown",
            intentConfidence: 0,
            motivation: "Practice scenario",
            concerns: "N/A",
            callReadiness: 0,
            leadScore: 0,
          },
          feedbackMode: true,
        },
      });

      // Use a dedicated feedback call via training-chat with a feedback prompt
      const { data: fbData } = await supabase.functions.invoke("training-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `You are now a DM coaching expert. Analyze this practice conversation and provide feedback.

Conversation:
${convoText}

Scenario: ${scenario?.name} (${scenario?.difficulty}) — ${scenario?.description}

Respond with ONLY a JSON object (no markdown, no code blocks):
{"grade":"A/B/C/D","strengths":["point1","point2"],"improvements":["point1","point2","point3"],"summary":"One sentence overall assessment"}`,
            },
          ],
          scenario: {
            name: "Feedback Mode",
            description: "Provide coaching feedback",
            difficulty: "N/A",
            personaType: "Coach",
          },
        },
      });

      if (fbData?.reply) {
        try {
          // Try to parse JSON from the reply, handling potential markdown code blocks
          let jsonStr = fbData.reply.trim();
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          }
          const parsed = JSON.parse(jsonStr);
          setFeedback(parsed);
        } catch {
          setFeedback({
            grade: "B",
            strengths: ["Completed the conversation"],
            improvements: ["Keep practicing to improve"],
            summary: fbData.reply,
          });
        }
      }
    } catch (e) {
      console.error("Feedback error:", e);
      setFeedback({
        grade: "?",
        strengths: ["Conversation completed"],
        improvements: ["Unable to generate detailed feedback"],
        summary: "Practice makes perfect! Try again with a different approach.",
      });
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function startScenario(id: string) {
    setActiveScenario(id);
    setMessages([]);
    setCompleted(false);
    setFeedback(null);
    setTurnCount(0);
    setError(null);

    // Get AI's opening message
    const sc = demoTrainingScenarios.find((s) => s.id === id);
    setAiThinking(true);
    const { data, error: fnError } = await supabase.functions.invoke("training-chat", {
      body: {
        messages: [],
        scenario: sc
          ? {
              name: sc.name,
              description: sc.description,
              difficulty: sc.difficulty,
              personaType: sc.personaType,
            }
          : null,
      },
    });
    setAiThinking(false);

    if (data?.reply) {
      setMessages([{ role: "ai-prospect", content: data.reply }]);
    } else {
      setError(fnError?.message || data?.error || "Failed to start scenario");
    }
  }

  async function sendMessage() {
    if (!input.trim() || !activeScenario || aiThinking) return;
    const userMsg: ChatMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    // After 5+ user turns, allow ending
    if (newTurnCount >= 6) {
      setCompleted(true);
      getFeedback(newMessages);
      return;
    }

    const reply = await getAiReply(newMessages);
    if (reply) {
      setMessages([...newMessages, { role: "ai-prospect", content: reply }]);
    }
  }

  function endConversation() {
    setCompleted(true);
    getFeedback(messages);
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Training Mode</h1>
        <p className="text-sm text-muted-foreground">Practice DM conversations with AI prospects</p>
      </div>

      {!activeScenario ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoTrainingScenarios.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => startScenario(s.id)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" />
                  <Badge variant={
                    s.difficulty === "Beginner" ? "success" : s.difficulty === "Intermediate" ? "warning" : "destructive"
                  }>{s.difficulty}</Badge>
                </div>
                <h3 className="font-semibold mb-1">{s.name}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full">Start Practice</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="flex flex-col h-[500px]">
              <CardHeader className="pb-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{scenario?.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{scenario?.personaType} Prospect • Turn {turnCount}/6</p>
                  </div>
                  <div className="flex gap-2">
                    {turnCount >= 3 && !completed && (
                      <Button variant="outline" size="sm" onClick={endConversation}>
                        End & Get Feedback
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setActiveScenario(null); setFeedback(null); }}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Exit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`flex items-start gap-2 max-w-[80%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                          m.role === "user" ? "bg-primary/10" : "bg-muted"
                        }`}>
                          {m.role === "user" ? <User className="h-3.5 w-3.5 text-primary" /> : <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                        <div className={`rounded-xl px-3 py-2 text-sm ${
                          m.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  {aiThinking && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-2 max-w-[80%]">
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 bg-muted">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="rounded-xl px-3 py-2 text-sm bg-muted">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                {error && (
                  <p className="text-xs text-destructive text-center mb-2">{error}</p>
                )}
                {!completed ? (
                  <TrainingDictateButton input={input} setInput={setInput} aiThinking={aiThinking} sendMessage={sendMessage} />
                ) : (
                  <div className="text-center py-2">
                    <Badge variant="success" className="mb-2">Practice Complete</Badge>
                    <p className="text-xs text-muted-foreground">See AI feedback on the right →</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Feedback Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> AI Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {feedbackLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-muted-foreground text-xs">Analyzing your conversation...</p>
                </div>
              ) : feedback ? (
                <>
                  <div>
                    <Badge variant="score" className="text-lg px-3 py-1 mb-3">{feedback.grade}</Badge>
                    <p className="text-xs text-muted-foreground mb-3">{feedback.summary}</p>
                    <h4 className="font-semibold text-success mb-1">Strengths</h4>
                    <ul className="text-muted-foreground space-y-1">
                      {feedback.strengths.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-warning mb-1">Areas to Improve</h4>
                    <ul className="text-muted-foreground space-y-1">
                      {feedback.improvements.map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => startScenario(activeScenario!)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Try Again
                  </Button>
                </>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Complete the conversation to receive AI coaching feedback</p>
                  {turnCount >= 3 && !completed && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={endConversation}>
                      End & Get Feedback
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function TrainingDictateButton({ input, setInput, aiThinking, sendMessage }: {
  input: string; setInput: (v: string) => void; aiThinking: boolean; sendMessage: () => void;
}) {
  const { isListening, start, stop, isSupported } = useSpeechToText((t) => setInput(t));
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Type your response..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        disabled={aiThinking}
      />
      {isSupported && (
        <Button
          type="button"
          size="icon"
          variant={isListening ? "destructive" : "outline"}
          className={isListening ? "animate-pulse" : ""}
          onClick={isListening ? stop : start}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      )}
      <Button onClick={sendMessage} size="icon" disabled={aiThinking || !input.trim()}>
        {aiThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
