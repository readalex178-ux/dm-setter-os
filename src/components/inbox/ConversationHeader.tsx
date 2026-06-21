import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, ExternalLink, Phone, Target, Trash2 } from "lucide-react";
import { platformIcon, STAGES, type NormalizedProspect } from "@/components/inbox/types";

interface Props {
  sel: NormalizedProspect;
  isMobile: boolean;
  useDemo: boolean;
  onBack: () => void;
  onAnalyzeStage: () => void;
  onChangeStage: (stage: string) => void;
  onDelete: () => void;
}

export function ConversationHeader({ sel, isMobile, useDemo, onBack, onAnalyzeStage, onChangeStage, onDelete }: Props) {
  const controls = (
    <>
      {!useDemo ? (
        <Select value={sel.stage} onValueChange={onChangeStage}>
          <SelectTrigger className="h-7 w-[140px] text-xs shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : null}
      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={onAnalyzeStage} title="AI analyzes this prospect's stage">
        <Target className="h-3 w-3 mr-1" /> Analyze
      </Button>
      <Badge variant={sel.callReadiness >= 70 ? "success" : "warning"} className="text-xs hidden sm:inline-flex shrink-0">
        <Phone className="h-3 w-3 mr-1" /> {sel.callReadiness}%
      </Badge>
      {!useDemo && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onDelete}
          title="Delete prospect"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </>
  );

  return (
    <div className="p-3 lg:p-4 border-b border-border space-y-2 lg:space-y-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isMobile && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm lg:text-base flex items-center gap-1.5 truncate">
              {platformIcon(sel.platform)} {sel.name}
              {sel.profileUrl && (
                <a
                  href={sel.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open profile"
                  className="text-muted-foreground hover:text-primary shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </h2>
            <p className="text-xs text-muted-foreground truncate">{sel.handle} • {sel.stage}</p>
          </div>
        </div>
        {/* Desktop: controls stay inline on the name's row since there's room. */}
        <div className="hidden lg:flex gap-2 items-center shrink-0">
          {controls}
        </div>
      </div>
      {/* Mobile: controls move to their own row instead of squeezing the
          fixed-width Stage dropdown + Analyze button into the name's row,
          which used to push the name down to near-zero width. */}
      <div className="flex lg:hidden gap-2 items-center overflow-x-auto pb-0.5">
        {controls}
      </div>
    </div>
  );
}
