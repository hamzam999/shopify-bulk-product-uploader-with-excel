import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { parseProductsFile } from "@/utils/mockParse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileJson } from "lucide-react";
import { toast } from "sonner";

export function Step1Upload() {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const setProducts = useUploadStore((s) => s.setProducts);
  const products = useUploadStore((s) => s.products);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      setLoading(true);
      try {
        const parsed = await parseProductsFile(file);
        setProducts(parsed);
        toast.success(`${parsed.length} product(s) loaded.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to parse file.");
      } finally {
        setLoading(false);
      }
    },
    [setProducts]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload products</CardTitle>
        <CardDescription>
          Upload a products.json file or an Excel file (mock: .xlsx will load sample data).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`
            flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12
            transition-colors
            ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          `}
        >
          <input
            type="file"
            accept=".json,.xlsx,.xls"
            onChange={onInputChange}
            disabled={loading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex cursor-pointer flex-col items-center gap-2 text-center"
          >
            {loading ? (
              <span className="text-muted-foreground">Parsing...</span>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium">Drop file here or click to browse</span>
                <span className="text-xs text-muted-foreground">.json or .xlsx</span>
              </>
            )}
          </label>
        </div>
        {products.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3">
            <FileJson className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">
              {products.length} product(s) loaded. You can proceed to the next step.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
