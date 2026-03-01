import type { Product } from "@/types/product";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type UploadResult = { success: number; failed: string[] };

export async function uploadProducts(
  products: Product[],
  onProgress?: (progress: number, currentProduct?: string) => void
): Promise<UploadResult> {
  const failed: string[] = [];
  const total = products.length;
  for (let i = 0; i < total; i++) {
    const p = products[i];
    onProgress?.(Math.round(((i + 1) / total) * 100), p.title);
    await delay(400 + Math.random() * 200);
    if (Math.random() > 0.9) failed.push(p.title);
  }
  onProgress?.(100);
  return { success: total - failed.length, failed };
}
