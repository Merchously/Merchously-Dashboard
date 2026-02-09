interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepName?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  stepName,
}: ProgressIndicatorProps) {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900">
            Step {currentStep}/{totalSteps}
          </span>
          {stepName && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">{stepName}</span>
            </>
          )}
        </div>
        <span className="text-slate-500">{percentage}%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
