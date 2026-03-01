import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { parseImageListFile, groupImagesBySku, type ImageListItem } from "@/utils/imageMock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export function Step3ImageMapping() {
  const products = useUploadStore((s) => s.products);
  const imageList = useUploadStore((s) => s.imageList);
  const setImageList = useUploadStore((s) => s.setImageList);
  const imageMapping = useUploadStore((s) => s.imageMapping);
  const setImageMapping = useUploadStore((s) => s.setImageMapping);

  const [loading, setLoading] = useState(false);
  const [selectedColorByProduct, setSelectedColorByProduct] = useState<Record<number, string>>({});

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const list = await parseImageListFile(file);
        setImageList(list);
        toast.success(`Loaded ${list.length} image(s).`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to parse file.");
      } finally {
        setLoading(false);
      }
    },
    [setImageList]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const imagesBySku = groupImagesBySku(imageList);

  const getImagesForProductAndColor = (productIndex: number, color: string) => {
    const p = products[productIndex];
    if (!p) return [];
    const colorOpt = p.options.find((o) => o.name.toLowerCase() === "color");
    if (!colorOpt) return [];
    const variantsWithColor = p.variants.filter((v) => {
      const colorIdx = p.options.findIndex((o) => o.name.toLowerCase() === "color");
      return colorIdx >= 0 && v.options[colorIdx] === color;
    });
    const skus = variantsWithColor.map((v) => v.sku);
    const out: ImageListItem[] = [];
    for (const sku of skus) {
      (imagesBySku[sku] ?? []).forEach((img) => out.push(img));
    }
    return out;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image list</CardTitle>
          <CardDescription>
            Upload a JSON file with image list (sku, filename, url). Or use mock data by uploading any file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              onChange={onInputChange}
              disabled={loading}
              className="hidden"
              id="image-list-upload"
            />
            <Label htmlFor="image-list-upload" className="cursor-pointer">
              <Button type="button" variant="outline" asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {loading ? "Loading..." : "Upload image list"}
                </span>
              </Button>
            </Label>
            {imageList.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {imageList.length} image(s) loaded, grouped by SKU.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {imageList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Product preview</CardTitle>
            <CardDescription>
              Select color to filter images. Gallery shows images for selected variant option.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="grid gap-6 sm:grid-cols-2">
                {products.map((product, productIndex) => {
                  const colorOpt = product.options.find(
                    (o) => o.name.toLowerCase() === "color"
                  );
                  const sizeOpt = product.options.find(
                    (o) => o.name.toLowerCase() === "size"
                  );
                  const selectedColor =
                    selectedColorByProduct[productIndex] ?? colorOpt?.values[0];
                  const images = selectedColor
                    ? getImagesForProductAndColor(productIndex, selectedColor)
                    : [];
                  const firstPrice = product.variants[0]?.price ?? "—";

                  return (
                    <Card key={product.sku}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                            {images[0]?.url ? (
                              <img
                                src={images[0].url}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                No image
                              </div>
                            )}
                          </div>
                          <h3 className="font-medium">{product.title}</h3>
                          <p className="text-sm text-muted-foreground">${firstPrice}</p>
                          {colorOpt && (
                            <div>
                              <Label className="text-xs">Color</Label>
                              <Select
                                value={selectedColor ?? ""}
                                onValueChange={(val) =>
                                  setSelectedColorByProduct((prev) => ({
                                    ...prev,
                                    [productIndex]: val,
                                  }))
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {colorOpt.values.map((v) => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {sizeOpt && (
                            <div>
                              <Label className="text-xs">Size</Label>
                              <Select>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Size" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sizeOpt.values.map((v) => (
                                    <SelectItem key={v} value={v}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {imageList.length === 0 && products.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Upload an image list to see product previews.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
