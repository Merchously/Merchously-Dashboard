"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/dashboard/agent-card";
import { useSSE } from "@/lib/hooks/use-sse";

interface Agent {
  id: string;
  agent_key: string;
  display_name: string;
  category: string;
  is_active: number;
  total_events: number;
  last_event_at?: string | null;
  created_at: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleSSEMessage = useCallback((event: any) => {
    if (event.type === "agent.event") {
      fetchAgents();
    }
  }, []);

  useSSE("/api/events", { onMessage: handleSSEMessage });

  const handleToggle = async (id: string, is_active: boolean) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });

      if (response.ok) {
        await fetchAgents();
      }
    } catch (error) {
      console.error("Error toggling agent:", error);
    }
  };

  const activeCount = agents.filter((a) => a.is_active === 1).length;
  const totalEvents = agents.reduce((sum, a) => sum + a.total_events, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold font-serif text-slate-900">
          Agent Monitor
        </h2>
        <p className="text-slate-600 mt-1">
          Monitor agent activity and manage active/inactive status
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Registered Agents</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {agents.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Active</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Events</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">
            {totalEvents}
          </p>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No agents registered</p>
          <p className="text-sm text-slate-400 mt-1">
            Run the seed script to register agents
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} {...agent} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  );
}
