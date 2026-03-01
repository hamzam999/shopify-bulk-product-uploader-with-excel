import { useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { uploadProducts } from "@/services/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function Step4Upload() {
  const products = useUploadStore((s) => s.products);
  const uploadProgress = useUploadStore((s) => s.uploadProgress);
  const uploadStatus = useUploadStore((s) => s.uploadStatus);
  const currentUploadProduct = useUploadStore((s) => s.currentUploadProduct);
  const setUploadProgress = useUploadStore((s) => s.setUploadProgress);
  const setUploadStatus = useUploadStore((s) => s.setUploadStatus);
  const setCurrentUploadProduct = useUploadStore((s) => s.setCurrentUploadProduct);
  const setCurrentStep = useUploadStore((s) => s.setCurrentStep);
  const resetUpload = useUploadStore((s) => s.resetUpload);

  const [result, setResult] = useState<{ success: number; failed: string[] } | null>(null);

  const handleUpload = async () => {
    if (products.length === 0) {
      toast.error("No products to upload.");
      return;
    }
    setUploadStatus("uploading");
    setResult(null);
    setUploadProgress(0);
    try {
      const res = await uploadProducts(products, (progress, currentProduct) => {
        setUploadProgress(progress);
        setCurrentUploadProduct(currentProduct);
      });
      setResult(res);
      setUploadStatus("success");
      setCurrentUploadProduct(undefined);
      if (res.failed.length > 0) {
        res.failed.forEach((title) => toast.error(`Failed: ${title}`));
      }
      toast.success(`Upload complete. ${res.success} succeeded, ${res.failed.length} failed.`);
    } catch (e) {
      setUploadStatus("error");
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    }
  };

  const isUploading = uploadStatus === "uploading";
  const isSuccess = uploadStatus === "success" && result !== null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload to Shopify</CardTitle>
          <CardDescription>
            Mock upload: simulates CLI upload with progress. No API calls are made.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isSuccess && (
            <>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || products.length === 0}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "Uploading..." : "Start upload"}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {products.length} product(s) ready.
                </span>
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {currentUploadProduct
                      ? `Uploading: ${currentUploadProduct}`
                      : "Preparing..."}
                  </p>
                </div>
              )}
            </>
          )}

          {isSuccess && result && (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Upload complete</span>
              </div>
              <p className="text-sm">
                {result.success} product(s) uploaded successfully.
                {result.failed.length > 0 && (
                  <> {result.failed.length} failed.</>
                )}
              </p>
              {result.failed.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Failed:</p>
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {result.failed.map((title) => (
                      <li key={title}>{title}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetUpload();
                    setResult(null);
                    setCurrentStep(1);
                  }}
                >
                  Start over
                </Button>
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back to Image Mapping
                </Button>
              </div>
            </div>
          )}

          {uploadStatus === "error" && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Upload failed. You can try again.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
