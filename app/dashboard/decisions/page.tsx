"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSSE } from "@/lib/hooks/use-sse";
import { AlertTriangle, Clock, Shield } from "lucide-react";

interface DecisionItem {
  id: string;
  type: "escalation" | "approval" | "policy_alert";
  urgency: number;
  title: string;
  description: string;
  category?: string;
  level?: string;
  client_email?: string;
  created_at: string;
  source_id: string;
}

interface Summary {
  l3_escalations: number;
  l2_escalations: number;
  l1_escalations: number;
  pending_approvals: number;
  recent_policy_actions: number;
}

export default function DecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/decisions");
      const data = await res.json();
      if (data.success) {
        setDecisions(data.decisions);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching decisions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSSEMessage = useCallback((event: any) => {
    if (["new_approval", "escalation.created", "escalation.resolved", "approval.policy_blocked"].includes(event.type)) {
      fetchData();
    }
  }, []);

  useSSE("/api/events", { onMessage: handleSSEMessage });

  const handleClick = (item: DecisionItem) => {
    if (item.type === "escalation") {
      router.push(`/dashboard/escalations/${item.source_id}`);
    } else if (item.type === "approval") {
      router.push("/dashboard"); // Approvals are reviewed on the main dashboard
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isHealthy = decisions.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">Decision Queue</h2>
        <p className="text-muted-foreground mt-1">
          {isHealthy
            ? "System is healthy. No decisions pending."
            : `${decisions.length} decision${decisions.length === 1 ? "" : "s"} require your attention`}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={summary.l3_escalations > 0 ? "border-red-200 bg-red-50/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">L3 Escalations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">{summary.l3_escalations}</div>
            </CardContent>
          </Card>
          <Card className={summary.l2_escalations > 0 ? "border-yellow-200 bg-yellow-50/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">L2 Escalations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">{summary.l2_escalations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">L1 Escalations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.l1_escalations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pending_approvals}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decision List */}
      <Card>
        <CardHeader>
          <CardTitle>All Decisions (by urgency)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {decisions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium text-green-700">System Healthy</p>
                <p className="text-sm text-muted-foreground mt-1">No decisions require attention</p>
              </div>
            ) : (
              decisions.map((item) => (
                <div
                  key={item.id}
                  className="px-6 py-4 hover:bg-muted/50 transition cursor-pointer"
                  onClick={() => handleClick(item)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.type === "escalation" ? (
                        <AlertTriangle className={`h-5 w-5 ${
                          item.level === "L3" ? "text-red-600" :
                          item.level === "L2" ? "text-yellow-600" : "text-blue-600"
                        }`} />
                      ) : (
                        <Clock className="h-5 w-5 text-orange-600" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          {item.level && (
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                              item.level === "L3" ? "bg-red-100 text-red-700" :
                              item.level === "L2" ? "bg-yellow-100 text-yellow-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {item.level}
                            </span>
                          )}
                          {item.category && (
                            <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.description || item.client_email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.type === "escalation" ? "destructive" : "warning"}>
                        {item.type === "escalation" ? "Escalation" : "Approval"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleDateString()}
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
  );
}
