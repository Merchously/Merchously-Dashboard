"use client";

import { useEffect, useState, useCallback } from "react";
import { ApprovalCard } from "@/components/dashboard/approval-card";
import { ApprovalModal } from "@/components/dashboard/approval-modal";
import { useSSE } from "@/lib/hooks/use-sse";

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

export default function DashboardPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch approvals
  const fetchApprovals = async () => {
    try {
      const response = await fetch("/api/approvals");
      const data = await response.json();
      if (data.success) {
        setApprovals(data.approvals);
      }
    } catch (error) {
      console.error("Error fetching approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  // Real-time updates via SSE
  const handleSSEMessage = useCallback((event: any) => {
    console.log("SSE event received:", event);

    if (event.type === "new_approval") {
      // Refresh approvals when new approval arrives
      fetchApprovals();

      // Optional: Show notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Approval", {
          body: `New ${event.data.checkpoint_type.replace("_", " ")} for ${event.data.client_email}`,
        });
      }
    }
  }, []);

  // Connect to SSE stream
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
      throw new Error("Failed to approve");
    }

    // Refresh approvals
    await fetchApprovals();
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
      throw new Error("Failed to reject");
    }

    // Refresh approvals
    await fetchApprovals();
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
        <div>
          <h2 className="text-3xl font-bold font-serif text-slate-900">
            Dashboard
          </h2>
          <p className="text-slate-600 mt-1">
            Monitor and approve agent outputs across your client pipeline
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Approvals
                </p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {approvals.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Pending Approvals
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {pendingApprovals.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-slate-500">
                  No pending approvals at the moment
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  New approvals will appear here when agents complete tasks
                </p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
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

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {approvals.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500">
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
                        {new Date(approval.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
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
