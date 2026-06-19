import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, UserPlus } from "lucide-react";
import { useAddProspect } from "@/hooks/useSetterData";
import { useToast } from "@/hooks/use-toast";
import type { DBProspect } from "@/components/inbox/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded?: (prospect: DBProspect) => void;
}

export function AddProspectDialog({ open, onOpenChange, onAdded }: Props) {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const addProspect = useAddProspect();
  const { toast } = useToast();

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      const prospect = await addProspect.mutateAsync({ name: name.trim(), handle: handle.trim() || undefined });
      toast({ title: "Prospect added", description: `${name} added to New Leads.` });
      setName("");
      setHandle("");
      onAdded?.(prospect as DBProspect);
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Could not add prospect", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Quick Add Prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input placeholder="e.g. Sarah Mitchell" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Handle</Label>
            <Input placeholder="e.g. @sarahmitchell_fit" value={handle} onChange={(e) => setHandle(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim() || addProspect.isPending} onClick={handleAdd}>
            {addProspect.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />} Add to New Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
