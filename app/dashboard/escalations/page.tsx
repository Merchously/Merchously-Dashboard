"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { EscalationCard } from "@/components/dashboard/escalation-card";
import { EscalationResolveModal } from "@/components/dashboard/escalation-resolve-modal";
import { useSSE } from "@/lib/hooks/use-sse";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-10 w-80" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">
            Escalations
          </h2>
          <p className="text-muted-foreground mt-1">
            Review and resolve escalated issues across projects
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <TabsList>
              {(["ALL", "OPEN", "RESOLVED", "HALTED"] as StatusFilter[]).map(
                (status) => (
                  <TabsTrigger key={status} value={status}>
                    {status === "ALL" ? "All" : status}{" "}
                    <span className="ml-1 text-xs opacity-75">
                      {statusCounts[status]}
                    </span>
                  </TabsTrigger>
                )
              )}
            </TabsList>
          </Tabs>

          <Separator orientation="vertical" className="h-6" />

          <Select
            value={levelFilter}
            onValueChange={(v) => setLevelFilter(v as LevelFilter)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Levels</SelectItem>
              <SelectItem value="L1">L1</SelectItem>
              <SelectItem value="L2">L2</SelectItem>
              <SelectItem value="L3">L3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Escalation List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No escalations found</p>
          </Card>
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
