"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/dashboard/agent-card";
import { useSSE } from "@/lib/hooks/use-sse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Activity, Zap } from "lucide-react";

interface Agent {
  id: string;
  agent_key: string;
  display_name: string;
  category: string;
  is_active: number;
  webhook_url?: string | null;
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

  const handleWebhookUpdate = async (id: string, webhook_url: string) => {
    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhook_url || null }),
      });

      if (response.ok) {
        await fetchAgents();
      }
    } catch (error) {
      console.error("Error updating webhook URL:", error);
    }
  };

  const activeCount = agents.filter((a) => a.is_active === 1).length;
  const totalEvents = agents.reduce((sum, a) => sum + a.total_events, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">
          Agent Monitor
        </h2>
        <p className="text-muted-foreground mt-1">
          Monitor agent activity and manage active/inactive status
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered Agents
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {activeCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Events
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEvents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      {agents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No agents registered</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Run the seed script to register agents
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} {...agent} onToggle={handleToggle} onWebhookUpdate={handleWebhookUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
