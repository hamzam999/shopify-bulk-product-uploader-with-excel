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
  universalTags: string[] = []
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
  const mediaParam =
    imagesWithUrls.length > 0
      ? `,
  media: [${imagesWithUrls
    .map(
      (img) =>
        `{ originalSource: "${escapeGraphqlString(img.url)}", mediaContentType: IMAGE }`
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
  }${mediaParam}) {
    product { id }
    userErrors { field message }
  }
}`;
}

/**
 * Generate productVariantsBulkCreate mutation for a single product.
 * Use productIdPlaceholder when product ID is unknown (e.g. before productCreate runs).
 * Optionally pass optionToImageTerm for color-to-filename mapping (from ColorMappingModal).
 *
 * ProductVariantsBulkInput fields used: price, inventoryItem, optionValues, mediaSrc, inventoryPolicy, taxable.
 * inventoryItem (InventoryItemInput): sku, requiresShipping.
 */
export function generateVariantsMutation(
  product: GraphqlProduct,
  productIdPlaceholder: string = "gid://shopify/Product/REPLACE_AFTER_CREATE",
  optionToImageTerm?: Record<string, string>
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
    const variantImageUrl = colorImages.find((img) => img.url)?.url;
    const mediaSrcEntry =
      variantImageUrl
        ? `mediaSrc: ["${escapeGraphqlString(variantImageUrl)}"], `
        : "";

    const priceEsc = escapeGraphqlString(variant.price);
    const skuEsc = escapeGraphqlString(variantSkus);

    return `      {
        price: "${priceEsc}",
        inventoryItem: { sku: "${skuEsc}", requiresShipping: true },
        ${mediaSrcEntry}${optionValuesEntry}inventoryPolicy: DENY,
        taxable: true
      }`;
  });

  return `mutation {
  productVariantsBulkCreate(
    productId: "${productIdPlaceholder}"
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
 * Generate both mutations for a single product.
 */
export function generateForProduct(
  product: GraphqlProduct,
  universalTags: string[] = [],
  productIdPlaceholder?: string,
  optionToImageTerm?: Record<string, string>
): GraphqlMutationResult {
  return {
    productMutation: generateProductMutation(product, universalTags),
    variantsMutation: generateVariantsMutation(
      product,
      productIdPlaceholder ?? "gid://shopify/Product/REPLACE_AFTER_CREATE",
      optionToImageTerm
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
 * @param productIdFromCreate - Optional product ID from productCreate response; when set, variants mutation uses it instead of placeholder
 * @param colorMappingPerProduct - Optional map of productIndex -> (color -> imageSearchTerm) for variant image by color
 */
export function generateGraphqlExport(
  products: GraphqlProduct[],
  universalTags: string[] = [],
  productIndex: number = 0,
  productIdFromCreate?: string,
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
  const productId = productIdFromCreate?.trim() || "gid://shopify/Product/REPLACE_AFTER_CREATE";
  const optionToImageTerm = colorMappingPerProduct?.[productIndex];
  const mutations = generateForProduct(
    product,
    universalTags,
    productId,
    optionToImageTerm
  );

  return {
    mutations,
    validation,
  };
}
