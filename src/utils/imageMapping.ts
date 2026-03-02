import type { Product } from "@/types/product";
import type { ProductImage } from "@/types/product";

/** Parse Shopify GraphQL-style JSON (object): data.files.edges[].node.image.url → filename from URL path */
function parseImageUrlMapFromJson(json: unknown): Record<string, string> {
  const edges = (json as { data?: { files?: { edges?: unknown[] } } })?.data
    ?.files?.edges;
  if (!Array.isArray(edges)) {
    throw new Error("Invalid format: expected data.files.edges array");
  }
  const map: Record<string, string> = {};
  for (let i = 0; i < edges.length; i++) {
    const node = (edges[i] as { node?: { image?: { url?: string } } })?.node;
    const url = node?.image?.url;
    if (typeof url !== "string" || !url.trim()) continue;
    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split("/").filter(Boolean);
      const filename = segments[segments.length - 1] ?? `image-${i}`;
      if (filename) map[filename] = url;
    } catch {
      map[`image-${i}`] = url;
    }
  }
  if (Object.keys(map).length === 0) {
    throw new Error("No valid image URLs found");
  }
  return map;
}

/** Parse Shopify GraphQL-style JSON from file. */
export async function parseImageUrlMapFile(
  file: File
): Promise<Record<string, string>> {
  const text = await file.text();
  const json = JSON.parse(text) as unknown;
  return parseImageUrlMapFromJson(json);
}

/** Parse Shopify GraphQL-style JSON from string (e.g. paste). */
export function parseImageUrlMapFromString(text: string): Record<string, string> {
  const json = JSON.parse(text) as unknown;
  return parseImageUrlMapFromJson(json);
}

/** Match images to products by SKU prefix; detect color from filename (e.g. NAOK01-pink-1.jpg → pink). */
export function matchImagesToProducts(
  products: Product[],
  imageUrlMap: Record<string, string>,
  localImageList: string[]
): ProductImage[][] {
  const allFilenames = new Set<string>([
    ...Object.keys(imageUrlMap),
    ...localImageList,
  ]);
  const result: ProductImage[][] = [];

  for (const product of products) {
    const sku = product.sku;
    const colorOpt = product.options.find(
      (o) => o.name.toLowerCase() === "color"
    );
    const colorValues = new Set(
      (colorOpt?.values ?? []).map((v) => v.toLowerCase().trim())
    );
    const matched: ProductImage[] = [];

    for (const filename of allFilenames) {
      const base = filename.split("/").pop() ?? filename;
      const skuLower = sku.toLowerCase();
      const baseLower = base.toLowerCase();
      const withSep = baseLower.startsWith(skuLower + "-") || baseLower.startsWith(skuLower + "_");
      const exact = baseLower.startsWith(skuLower);
      if (!withSep && !exact) continue;
      const url = imageUrlMap[base] ?? imageUrlMap[filename] ?? null;
      matched.push({ filename: base, url: url ?? undefined });
    }

    result.push(matched);
  }

  return result;
}

/** Get search terms for a variant color: literal normalized name, base colour (last word), and optional mapped term. */
export function getSearchTermsForVariantColor(
  color: string,
  mappedTerm?: string
): string[] {
  const colorNorm = color.trim().toLowerCase().replace(/\s+/g, "-");
  const words = color.trim().split(/\s+/).filter(Boolean);
  const baseColor = words.length > 0
    ? words[words.length - 1].toLowerCase().replace(/\s+/g, "-")
    : "";
  const mappedNorm = mappedTerm?.trim()
    ? mappedTerm.trim().toLowerCase().replace(/\s+/g, "-")
    : "";
  const terms = [colorNorm, baseColor, mappedNorm].filter(Boolean);
  return [...new Set(terms)];
}

/** Get images for a product filtered by color (filename contains any of the color's search terms). */
export function getImagesForColor(
  images: ProductImage[],
  color: string,
  _productSku: string,
  optionToImageTerm?: Record<string, string>
): ProductImage[] {
  const terms = getSearchTermsForVariantColor(color, optionToImageTerm?.[color]);
  return images.filter((img) => {
    const base = img.filename.replace(/\.[^.]+$/, "").toLowerCase();
    return terms.some((t) => base.includes(t));
  });
}

export type AvailableColorsPerProduct = {
  productIndex: number;
  sku: string;
  optionColors: string[];
  imageColorTokens: string[];
};

