import { useState, useMemo, useEffect } from "react";
import { useUploadStore } from "@/store/upload-store";
import { getImagesForColor } from "@/utils/imageMapping";
import type { Product } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ProductPagePreviewProps = {
  product: Product;
  productIndex: number;
  localImageUrls: Record<string, string>;
};

export function ProductPagePreview({
  product,
  productIndex,
  localImageUrls,
}: ProductPagePreviewProps) {
  const [mainIndex, setMainIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(() => null);
  const [selectedSize, setSelectedSize] = useState<string | null>(() => null);
  const colorMappingPerProduct = useUploadStore((s) => s.colorMappingPerProduct);
  const optionToImageTerm = colorMappingPerProduct[productIndex];
  const colorOpt = product.options.find((o) => o.name.toLowerCase() === "color");
  const sizeOpt = product.options.find((o) => o.name.toLowerCase() === "size");
  const images = product.images ?? [];
  const effectiveColor = selectedColor ?? colorOpt?.values[0] ?? null;
  const effectiveSize = selectedSize ?? sizeOpt?.values[0] ?? null;
  console.log(optionToImageTerm);
  const displayImages = useMemo(() => {
    if (!colorOpt || !effectiveColor) return images;
    return getImagesForColor(
      images,
      effectiveColor,
      product.sku,
      optionToImageTerm
    );
  }, [images, colorOpt, effectiveColor, product.sku, optionToImageTerm]);

  const safeMainIndex = Math.min(mainIndex, Math.max(0, displayImages.length - 1));
  useEffect(() => {
    if (mainIndex >= displayImages.length && displayImages.length > 0) {
      setMainIndex(0);
    }
  }, [displayImages.length, mainIndex]);
  const mainImage = displayImages[safeMainIndex];
  const mainSrc = mainImage
    ? mainImage.url ?? localImageUrls[mainImage.filename]
    : null;
  const firstPrice = product.variants[0]?.price ?? "—";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl text-center">{product.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1 space-y-2">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {mainSrc ? (
              <img
                src={mainSrc}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No image
              </div>
            )}
          </div>
          {displayImages.length > 1 && (
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {displayImages.map((img, i) => {
                  const src = img.url ?? localImageUrls[img.filename];
                  return (
                    <button
                      key={img.filename}
                      type="button"
                      onClick={() => setMainIndex(i)}
                      className={cn(
                        "h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition-colors",
                        i === safeMainIndex
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/50"
                      )}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-lg font-medium">Price: {firstPrice}</p>
          {colorOpt && (
            <div>
              <p className="mb-2 text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {colorOpt.values.map((c) => (
                  <Button
                    key={c}
                    type="button"
                    variant={effectiveColor === c ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedColor(c);
                      setMainIndex(0);
                    }}
                  >
                    {c}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {sizeOpt && (
            <div>
              <p className="mb-2 text-sm font-medium">Size</p>
              <Select
                value={effectiveSize ?? ""}
                onValueChange={(v) => setSelectedSize(v)}
              >
                <SelectTrigger>
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
          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          <p className="text-sm text-muted-foreground">Tags: {product.tags}</p>
          <p className="text-sm text-muted-foreground">Product Type: {product.productType}</p>
          <p className="text-sm text-muted-foreground">Handle: {product.handle}</p>
          <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}></p>
        </div>
      </CardContent>
    </Card>
  );
}
