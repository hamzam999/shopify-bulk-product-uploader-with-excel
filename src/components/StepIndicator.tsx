import { useUploadStore } from "@/store/upload-store";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Upload Excel" },
  { id: 2, label: "Variant Editor" },
  { id: 3, label: "Image Mapping" },
  { id: 4, label: "Upload" },
] as const;

export function StepIndicator() {
  const currentStep = useUploadStore((s) => s.currentStep);

  return (
    <nav className="border-t px-4 py-3" aria-label="Progress">
      <ol className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isActive = currentStep === step.id;
          const isPast = currentStep > step.id;
          return (
            <li
              key={step.id}
              className={cn(
                "flex flex-1 items-center text-sm font-medium",
                index < STEPS.length - 1 && "after:content-[''] after:flex-1 after:border-b after:border-border after:mx-2"
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5",
                  isActive && "bg-primary text-primary-foreground",
                  isPast && "text-muted-foreground",
                  !isActive && !isPast && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs",
                    isActive && "border-primary-foreground bg-primary-foreground/20",
                    isPast && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isPast && "border-muted-foreground/50"
                  )}
                >
                  {isPast ? "✓" : step.id}
                </span>
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
