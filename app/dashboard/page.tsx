"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApprovalCard } from "@/components/dashboard/approval-card";
import { ApprovalModal } from "@/components/dashboard/approval-modal";
import { useSSE } from "@/lib/hooks/use-sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, AlertTriangle, PauseCircle, CheckCircle, Plus, UserPlus } from "lucide-react";
import { CreateProjectModal } from "@/components/dashboard/create-project-modal";
import { TIER_LABELS, getStageName } from "@/lib/constants";

interface Approval {
  id: string;
  client_email: string;
  agent_key: string;
  stage_name: string;
  checkpoint_type: string;
  agent_payload: any;
  agent_response: any;
  status: "pending" | "approved" | "rejected" | "edited";
  created_at: string;
  updated_at: string;
}

interface Escalation {
  id: string;
  level: string;
  category: string;
  status: string;
  title: string;
  project_id: string;
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

interface PendingProject {
  approval_id: string;
  client_email: string;
  agent_key: string;
  stage_name: string;
  recommended_stage: string | null;
  tier: string;
  client_name: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [openEscalations, setOpenEscalations] = useState<Escalation[]>([]);
  const [pausedProjects, setPausedProjects] = useState<Project[]>([]);
  const [pendingProjects, setPendingProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);

  const fetchData = async () => {
    try {
      const [approvalsRes, escalationsRes, projectsRes, pendingRes] = await Promise.all([
        fetch("/api/approvals"),
        fetch("/api/escalations?status=OPEN"),
        fetch("/api/projects?status=PAUSED"),
        fetch("/api/pending-projects"),
      ]);

      const [approvalsData, escalationsData, projectsData, pendingData] = await Promise.all([
        approvalsRes.json(),
        escalationsRes.json(),
        projectsRes.json(),
        pendingRes.json(),
      ]);

      if (approvalsData.success) setApprovals(approvalsData.approvals);
      if (escalationsData.success)
        setOpenEscalations(escalationsData.escalations);
      if (projectsData.success) setPausedProjects(projectsData.projects);
      if (pendingData.success) setPendingProjects(pendingData.pending_projects);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSSEMessage = useCallback((event: any) => {
    if (
      event.type === "new_approval" ||
      event.type === "escalation.created" ||
      event.type === "escalation.resolved" ||
      event.type === "project.updated" ||
      event.type === "project.created" ||
      event.type === "project.creation_pending" ||
      event.type === "approval.policy_blocked"
    ) {
      fetchData();
    }

    if (event.type === "new_approval") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Approval", {
          body: `New ${event.data.checkpoint_type?.replace("_", " ")} for ${event.data.client_email}`,
        });
      }
    }
  }, []);

  const { isConnected } = useSSE("/api/events", {
    onMessage: handleSSEMessage,
    onConnect: () => {
      console.log("Connected to real-time updates");
    },
    onError: (error) => {
      console.error("SSE connection error:", error);
    },
  });

  const handleReview = (id: string) => {
    const approval = approvals.find((a) => a.id === id);
    if (approval) {
      setSelectedApproval(approval);
      setIsModalOpen(true);
    }
  };

  const handleApprove = async (id: string, comments: string) => {
    const response = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "approved",
        admin_comments: comments || null,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to approve");
    }

    await fetchData();
  };

  const handleReject = async (id: string, comments: string) => {
    const response = await fetch(`/api/approvals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "rejected",
        admin_comments: comments,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to reject");
    }

    await fetchData();
  };

  const pendingApprovals = approvals.filter((a) => a.status === "pending");
  const approvedToday = approvals.filter(
    (a) =>
      a.status === "approved" &&
      new Date(a.updated_at).toDateString() === new Date().toDateString()
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-serif tracking-tight">
              Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor and approve agent outputs across your client pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowCreateProject(true)}
              size="sm"
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-muted-foreground">
                {isConnected ? "Live" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {pendingApprovals.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open Escalations
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {openEscalations.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paused Projects
              </CardTitle>
              <PauseCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {pausedProjects.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Today
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {approvedToday.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Project Creations — human authorization required */}
        {pendingProjects.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-900">
                  Pending Project Creations
                </CardTitle>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {pendingProjects.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-blue-100">
                {pendingProjects.map((pp) => (
                  <div key={pp.approval_id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">
                        {pp.client_name || pp.client_email}
                      </p>
                      <p className="text-sm text-blue-700">
                        {pp.stage_name} &middot; {TIER_LABELS[pp.tier] || pp.tier}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShowCreateProject(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Project
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Two-column layout for widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              {pendingApprovals.length > 0 && (
                <Badge variant="warning">{pendingApprovals.length}</Badge>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pendingApprovals.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No pending approvals</p>
                  </div>
                ) : (
                  pendingApprovals.slice(0, 5).map((approval) => (
                    <ApprovalCard
                      key={approval.id}
                      id={approval.id}
                      client_email={approval.client_email}
                      stage_name={approval.stage_name}
                      checkpoint_type={approval.checkpoint_type}
                      status={approval.status}
                      created_at={approval.created_at}
                      onReview={handleReview}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Open Escalations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Open Escalations</CardTitle>
              <a
                href="/dashboard/escalations"
                className="text-sm text-primary hover:underline"
              >
                View All
              </a>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {openEscalations.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No open escalations</p>
                  </div>
                ) : (
                  openEscalations.slice(0, 5).map((esc) => (
                    <div
                      key={esc.id}
                      className="px-6 py-4 hover:bg-muted/50 transition cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/escalations/${esc.id}`)
                      }
                    >
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
                          <span className="font-medium text-sm">
                            {esc.title}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(esc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Paused Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Paused Projects</CardTitle>
              <a
                href="/dashboard/projects"
                className="text-sm text-primary hover:underline"
              >
                View All
              </a>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {pausedProjects.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-muted-foreground">No paused projects</p>
                  </div>
                ) : (
                  pausedProjects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="px-6 py-4 hover:bg-muted/50 transition cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/projects/${project.id}`)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {project.client_name || project.client_email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getStageName(project.stage)}
                          </p>
                        </div>
                        <Badge variant="warning">PAUSED</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {approvals.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">
                    No activity yet
                  </div>
                ) : (
                  approvals.slice(0, 5).map((approval) => (
                    <div key={approval.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {approval.stage_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {approval.client_email}
                          </p>
                        </div>
                        <div className="text-right">
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(
                              approval.created_at
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ApprovalModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedApproval(null);
        }}
        approval={selectedApproval}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={fetchData}
      />
    </>
  );
}
