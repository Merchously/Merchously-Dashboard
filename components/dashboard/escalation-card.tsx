"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EscalationCardProps {
  id: string;
  title: string;
  level: string;
  category: string;
  status: string;
  description?: string | null;
  created_at: string;
  onResolve: (id: string) => void;
}

const levelColors: Record<string, string> = {
  L1: "bg-blue-100 text-blue-700",
  L2: "bg-yellow-100 text-yellow-700",
  L3: "bg-red-100 text-red-700",
};

const categoryLabels: Record<string, string> = {
  FINANCIAL: "Financial",
  SCOPE: "Scope",
  LEGAL_BRAND: "Legal/Brand",
  RELATIONSHIP: "Relationship",
  SYSTEM_CONFLICT: "System",
  OTHER: "Other",
};

const statusBadgeVariants: Record<string, "warning" | "success" | "destructive"> = {
  OPEN: "warning",
  RESOLVED: "success",
  HALTED: "destructive",
};

export function EscalationCard({
  id,
  title,
  level,
  category,
  status,
  description,
  created_at,
  onResolve,
}: EscalationCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                levelColors[level] || "bg-slate-100 text-slate-700"
              }`}
            >
              {level}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {categoryLabels[category] || category}
            </span>
            <Badge
              variant={statusBadgeVariants[status] || "secondary"}
              className="ml-auto"
            >
              {status}
            </Badge>
          </div>
          <h4 className="font-semibold text-slate-900 mt-2">{title}</h4>
          {description && (
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {description}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {new Date(created_at).toLocaleDateString()}{" "}
            {new Date(created_at).toLocaleTimeString()}
          </p>
        </div>
        {status === "OPEN" && (
          <Button
            onClick={() => onResolve(id)}
            size="sm"
            variant="outline"
            className="ml-3 flex-shrink-0"
          >
            Resolve
          </Button>
        )}
      </div>
    </div>
  );
}
