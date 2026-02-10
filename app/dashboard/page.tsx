"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApprovalCard } from "@/components/dashboard/approval-card";
import { ApprovalModal } from "@/components/dashboard/approval-modal";
import { useSSE } from "@/lib/hooks/use-sse";
import { Badge } from "@/components/ui/badge";

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

export default function DashboardPage() {
  const router = useRouter();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [openEscalations, setOpenEscalations] = useState<Escalation[]>([]);
  const [pausedProjects, setPausedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [approvalsRes, escalationsRes, projectsRes] = await Promise.all([
        fetch("/api/approvals"),
        fetch("/api/escalations?status=OPEN"),
        fetch("/api/projects?status=PAUSED"),
      ]);

      const [approvalsData, escalationsData, projectsData] = await Promise.all([
        approvalsRes.json(),
        escalationsRes.json(),
        projectsRes.json(),
      ]);

      if (approvalsData.success) setApprovals(approvalsData.approvals);
      if (escalationsData.success)
        setOpenEscalations(escalationsData.escalations);
      if (projectsData.success) setPausedProjects(projectsData.projects);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time updates via SSE — handle all event types
  const handleSSEMessage = useCallback((event: any) => {
    if (
      event.type === "new_approval" ||
      event.type === "escalation.created" ||
      event.type === "escalation.resolved" ||
      event.type === "project.updated" ||
      event.type === "approval.policy_blocked"
    ) {
      fetchData();
    }

    // Browser notification for new approvals
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-serif text-slate-900">
              Dashboard
            </h2>
            <p className="text-slate-600 mt-1">
              Monitor and approve agent outputs across your client pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-slate-400">
              {isConnected ? "Live" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Stats Cards — 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Pending Approvals
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {pendingApprovals.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Open Escalations
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {openEscalations.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Paused Projects
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {pausedProjects.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Approved Today
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {approvedToday.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout for widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Approvals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Pending Approvals
              </h3>
              {pendingApprovals.length > 0 && (
                <Badge variant="warning">{pendingApprovals.length}</Badge>
              )}
            </div>
            <div className="divide-y divide-slate-200">
              {pendingApprovals.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-slate-500">No pending approvals</p>
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
          </div>

          {/* Open Escalations */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Open Escalations
              </h3>
              <a
                href="/dashboard/escalations"
                className="text-sm text-primary hover:underline"
              >
                View All
              </a>
            </div>
            <div className="divide-y divide-slate-200">
              {openEscalations.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-slate-500">No open escalations</p>
                </div>
              ) : (
                openEscalations.slice(0, 5).map((esc) => (
                  <div
                    key={esc.id}
                    className="px-6 py-4 hover:bg-slate-50 transition cursor-pointer"
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
                        <span className="font-medium text-slate-900 text-sm">
                          {esc.title}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(esc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paused Projects */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Paused Projects
              </h3>
              <a
                href="/dashboard/projects"
                className="text-sm text-primary hover:underline"
              >
                View All
              </a>
            </div>
            <div className="divide-y divide-slate-200">
              {pausedProjects.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-slate-500">No paused projects</p>
                </div>
              ) : (
                pausedProjects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="px-6 py-4 hover:bg-slate-50 transition cursor-pointer"
                    onClick={() =>
                      router.push(`/dashboard/projects/${project.id}`)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {project.client_name || project.client_email}
                        </p>
                        <p className="text-sm text-slate-500">
                          {project.stage.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge variant="warning">PAUSED</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Recent Activity
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {approvals.length === 0 ? (
                <div className="px-6 py-8 text-center text-slate-500">
                  No activity yet
                </div>
              ) : (
                approvals.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          {approval.stage_name}
                        </p>
                        <p className="text-sm text-slate-600">
                          {approval.client_email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            approval.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : approval.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {approval.status}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
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
          </div>
        </div>
      </div>

      {/* Approval Modal */}
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
    </>
  );
}
