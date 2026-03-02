import { useCallback, useState } from "react";
import { useUploadStore } from "@/store/upload-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, X } from "lucide-react";
import { toast } from "sonner";
import { Label } from "../ui/label";

const ALLOWED_EXT = /\.(jpg|jpeg|png|webp)$/i;

export function LocalFolderPicker() {
  const [loading, setLoading] = useState(false);
  const localImageList = useUploadStore((s) => s.localImageList);
  const localImageUrls = useUploadStore((s) => s.localImageUrls);
  const setLocalImageList = useUploadStore((s) => s.setLocalImageList);
  const setLocalImageUrls = useUploadStore((s) => s.setLocalImageUrls);

  const revokeAll = useCallback(() => {
    Object.values(localImageUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    setLocalImageUrls({});
    setLocalImageList([]);
  }, [localImageUrls, setLocalImageUrls, setLocalImageList]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setLoading(true);
      revokeAll();
      const list: string[] = [];
      const urls: Record<string, string> = {};
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? file.name;
        const segments = path.split("/");
        if (segments.length !== 2) continue;
        const name = file.name;
        if (!ALLOWED_EXT.test(name)) continue;
        list.push(name);
        urls[name] = URL.createObjectURL(file);
      }
      setLocalImageList(list);
      setLocalImageUrls(urls);
      setLoading(false);
      if (list.length > 0) toast.success(`${list.length} local image(s) loaded.`);
      e.target.value = "";
    },
    [revokeAll, setLocalImageList, setLocalImageUrls]
  );

  const count = localImageList.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local images folder</CardTitle>
        <CardDescription>
          Select a flat folder (no subfolders). Only .jpg, .jpeg, .png, .webp are accepted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="local-folder"
            {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            multiple
            onChange={handleChange}
            disabled={loading}
            className="hidden"
          />
          <Label htmlFor="local-folder" className="cursor-pointer">
            <Button type="button" variant="outline" asChild>
              <span>
                <FolderOpen className="mr-2 h-4 w-4" />
                {loading ? "Loading..." : "Select Images Folder"}
              </span>
            </Button>
          </Label>
          {count > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={revokeAll}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
        </div>
        {count > 0 && (
          <>
            <p className="text-sm text-muted-foreground">{count} image(s)</p>
            <div className="grid max-h-48 grid-cols-4 gap-2 overflow-auto rounded border p-2 sm:grid-cols-6">
              {localImageList.slice(0, 24).map((filename) => (
                <div
                  key={filename}
                  className="aspect-square overflow-hidden rounded bg-muted"
                >
                  <img
                    src={localImageUrls[filename]}
                    alt={filename}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {count > 24 && (
                <div className="flex aspect-square items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  +{count - 24} more
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
