/**
 * Shopify GraphQL Product Generator
 * Generates mutation strings for productCreate and productVariantsBulkCreate.
 * Does NOT execute mutations - only generates.
 */
import { getImagesForColor } from "./imageMapping";

export interface GraphqlProductImage {
  filename: string;
  url: string;
}

export interface GraphqlProduct {
  sku: string;
  handle: string;
  title: string;
  productType: string;
  descriptionHtml: string;
  tags: string[];
  options: { name: string; values: string[] }[];
  variants: { sku: string; options: string[]; price: string }[];
  images?: GraphqlProductImage[];
}

export interface GraphqlMutationResult {
  productMutation: string;
  variantsMutation: string;
}

export interface GraphqlValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GraphqlGeneratorOutput {
  mutations: GraphqlMutationResult;
  validation: GraphqlValidationResult;
}

/** Escape a string for use inside GraphQL double-quoted string. */
function escapeGraphqlString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

function getOptionIndices(product: GraphqlProduct): {
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

/** Get Color and Size values in correct order for product options. */
function getOptionValues(product: GraphqlProduct): {
  colorValues: string[];
  sizeValues: string[];
} {
  const { colorIndex, sizeIndex } = getOptionIndices(product);
  const colorValues =
    colorIndex >= 0 ? product.options[colorIndex].values : [];
  const sizeValues = sizeIndex >= 0 ? product.options[sizeIndex].values : [];
  return { colorValues, sizeValues };
}

function sortImagesByColorOptionOrder(
  images: GraphqlProductImage[],
  colorValues: string[],
  productSku: string,
  optionToImageTerm?: Record<string, string>
): GraphqlProductImage[] {
  if (colorValues.length === 0 || images.length <= 1) return images;

  const ordered: GraphqlProductImage[] = [];
  const usedKeys = new Set<string>();
  const keyFor = (img: GraphqlProductImage) => `${img.filename}::${img.url}`;
  const byFilenameAsc = (a: GraphqlProductImage, b: GraphqlProductImage) =>
    a.filename.localeCompare(b.filename, undefined, { sensitivity: "base" });

  for (const color of colorValues) {
    const colorImages = getImagesForColor(
      images,
      color,
      productSku,
      optionToImageTerm
    );
    const sortedColorImages = colorImages
      .filter((image): image is GraphqlProductImage =>
        typeof image.url === "string" && image.url.length > 0
      )
      .sort(byFilenameAsc);
    for (const image of sortedColorImages) {
      if (!image.url) continue;
      const key = keyFor(image);
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      ordered.push(image);
    }
  }

  const remainingImages = images
    .filter((image) => !usedKeys.has(keyFor(image)))
    .sort(byFilenameAsc);
  for (const image of remainingImages) {
    const key = keyFor(image);
    if (usedKeys.has(key)) continue;
    ordered.push(image);
  }

  return ordered;
}

export function validateForGraphqlExport(
  products: GraphqlProduct[]
): GraphqlValidationResult {
  const errors: string[] = [];

  for (const product of products) {
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

    const { colorIndex, sizeIndex } = getOptionIndices(product);
    if (colorIndex < 0 && sizeIndex < 0) {
      errors.push(
        `Product '${product.title}' has no Color or Size option`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate productCreate mutation for a single product.
 * Includes media (images) when product.images has URLs.
 */
export function generateProductMutation(
  product: GraphqlProduct,
  universalTags: string[] = [],
  optionToImageTerm?: Record<string, string>
): string {
  const tags = [...new Set([...universalTags, ...product.tags])];
  const { colorValues, sizeValues } = getOptionValues(product);

  const options: { name: string; values: string[] }[] = [];
  if (colorValues.length > 0) {
    options.push({ name: "Color", values: colorValues });
  }
  if (sizeValues.length > 0) {
    options.push({ name: "Size", values: sizeValues });
  }

  const titleEsc = escapeGraphqlString(product.title);
  const handleEsc = escapeGraphqlString(product.handle);
  const descEsc = escapeGraphqlString(product.descriptionHtml);
  const typeEsc = escapeGraphqlString(product.productType);
  const tagsArr = tags.map((t) => `"${escapeGraphqlString(t)}"`).join(", ");
  const productOptionsJson = options
    .map(
      (opt) =>
        `{ name: "${escapeGraphqlString(opt.name)}", values: [${opt.values.map((v) => `{ name: "${escapeGraphqlString(v)}" }`).join(", ")}] }`
    )
    .join(", ");

  const imagesWithUrls = (product.images ?? []).filter(
    (img): img is GraphqlProductImage => typeof img.url === "string" && img.url.length > 0
  );
  const orderedImagesWithUrls = sortImagesByColorOptionOrder(
    imagesWithUrls,
    colorValues,
    product.sku,
    optionToImageTerm
  );
  const mediaArg =
    orderedImagesWithUrls.length > 0
      ? `, media: [${orderedImagesWithUrls
          .map(
            (img) =>
              `{ originalSource: "${escapeGraphqlString(img.url)}", mediaContentType: IMAGE, alt: "${escapeGraphqlString(img.filename)}" }`
          )
          .join(", ")}]`
      : "";

  return `mutation {
  productCreate(product: {
    title: "${titleEsc}"
    handle: "${handleEsc}"
    descriptionHtml: "${descEsc}"
    productType: "${typeEsc}"
    tags: [${tagsArr}]
    status: DRAFT
    productOptions: [${productOptionsJson}]
  }${mediaArg}) {
    product {
      id
      media(first: 50) { nodes { id alt } }
    }
    userErrors { field message }
  }
}`;
}

/**
 * Generate productVariantsBulkCreate mutation for a single product.
 * Use productIdPlaceholder when product ID is unknown (e.g. before productCreate runs).
 * Optionally pass optionToImageTerm for color-to-filename mapping (from ColorMappingModal).
 * Optionally pass mediaByFilename (filename -> mediaId) from productCreate response to attach variant images via mediaId.
 *
 * ProductVariantsBulkInput fields used: price, inventoryItem, optionValues, mediaSrc/mediaId, inventoryPolicy, taxable.
 * inventoryItem (InventoryItemInput): sku, requiresShipping, tracked (false = don't track inventory).
 */
export function generateVariantsMutation(
  product: GraphqlProduct,
  productIdPlaceholder: string = "gid://shopify/Product/REPLACE_AFTER_CREATE",
  optionToImageTerm?: Record<string, string>,
  mediaByFilename?: Record<string, string>
): string {
  const { colorIndex, sizeIndex } = getOptionIndices(product);
  const variantSkus = product.sku;
  const images = product.images ?? [];

  const variantInputs = product.variants.map((variant) => {
    const optionValues: { optionName: string; name: string }[] = [];
    if (colorIndex >= 0 && variant.options[colorIndex] !== undefined) {
      optionValues.push({
        optionName: "Color",
        name: variant.options[colorIndex],
      });
    }
    if (sizeIndex >= 0 && variant.options[sizeIndex] !== undefined) {
      optionValues.push({
        optionName: "Size",
        name: variant.options[sizeIndex],
      });
    }

    const optionValuesEntry =
      optionValues.length > 0
        ? `optionValues: [${optionValues.map((ov) => `{ optionName: "${escapeGraphqlString(ov.optionName)}", name: "${escapeGraphqlString(ov.name)}" }`).join(", ")}], `
        : "";

    const color = colorIndex >= 0 ? variant.options[colorIndex] ?? "" : "";
    const colorImages =
      color && images.length > 0
        ? getImagesForColor(images, color, product.sku, optionToImageTerm)
        : [];
    const variantImage = colorImages.find((img) => img.url);
    const variantImageUrl = variantImage?.url;
    const variantFilename = variantImage?.filename;

    let mediaEntry = "";
    if (mediaByFilename && variantFilename) {
      const mediaId = mediaByFilename[variantFilename];
      if (mediaId) {
        mediaEntry = `mediaId: "${escapeGraphqlString(mediaId)}", `;
      }
    }
    if (!mediaEntry && variantImageUrl) {
      mediaEntry = `mediaSrc: ["${escapeGraphqlString(variantImageUrl)}"], `;
    }

    const priceEsc = escapeGraphqlString(variant.price);
    const skuEsc = escapeGraphqlString(variantSkus);

    return `      {
        price: "${priceEsc}",
        inventoryItem: { sku: "${skuEsc}", requiresShipping: true, tracked: false },
        ${mediaEntry}${optionValuesEntry}inventoryPolicy: DENY,
        taxable: true
      }`;
  });

  return `mutation {
  productVariantsBulkCreate(
    productId: "${productIdPlaceholder}"
    strategy: REMOVE_STANDALONE_VARIANT
    variants: [
${variantInputs.join(",\n")}
    ]
  ) {
    productVariants { id }
    userErrors { field message }
  }
}`;
}

/**
 * Parse productCreate response JSON to extract product ID and media IDs by filename (alt).
 * Returns { productId, mediaByFilename } or null if parsing fails.
 */
export function parseProductCreateResponse(
  json: string
): { productId: string; mediaByFilename: Record<string, string> } | null {
  try {
    const data = JSON.parse(json) as {
      data?: { productCreate?: { product?: { id?: string; media?: { nodes?: Array<{ id?: string; alt?: string }> } } } };
    };
    const product = data?.data?.productCreate?.product;
    if (!product?.id) return null;

    const mediaByFilename: Record<string, string> = {};
    const nodes = product.media?.nodes ?? [];
    for (const node of nodes) {
      if (node.id && node.alt) {
        mediaByFilename[node.alt] = node.id;
      }
    }

    return { productId: product.id, mediaByFilename };
  } catch {
    return null;
  }
}

/**
 * Generate both mutations for a single product.
 */
export function generateForProduct(
  product: GraphqlProduct,
  universalTags: string[] = [],
  productIdPlaceholder?: string,
  optionToImageTerm?: Record<string, string>,
  mediaByFilename?: Record<string, string>
): GraphqlMutationResult {
  return {
    productMutation: generateProductMutation(
      product,
      universalTags,
      optionToImageTerm
    ),
    variantsMutation: generateVariantsMutation(
      product,
      productIdPlaceholder ?? "gid://shopify/Product/REPLACE_AFTER_CREATE",
      optionToImageTerm,
      mediaByFilename
    ),
  };
}

/**
 * Generate mutations for all products (one pair per product).
 */
export function generateForProducts(
  products: GraphqlProduct[],
  universalTags: string[] = []
): GraphqlMutationResult[] {
  return products.map((p) => generateForProduct(p, universalTags));
}

/**
 * Full export: validate and generate for a single product (or first product).
 * Returns structured output with validation summary.
 * @param productCreateResponse - Optional: product ID string, or full productCreate JSON response. When full JSON is pasted, extracts productId and mediaByFilename for variant image attachment.
 * @param colorMappingPerProduct - Optional map of productIndex -> (color -> imageSearchTerm) for variant image by color
 */
export function generateGraphqlExport(
  products: GraphqlProduct[],
  universalTags: string[] = [],
  productIndex: number = 0,
  productCreateResponse?: string,
  colorMappingPerProduct?: Record<number, Record<string, string>>
): GraphqlGeneratorOutput {
  const validation = validateForGraphqlExport(products);

  if (!validation.valid || products.length === 0 || productIndex >= products.length) {
    return {
      mutations: {
        productMutation: "",
        variantsMutation: "",
      },
      validation,
    };
  }

  const product = products[productIndex];
  let productId = "gid://shopify/Product/REPLACE_AFTER_CREATE";
  let mediaByFilename: Record<string, string> | undefined;

  const trimmed = productCreateResponse?.trim();
  if (trimmed) {
    const parsed = parseProductCreateResponse(trimmed);
    if (parsed) {
      productId = parsed.productId;
      mediaByFilename = Object.keys(parsed.mediaByFilename).length > 0 ? parsed.mediaByFilename : undefined;
    } else if (trimmed.startsWith("gid://")) {
      productId = trimmed;
    }
  }

  const optionToImageTerm = colorMappingPerProduct?.[productIndex];
  const mutations = generateForProduct(
    product,
    universalTags,
    productId,
    optionToImageTerm,
    mediaByFilename
  );

  return {
    mutations,
    validation,
  };
}
