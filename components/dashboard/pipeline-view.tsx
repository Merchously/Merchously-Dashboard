"use client";

import { Badge } from "@/components/ui/badge";
import { STAGE_DISPLAY_NAMES } from "@/lib/constants";

interface Project {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: string;
  stage: string;
  status: string;
}

interface PipelineViewProps {
  projects: Project[];
  onProjectClick: (id: string) => void;
}

const PIPELINE_STAGES = [
  "LEAD",
  "QUALIFIED",
  "DISCOVERY",
  "FIT_DECISION",
  "PROPOSAL",
  "CLOSED",
  "ONBOARDING",
  "DELIVERY",
  "COMPLETE",
];

const stageLabels = STAGE_DISPLAY_NAMES;

const tierLabels: Record<string, string> = {
  TIER_1: "Launch",
  TIER_2: "Growth",
  TIER_3: "Scale",
};

const tierDotColors: Record<string, string> = {
  TIER_1: "bg-blue-500",
  TIER_2: "bg-purple-500",
  TIER_3: "bg-amber-500",
};

export function PipelineView({ projects, onProjectClick }: PipelineViewProps) {
  const projectsByStage = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = projects.filter((p) => p.stage === stage);
      return acc;
    },
    {} as Record<string, Project[]>
  );

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageProjects = projectsByStage[stage] || [];
          return (
            <div
              key={stage}
              className="w-52 flex-shrink-0 bg-slate-50 rounded-lg border border-slate-200"
            >
              {/* Column Header */}
              <div className="px-3 py-2 border-b border-slate-200 bg-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase">
                    {stageLabels[stage] || stage}
                  </span>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {stageProjects.length}
                  </Badge>
                </div>
              </div>

              {/* Column Body */}
              <div className="p-2 space-y-2 min-h-[80px]">
                {stageProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No projects
                  </p>
                ) : (
                  stageProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => onProjectClick(project.id)}
                      className="bg-white rounded border border-slate-200 p-2 hover:shadow-sm transition cursor-pointer"
                    >
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {project.client_name || project.client_email}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tierDotColors[project.tier] || "bg-slate-400"
                          }`}
                        />
                        <span className="text-xs text-slate-500">
                          {tierLabels[project.tier] || project.tier}
                        </span>
                        {project.status === "PAUSED" && (
                          <Badge
                            variant="warning"
                            className="text-[10px] px-1 py-0 ml-auto"
                          >
                            Paused
                          </Badge>
                        )}
                        {project.status === "BLOCKED" && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1 py-0 ml-auto"
                          >
                            Blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
