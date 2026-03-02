import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUploadStore } from "@/store/upload-store";
import type { Product, Variant } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const productFormSchema = z.object({
  title: z.string().min(1),
  handle: z.string().min(1),
  tags: z.string(),
  productType: z.string(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export function Step2VariantEditor() {
  const products = useUploadStore((s) => s.products);
  const selectedProductIndex = useUploadStore((s) => s.selectedProductIndex);
  const setSelectedProduct = useUploadStore((s) => s.setSelectedProduct);
  const updateProduct = useUploadStore((s) => s.updateProduct);
  const addVariant = useUploadStore((s) => s.addVariant);
  const removeVariant = useUploadStore((s) => s.removeVariant);
  const updateVariant = useUploadStore((s) => s.updateVariant);
  const universalTags = useUploadStore((s) => s.universalTags);
  const setUniversalTags = useUploadStore((s) => s.setUniversalTags);

  const [jsonOpen, setJsonOpen] = useState(true);
  const [universalTagsInput, setUniversalTagsInput] = useState("");

  const selectedProduct =
    selectedProductIndex !== null && products[selectedProductIndex]
      ? products[selectedProductIndex]
      : null;

  const { register, setValue, watch, handleSubmit } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      handle: "",
      tags: "",
      productType: "",
    },
  });

  useEffect(() => {
    if (selectedProduct) {
      setValue("title", selectedProduct.title);
      setValue("handle", selectedProduct.handle);
      setValue("tags", selectedProduct.tags.join(", "));
      setValue("productType", selectedProduct.productType);
    }
  }, [selectedProduct, setValue]);

  useEffect(() => {
    setUniversalTagsInput(universalTags.join(", "));
  }, [universalTags]);

  const applyUniversalTags = () => {
    const tags = universalTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setUniversalTags(tags);
  };

  const onSubmit = (data: ProductFormValues) => {
    if (selectedProductIndex === null) return;
    updateProduct(selectedProductIndex, {
      title: data.title,
      handle: data.handle,
      tags: data.tags.split(",").map((t) => t.trim()).filter(Boolean),
      productType: data.productType,
    });
  };

  const handleAddVariant = () => {
    if (selectedProductIndex === null) return;
    const p = products[selectedProductIndex];
    const optNames = p.options.map((o) => o.name);
    const optValues = p.options.map((o) => o.values[0] ?? "");
    addVariant(selectedProductIndex, {
      sku: `${p.sku}-new-${Date.now()}`,
      options: optValues,
      price: "0.00",
    });
  };

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No products loaded. Go back to Step 1 and upload a file.
        </CardContent>
      </Card>
    );
  }

  const effectiveTagsForProduct = (p: Product) =>
    [...new Set([...universalTags, ...p.tags])];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Universal tags</CardTitle>
          <p className="text-xs text-muted-foreground">
            These tags are applied to every product. Use the per-product tags below for product-specific tags.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <Input
              value={universalTagsInput}
              onChange={(e) => setUniversalTagsInput(e.target.value)}
              placeholder="e.g. summer-2024, sale (comma-separated)"
              className="h-9"
            />
          </div>
          <Button type="button" size="sm" onClick={applyUniversalTags}>
            Apply to all products
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <ul className="space-y-0">
                {products.map((p, i) => (
                  <li key={p.sku}>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(i)}
                      className={`w-full border-b px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                        selectedProductIndex === i ? "bg-muted" : ""
                      }`}
                    >
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-5">
        {selectedProduct && selectedProductIndex !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Edit product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input {...register("title")} className="mt-1" />
                </div>
                <div>
                  <Label>Handle</Label>
                  <Input {...register("handle")} className="mt-1" />
                </div>
                <div>
                  <Label>Tags (comma-separated, product-specific)</Label>
                  <Input {...register("tags")} className="mt-1" placeholder="Extra tags for this product only" />
                </div>
                <div>
                  <Label>Product type</Label>
                  <Input {...register("productType")} className="mt-1" />
                </div>
                <Button type="submit" size="sm">
                  Save product
                </Button>
              </form>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddVariant}>
                    <Plus className="h-4 w-4" /> Add variant
                  </Button>
                </div>
                <ScrollArea className="h-[240px] rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedProduct.options.map((o) => (
                          <TableHead key={o.name}>{o.name}</TableHead>
                        ))}
                        <TableHead>Price</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProduct.variants.map((v, vi) => (
                        <TableRow key={v.sku}>
                          {v.options.map((opt, oi) => (
                            <TableCell key={oi}>{opt}</TableCell>
                          ))}
                          <TableCell>
                            <Input
                              value={v.price}
                              onChange={(e) =>
                                updateVariant(selectedProductIndex as number, vi, {
                                  price: e.target.value,
                                })
                              }
                              className="h-8 w-20"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={v.sku}
                              onChange={(e) =>
                                updateVariant(selectedProductIndex as number, vi, {
                                  sku: e.target.value,
                                })
                              }
                              className="h-8 text-xs"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => removeVariant(selectedProductIndex as number, vi)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
        {!selectedProduct && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Select a product from the list.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-4">
        <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              JSON preview
              <ChevronDown className={`h-4 w-4 transition-transform ${jsonOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="mt-2 h-[500px] rounded border bg-muted/30 p-3">
              <pre className="text-xs">
                {JSON.stringify(
                  selectedProduct
                    ? [{ ...selectedProduct, tags: effectiveTagsForProduct(selectedProduct) }]
                    : products.map((p) => ({ ...p, tags: effectiveTagsForProduct(p) })),
                  null,
                  2
                )}
              </pre>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>
      </div>
    </div>
  );
}
