"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSSE } from "@/lib/hooks/use-sse";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StageActions } from "@/components/dashboard/stage-actions";
import { TriggerAgentModal } from "@/components/dashboard/trigger-agent-modal";
import { CreateEscalationModal } from "@/components/dashboard/create-escalation-modal";
import { FitDecisionModal } from "@/components/dashboard/fit-decision-modal";
import { PIPELINE_STAGES, TIER_LABELS, getStageName } from "@/lib/constants";

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
  decision_maker?: string | null;
  trust_score?: number | null;
  assigned_sales_lead?: string | null;
  assigned_delivery_lead?: string | null;
  created_at: string;
  updated_at: string;
}

interface Approval {
  id: string;
  stage_name: string;
  checkpoint_type: string;
  agent_key: string;
  status: string;
  sent_at?: string | null;
  created_at: string;
  admin_comments?: string | null;
}

interface ClientIntel {
  confidence_score?: number;
  red_flags?: string[];
  opportunities?: string[];
  discovery_summary?: string;
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

interface Note {
  id: string;
  author: string;
  content: string;
  note_type: string;
  created_at: string;
}

const statusBadgeVariants: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  ACTIVE: "success",
  PAUSED: "warning",
  BLOCKED: "destructive",
  COMPLETE: "secondary",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [clientIntel, setClientIntel] = useState<ClientIntel | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [triggerAgentKey, setTriggerAgentKey] = useState<string | null>(null);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showFitDecisionModal, setShowFitDecisionModal] = useState(false);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.project);
        setApprovals(data.approvals || []);
        setEscalations(data.escalations || []);
        setNotes(data.notes || []);

        // Fetch client intelligence from Airtable (M2)
        if (data.project?.client_email) {
          fetch(`/api/clients/${encodeURIComponent(data.project.client_email)}`)
            .then((r) => r.json())
            .then((clientData) => {
              if (clientData.success && clientData.client) {
                setClientIntel({
                  confidence_score: clientData.client.confidence_score,
                  red_flags: clientData.client.red_flags,
                  opportunities: clientData.client.opportunities,
                  discovery_summary: clientData.client.discovery_summary,
                });
              }
            })
            .catch(() => {}); // Airtable may not be configured
        }
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
        event.type === "new_approval" ||
        event.type === "project.note_added" ||
        event.type === "agent.triggered"
      ) {
        fetchProject();
      }
    },
    [params.id]
  );

  useSSE("/api/events", { onMessage: handleSSEMessage });

  const handleAdvanceStage = async (nextStage: string, extra?: { fit_decision_notes?: string }) => {
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage, ...extra }),
      });
      if (res.ok) await fetchProject();
    } catch (error) {
      console.error("Error advancing stage:", error);
    }
  };

  const handleFitDecision = async (decision: "pass" | "fail", notes: string, icpLevel?: string) => {
    if (decision === "pass") {
      // Advance to PROPOSAL with required fit decision notes
      const extra: any = { fit_decision_notes: notes };
      if (icpLevel) extra.icp_level = icpLevel;
      await handleAdvanceStage("PROPOSAL", extra);
    } else {
      // Fail — don't advance, just record the decision as a note
      try {
        await fetch(`/api/projects/${params.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Fit Decision: REJECTED — ${notes}`,
            note_type: "instruction",
          }),
        });
        await fetchProject();
      } catch (error) {
        console.error("Error recording fit decision:", error);
      }
    }
  };

  const handleMarkProposalSent = async (approvalId: string) => {
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_sent: true }),
      });
      if (res.ok) await fetchProject();
    } catch (error) {
      console.error("Error marking proposal sent:", error);
    }
  };

  const handleTogglePause = async () => {
    if (!project) return;
    const newStatus = project.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    try {
      const res = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) await fetchProject();
    } catch (error) {
      console.error("Error toggling pause:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
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

  const currentStageIndex = PIPELINE_STAGES.indexOf(
    project.stage as (typeof PIPELINE_STAGES)[number]
  );
  const blockers = Array.isArray(project.blockers_json)
    ? project.blockers_json
    : [];

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold font-serif">
                {project.client_name || project.client_email}
              </h2>
              {project.client_name && (
                <p className="text-muted-foreground mt-1">
                  {project.client_email}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={statusBadgeVariants[project.status] || "secondary"}
              >
                {project.status}
              </Badge>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                {TIER_LABELS[project.tier] || project.tier}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Stage</p>
              <p className="font-semibold mt-1">
                {getStageName(project.stage)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">ICP Level</p>
              <p className="font-semibold mt-1">
                {project.icp_level || "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">SOP Step</p>
              <p className="font-semibold mt-1 text-sm">
                {project.sop_step_key?.replace(/_/g, " ") || "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-semibold mt-1 text-sm">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Client Record Fields (M1) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Decision Maker</p>
              <p className="font-semibold mt-1 text-sm">
                {project.decision_maker || "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Trust Score</p>
              <p className="font-semibold mt-1">
                {project.trust_score ? `${project.trust_score}/5` : "N/A"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Sales Lead</p>
              <p className="font-semibold mt-1 text-sm">
                {project.assigned_sales_lead || "Unassigned"}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Delivery Lead</p>
              <p className="font-semibold mt-1 text-sm">
                {project.assigned_delivery_lead || "Unassigned"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Intelligence (M2) */}
      {clientIntel && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-base text-indigo-900">
              Client Intelligence (Airtable)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientIntel.confidence_score !== undefined && (
              <div>
                <span className="text-xs text-muted-foreground">Confidence Score:</span>
                <span className="ml-2 font-semibold">{clientIntel.confidence_score}%</span>
              </div>
            )}
            {clientIntel.discovery_summary && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Discovery Summary</p>
                <p className="text-sm">{clientIntel.discovery_summary}</p>
              </div>
            )}
            {clientIntel.red_flags && clientIntel.red_flags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Red Flags</p>
                <div className="flex flex-wrap gap-1">
                  {clientIntel.red_flags.map((flag, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {clientIntel.opportunities && clientIntel.opportunities.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Opportunities</p>
                <div className="flex flex-wrap gap-1">
                  {clientIntel.opportunities.map((opp, i) => (
                    <Badge key={i} variant="outline" className="text-xs text-green-700 border-green-300">{opp}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pipeline Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Progress</CardTitle>
        </CardHeader>
        <CardContent>
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
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getStageName(stage)}
                  </div>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={`w-4 h-0.5 mx-0.5 ${
                        isPast ? "bg-green-300" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two-column layout: Main content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blockers */}
          {blockers.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader>
                <CardTitle className="text-base text-red-900">
                  Blockers
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Escalations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Escalations ({escalations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {escalations.length === 0 ? (
                  <p className="px-6 py-8 text-center text-muted-foreground">
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
                          <span className="font-medium">{esc.title}</span>
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
                      {esc.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {esc.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Approval History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Approval History ({approvals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {approvals.length === 0 ? (
                  <p className="px-6 py-8 text-center text-muted-foreground">
                    No approvals yet
                  </p>
                ) : (
                  approvals.map((approval) => (
                    <div key={approval.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{approval.stage_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(approval.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
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
                          {/* M4: Proposal sent tracking */}
                          {approval.agent_key === "proposal" && approval.status === "approved" && (
                            approval.sent_at ? (
                              <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                                Sent {new Date(approval.sent_at).toLocaleDateString()}
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleMarkProposalSent(approval.id)}
                              >
                                Mark Sent
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                      {approval.admin_comments && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          &ldquo;{approval.admin_comments}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-6">
          <StageActions
            stage={project.stage}
            status={project.status}
            onAdvanceStage={handleAdvanceStage}
            onTriggerAgent={(agentKey) => setTriggerAgentKey(agentKey)}
            onCreateEscalation={() => setShowEscalationModal(true)}
            onTogglePause={handleTogglePause}
            onFitDecision={() => setShowFitDecisionModal(true)}
          />

          <ActivityFeed
            projectId={project.id}
            notes={notes}
            onNoteAdded={fetchProject}
          />
        </div>
      </div>

      {/* Modals */}
      {triggerAgentKey && (
        <TriggerAgentModal
          isOpen={!!triggerAgentKey}
          onClose={() => setTriggerAgentKey(null)}
          projectId={project.id}
          agentKey={triggerAgentKey}
          onTriggered={fetchProject}
        />
      )}

      <CreateEscalationModal
        isOpen={showEscalationModal}
        onClose={() => setShowEscalationModal(false)}
        projectId={project.id}
        onCreated={fetchProject}
      />

      <FitDecisionModal
        isOpen={showFitDecisionModal}
        onClose={() => setShowFitDecisionModal(false)}
        projectId={project.id}
        clientName={project.client_name || project.client_email}
        onDecision={handleFitDecision}
      />
    </div>
  );
}
