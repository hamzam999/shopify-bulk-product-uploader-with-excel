import { useUploadStore } from "@/store/upload-store";
import { computeValidation } from "@/utils/imageMapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle } from "lucide-react";

export function ImageValidationPanel() {
  const products = useUploadStore((s) => s.products);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);
  const localImageList = useUploadStore((s) => s.localImageList);
  const colorMappingPerProduct = useUploadStore((s) => s.colorMappingPerProduct);

  const { summary, perProduct } = computeValidation(
    products,
    imagesByFilename,
    localImageList,
    colorMappingPerProduct
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Summary</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Total images: {summary.totalImages}</li>
            <li>Unmatched images: {summary.unmatchedCount}</li>
            <li>Products missing images: {summary.productsMissingImages}</li>
          </ul>
          {summary.unmatchedFilenames.length > 0 && summary.unmatchedFilenames.length <= 10 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Unmatched: {summary.unmatchedFilenames.join(", ")}
            </p>
          )}
          {summary.unmatchedFilenames.length > 10 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Unmatched: {summary.unmatchedFilenames.slice(0, 5).join(", ")} and{" "}
              {summary.unmatchedFilenames.length - 5} more
            </p>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          <ul className="space-y-2">
            {perProduct.map((v) => (
              <li
                key={v.productIndex}
                className="rounded border p-3 text-sm"
              >
                <p className="font-medium">{v.productTitle} - {products[v.productIndex].sku}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  <li className="flex items-center gap-1">
                    {v.imagesMatched ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Images matched</span>
                  </li>
                  <li className="flex items-center gap-1">
                    {v.colorsMatched ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>Colors matched</span>
                  </li>
                  {v.missingUrlsCount > 0 && (
                    <li className="flex items-center gap-1 text-amber-600">
                      <XCircle className="h-4 w-4" />
                      <span>Missing image URLs: {v.missingUrlsCount}</span>
                    </li>
                  )}
                  {v.missingVariantColors.length > 0 && (
                    <li className="flex items-center gap-1 text-amber-600">
                      <XCircle className="h-4 w-4" />
                      <span>Missing variant colors: {v.missingVariantColors.join(", ")}</span>
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
