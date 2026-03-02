import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { parseImageUrlMapFile, parseImageUrlMapFromString } from "@/utils/imageMapping";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileJson } from "lucide-react";
import { toast } from "sonner";

export function ImageUrlUploader() {
  const [loading, setLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const setImagesByFilename = useUploadStore((s) => s.setImagesByFilename);
  const imagesByFilename = useUploadStore((s) => s.imagesByFilename);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const map = await parseImageUrlMapFile(file);
        setImagesByFilename(map);
        toast.success(`${Object.keys(map).length} image URL(s) loaded.`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Invalid image JSON.");
      } finally {
        setLoading(false);
      }
    },
    [setImagesByFilename]
  );

  const handlePaste = useCallback(() => {
    const trimmed = pasteText.trim();
    if (!trimmed) {
      toast.error("Paste JSON first.");
      return;
    }
    try {
      const map = parseImageUrlMapFromString(trimmed);
      setImagesByFilename(map);
      toast.success(`${Object.keys(map).length} image URL(s) loaded.`);
      setPasteText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid image JSON.");
    }
  }, [pasteText, setImagesByFilename]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const count = Object.keys(imagesByFilename).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Image URL map</CardTitle>
        <CardDescription>
          Upload a JSON file or paste JSON (Shopify GraphQL-style: data.files.edges with node.image.url). Filenames are extracted from URLs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".json"
            onChange={onInputChange}
            disabled={loading}
            className="hidden"
            id="image-json-upload"
          />
          <Label htmlFor="image-json-upload" className="cursor-pointer">
            <Button type="button" variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                {loading ? "Loading..." : "Upload JSON file"}
              </span>
            </Button>
          </Label>
          {count > 0 && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileJson className="h-4 w-4" />
              {count} image(s)
            </span>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="image-json-paste">Or paste JSON</Label>
          <textarea
            id="image-json-paste"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder='{"data":{"files":{"edges":[...]}}}'
            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={5}
          />
          <Button type="button" variant="secondary" size="sm" onClick={handlePaste}>
            Load from paste
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
