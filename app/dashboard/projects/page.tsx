"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/components/dashboard/project-card";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { useSSE } from "@/lib/hooks/use-sse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  client_email: string;
  client_name?: string | null;
  tier: string;
  stage: string;
  status: string;
  icp_level?: string | null;
  sop_step_key?: string | null;
  blockers_json: any;
  created_at: string;
  updated_at: string;
}

type ViewMode = "pipeline" | "list";
type StatusFilter = "ALL" | "ACTIVE" | "PAUSED" | "BLOCKED" | "COMPLETE";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const fetchProjects = async () => {
    try {
      const url =
        statusFilter === "ALL"
          ? "/api/projects"
          : `/api/projects?status=${statusFilter}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleSSEMessage = useCallback((event: any) => {
    if (event.type === "project.updated") {
      fetchProjects();
    }
  }, []);

  useSSE("/api/events", {
    onMessage: handleSSEMessage,
  });

  const handleProjectClick = (id: string) => {
    router.push(`/dashboard/projects/${id}`);
  };

  const statusCounts = {
    ALL: projects.length,
    ACTIVE: projects.filter((p) => p.status === "ACTIVE").length,
    PAUSED: projects.filter((p) => p.status === "PAUSED").length,
    BLOCKED: projects.filter((p) => p.status === "BLOCKED").length,
    COMPLETE: projects.filter((p) => p.status === "COMPLETE").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-500">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-serif text-slate-900">
            Projects
          </h2>
          <p className="text-slate-600 mt-1">
            Track client engagements across the pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "pipeline" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("pipeline")}
          >
            Pipeline
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            List
          </Button>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(
          ["ALL", "ACTIVE", "PAUSED", "BLOCKED", "COMPLETE"] as StatusFilter[]
        ).map((status) => (
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
        ))}
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-500">No projects found</p>
          <p className="text-sm text-slate-400 mt-1">
            Projects are created automatically when webhooks arrive
          </p>
        </div>
      ) : viewMode === "pipeline" ? (
        <PipelineView
          projects={projects}
          onProjectClick={handleProjectClick}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              {...project}
              onClick={handleProjectClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
