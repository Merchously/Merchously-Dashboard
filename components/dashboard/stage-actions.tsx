"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  STAGE_ACTIONS,
  STAGE_AGENT_MAP,
  AGENT_DISPLAY_NAMES,
} from "@/lib/constants";
import {
  ArrowRight,
  Bot,
  AlertTriangle,
  Pause,
  Play,
} from "lucide-react";

interface StageActionsProps {
  stage: string;
  status: string;
  onAdvanceStage: (nextStage: string) => void;
  onTriggerAgent: (agentKey: string) => void;
  onCreateEscalation: () => void;
  onTogglePause: () => void;
}

export function StageActions({
  stage,
  status,
  onAdvanceStage,
  onTriggerAgent,
  onCreateEscalation,
  onTogglePause,
}: StageActionsProps) {
  const stageAction = STAGE_ACTIONS[stage];
  const availableAgents = STAGE_AGENT_MAP[stage] || [];
  const isPaused = status === "PAUSED";
  const isComplete = stage === "COMPLETE";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Advance stage */}
        {stageAction && !isComplete && (
          <Button
            onClick={() => onAdvanceStage(stageAction.nextStage)}
            className="w-full justify-start gap-2"
            disabled={isPaused}
          >
            <ArrowRight className="h-4 w-4" />
            {stageAction.label}
          </Button>
        )}

        {/* Trigger agents */}
        {availableAgents.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trigger Agent
            </p>
            {availableAgents.map((agentKey) => (
              <Button
                key={agentKey}
                variant="outline"
                onClick={() => onTriggerAgent(agentKey)}
                className="w-full justify-start gap-2"
                disabled={isPaused}
              >
                <Bot className="h-4 w-4" />
                {AGENT_DISPLAY_NAMES[agentKey] || agentKey}
              </Button>
            ))}
          </div>
        )}

        {/* Create escalation */}
        <Button
          variant="outline"
          onClick={onCreateEscalation}
          className="w-full justify-start gap-2 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50"
        >
          <AlertTriangle className="h-4 w-4" />
          Create Escalation
        </Button>

        {/* Pause / Resume */}
        {!isComplete && (
          <Button
            variant="outline"
            onClick={onTogglePause}
            className="w-full justify-start gap-2"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 text-green-600" />
                Resume Project
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 text-yellow-600" />
                Pause Project
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
