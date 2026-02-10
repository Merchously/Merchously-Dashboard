"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EscalationCard } from "@/components/dashboard/escalation-card";
import { EscalationResolveModal } from "@/components/dashboard/escalation-resolve-modal";
import { useSSE } from "@/lib/hooks/use-sse";

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
  created_at: string;
}

type StatusFilter = "ALL" | "OPEN" | "RESOLVED" | "HALTED";
type LevelFilter = "ALL" | "L1" | "L2" | "L3";

export default function EscalationsPage() {
  const router = useRouter();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("ALL");
  const [selectedEscalation, setSelectedEscalation] =
    useState<Escalation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEscalations = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const url = `/api/escalations${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setEscalations(data.escalations);
      }
    } catch (error) {
      console.error("Error fetching escalations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEscalations();
  }, [statusFilter]);

  const handleSSEMessage = useCallback((event: any) => {
    if (
      event.type === "escalation.created" ||
      event.type === "escalation.resolved"
    ) {
      fetchEscalations();
    }
  }, []);

  useSSE("/api/events", { onMessage: handleSSEMessage });

  const handleResolve = (id: string) => {
    const esc = escalations.find((e) => e.id === id);
    if (esc) {
      setSelectedEscalation(esc);
      setIsModalOpen(true);
    }
  };

  const handleResolveSubmit = async (
    id: string,
    data: {
      status: "RESOLVED" | "HALTED";
      decision_notes: string;
      unpause_project?: boolean;
    }
  ) => {
    const response = await fetch(`/api/escalations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to resolve");
    }

    await fetchEscalations();
  };

  // Client-side level filter
  const filtered =
    levelFilter === "ALL"
      ? escalations
      : escalations.filter((e) => e.level === levelFilter);

  const statusCounts = {
    ALL: escalations.length,
    OPEN: escalations.filter((e) => e.status === "OPEN").length,
    RESOLVED: escalations.filter((e) => e.status === "RESOLVED").length,
    HALTED: escalations.filter((e) => e.status === "HALTED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading escalations...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold font-serif text-slate-900">
            Escalations
          </h2>
          <p className="text-slate-600 mt-1">
            Review and resolve escalated issues across projects
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["ALL", "OPEN", "RESOLVED", "HALTED"] as StatusFilter[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition ${
                  statusFilter === status
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {status === "ALL" ? "All" : status}
                <span className="ml-1.5 text-xs opacity-75">
                  {statusCounts[status]}
                </span>
              </button>
            )
          )}

          <span className="w-px h-6 bg-slate-200 mx-2" />

          {/* Level Filters */}
          {(["ALL", "L1", "L2", "L3"] as LevelFilter[]).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition ${
                levelFilter === level
                  ? level === "L3"
                    ? "bg-red-600 text-white border-red-600"
                    : level === "L2"
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : level === "L1"
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {level === "ALL" ? "All Levels" : level}
            </button>
          ))}
        </div>

        {/* Escalation List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No escalations found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((esc) => (
              <EscalationCard
                key={esc.id}
                {...esc}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>

      <EscalationResolveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEscalation(null);
        }}
        escalation={selectedEscalation}
        onResolve={handleResolveSubmit}
      />
    </>
  );
}
