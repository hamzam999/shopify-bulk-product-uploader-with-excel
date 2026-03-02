import { useState, useEffect } from "react";
import { useUploadStore } from "@/store/upload-store";
import { transformRowsToProducts } from "@/utils/transformRowsToProducts";
import {
  SYSTEM_FIELD_IDS,
  isRequiredField,
  type SystemFieldId,
  type ColumnMapping,
} from "@/types/excel";
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
import { toast } from "sonner";

const FIELD_LABELS: Record<SystemFieldId, string> = {
  sku: "SKU",
  title: "Title",
  category: "Category",
  description: "Description",
  colorOptions: "Color options",
  sizes: "Sizes",
  price: "Price",
  shippingTimeline: "Shipping timeline",
};

type ColumnMapperModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ColumnMapperModal({ open, onOpenChange }: ColumnMapperModalProps) {
  const excelHeaders = useUploadStore((s) => s.excelHeaders);
  const rawRows = useUploadStore((s) => s.rawRows);
  const columnMapping = useUploadStore((s) => s.columnMapping);
  const setColumnMapping = useUploadStore((s) => s.setColumnMapping);
  const setProducts = useUploadStore((s) => s.setProducts);
  const setMappingConfirmed = useUploadStore((s) => s.setMappingConfirmed);

  const [localMapping, setLocalMapping] = useState<ColumnMapping>({});
  const NONE = "__none__";

  /** Auto-match: if an Excel header has the same name as (or includes / is included in) the system field id or label, pre-select it. */
  function getInitialMapping(): ColumnMapping {
    const mapping: ColumnMapping = { ...(columnMapping ?? {}) };
    for (const fieldId of SYSTEM_FIELD_IDS) {
      if (mapping[fieldId]) continue;
      const fieldLower = fieldId.toLowerCase();
      const labelLower = FIELD_LABELS[fieldId].toLowerCase();
      const matched = excelHeaders.find((header) => {
        const h = String(header).trim().toLowerCase();
        if (!h) return false;
        return (
          h === fieldLower ||
          h === labelLower ||
          h.includes(fieldLower) ||
          fieldLower.includes(h) ||
          h.includes(labelLower) ||
          labelLower.includes(h)
        );
      });
      if (matched) mapping[fieldId] = matched;
    }
    return mapping;
  }

  useEffect(() => {
    if (open) {
      if (columnMapping && Object.keys(columnMapping).length > 0) {
        setLocalMapping(columnMapping);
      } else {
        setLocalMapping(getInitialMapping());
      }
    }
  }, [open, excelHeaders, columnMapping]);

  const setField = (field: SystemFieldId, excelHeader: string) => {
    if (!excelHeader || excelHeader === NONE) {
      setLocalMapping((m) => {
        const next = { ...m };
        delete next[field];
        return next;
      });
    } else {
      setLocalMapping((m) => ({ ...m, [field]: excelHeader }));
    }
  };

  const handleConfirm = () => {
    const missing = ["sku", "title", "price"].filter(
      (f) => !localMapping[f as SystemFieldId]
    );
    if (missing.length) {
      toast.error(`Required fields must be mapped: ${missing.join(", ")}`);
      return;
    }
    setColumnMapping(localMapping);
    const products = transformRowsToProducts(rawRows, localMapping);
    setProducts(products);
    setMappingConfirmed(true);
    onOpenChange(false);
    toast.success(`${products.length} product(s) generated.`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" showClose={true}>
        <DialogHeader>
          <DialogTitle>Map columns</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2 text-sm font-medium text-muted-foreground">
            System field
          </div>
          <div className="space-y-2 text-sm font-medium text-muted-foreground">
            Excel column
          </div>
          {SYSTEM_FIELD_IDS.map((fieldId) => (
            <div key={fieldId} className="contents">
              <div className="flex items-center gap-2">
                <Label>{FIELD_LABELS[fieldId]}</Label>
                {isRequiredField(fieldId) && (
                  <span className="text-destructive">*</span>
                )}
              </div>
              <Select
                value={localMapping[fieldId] ?? NONE}
                onValueChange={(v) => setField(fieldId, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Not mapped —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— Not mapped —</SelectItem>
                  {excelHeaders.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
