"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FitDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  clientName?: string;
  onDecision: (decision: "pass" | "fail", notes: string, icpLevel?: string) => void;
}

export function FitDecisionModal({
  isOpen,
  onClose,
  projectId,
  clientName,
  onDecision,
}: FitDecisionModalProps) {
  const [decision, setDecision] = useState<"pass" | "fail" | "">("");
  const [notes, setNotes] = useState("");
  const [icpLevel, setIcpLevel] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!decision) {
      setError("Fit assessment is required");
      return;
    }
    if (!notes.trim()) {
      setError("Decision rationale is required — this is a human-owned decision checkpoint");
      return;
    }

    onDecision(decision, notes.trim(), icpLevel || undefined);
    onClose();
    setDecision("");
    setNotes("");
    setIcpLevel("");
    setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Internal Fit Decision</DialogTitle>
          <DialogDescription>
            Assess whether {clientName || "this client"} is a fit before creating
            a proposal. This decision affects scope and revenue — it is
            human-owned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fit Assessment</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as "pass" | "fail")}>
              <SelectTrigger>
                <SelectValue placeholder="Select assessment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass — proceed to proposal</SelectItem>
                <SelectItem value="fail">Fail — do not proceed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ICP Level Confirmation</Label>
            <Select value={icpLevel} onValueChange={setIcpLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Confirm ICP level (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A — Ideal fit</SelectItem>
                <SelectItem value="B">B — Good fit with caveats</SelectItem>
                <SelectItem value="C">C — Marginal fit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Decision Rationale (required)</Label>
            <Textarea
              placeholder="Why is this client a fit or not? Consider: budget, power, intent, ICP alignment, risk flags..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {decision === "fail" ? (
            <Button variant="destructive" onClick={handleSubmit}>
              Reject — No Proposal
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!decision}>
              Approve — Create Proposal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
