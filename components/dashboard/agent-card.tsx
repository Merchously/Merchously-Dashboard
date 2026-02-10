"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface AgentCardProps {
  id: string;
  agent_key: string;
  display_name: string;
  category: string;
  is_active: number;
  total_events: number;
  last_event_at?: string | null;
  onToggle: (id: string, is_active: boolean) => void;
}

const categoryColors: Record<string, string> = {
  sales: "bg-blue-100 text-blue-700",
  operations: "bg-purple-100 text-purple-700",
  support: "bg-amber-100 text-amber-700",
  compliance: "bg-green-100 text-green-700",
};

export function AgentCard({
  id,
  agent_key,
  display_name,
  category,
  is_active,
  total_events,
  last_event_at,
  onToggle,
}: AgentCardProps) {
  const active = is_active === 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                active ? "bg-green-500" : "bg-slate-300"
              }`}
            />
            <h4 className="font-semibold">{display_name}</h4>
          </div>
          <Switch
            checked={active}
            onCheckedChange={(checked) => onToggle(id, checked)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              categoryColors[category] || "bg-slate-100 text-slate-700"
            }`}
          >
            {category}
          </span>
          <span className="text-xs text-muted-foreground">{agent_key}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total Events</p>
            <p className="text-lg font-bold">{total_events}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Active</p>
            <p className="text-sm font-medium">
              {last_event_at
                ? new Date(last_event_at).toLocaleDateString()
                : "Never"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
