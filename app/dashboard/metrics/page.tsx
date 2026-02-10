"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES, ESCALATION_CATEGORY_LABELS, getStageName } from "@/lib/constants";

interface Metrics {
  funnel: { stage: string; count: number }[];
  icp_distribution: { icp_level: string; count: number }[];
  escalation_frequency: { level: string; count: number }[];
  escalation_by_category: { category: string; count: number }[];
  approval_stats: { status: string; count: number }[];
  agent_activity: { agent_key: string; total_events: number; last_event_at: string }[];
  projects_by_status: { status: string; count: number }[];
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMetrics(data.metrics);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return <p className="text-muted-foreground">Failed to load metrics.</p>;
  }

  // Build funnel data in pipeline order
  const funnelMap = Object.fromEntries(metrics.funnel.map((f) => [f.stage, f.count]));
  const totalProjects = metrics.funnel.reduce((sum, f) => sum + f.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">Metrics & System Health</h2>
        <p className="text-muted-foreground mt-1">Non-vanity metrics. Drift indicates upstream failure.</p>
      </div>

      {/* Pipeline Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const count = funnelMap[stage] || 0;
              const pct = totalProjects > 0 ? (count / totalProjects) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 text-right truncate">
                    {getStageName(stage)}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    >
                      {count > 0 && (
                        <span className="text-xs text-primary-foreground font-medium">{count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ICP Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>ICP Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.icp_distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ICP data</p>
            ) : (
              <div className="space-y-3">
                {metrics.icp_distribution.map((item) => (
                  <div key={item.icp_level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        item.icp_level === "A" ? "bg-green-500" :
                        item.icp_level === "B" ? "bg-yellow-500" : "bg-red-500"
                      }`} />
                      <span className="font-medium">ICP {item.icp_level}</span>
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Projects by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.projects_by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="font-medium">{item.status}</span>
                  <Badge variant={
                    item.status === "ACTIVE" ? "success" :
                    item.status === "PAUSED" ? "warning" :
                    item.status === "BLOCKED" ? "destructive" : "secondary"
                  }>
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Escalation Frequency (30d) */}
        <Card>
          <CardHeader>
            <CardTitle>Escalation Frequency (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.escalation_frequency.length === 0 ? (
              <p className="text-sm text-muted-foreground">No escalations in the last 30 days</p>
            ) : (
              <div className="space-y-3">
                {metrics.escalation_frequency.map((item) => (
                  <div key={item.level} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.level === "L3" ? "bg-red-100 text-red-700" :
                      item.level === "L2" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {item.level}
                    </span>
                    <span className="font-bold text-lg">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation by Category (30d) */}
        <Card>
          <CardHeader>
            <CardTitle>Escalations by Category (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.escalation_by_category.length === 0 ? (
              <p className="text-sm text-muted-foreground">No escalations</p>
            ) : (
              <div className="space-y-3">
                {metrics.escalation_by_category.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="font-medium">
                      {ESCALATION_CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.approval_stats.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="font-medium capitalize">{item.status}</span>
                  <Badge variant={
                    item.status === "approved" ? "success" :
                    item.status === "rejected" ? "destructive" :
                    item.status === "pending" ? "warning" : "secondary"
                  }>
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.agent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent activity</p>
            ) : (
              <div className="space-y-3">
                {metrics.agent_activity.map((agent) => (
                  <div key={agent.agent_key} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{agent.agent_key}</span>
                    <div className="text-right">
                      <span className="font-bold">{agent.total_events}</span>
                      <span className="text-xs text-muted-foreground ml-1">events</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
