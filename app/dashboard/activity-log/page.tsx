"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Webhook, Shield, Bot } from "lucide-react";

interface ActivityItem {
  id: string;
  event_type: "webhook_received" | "agent_triggered" | "policy_action";
  agent_key: string;
  client_email?: string | null;
  summary: string;
  timestamp: string;
  details?: any;
}

const eventIcons: Record<string, typeof Webhook> = {
  webhook_received: Webhook,
  agent_triggered: Bot,
  policy_action: Shield,
};

const eventLabels: Record<string, string> = {
  webhook_received: "Webhook",
  agent_triggered: "Triggered",
  policy_action: "Policy",
};

export default function ActivityLogPage() {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity-log?limit=200")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setActivity(data.activity);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold font-serif tracking-tight">AI Activity Log</h2>
        <p className="text-muted-foreground mt-1">
          Read-only audit trail: which agent executed, when, what it produced, what it flagged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Feed ({activity.length} events)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {activity.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                No AI activity recorded yet
              </div>
            ) : (
              activity.map((item) => {
                const Icon = eventIcons[item.event_type] || Webhook;
                return (
                  <div key={item.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 ${
                        item.event_type === "policy_action" ? "text-red-500" :
                        item.event_type === "agent_triggered" ? "text-indigo-500" :
                        "text-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {eventLabels[item.event_type]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {item.agent_key}
                          </Badge>
                          {item.client_email && (
                            <span className="text-xs text-muted-foreground">
                              {item.client_email}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1">{item.summary}</p>
                        {item.details?.error && (
                          <p className="text-xs text-red-600 mt-1">Error: {item.details.error}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
