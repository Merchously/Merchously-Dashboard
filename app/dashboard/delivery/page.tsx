"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pause,
  Package,
  Timer,
  MessageSquare,
} from "lucide-react";
import { useSSE } from "@/lib/hooks/use-sse";

interface SOPStep {
  id: string;
  project_id: string;
  step_key: string;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  expected_completion_at?: string | null;
  blockers: string;
  missing_inputs: string;
  notes?: string | null;
  step_name: string;
  step_order: number;
  expected_duration_hours: number;
}

interface DeliveryProject {
  id: string;
  client_email: string;
  client_name?: string;
  tier: string;
  stage: string;
  status: string;
  sop: {
    progress: SOPStep[];
    totalSteps: number;
    completedSteps: number;
    blockedSteps: number;
    inProgressSteps: number;
    completionPercent: number;
    driftingSteps: number;
  };
  responsiveness: {
    avgResponseHours: number | null;
    pendingRequests: number;
    totalRequests: number;
    respondedRequests: number;
  };
}

interface DeliverySummary {
  total: number;
  active: number;
  blocked: number;
  paused: number;
  withDrift: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  blocked: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-500",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  in_progress: Timer,
  blocked: AlertTriangle,
  completed: CheckCircle2,
  skipped: Pause,
};

const TIER_LABELS: Record<string, string> = {
  TIER_1: "Launch",
  TIER_2: "Growth",
  TIER_3: "Scale",
};

function safeJSONParse(str: string): string[] {
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

export default function DeliveryPage() {
  const [projects, setProjects] = useState<DeliveryProject[]>([]);
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const fetchData = () => {
    fetch("/api/delivery")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProjects(data.projects);
          setSummary(data.summary);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  useSSE("/api/events", {
    onMessage: (event: any) => {
      if (event.type === "sop.updated" || event.type === "project.updated") {
        fetchData();
      }
    },
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">
          Delivery Command Center
        </h2>
        <p className="text-muted-foreground mt-1">
          Track SOP progress, timeline drift, blockers, and client
          responsiveness across active deliveries.
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.total}</div>
              <p className="text-xs text-muted-foreground">Total Deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {summary.active}
              </div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {summary.blocked}
              </div>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">
                {summary.paused}
              </div>
              <p className="text-xs text-muted-foreground">Paused</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {summary.withDrift}
              </div>
              <p className="text-xs text-muted-foreground">Timeline Drift</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No active deliveries</p>
            <p className="text-sm mt-1">
              Projects in Onboarding or Delivery stages will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className={
                project.sop.driftingSteps > 0
                  ? "border-orange-300"
                  : project.status === "BLOCKED"
                    ? "border-red-300"
                    : ""
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">
                      {project.client_name || project.client_email}
                    </CardTitle>
                    <Badge variant="outline">
                      {TIER_LABELS[project.tier] || project.tier}
                    </Badge>
                    <Badge
                      variant={
                        project.status === "BLOCKED"
                          ? "destructive"
                          : project.status === "PAUSED"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {project.stage}
                    </Badge>
                    {project.sop.driftingSteps > 0 && (
                      <Badge
                        variant="outline"
                        className="text-orange-600 border-orange-300"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {project.sop.driftingSteps} drifting
                      </Badge>
                    )}
                    {project.sop.blockedSteps > 0 && (
                      <Badge
                        variant="outline"
                        className="text-red-600 border-red-300"
                      >
                        {project.sop.blockedSteps} blocked
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {project.responsiveness.avgResponseHours !== null && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        Avg {project.responsiveness.avgResponseHours}h response
                      </span>
                    )}
                    {project.responsiveness.pendingRequests > 0 && (
                      <Badge
                        variant="outline"
                        className="text-yellow-600 border-yellow-300"
                      >
                        {project.responsiveness.pendingRequests} awaiting client
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedProject(
                          expandedProject === project.id ? null : project.id
                        )
                      }
                    >
                      {expandedProject === project.id
                        ? "Collapse"
                        : "Expand"}
                    </Button>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-3 mt-2">
                  <Progress
                    value={project.sop.completionPercent}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-16 text-right">
                    {project.sop.completedSteps}/{project.sop.totalSteps}
                  </span>
                </div>
              </CardHeader>

              {expandedProject === project.id && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3">SOP Steps</h4>
                    <div className="space-y-2">
                      {project.sop.progress.map((step) => {
                        const Icon = statusIcons[step.status] || Clock;
                        const blockers = safeJSONParse(step.blockers);
                        const missingInputs = safeJSONParse(
                          step.missing_inputs
                        );
                        const isDrifting =
                          step.status === "in_progress" &&
                          step.expected_completion_at &&
                          new Date(step.expected_completion_at) < new Date();

                        return (
                          <div
                            key={step.step_key}
                            className={`flex items-start gap-3 p-3 rounded-lg ${
                              isDrifting
                                ? "bg-orange-50"
                                : step.status === "blocked"
                                  ? "bg-red-50"
                                  : step.status === "completed"
                                    ? "bg-green-50"
                                    : "bg-gray-50"
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 mt-0.5 ${
                                isDrifting
                                  ? "text-orange-500"
                                  : step.status === "blocked"
                                    ? "text-red-500"
                                    : step.status === "completed"
                                      ? "text-green-500"
                                      : step.status === "in_progress"
                                        ? "text-blue-500"
                                        : "text-gray-400"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {step.step_order}. {step.step_name}
                                </span>
                                <Badge
                                  className={`text-xs ${statusColors[step.status]}`}
                                >
                                  {step.status.replace("_", " ")}
                                </Badge>
                                {isDrifting && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-orange-600 border-orange-300"
                                  >
                                    OVERDUE
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span>
                                  Expected: {step.expected_duration_hours}h
                                </span>
                                {step.started_at && (
                                  <span>
                                    Started:{" "}
                                    {new Date(
                                      step.started_at
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                {step.completed_at && (
                                  <span>
                                    Completed:{" "}
                                    {new Date(
                                      step.completed_at
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                                {isDrifting && step.expected_completion_at && (
                                  <span className="text-orange-600 font-medium">
                                    Due:{" "}
                                    {new Date(
                                      step.expected_completion_at
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {blockers.length > 0 && (
                                <div className="mt-1">
                                  {blockers.map(
                                    (b: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs text-red-600 block"
                                      >
                                        Blocker: {b}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                              {missingInputs.length > 0 && (
                                <div className="mt-1">
                                  {missingInputs.map(
                                    (m: string, i: number) => (
                                      <span
                                        key={i}
                                        className="text-xs text-yellow-600 block"
                                      >
                                        Missing: {m}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                              {step.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {step.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
