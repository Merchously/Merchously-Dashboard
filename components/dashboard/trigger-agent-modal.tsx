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
import { AGENT_DISPLAY_NAMES } from "@/lib/constants";

interface TriggerAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  agentKey: string;
  onTriggered: () => void;
}

export function TriggerAgentModal({
  isOpen,
  onClose,
  projectId,
  agentKey,
  onTriggered,
}: TriggerAgentModalProps) {
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const agentName = AGENT_DISPLAY_NAMES[agentKey] || agentKey;

  const handleTrigger = async () => {
    setLoading(true);
    setError("");

    try {
      let parsedPayload = {};
      if (payload.trim()) {
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          setError("Invalid JSON payload");
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/projects/${projectId}/trigger-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_key: agentKey, payload: parsedPayload }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to trigger agent");
        return;
      }

      onTriggered();
      onClose();
      setPayload("");
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger {agentName}</DialogTitle>
          <DialogDescription>
            Send a trigger to this agent with optional additional data. The
            project context (email, tier, stage) is included automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Additional Payload (optional JSON)</Label>
            <Textarea
              placeholder='{"instructions": "Focus on pricing..."}'
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleTrigger} disabled={loading}>
            {loading ? "Triggering..." : "Trigger Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
