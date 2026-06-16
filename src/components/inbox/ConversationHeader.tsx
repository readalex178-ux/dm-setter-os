import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Phone, Target } from "lucide-react";
import { platformIcon, STAGES, type NormalizedProspect } from "@/components/inbox/types";

interface Props {
  sel: NormalizedProspect;
  isMobile: boolean;
  useDemo: boolean;
  onBack: () => void;
  onAnalyzeStage: () => void;
  onChangeStage: (stage: string) => void;
}

export function ConversationHeader({ sel, isMobile, useDemo, onBack, onAnalyzeStage, onChangeStage }: Props) {
  return (
    <div className="p-3 lg:p-4 border-b border-border flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0">
          <h2 className="font-semibold text-sm lg:text-base flex items-center gap-1.5 truncate">
            {platformIcon(sel.platform)} {sel.name}
          </h2>
          <p className="text-xs text-muted-foreground truncate">{sel.handle} • {sel.stage}</p>
        </div>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        {!useDemo ? (
          <Select value={sel.stage} onValueChange={onChangeStage}>
            <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAnalyzeStage} title="AI analyzes this prospect's stage">
          <Target className="h-3 w-3 mr-1" /> Analyze
        </Button>
        <Badge variant={sel.callReadiness >= 70 ? "success" : "warning"} className="text-xs hidden sm:inline-flex">
          <Phone className="h-3 w-3 mr-1" /> {sel.callReadiness}%
        </Badge>
      </div>
    </div>
  );
}
