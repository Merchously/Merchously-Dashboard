import { notFound } from "next/navigation";
import { StageTimeline } from "@/components/dashboard/stage-timeline";
import { Badge } from "@/components/ui/badge";
import { ProgressIndicator } from "@/components/dashboard/progress-indicator";

interface ClientDetailPageProps {
  params: Promise<{ email: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { email } = await params;
  const decodedEmail = decodeURIComponent(email);

  // Fetch client data from API
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/clients/${encodeURIComponent(decodedEmail)}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    notFound();
  }

  const { client, approvals } = await response.json();

  // Build timeline from approvals
  const stages = [
    {
      name: "Lead Intake & Qualification",
      status: (approvals.some((a: any) => a.agent_key === "leadIntake")
        ? "completed"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find((a: any) => a.agent_key === "leadIntake")
        ?.created_at,
    },
    {
      name: "Discovery Call",
      status: (approvals.some((a: any) => a.agent_key === "discovery")
        ? approvals.find((a: any) => a.agent_key === "discovery")?.status ===
          "pending"
          ? "pending"
          : "completed"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find((a: any) => a.agent_key === "discovery")
        ?.created_at,
    },
    {
      name: "Proposal",
      status: (approvals.some((a: any) => a.agent_key === "proposal")
        ? approvals.find((a: any) => a.agent_key === "proposal")?.status ===
          "pending"
          ? "pending"
          : "completed"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find((a: any) => a.agent_key === "proposal")
        ?.created_at,
    },
    {
      name: "Client Onboarding",
      status: (approvals.some((a: any) => a.agent_key === "onboarding")
        ? "completed"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find((a: any) => a.agent_key === "onboarding")
        ?.created_at,
    },
    {
      name: "Tier Execution",
      status: (approvals.some((a: any) => a.agent_key === "tierExecution")
        ? "in_progress"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find((a: any) => a.agent_key === "tierExecution")
        ?.created_at,
    },
    {
      name: "Quality Check",
      status: (approvals.some((a: any) => a.agent_key === "qualityCompliance")
        ? approvals.find((a: any) => a.agent_key === "qualityCompliance")
          ?.status === "approved"
          ? "completed"
          : "pending"
        : "not_started") as "completed" | "pending" | "in_progress" | "not_started",
      timestamp: approvals.find(
        (a: any) => a.agent_key === "qualityCompliance"
      )?.created_at,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold font-serif text-slate-900">
            {client.name || decodedEmail}
          </h2>
          <Badge variant={client.icp_level === "A" ? "success" : "warning"}>
            ICP Level {client.icp_level || "Unknown"}
          </Badge>
        </div>
        <p className="text-slate-600 mt-1">{decodedEmail}</p>
      </div>

      {/* Client Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Recommended Tier</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {client.recommended_tier || "Not set"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Budget Range</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {client.budget_range || "Not set"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-600">Status</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {client.status || "New Lead"}
          </p>
        </div>
      </div>

      {/* Progress for Tier Execution */}
      {approvals.some((a: any) => a.agent_key === "tierExecution") && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Execution Progress
          </h3>
          <ProgressIndicator
            currentStep={3}
            totalSteps={7}
            stepName="Design Coordination"
          />
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Client Journey</h3>
        <StageTimeline stages={stages} />
      </div>

      {/* Approvals History */}
      {approvals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Approval History</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {approvals.map((approval: any) => (
              <div key={approval.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {approval.stage_name}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      {approval.checkpoint_type.replace("_", " ")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      approval.status === "approved"
                        ? "success"
                        : approval.status === "rejected"
                        ? "destructive"
                        : "warning"
                    }
                  >
                    {approval.status}
                  </Badge>
                </div>
                {approval.admin_comments && (
                  <p className="text-sm text-slate-500 mt-2 italic">
                    &quot;{approval.admin_comments}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
