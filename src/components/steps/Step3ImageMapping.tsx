import { useCallback, useMemo, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { getAvailableColorsPerProduct, matchImagesToProducts } from "@/utils/imageMapping";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUrlUploader } from "@/components/steps/ImageUrlUploader";
import { LocalFolderPicker } from "@/components/steps/LocalFolderPicker";
import { ProductPagePreview } from "@/components/steps/ProductPagePreview";
import { ImageValidationPanel } from "@/components/steps/ImageValidationPanel";
import { ColorMappingModal } from "@/components/steps/ColorMappingModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, ImageIcon, Eye, CheckSquare, Palette, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export function Step3ImageMapping() {
  const [matching, setMatching] = useState(false);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const products = useUploadStore((s) => s.products);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);
  const localImageList = useUploadStore((s) => s.localImageList);
  const localImageUrls = useUploadStore((s) => s.localImageUrls);
  const selectedProductIndex = useUploadStore((s) => s.selectedProductIndex);
  const setSelectedProduct = useUploadStore((s) => s.setSelectedProduct);
  const updateProduct = useUploadStore((s) => s.updateProduct);
  const moveProductImage = useUploadStore((s) => s.moveProductImage);
  const colorMappingPerProduct = useUploadStore((s) => s.colorMappingPerProduct);
  const setColorMappingPerProduct = useUploadStore((s) => s.setColorMappingPerProduct);

  const hasImageSource =
    Object.keys(imagesByFilename).length > 0 || localImageList.length > 0;

  const runMatch = useCallback(() => {
    // console.log("runMatch", hasImageSource);
    if (!hasImageSource) {
      toast.error("Upload image JSON or select a local folder first.");
      return;
    }
    setMatching(true);
    try {
      const results = matchImagesToProducts(
        products,
        imagesByFilename,
        localImageList
      );
      results.forEach((images, i) => {
        updateProduct(i, { images });
      });
      // console.log("results", results);
      toast.success("Images matched to products.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Match failed.");
    } finally {
      setMatching(false);
    }
  }, [
    hasImageSource,
    products,
    imagesByFilename,
    localImageList,
    updateProduct,
  ]);

  const previewProductIndex =
    selectedProductIndex !== null && selectedProductIndex < products.length
      ? selectedProductIndex
      : 0;
  const previewProduct = products[previewProductIndex];

  const availablePerProduct = useMemo(
    () =>
      getAvailableColorsPerProduct(
        products,
        imagesByFilename,
        localImageList
      ),
    [products, imagesByFilename, localImageList]
  );
  const availableForSelected = availablePerProduct[previewProductIndex];

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No products loaded. Complete Step 1 and Step 2 first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Images
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Validation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-6">
          <ImageUrlUploader />
          <LocalFolderPicker />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Match images to products
              </CardTitle>
              <CardDescription>
                Run auto-match to attach images to products by SKU prefix (e.g. NAOK01-pink-1.jpg → product NAOK01).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3">
              <Button
                onClick={runMatch}
                disabled={!hasImageSource || matching}
              >
                {matching ? "Matching..." : "Match images"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setColorModalOpen(true)}
                disabled={products.length === 0}
              >
                <Palette className="mr-2 h-4 w-4" />
                Map colors
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Image order</CardTitle>
              <CardDescription>
                Set image positions for the selected product. Move images up or down; order is used in preview and export.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm">Product</Label>
                <Select
                  value={String(previewProductIndex)}
                  onValueChange={(v) => setSelectedProduct(parseInt(v, 10))}
                >
                  <SelectTrigger className="mt-1 w-full max-w-[320px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p, i) => (
                      <SelectItem key={p.sku} value={String(i)}>
                        {p.title} — {p.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {previewProduct && (
                <>
                  <Label className="text-sm">Images</Label>
                  <ScrollArea className="h-[280px] rounded-md border">
                    <ul className="p-2 space-y-1">
                      {(previewProduct.images ?? []).length === 0 ? (
                        <li className="py-4 text-center text-sm text-muted-foreground">
                          No images. Run &quot;Match images&quot; first.
                        </li>
                      ) : (
                        (previewProduct.images ?? []).map((img, idx) => {
                          const src = img.url ?? localImageUrls[img.filename] ?? imagesByFilename[img.filename];
                          return (
                            <li
                              key={`${img.filename}-${idx}`}
                              className="flex items-center gap-3 rounded-md border bg-card px-2 py-1.5"
                            >
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded border bg-muted">
                                {src ? (
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">
                                    —
                                  </div>
                                )}
                              </div>
                              <span className="min-w-0 flex-1 truncate text-sm" title={img.filename}>
                                {img.filename}
                              </span>
                              <div className="flex shrink-0 gap-0.5">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={idx === 0}
                                  onClick={() => moveProductImage(previewProductIndex, idx, idx - 1)}
                                  aria-label="Move up"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={idx === (previewProduct.images?.length ?? 0) - 1}
                                  onClick={() => moveProductImage(previewProductIndex, idx, idx + 1)}
                                  aria-label="Move down"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </ScrollArea>
                </>
              )}

              {previewProduct && availableForSelected && availableForSelected.optionColors.length > 0 && (
                <>
                  <Label className="text-sm">Variant image (Color)</Label>
                  <p className="text-xs text-muted-foreground">
                    Assign which image token to use for each color variant.
                  </p>
                  <div className="rounded-md border p-2 space-y-2">
                    {availableForSelected.optionColors.map((color) => {
                      const currentMapping = colorMappingPerProduct[previewProductIndex] ?? {};
                      const value = currentMapping[color] ?? "";
                      return (
                        <div key={color} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-sm font-medium">{color}</span>
                          <Select
                            value={value || "__none__"}
                            onValueChange={(v) => {
                              const next = {
                                ...currentMapping,
                                [color]: v === "__none__" ? "" : v,
                              };
                              const cleaned: Record<string, string> = {};
                              for (const [k, vv] of Object.entries(next)) {
                                if (vv && vv !== "__none__") cleaned[k] = vv;
                              }
                              setColorMappingPerProduct(previewProductIndex, cleaned);
                            }}
                          >
                            <SelectTrigger className="h-8 max-w-[200px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">—</SelectItem>
                              {availableForSelected.imageColorTokens.map((token) => (
                                <SelectItem key={token} value={token}>
                                  {token}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <ColorMappingModal
            open={colorModalOpen}
            onOpenChange={setColorModalOpen}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Product</Label>
            <Select
              value={String(previewProductIndex)}
              onValueChange={(v) => setSelectedProduct(parseInt(v, 10))}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p, i) => (
                  <SelectItem key={p.sku} value={String(i)}>
                    {p.title} - {p.sku}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AnimatePresence mode="wait">
            {previewProduct && (
              <motion.div
                key={previewProductIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ProductPagePreview
                  product={previewProduct}
                  productIndex={previewProductIndex}
                  localImageUrls={localImageUrls}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="validation">
          <ImageValidationPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
