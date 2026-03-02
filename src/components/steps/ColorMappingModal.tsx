import { useState, useEffect, useMemo } from "react";
import { useUploadStore } from "@/store/upload-store";
import {
  getAvailableColorsPerProduct,
  suggestColorMapping,
  type AvailableColorsPerProduct,
} from "@/utils/imageMapping";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Palette } from "lucide-react";
import { toast } from "sonner";

const EMPTY = "__empty__";

type ColorMappingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ColorMappingModal({ open, onOpenChange }: ColorMappingModalProps) {
  const products = useUploadStore((s) => s.products);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);
  const localImageList = useUploadStore((s) => s.localImageList);
  const colorMappingPerProduct = useUploadStore((s) => s.colorMappingPerProduct);
  const setColorMappingPerProduct = useUploadStore((s) => s.setColorMappingPerProduct);

  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [localMapping, setLocalMapping] = useState<Record<string, string>>({});

  const available = useMemo(
    () =>
      getAvailableColorsPerProduct(
        products,
        imagesByFilename,
        localImageList
      ),
    [products, imagesByFilename, localImageList]
  );

  const current: AvailableColorsPerProduct | undefined = available[selectedProductIndex];

  useEffect(() => {
    if (!open || !current) return;
    const existing = colorMappingPerProduct[current.productIndex] ?? {};
    const suggested = suggestColorMapping(
      current.optionColors,
      current.imageColorTokens
    );
    const merged: Record<string, string> = {};
    for (const opt of current.optionColors) {
      merged[opt] = existing[opt] ?? suggested[opt] ?? "";
    }
    setLocalMapping(merged);
  }, [open, current, colorMappingPerProduct]);

  const handleSave = () => {
    if (!current) return;
    const toSave: Record<string, string> = {};
    for (const [opt, token] of Object.entries(localMapping)) {
      if (token && token !== EMPTY) toSave[opt] = token;
    }
    setColorMappingPerProduct(current.productIndex, toSave);
    toast.success("Color mapping saved.");
    onOpenChange(false);
  };

  if (products.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Map option colors to image filenames
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          For each product color option, choose which filename token to match (e.g. OLIVE GREEN → green). Option colors from data; tokens from image filenames. Prefilled when the option name contains the token.
        </p>
        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div>
            <Label>Product</Label>
            <Select
              value={String(selectedProductIndex)}
              onValueChange={(v) => setSelectedProductIndex(parseInt(v, 10))}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {available.map((a) => (
                  <SelectItem key={a.sku} value={String(a.productIndex)}>
                    {products[a.productIndex]?.title ?? a.sku} ({a.sku})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {current && (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Option colors (data):</span>{" "}
                  {current.optionColors.length
                    ? current.optionColors.join(", ")
                    : "—"}
                </div>
                <div>
                  <span className="font-medium">Image tokens (filenames):</span>{" "}
                  {current.imageColorTokens.length
                    ? current.imageColorTokens.join(", ")
                    : "—"}
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-[200px] rounded border p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Option color</th>
                      <th className="text-left py-2 font-medium">Map to image token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.optionColors.map((opt) => (
                      <tr key={opt} className="border-b last:border-0">
                        <td className="py-2">{opt}</td>
                        <td className="py-2">
                          <Select
                            value={localMapping[opt] || EMPTY}
                            onValueChange={(v) =>
                              setLocalMapping((m) => ({
                                ...m,
                                [opt]: v === EMPTY ? "" : v,
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 w-full max-w-[200px]">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={EMPTY}>—</SelectItem>
                              {current.imageColorTokens.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save mapping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
