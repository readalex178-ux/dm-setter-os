import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { demoTrainingScenarios } from "@/data/demo-data";
import { Target, Send, Bot, User, Sparkles } from "lucide-react";

interface ChatMsg {
  role: "user" | "ai-prospect";
  content: string;
}

const aiResponses: Record<string, string[]> = {
  ts1: [
    "Hey... thanks I guess? Lol. What do you actually do?",
    "Hmm interesting. How does it work exactly?",
    "I mean sounds cool but how do I know it's not just another scam?",
    "Ok fair enough. So what would someone like me need to do?",
  ],
  ts2: [
    "Hey! Yeah I downloaded it, the guide was pretty helpful actually",
    "I've been wanting to make money online for a while but never found the right thing",
    "What kind of income are people making with this?",
    "That sounds good but I'm a bit worried about the time commitment honestly",
  ],
  ts3: [
    "Look, I've been burned before by these 'online business' things. What makes yours different?",
    "I need proof. Can you show me actual results from real people?",
    "Fine, but how much does it actually cost? People always hide the real price.",
    "I need to think about it. Send me something I can review on my own time.",
  ],
};

export default function TrainingPage() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [aiMsgIndex, setAiMsgIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const startScenario = (id: string) => {
    const responses = aiResponses[id] || aiResponses.ts1;
    setActiveScenario(id);
    setMessages([{ role: "ai-prospect", content: responses[0] }]);
    setAiMsgIndex(1);
    setCompleted(false);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeScenario) return;
    const newMessages: ChatMsg[] = [...messages, { role: "user", content: input }];
    setInput("");

    const responses = aiResponses[activeScenario] || aiResponses.ts1;
    if (aiMsgIndex < responses.length) {
      setTimeout(() => {
        setMessages([...newMessages, { role: "ai-prospect", content: responses[aiMsgIndex] }]);
        setAiMsgIndex((i) => i + 1);
      }, 800);
    } else {
      setCompleted(true);
    }
    setMessages(newMessages);
  };

  const scenario = demoTrainingScenarios.find((s) => s.id === activeScenario);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Training Mode</h1>
        <p className="text-sm text-muted-foreground">Practice DM conversations with AI prospects</p>
      </div>

      {!activeScenario ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoTrainingScenarios.map((s) => (
            <Card key={s.id} className="hover:glow-sm transition-all cursor-pointer" onClick={() => startScenario(s.id)}>
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
                    <p className="text-xs text-muted-foreground">{scenario?.personaType} Prospect</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveScenario(null)}>Exit</Button>
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
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                {!completed ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your response..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="icon"><Send className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Badge variant="success" className="mb-2">Practice Complete</Badge>
                    <p className="text-xs text-muted-foreground">See feedback on the right →</p>
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
              {completed ? (
                <>
                  <div>
                    <Badge variant="score" className="text-lg px-3 py-1 mb-3">B+</Badge>
                    <h4 className="font-semibold text-success mb-1">Strengths</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Good conversational tone</li>
                      <li>• Asked relevant follow-up questions</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-warning mb-1">Improve</h4>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Try addressing concerns earlier</li>
                      <li>• Use more acknowledgement before questions</li>
                      <li>• Look for call transition opportunities</li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Complete the conversation to receive feedback</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
