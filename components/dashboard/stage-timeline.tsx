import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Circle, AlertCircle } from "lucide-react";

interface Stage {
  name: string;
  status: "completed" | "pending" | "in_progress" | "not_started";
  timestamp?: string;
}

interface StageTimelineProps {
  stages: Stage[];
}

const stageIcons = {
  completed: CheckCircle2,
  in_progress: Clock,
  pending: AlertCircle,
  not_started: Circle,
};

const stageColors = {
  completed: "text-green-600",
  in_progress: "text-blue-600",
  pending: "text-yellow-600",
  not_started: "text-slate-300",
};

const stageBadges = {
  completed: "success" as const,
  in_progress: "pending" as const,
  pending: "warning" as const,
  not_started: "outline" as const,
};

export function StageTimeline({ stages }: StageTimelineProps) {
  return (
    <div className="space-y-4">
      {stages.map((stage, index) => {
        const Icon = stageIcons[stage.status];
        const isLast = index === stages.length - 1;

        return (
          <div key={index} className="flex gap-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  stage.status === "completed"
                    ? "bg-green-50 border-green-600"
                    : stage.status === "in_progress"
                    ? "bg-blue-50 border-blue-600"
                    : stage.status === "pending"
                    ? "bg-yellow-50 border-yellow-600"
                    : "bg-slate-50 border-slate-300"
                }`}
              >
                <Icon className={`w-4 h-4 ${stageColors[stage.status]}`} />
              </div>
              {!isLast && (
                <div
                  className={`w-0.5 h-12 ${
                    stage.status === "completed"
                      ? "bg-green-200"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </div>

            {/* Stage info */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900">
                    {stage.name}
                  </h4>
                  {stage.timestamp && (
                    <p className="text-sm text-slate-500 mt-1">
                      {new Date(stage.timestamp).toLocaleDateString()} at{" "}
                      {new Date(stage.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                <Badge variant={stageBadges[stage.status]}>
                  {stage.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
