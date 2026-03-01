import { useCallback, useState, useEffect } from "react";
import { useUploadStore } from "@/store/upload-store";
import { parseExcelWorkbook, getSheetData } from "@/utils/excelParse";
import { ColumnMapperModal } from "@/components/ColumnMapperModal";
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
import { Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export function Step1Upload() {
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [mapperOpen, setMapperOpen] = useState(false);

  const workbook = useUploadStore((s) => s.workbook);
  const sheetNames = useUploadStore((s) => s.sheetNames);
  const selectedSheetName = useUploadStore((s) => s.selectedSheetName);
  const products = useUploadStore((s) => s.products);
  const mappingConfirmed = useUploadStore((s) => s.mappingConfirmed);

  const setWorkbook = useUploadStore((s) => s.setWorkbook);
  const setSheetNames = useUploadStore((s) => s.setSheetNames);
  const setSelectedSheetName = useUploadStore((s) => s.setSelectedSheetName);
  const setRawRows = useUploadStore((s) => s.setRawRows);
  const setExcelHeaders = useUploadStore((s) => s.setExcelHeaders);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const name = file.name.toLowerCase();
      if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
        toast.error("Please upload an Excel file (.xlsx or .xls).");
        return;
      }
      setLoading(true);
      try {
        const { workbook: wb, sheetNames: names } = await parseExcelWorkbook(file);
        setWorkbook(wb);
        setSheetNames(names);
        setSelectedSheetName(names[0] ?? null);
        toast.success("Excel file loaded. Select a sheet and map columns.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to parse Excel.");
      } finally {
        setLoading(false);
      }
    },
    [setWorkbook, setSheetNames, setSelectedSheetName]
  );

  useEffect(() => {
    if (!workbook || !selectedSheetName) return;
    try {
      const { headers, rows } = getSheetData(workbook, selectedSheetName);
      setExcelHeaders(headers);
      setRawRows(rows);
      setMapperOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read sheet.");
    }
  }, [workbook, selectedSheetName, setExcelHeaders, setRawRows]);

  const onSheetChange = (name: string) => {
    setSelectedSheetName(name);
    setMapperOpen(true);
  };

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

  const canProceed = mappingConfirmed && products.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Upload Excel</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx or .xls). Select a sheet and map columns to system fields.
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
              accept=".xlsx,.xls"
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
                  <span className="text-sm font-medium">Drop Excel file or click to browse</span>
                  <span className="text-xs text-muted-foreground">.xlsx or .xls</span>
                </>
              )}
            </label>
          </div>

          {workbook && sheetNames.length > 0 && (
            <div className="space-y-2">
              <Label>Sheet</Label>
              <Select value={selectedSheetName ?? ""} onValueChange={onSheetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheetNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMapperOpen(true)}
              >
                Edit column mapping
              </Button>
            </div>
          )}

          {canProceed && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {products.length} product(s) ready. You can proceed to the next step.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <ColumnMapperModal open={mapperOpen} onOpenChange={setMapperOpen} />
    </>
  );
}
