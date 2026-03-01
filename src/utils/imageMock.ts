export type ImageListItem = { sku: string; filename: string; url?: string };

const MOCK_IMAGE_LIST: ImageListItem[] = [
  { sku: "SHIRT-001-W-S", filename: "shirt-white-s.jpg", url: "https://picsum.photos/200/200?r=1" },
  { sku: "SHIRT-001-W-M", filename: "shirt-white-m.jpg", url: "https://picsum.photos/200/200?r=2" },
  { sku: "SHIRT-001-B-L", filename: "shirt-black-l.jpg", url: "https://picsum.photos/200/200?r=3" },
  { sku: "HOOD-002-G-M", filename: "hoodie-gray-m.jpg", url: "https://picsum.photos/200/200?r=4" },
  { sku: "HOOD-002-B-L", filename: "hoodie-black-l.jpg", url: "https://picsum.photos/200/200?r=5" },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function parseImageListFile(file: File): Promise<ImageListItem[]> {
  await delay(500);
  if (file.name.toLowerCase().endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.filter(
      (x: unknown): x is ImageListItem =>
        typeof x === "object" && x !== null && "sku" in x && "filename" in (x as object)
    );
  }
  return MOCK_IMAGE_LIST;
}

export function groupImagesBySku(list: ImageListItem[]): Record<string, ImageListItem[]> {
  const map: Record<string, ImageListItem[]> = {};
  for (const item of list) {
    if (!map[item.sku]) map[item.sku] = [];
    map[item.sku].push(item);
  }
  return map;
}
