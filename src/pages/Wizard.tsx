import { useUploadStore } from "@/store/upload-store";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import { StepIndicator } from "@/components/StepIndicator";
import { Step1Upload } from "@/components/steps/Step1Upload";
import { Step2VariantEditor } from "@/components/steps/Step2VariantEditor";
import { Step3ImageMapping } from "@/components/steps/Step3ImageMapping";
import { Step4Upload } from "@/components/steps/Step4Upload";
import { AnimatePresence, motion } from "framer-motion";

const STEP_CONTENT = [
  { id: 1, Component: Step1Upload },
  { id: 2, Component: Step2VariantEditor },
  { id: 3, Component: Step3ImageMapping },
  { id: 4, Component: Step4Upload },
] as const;

function useStepValid() {
  const currentStep = useUploadStore((s) => s.currentStep);
  const products = useUploadStore((s) => s.products);
  const mappingConfirmed = useUploadStore((s) => s.mappingConfirmed);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);
  const localImageList = useUploadStore((s) => s.localImageList);

  switch (currentStep) {
    case 1:
      return mappingConfirmed && products.length > 0;
    case 2:
      return products.length > 0;
    case 3:
      return (
        products.length > 0 &&
        (Object.keys(imagesByFilename).length > 0 || localImageList.length > 0)
      );
    case 4:
      return true;
    default:
      return false;
  }
}

export default function Wizard() {
  const currentStep = useUploadStore((s) => s.currentStep);
  const setCurrentStep = useUploadStore((s) => s.setCurrentStep);
  const { resolvedTheme, setTheme } = useTheme();
  const isStepValid = useStepValid();

  const goNext = () => {
    if (currentStep < 4) setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4);
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4);
  };

  const CurrentStepComponent = STEP_CONTENT[currentStep - 1].Component;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Shopify Product Uploader</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        </div>
        <StepIndicator />
      </header>
      <main className="mx-auto p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <CurrentStepComponent />
            <div className="flex justify-between border-t pt-6">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
              {currentStep < 4 ? (
                <Button onClick={goNext} disabled={!isStepValid}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
