import type { Product } from "@/types/product";
import type { ColumnMapping, RawRow } from "@/types/excel";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCell(row: RawRow, header: string | undefined): string {
  if (!header) return "";
  const v = row[header];
  if (v == null) return "";
  return String(v).trim();
}

function parsePrice(value: string): string {
  const num = value.replace(/[^\d.]/g, "");
  const n = parseFloat(num);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function parseList(value: string): string[] {
  if (!value) return [];
  const parts = value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  const cleaned = parts.map((s) => s.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

function descriptionToHtml(description: string): string {
  if (!description.trim()) return "<p></p>";
  const lines = description.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const linesWithoutStyleName = lines.slice(1);
  const out: string[] = [];
  for (const line of linesWithoutStyleName) {
    const colonIdx = line.indexOf(":");
    if (colonIdx >= 0) {
      const label = line.slice(0, colonIdx + 1);
      const value = line.slice(colonIdx + 1).trim();
      out.push(
        value
          ? `<p><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</p>`
          : `<p><strong>${escapeHtml(label)}</strong></p>`
      );
    } else {
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  return out.length ? out.join("") : "<p></p>";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function transformRowsToProducts(
  rawRows: RawRow[],
  mapping: ColumnMapping
): Product[] {
  const products: Product[] = [];
  for (const row of rawRows) {
    const sku = getCell(row, mapping.sku);
    const title = getCell(row, mapping.title);
    const priceStr = getCell(row, mapping.price);
    if (!sku || !title) continue;
    const handle = slugify(title);
    const productType = getCell(row, mapping.category) || "";
    const descriptionHtml = descriptionToHtml(getCell(row, mapping.description));
    const shippingTimeline = getCell(row, mapping.shippingTimeline) || "";
    const colors = parseList(getCell(row, mapping.colorOptions));
    const sizes = parseList(getCell(row, mapping.sizes));
    const price = parsePrice(priceStr);

    const options: { name: string; values: string[] }[] = [];
    if (colors.length) options.push({ name: "Color", values: colors });
    if (sizes.length) options.push({ name: "Size", values: sizes });

    const variants: Product["variants"] = [];
    if (colors.length && sizes.length) {
      for (const color of colors) {
        for (const size of sizes) {
          variants.push({
            sku,
            options: colors.length && sizes.length ? [color, size] : sizes.length ? [size] : [color],
            price,
          });
        }
      }
    } else if (sizes.length) {
      for (const size of sizes) {
        variants.push({ sku, options: [size], price });
      }
    } else if (colors.length) {
      for (const color of colors) {
        variants.push({ sku, options: [color], price });
      }
    } else {
      variants.push({ sku, options: [], price });
    }

    products.push({
      sku,
      handle,
      title,
      productType,
      tags: [],
      descriptionHtml,
      shippingTimeline,
      options,
      variants,
    });
  }
  return products;
}
