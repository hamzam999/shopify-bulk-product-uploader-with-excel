import type { Product, ProductImage } from "@/types/product";
import { getImagesForColor } from "./imageMapping";

export interface CsvGeneratorInput {
  products: Product[];
  universalTags: string[];
  colorMappingPerProduct: Record<number, Record<string, string>>;
  imagesByFilename: Record<string, string>;
}

export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CsvExportResult {
  csv: string;
  rowCount: number;
  validation: CsvValidationResult;
}

const COLUMNS = [
  "Handle",
  "Title",
  "Body (HTML)",
  "Vendor",
  "Product Category",
  "Type",
  "Tags",
  "Published",
  "Option1 Name",
  "Option1 Value",
  "Option2 Name",
  "Option2 Value",
  "Option3 Name",
  "Option3 Value",
  "Variant SKU",
  "Variant Price",
  "Variant Inventory Tracker",
  "Variant Inventory Qty",
  "Variant Inventory Policy",
  "Variant Fulfillment Service",
  "Variant Requires Shipping",
  "Variant Taxable",
  "Image Src",
  "Image Position",
  "Variant Image",
  "Status",
] as const;

/** Escape a cell value for RFC 4180 CSV (quotes, commas, newlines). */
function escapeCsvCell(value: string): string {
  if (value === "") return "";
  const needsQuotes = /[",\r\n]/.test(value);
  if (!needsQuotes) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function resolveImageUrl(
  img: ProductImage,
  imagesByFilename: Record<string, string>
): string | null {
  const url = img.url ?? imagesByFilename[img.filename];
  return typeof url === "string" && url.trim() ? url : null;
}

function getOptionIndices(product: Product): {
  colorIndex: number;
  sizeIndex: number;
} {
  let colorIndex = -1;
  let sizeIndex = -1;
  product.options.forEach((opt, i) => {
    const name = opt.name.toLowerCase();
    if (name === "color") colorIndex = i;
    if (name === "size") sizeIndex = i;
  });
  return { colorIndex, sizeIndex };
}

function getOptionValues(
  variant: Product["variants"][0],
  colorIndex: number,
  sizeIndex: number
): { option1Name: string; option1Value: string; option2Name: string; option2Value: string } {
  const option1Name = colorIndex >= 0 ? "Color" : sizeIndex >= 0 ? "Size" : "";
  const option1Value =
    colorIndex >= 0
      ? variant.options[colorIndex] ?? ""
      : sizeIndex >= 0
        ? variant.options[sizeIndex] ?? ""
        : variant.options.length > 0
          ? variant.options[0]
          : "";
  const option2Name =
    colorIndex >= 0 && sizeIndex >= 0 ? "Size" : "";
  const option2Value =
    colorIndex >= 0 && sizeIndex >= 0
      ? variant.options[sizeIndex] ?? ""
      : "";
  return { option1Name, option1Value, option2Name, option2Value };
}

function getVariantImageUrl(
  product: Product,
  variant: Product["variants"][0],
  productIndex: number,
  imagesByFilename: Record<string, string>,
  colorMappingPerProduct: Record<number, Record<string, string>>
): string {
  const images = product.images ?? [];
  const colorOpt = product.options.find((o) => o.name.toLowerCase() === "color");
  const colorIndex = colorOpt
    ? product.options.findIndex((o) => o.name.toLowerCase() === "color")
    : -1;
  const color = colorIndex >= 0 ? variant.options[colorIndex] ?? "" : "";
  if (!color) return "";

  const optionToImageTerm = colorMappingPerProduct[productIndex];
  const colorImages = getImagesForColor(
    images,
    color,
    product.sku,
    optionToImageTerm
  );
  const first = colorImages[0];
  if (!first) return "";
  const url = resolveImageUrl(first, imagesByFilename);
  return url ?? "";
}

export function validateForExport(
  input: CsvGeneratorInput
): CsvValidationResult {
  const errors: string[] = [];

  for (const product of input.products) {
    if (!product.variants.length) {
      errors.push(`Product '${product.title}' has no variants`);
      continue;
    }

    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      if (!variant.price || !String(variant.price).trim()) {
        errors.push(
          `Product '${product.title}', variant ${i + 1} has empty price`
        );
      }
    }

    const images = product.images ?? [];
    if (images.length === 0) {
      errors.push(`Product '${product.title}' has no images`);
    } else {
      for (const img of images) {
        const url = resolveImageUrl(img, input.imagesByFilename);
        if (!url) {
          errors.push(
            `Product '${product.title}' has image '${img.filename}' without URL`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateShopifyCsv(input: CsvGeneratorInput): CsvExportResult {
  const validation = validateForExport(input);
  if (!validation.valid) {
    return {
      csv: "",
      rowCount: 0,
      validation,
    };
  }

  const rows: string[][] = [];
  rows.push([...COLUMNS]);

  const effectiveTags = (product: Product) =>
    [...new Set([...input.universalTags, ...product.tags])].join(", ");

  for (let productIndex = 0; productIndex < input.products.length; productIndex++) {
    const product = input.products[productIndex];
    const images = product.images ?? [];
    const resolvedImages = images
      .map((img) => ({
        ...img,
        url: resolveImageUrl(img, input.imagesByFilename),
      }))
      .filter((img): img is ProductImage & { url: string } => img.url !== null);

    const { colorIndex, sizeIndex } = getOptionIndices(product);
    const firstVariant = product.variants[0];
    const firstOpts = getOptionValues(firstVariant, colorIndex, sizeIndex);

    const baseCells = (
      handle: string,
      title: string,
      body: string,
      tags: string,
      typeVal: string,
      opt1Name: string,
      opt1Val: string,
      opt2Name: string,
      opt2Val: string,
      variantSku: string,
      variantPrice: string,
      imageSrc: string,
      imagePos: string,
      variantImage: string
    ): string[] => [
      escapeCsvCell(handle),
      escapeCsvCell(title),
      escapeCsvCell(body),
      "",
      "",
      escapeCsvCell(typeVal),
      escapeCsvCell(tags),
      "FALSE",
      escapeCsvCell(opt1Name),
      escapeCsvCell(opt1Val),
      escapeCsvCell(opt2Name),
      escapeCsvCell(opt2Val),
      "",
      "",
      escapeCsvCell(variantSku),
      escapeCsvCell(variantPrice),
      "",
      "",
      "deny",
      "manual",
      "TRUE",
      "TRUE",
      escapeCsvCell(imageSrc),
      escapeCsvCell(imagePos),
      escapeCsvCell(variantImage),
      "draft",
    ];

    const handle = product.handle;
    const title = product.title;
    const body = product.descriptionHtml;
    const tags = effectiveTags(product);
    const typeVal = product.productType;
    const variantSku = product.sku;

    if (product.variants.length === 0) continue;

    const firstVariantImage = getVariantImageUrl(
      product,
      firstVariant,
      productIndex,
      input.imagesByFilename,
      input.colorMappingPerProduct
    );

    const firstImageSrc = resolvedImages[0]?.url ?? "";
    const firstImagePos = resolvedImages.length > 0 ? "1" : "";

    rows.push(
      baseCells(
        handle,
        title,
        body,
        tags,
        typeVal,
        firstOpts.option1Name,
        firstOpts.option1Value,
        firstOpts.option2Name,
        firstOpts.option2Value,
        variantSku,
        firstVariant.price,
        firstImageSrc,
        firstImagePos,
        firstVariantImage
      )
    );

    for (let imgIdx = 1; imgIdx < resolvedImages.length; imgIdx++) {
      const img = resolvedImages[imgIdx];
      rows.push(
        baseCells(
          handle,
          "",
          "",
          "",
          "",
          firstOpts.option1Name,
          firstOpts.option1Value,
          firstOpts.option2Name,
          firstOpts.option2Value,
          variantSku,
          firstVariant.price,
          img.url,
          String(imgIdx + 1),
          ""
        )
      );
    }

    for (let vIdx = 1; vIdx < product.variants.length; vIdx++) {
      const variant = product.variants[vIdx];
      const opts = getOptionValues(variant, colorIndex, sizeIndex);
      const variantImage = getVariantImageUrl(
        product,
        variant,
        productIndex,
        input.imagesByFilename,
        input.colorMappingPerProduct
      );

      rows.push(
        baseCells(
          handle,
          "",
          "",
          "",
          "",
          opts.option1Name,
          opts.option1Value,
          opts.option2Name,
          opts.option2Value,
          variantSku,
          variant.price,
          "",
          "",
          variantImage
        )
      );
    }
  }

  const csv = rows.map((r) => r.join(",")).join("\n");
  const rowCount = rows.length - 1;

  return {
    csv,
    rowCount,
    validation,
  };
}
