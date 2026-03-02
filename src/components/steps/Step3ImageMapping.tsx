import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { matchImagesToProducts } from "@/utils/imageMapping";
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
import { Link2, ImageIcon, Eye, CheckSquare, Palette } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
                    {p.title}
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
