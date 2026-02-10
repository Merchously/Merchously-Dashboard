"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSSE } from "@/lib/hooks/use-sse";

interface Project {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: string;
  stage: string;
  status: string;
  icp_level?: string | null;
  sop_step_key?: string | null;
  blockers_json: any;
  created_at: string;
  updated_at: string;
}

interface Approval {
  id: string;
  stage_name: string;
  checkpoint_type: string;
  status: string;
  created_at: string;
  admin_comments?: string | null;
}

interface Escalation {
  id: string;
  level: string;
  category: string;
  status: string;
  title: string;
  description?: string | null;
  created_at: string;
}

const tierLabels: Record<string, string> = {
  TIER_1: "Launch",
  TIER_2: "Growth",
  TIER_3: "Scale",
};

const statusBadgeVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  BLOCKED: "destructive",
  COMPLETE: "secondary",
};

const PIPELINE_STAGES = [
  "LEAD",
  "QUALIFIED",
  "DISCOVERY",
  "FIT_DECISION",
  "PROPOSAL",
  "CLOSED",
  "ONBOARDING",
  "DELIVERY",
  "COMPLETE",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
        setApprovals(data.approvals || []);
        setEscalations(data.escalations || []);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchProject();
  }, [params.id]);

  const handleSSEMessage = useCallback(
    (event: any) => {
      if (
        event.type === "project.updated" ||
        event.type === "escalation.created" ||
        event.type === "escalation.resolved" ||
        event.type === "new_approval"
      ) {
        fetchProject();
      }
    },
    [params.id]
  );

  useSSE("/api/events", { onMessage: handleSSEMessage });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Project not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/projects")}
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  const currentStageIndex = PIPELINE_STAGES.indexOf(project.stage);
  const blockers = Array.isArray(project.blockers_json)
    ? project.blockers_json
    : [];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/projects")}
        className="text-sm text-slate-500 hover:text-primary transition"
      >
        &larr; Back to Projects
      </button>

      {/* Project Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold font-serif text-slate-900">
              {project.client_name || project.client_email}
            </h2>
            {project.client_name && (
              <p className="text-slate-600 mt-1">{project.client_email}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusBadgeVariants[project.status] || "secondary"}>
              {project.status}
            </Badge>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
              {tierLabels[project.tier] || project.tier}
            </span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Stage</p>
            <p className="font-semibold text-slate-900 mt-1">
              {project.stage.replace(/_/g, " ")}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">ICP Level</p>
            <p className="font-semibold text-slate-900 mt-1">
              {project.icp_level || "N/A"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">SOP Step</p>
            <p className="font-semibold text-slate-900 mt-1 text-sm">
              {project.sop_step_key?.replace(/_/g, " ") || "N/A"}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Created</p>
            <p className="font-semibold text-slate-900 mt-1 text-sm">
              {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stage Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Pipeline Progress
        </h3>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, index) => {
            const isActive = stage === project.stage;
            const isPast = index < currentStageIndex;
            return (
              <div key={stage} className="flex items-center">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-white"
                      : isPast
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {stage.replace(/_/g, " ")}
                </div>
                {index < PIPELINE_STAGES.length - 1 && (
                  <div
                    className={`w-4 h-0.5 mx-0.5 ${
                      isPast ? "bg-green-300" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blockers */}
      {blockers.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-3">Blockers</h3>
          <ul className="space-y-2">
            {blockers.map((blocker: string, i: number) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-red-800"
              >
                <span className="text-red-500 mt-0.5">&#x2022;</span>
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Linked Escalations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Escalations ({escalations.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-200">
          {escalations.length === 0 ? (
            <p className="px-6 py-8 text-center text-slate-500">
              No escalations
            </p>
          ) : (
            escalations.map((esc) => (
              <div key={esc.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        esc.level === "L3"
                          ? "bg-red-100 text-red-700"
                          : esc.level === "L2"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {esc.level}
                    </span>
                    <span className="font-medium text-slate-900">
                      {esc.title}
                    </span>
                  </div>
                  <Badge
                    variant={
                      esc.status === "OPEN"
                        ? "warning"
                        : esc.status === "RESOLVED"
                        ? "success"
                        : "destructive"
                    }
                  >
                    {esc.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Linked Approvals */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">
            Approval History ({approvals.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-200">
          {approvals.length === 0 ? (
            <p className="px-6 py-8 text-center text-slate-500">
              No approvals yet
            </p>
          ) : (
            approvals.map((approval) => (
              <div key={approval.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {approval.stage_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(approval.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      approval.status === "approved"
                        ? "success"
                        : approval.status === "rejected"
                        ? "destructive"
                        : "warning"
                    }
                  >
                    {approval.status}
                  </Badge>
                </div>
                {approval.admin_comments && (
                  <p className="text-sm text-slate-600 mt-2 italic">
                    &ldquo;{approval.admin_comments}&rdquo;
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