/** Get option colors from product and image color tokens from filenames matched to this product's SKU. */
export function getAvailableColorsPerProduct(
  products: Product[],
  imageUrlMap: Record<string, string>,
  localImageList: string[]
): AvailableColorsPerProduct[] {
  const allFilenames = new Set<string>([
    ...Object.keys(imageUrlMap),
    ...localImageList,
  ]);
  const result: AvailableColorsPerProduct[] = [];

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const sku = product.sku;
    const skuLower = sku.toLowerCase();
    const colorOpt = product.options.find(
      (o) => o.name.toLowerCase() === "color"
    );
    const optionColors = colorOpt?.values ?? [];

    const imageColorTokens = new Set<string>();
    for (const filename of allFilenames) {
      const base = filename.split("/").pop() ?? filename;
      const baseLower = base.toLowerCase();
      const withSep =
        baseLower.startsWith(skuLower + "-") ||
        baseLower.startsWith(skuLower + "_");
      const exact = baseLower.startsWith(skuLower);
      if (!withSep && !exact) continue;
      const withoutExt = base.replace(/\.[^.]+$/, "").toLowerCase();
      const afterSku = withoutExt.slice(skuLower.length).replace(/^[-_]/, "");
      const parts = afterSku.split(/[-_]/).filter(Boolean);
      for (const p of parts) {
        if (p.length < 2) continue;
        if (/^\d+$/.test(p)) continue;
        imageColorTokens.add(p);
      }
    }

    result.push({
      productIndex: i,
      sku,
      optionColors,
      imageColorTokens: [...imageColorTokens].sort(),
    });
  }

  return result;
}

/** Suggest mapping: for each option color, pick an image token if option name includes it (e.g. OLIVE GREEN → green). */
export function suggestColorMapping(
  optionColors: string[],
  imageColorTokens: string[]
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const tokenLower = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
  for (const opt of optionColors) {
    const optNorm = opt.toLowerCase();
    const found = imageColorTokens.find((t) => {
      const tNorm = t.toLowerCase();
      return optNorm.includes(tNorm) || tNorm.includes(optNorm.replace(/\s+/g, ""));
    });
    if (found) mapping[opt] = found;
  }
  return mapping;
}

export type ValidationSummary = {
  totalImages: number;
  unmatchedCount: number;
  unmatchedFilenames: string[];
  productsMissingImages: number;
};

export type ProductValidation = {
  productIndex: number;
  productTitle: string;
  imagesMatched: boolean;
  colorsMatched: boolean;
  missingUrlsCount: number;
  missingVariantColors: string[];
};

export function computeValidation(
  products: Product[],
  imageUrlMap: Record<string, string>,
  localImageList: string[],
  colorMappingPerProduct?: Record<number, Record<string, string>>
): { summary: ValidationSummary; perProduct: ProductValidation[] } {
  const allFilenames = new Set<string>([
    ...Object.keys(imageUrlMap),
    ...localImageList,
  ]);
  const matchedFilenames = new Set<string>();
  const perProduct: ProductValidation[] = [];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const images = p.images ?? [];
    const colorOpt = p.options.find((o) => o.name.toLowerCase() === "color");
    const colorValues = colorOpt?.values ?? [];
    const colorsWithImages = new Set<string>();

    for (const img of images) {
      matchedFilenames.add(img.filename);
      if (colorOpt) {
        const base = img.filename.replace(/\.[^.]+$/, "").toLowerCase();
        for (const c of colorValues) {
          const terms = getSearchTermsForVariantColor(
            c,
            colorMappingPerProduct?.[i]?.[c]
          );
          if (terms.some((t) => base.includes(t))) {
            colorsWithImages.add(c);
          }
        }
      }
    }

    const missingVariantColors = colorValues.filter((c) => !colorsWithImages.has(c));
    const missingUrlsCount = images.filter((img) => !img.url).length;

    perProduct.push({
      productIndex: i,
      productTitle: p.title,
      imagesMatched: images.length > 0,
      colorsMatched: colorValues.length === 0 || missingVariantColors.length === 0,
      missingUrlsCount,
      missingVariantColors,
    });
  }

  const unmatchedFilenames = [...allFilenames].filter((f) => !matchedFilenames.has(f));
  const summary: ValidationSummary = {
    totalImages: allFilenames.size,
    unmatchedCount: unmatchedFilenames.length,
    unmatchedFilenames,
    productsMissingImages: perProduct.filter((v) => !v.imagesMatched).length,
  };

  return { summary, perProduct };
}
