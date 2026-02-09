"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApprovalCardProps {
  id: string;
  client_email: string;
  stage_name: string;
  checkpoint_type: string;
  status: "pending" | "approved" | "rejected" | "edited";
  created_at: string;
  onReview: (id: string) => void;
}

const checkpointLabels: Record<string, string> = {
  proposal_review: "Proposal Review",
  discovery_summary: "Discovery Summary",
  tier_execution: "Tier Execution",
  quality_check: "Quality Check",
};

const statusColors: Record<string, "success" | "warning" | "destructive" | "pending"> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  edited: "pending",
};

export function ApprovalCard({
  id,
  client_email,
  stage_name,
  checkpoint_type,
  status,
  created_at,
  onReview,
}: ApprovalCardProps) {
  const checkpointLabel = checkpointLabels[checkpoint_type] || checkpoint_type;

  return (
    <div className="px-6 py-4 hover:bg-slate-50 transition border-b border-slate-200 last:border-b-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant={statusColors[status] || "pending"}>
              {checkpointLabel}
            </Badge>
            <h4 className="font-semibold text-slate-900">{stage_name}</h4>
          </div>
          <p className="text-sm text-slate-600">{client_email}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{new Date(created_at).toLocaleDateString()}</span>
            <span>•</span>
            <span>{new Date(created_at).toLocaleTimeString()}</span>
          </div>
        </div>
        <div>
          {status === "pending" ? (
            <Button onClick={() => onReview(id)} size="sm">
              Review
            </Button>
          ) : (
            <Badge variant={statusColors[status]}>{status}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
