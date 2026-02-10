"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getStageName } from "@/lib/constants";

interface ProjectCardProps {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: string;
  stage: string;
  status: string;
  created_at: string;
  onClick: (id: string) => void;
}

const tierLabels: Record<string, string> = {
  TIER_1: "Launch",
  TIER_2: "Growth",
  TIER_3: "Scale",
};

const tierColors: Record<string, string> = {
  TIER_1: "bg-blue-100 text-blue-700",
  TIER_2: "bg-purple-100 text-purple-700",
  TIER_3: "bg-amber-100 text-amber-700",
};

const statusBorderColors: Record<string, string> = {
  ACTIVE: "border-l-green-500",
  PAUSED: "border-l-yellow-500",
  BLOCKED: "border-l-red-500",
  COMPLETE: "border-l-slate-400",
};

const statusBadgeVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  BLOCKED: "destructive",
  COMPLETE: "secondary",
};

export function ProjectCard({
  id,
  client_email,
  client_name,
  tier,
  stage,
  status,
  created_at,
  onClick,
}: ProjectCardProps) {
  return (
    <Card
      onClick={() => onClick(id)}
      className={`border-l-4 ${
        statusBorderColors[status] || "border-l-slate-300"
      } cursor-pointer hover:shadow-md transition`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">
              {client_name || client_email}
            </CardTitle>
            {client_name && (
              <CardDescription className="truncate">
                {client_email}
              </CardDescription>
            )}
          </div>
          <span
            className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
              tierColors[tier] || "bg-slate-100 text-slate-700"
            }`}
          >
            {tierLabels[tier] || tier}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariants[status] || "secondary"}>
            {status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {getStageName(stage)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
