import type { Product } from "@/types/product";
import { productSchema } from "@/types/product";

const MOCK_PRODUCTS: Product[] = [
  {
    sku: "SHIRT-001",
    handle: "classic-tshirt",
    title: "Classic T-Shirt",
    productType: "Apparel",
    tags: ["shirt", "casual"],
    descriptionHtml: "<p>Comfortable cotton t-shirt.</p>",
    shippingTimeline: "3-5 business days",
    options: [
      { name: "Color", values: ["White", "Black", "Navy"] },
      { name: "Size", values: ["S", "M", "L", "XL"] },
    ],
    variants: [
      { sku: "SHIRT-001-W-S", options: ["White", "S"], price: "24.99" },
      { sku: "SHIRT-001-W-M", options: ["White", "M"], price: "24.99" },
      { sku: "SHIRT-001-B-L", options: ["Black", "L"], price: "26.99" },
    ],
  },
  {
    sku: "HOOD-002",
    handle: "premium-hoodie",
    title: "Premium Hoodie",
    productType: "Apparel",
    tags: ["hoodie", "winter"],
    descriptionHtml: "<p>Warm fleece hoodie.</p>",
    shippingTimeline: "5-7 business days",
    options: [
      { name: "Color", values: ["Gray", "Black"] },
      { name: "Size", values: ["M", "L"] },
    ],
    variants: [
      { sku: "HOOD-002-G-M", options: ["Gray", "M"], price: "49.99" },
      { sku: "HOOD-002-B-L", options: ["Black", "L"], price: "49.99" },
    ],
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function parseProductsFile(file: File): Promise<Product[]> {
  await delay(800);
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    const parsed: Product[] = [];
    for (const item of arr) {
      const result = productSchema.safeParse(item);
      if (result.success) parsed.push(result.data);
    }
    if (parsed.length > 0) return parsed;
    throw new Error("No valid products in JSON file.");
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return [...MOCK_PRODUCTS];
  }
  throw new Error("Unsupported file type. Use .json or .xlsx.");
}
