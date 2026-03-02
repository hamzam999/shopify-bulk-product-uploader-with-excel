import { useState, useMemo } from "react";
import { useUploadStore } from "@/store/upload-store";
import { uploadProducts } from "@/services/upload";
import {
  generateShopifyCsv,
  validateForExport,
} from "@/utils/shopifyCsvGenerator";
import {
  generateGraphqlExport,
  validateForGraphqlExport,
} from "@/utils/shopifyGraphqlGenerator";
import type { GraphqlProduct } from "@/utils/shopifyGraphqlGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Upload, AlertCircle, Download, Copy } from "lucide-react";
import { toast } from "sonner";

export function Step4Upload() {
  const products = useUploadStore((s) => s.products);
  const universalTags = useUploadStore((s) => s.universalTags);
  const colorMappingPerProduct = useUploadStore((s) => s.colorMappingPerProduct);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);
  const uploadProgress = useUploadStore((s) => s.uploadProgress);
  const uploadStatus = useUploadStore((s) => s.uploadStatus);
  const currentUploadProduct = useUploadStore((s) => s.currentUploadProduct);
  const setUploadProgress = useUploadStore((s) => s.setUploadProgress);
  const setUploadStatus = useUploadStore((s) => s.setUploadStatus);
  const setCurrentUploadProduct = useUploadStore((s) => s.setCurrentUploadProduct);
  const setCurrentStep = useUploadStore((s) => s.setCurrentStep);
  const resetUpload = useUploadStore((s) => s.resetUpload);

  const [result, setResult] = useState<{ success: number; failed: string[] } | null>(null);
  const [graphqlProductIndex, setGraphqlProductIndex] = useState(0);
  const [productIdFromCreate, setProductIdFromCreate] = useState("");

  const graphqlProducts = useMemo((): GraphqlProduct[] => {
    return products.map((p) => {
      const images =
        p.images?.map((img) => ({
          filename: img.filename,
          url: img.url ?? imagesByFilename[img.filename] ?? "",
        })) ?? [];
      return {
        sku: p.sku,
        handle: p.handle,
        title: p.title,
        productType: p.productType,
        descriptionHtml: p.descriptionHtml,
        tags: p.tags,
        options: p.options,
        variants: p.variants,
        images: images.filter((img) => img.url),
      };
    });
  }, [products, imagesByFilename]);

  const graphqlExport = useMemo(
    () =>
      graphqlProducts.length > 0
        ? generateGraphqlExport(
            graphqlProducts,
            universalTags,
            graphqlProductIndex,
            productIdFromCreate || undefined,
            colorMappingPerProduct
          )
        : null,
    [
      graphqlProducts,
      universalTags,
      graphqlProductIndex,
      productIdFromCreate,
      colorMappingPerProduct,
    ]
  );

  const graphqlValidation = useMemo(
    () => validateForGraphqlExport(graphqlProducts),
    [graphqlProducts]
  );

  const handleCopyMutation = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard.`);
  };

  const csvInput = useMemo(
    () => ({
      products,
      universalTags,
      colorMappingPerProduct,
      imagesByFilename,
    }),
    [products, universalTags, colorMappingPerProduct, imagesByFilename]
  );

  const csvValidation = useMemo(
    () => validateForExport(csvInput),
    [csvInput]
  );

  const csvExportResult = useMemo(
    () => (csvValidation.valid ? generateShopifyCsv(csvInput) : null),
    [csvInput, csvValidation.valid]
  );

  const handleDownloadCsv = () => {
    const result = csvExportResult;
    if (!result || !result.validation.valid) {
      toast.error("Cannot export: validation failed.");
      return;
    }
    if (!result.csv) {
      toast.error("No CSV data to download.");
      return;
    }
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopify-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded CSV: ${products.length} products, ${result.rowCount} rows.`);
  };

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
          <CardTitle>Export Shopify CSV</CardTitle>
          <CardDescription>
            Generate a Shopify bulk import CSV file from your validated products. Use for manual import in Shopify Admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              onClick={handleDownloadCsv}
              disabled={
                products.length === 0 || !csvValidation.valid
              }
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            {products.length > 0 && csvExportResult && (
              <span className="text-sm text-muted-foreground">
                {products.length} product(s), {csvExportResult.rowCount} total rows
              </span>
            )}
          </div>
          {!csvValidation.valid && csvValidation.errors.length > 0 && (
            <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive">
                Validation errors (fix before export):
              </p>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {csvValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GraphQL Mutations</CardTitle>
          <CardDescription>
            Generate productCreate and productVariantsBulkCreate mutations. Copy and run in Shopify GraphiQL or your API client. Images are attached separately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium">Product</span>
                <Select
                  value={String(graphqlProductIndex)}
                  onValueChange={(v) => setGraphqlProductIndex(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p, i) => (
                      <SelectItem key={p.sku} value={String(i)}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {graphqlValidation.valid && graphqlExport?.mutations.productMutation ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">1. productCreate</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyMutation(
                            graphqlExport.mutations.productMutation,
                            "productCreate mutation"
                          )
                        }
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-48 overflow-auto rounded border bg-muted/50 p-3 text-xs">
                      <code>{graphqlExport.mutations.productMutation}</code>
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-id-input" className="text-sm font-medium">
                      2. Paste product ID from productCreate response
                    </Label>
                    <Input
                      id="product-id-input"
                      placeholder="gid://shopify/Product/1234567890"
                      value={productIdFromCreate}
                      onChange={(e) => setProductIdFromCreate(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Run productCreate, copy the product id from the response, paste above. The variants mutation below will use it.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">3. productVariantsBulkCreate</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleCopyMutation(
                            graphqlExport.mutations.variantsMutation,
                            "productVariantsBulkCreate mutation"
                          )
                        }
                      >
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </Button>
                    </div>
                    <pre className="max-h-48 overflow-auto rounded border bg-muted/50 p-3 text-xs">
                      <code>{graphqlExport.mutations.variantsMutation}</code>
                    </pre>
                  </div>
                  {!productIdFromCreate.trim() && (
                    <p className="text-xs text-muted-foreground">
                      Paste the product ID above to update the variants mutation. Then copy and run it.
                    </p>
                  )}
                </div>
              ) : null}

              {!graphqlValidation.valid && graphqlValidation.errors.length > 0 && (
                <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">
                    Validation errors (fix before generating):
                  </p>
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {graphqlValidation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {graphqlValidation.valid && (
                <p className="text-sm text-muted-foreground">
                  {products.length} product(s) ready. Run productCreate first, then productVariantsBulkCreate with the returned product ID.
                </p>
              )}
            </>
          )}

          {products.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No products loaded. Complete earlier steps first.
            </p>
          )}
        </CardContent>
      </Card>

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
