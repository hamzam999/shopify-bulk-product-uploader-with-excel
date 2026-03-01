import { z } from "zod";

export const variantSchema = z.object({
  sku: z.string().min(1),
  options: z.array(z.string()),
  price: z.string(),
});

export const productImageSchema = z.object({
  filename: z.string(),
  url: z.string().optional(),
});

export const productOptionSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export const productSchema = z.object({
  sku: z.string(),
  handle: z.string(),
  title: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  descriptionHtml: z.string(),
  shippingTimeline: z.string(),
  options: z.array(productOptionSchema),
  variants: z.array(variantSchema),
  images: z.array(productImageSchema).optional(),
});

export type Variant = z.infer<typeof variantSchema>;
export type Product = z.infer<typeof productSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
