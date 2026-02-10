"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSSE } from "@/lib/hooks/use-sse";
import { getStageName } from "@/lib/constants";

interface Escalation {
  id: string;
  project_id: string;
  level: string;
  category: string;
  status: string;
  title: string;
  description?: string | null;
  decision_notes?: string | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

interface Project {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: string;
  stage: string;
  status: string;
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
  SYSTEM_CONFLICT: "System Conflict",
  OTHER: "Other",
};

export default function EscalationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [escalation, setEscalation] = useState<Escalation | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [unpauseProject, setUnpauseProject] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEscalation = async () => {
    try {
      const response = await fetch(`/api/escalations/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setEscalation(data.escalation);
        setProject(data.project);
      }
    } catch (error) {
      console.error("Error fetching escalation:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchEscalation();
  }, [params.id]);

  const handleSSEMessage = useCallback((event: any) => {
    if (
      event.type === "escalation.resolved" ||
      event.type === "project.updated"
    ) {
      fetchEscalation();
    }
  }, []);

  useSSE("/api/events", { onMessage: handleSSEMessage });

  const handleResolve = async (status: "RESOLVED" | "HALTED") => {
    if (!escalation) return;

    const isL2OrL3 =
      escalation.level === "L2" || escalation.level === "L3";
    if (isL2OrL3 && !decisionNotes.trim()) {
      alert(
        `Decision notes are required when resolving ${escalation.level} escalations`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/escalations/${escalation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decision_notes: decisionNotes,
          unpause_project:
            escalation.level === "L3" && status === "RESOLVED"
              ? unpauseProject
              : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to resolve");
      }

      await fetchEscalation();
      setDecisionNotes("");
    } catch (error) {
      console.error("Error resolving escalation:", error);
      alert("Failed to resolve escalation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading escalation...</div>
      </div>
    );
  }

  if (!escalation) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Escalation not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/escalations")}
        >
          Back to Escalations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <button
        onClick={() => router.push("/dashboard/escalations")}
        className="text-sm text-slate-500 hover:text-primary transition"
      >
        &larr; Back to Escalations
      </button>

      {/* Escalation Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 text-sm font-bold rounded-full ${
                levelColors[escalation.level] || "bg-slate-100 text-slate-700"
              }`}
            >
              {escalation.level}
            </span>
            <span className="text-sm text-slate-500 font-medium">
              {categoryLabels[escalation.category] || escalation.category}
            </span>
          </div>
          <Badge
            variant={
              escalation.status === "OPEN"
                ? "warning"
                : escalation.status === "RESOLVED"
                ? "success"
                : "destructive"
            }
          >
            {escalation.status}
          </Badge>
        </div>

        <h2 className="text-2xl font-bold font-serif text-slate-900">
          {escalation.title}
        </h2>
        {escalation.description && (
          <p className="text-slate-600 mt-2">{escalation.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500">Created</p>
            <p className="font-semibold text-slate-900 mt-1 text-sm">
              {new Date(escalation.created_at).toLocaleString()}
            </p>
          </div>
          {escalation.resolved_at && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Resolved</p>
              <p className="font-semibold text-slate-900 mt-1 text-sm">
                {new Date(escalation.resolved_at).toLocaleString()}
                {escalation.resolved_by && (
                  <span className="text-slate-500">
                    {" "}
                    by {escalation.resolved_by}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {escalation.decision_notes && (
          <div className="mt-4 bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-xs font-semibold text-green-700 mb-1">
              Decision Notes
            </p>
            <p className="text-sm text-green-900">
              {escalation.decision_notes}
            </p>
          </div>
        )}
      </div>

      {/* Linked Project */}
      {project && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            Linked Project
          </h3>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-2 rounded"
            onClick={() => router.push(`/dashboard/projects/${project.id}`)}
          >
            <div>
              <p className="font-medium text-slate-900">
                {project.client_name || project.client_email}
              </p>
              <p className="text-sm text-slate-500">
                {getStageName(project.stage)} &middot;{" "}
                {project.tier.replace("TIER_", "Tier ")}
              </p>
            </div>
            <Badge
              variant={
                project.status === "ACTIVE"
                  ? "success"
                  : project.status === "PAUSED"
                  ? "warning"
                  : "secondary"
              }
            >
              {project.status}
            </Badge>
          </div>
        </div>
      )}

      {/* Resolve Form */}
      {escalation.status === "OPEN" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Resolve Escalation
          </h3>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="decision-notes"
                className="block font-semibold text-sm text-slate-700 mb-2"
              >
                Decision Notes
                {(escalation.level === "L2" ||
                  escalation.level === "L3") && (
                  <span className="text-red-500 ml-1">(required)</span>
                )}
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

            <div className="flex items-center gap-3">
              <Button
                variant="destructive"
                onClick={() => handleResolve("HALTED")}
                disabled={submitting}
              >
                Halt
              </Button>
              <Button
                variant="default"
                onClick={() => handleResolve("RESOLVED")}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Resolve"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
