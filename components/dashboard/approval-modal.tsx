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
import { Badge } from "@/components/ui/badge";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  approval: {
    id: string;
    client_email: string;
    stage_name: string;
    checkpoint_type: string;
    agent_payload: any;
    agent_response: any;
    status: string;
    created_at: string;
  } | null;
  onApprove: (id: string, comments: string) => Promise<void>;
  onReject: (id: string, comments: string) => Promise<void>;
}

export function ApprovalModal({
  isOpen,
  onClose,
  approval,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);

  if (!approval) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(approval.id, comments);
      setComments("");
      onClose();
    } catch (error) {
      console.error("Error approving:", error);
      alert("Failed to approve. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert("Please provide a reason for rejection");
      return;
    }
    setLoading(true);
    try {
      await onReject(approval.id, comments);
      setComments("");
      onClose();
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Failed to reject. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-2xl">{approval.stage_name}</DialogTitle>
            <Badge variant="warning">{approval.checkpoint_type.replace("_", " ")}</Badge>
          </div>
          <DialogDescription>
            {approval.client_email} • {new Date(approval.created_at).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Agent Response */}
          <div>
            <h3 className="font-semibold text-sm text-slate-700 mb-2">
              Agent Output
            </h3>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                {JSON.stringify(approval.agent_response, null, 2)}
              </pre>
            </div>
          </div>

          {/* Agent Input (optional) */}
          {approval.agent_payload && (
            <details className="group">
              <summary className="font-semibold text-sm text-slate-700 cursor-pointer hover:text-primary">
                View Input Data
              </summary>
              <div className="mt-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {JSON.stringify(approval.agent_payload, null, 2)}
                </pre>
              </div>
            </details>
          )}

          {/* Admin Comments */}
          <div>
            <label
              htmlFor="comments"
              className="block font-semibold text-sm text-slate-700 mb-2"
            >
              Comments (optional)
            </label>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add notes or feedback..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            Reject
          </Button>
          <Button
            variant="default"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
