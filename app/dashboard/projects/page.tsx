"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "@/components/dashboard/project-card";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { useSSE } from "@/lib/hooks/use-sse";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold font-serif tracking-tight">
            Projects
          </h2>
          <p className="text-muted-foreground mt-1">
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
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList>
          {(
            ["ALL", "ACTIVE", "PAUSED", "BLOCKED", "COMPLETE"] as StatusFilter[]
          ).map((status) => (
            <TabsTrigger key={status} value={status}>
              {status === "ALL" ? "All" : status}{" "}
              <span className="ml-1 text-xs opacity-75">
                {statusCounts[status]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No projects found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Projects are created automatically when webhooks arrive
          </p>
        </Card>
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
