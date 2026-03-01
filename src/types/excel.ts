export type RawRow = Record<string, string | number | undefined>;

export const SYSTEM_FIELD_IDS = [
  "sku",
  "title",
  "category",
  "description",
  "colorOptions",
  "sizes",
  "price",
  "shippingTimeline",
] as const;

export type SystemFieldId = (typeof SYSTEM_FIELD_IDS)[number];

export type ColumnMapping = Partial<Record<SystemFieldId, string>>;

export const REQUIRED_SYSTEM_FIELDS: SystemFieldId[] = ["sku", "title", "price"];

export function isRequiredField(field: SystemFieldId): boolean {
  return REQUIRED_SYSTEM_FIELDS.includes(field);
}
