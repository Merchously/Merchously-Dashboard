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

interface EscalationResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  escalation: {
    id: string;
    title: string;
    level: string;
    category: string;
    description?: string | null;
    project_id: string;
  } | null;
  onResolve: (
    id: string,
    data: {
      status: "RESOLVED" | "HALTED";
      decision_notes: string;
      unpause_project?: boolean;
    }
  ) => Promise<void>;
}

export function EscalationResolveModal({
  isOpen,
  onClose,
  escalation,
  onResolve,
}: EscalationResolveModalProps) {
  const [decisionNotes, setDecisionNotes] = useState("");
  const [unpauseProject, setUnpauseProject] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!escalation) return null;

  const isL2OrL3 =
    escalation.level === "L2" || escalation.level === "L3";

  const handleResolve = async (status: "RESOLVED" | "HALTED") => {
    if (isL2OrL3 && !decisionNotes.trim()) {
      alert(
        `Decision notes are required when resolving ${escalation.level} escalations`
      );
      return;
    }

    setLoading(true);
    try {
      await onResolve(escalation.id, {
        status,
        decision_notes: decisionNotes,
        unpause_project:
          escalation.level === "L3" && status === "RESOLVED"
            ? unpauseProject
            : undefined,
      });
      setDecisionNotes("");
      setUnpauseProject(false);
      onClose();
    } catch (error) {
      console.error("Error resolving escalation:", error);
      alert("Failed to resolve escalation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve Escalation</DialogTitle>
          <DialogDescription>
            {escalation.level} — {escalation.category.replace("_", " ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-slate-700">
              {escalation.title}
            </h4>
            {escalation.description && (
              <p className="text-sm text-slate-600 mt-1">
                {escalation.description}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="decision-notes"
              className="block font-semibold text-sm text-slate-700 mb-2"
            >
              Decision Notes{isL2OrL3 ? " (required)" : ""}
            </label>
            <Textarea
              id="decision-notes"
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Explain the resolution decision..."
              rows={4}
              className="resize-none"
            />
          </div>

          {escalation.level === "L3" && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={unpauseProject}
                onChange={(e) => setUnpauseProject(e.target.checked)}
                className="rounded border-slate-300"
              />
              Unpause linked project after resolution
            </label>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={() => handleResolve("HALTED")}
            disabled={loading}
          >
            Halt
          </Button>
          <Button
            variant="default"
            onClick={() => handleResolve("RESOLVED")}
            disabled={loading}
          >
            {loading ? "Processing..." : "Resolve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
