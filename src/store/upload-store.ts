import type { Product } from "@/types/product";
import type { ColumnMapping, RawRow } from "@/types/excel";
import type { WorkBook } from "xlsx";
import { create } from "zustand";

export type UploadStatus = "idle" | "uploading" | "success" | "error";

type UploadState = {
  products: Product[];
  currentStep: 1 | 2 | 3 | 4;
  selectedProductIndex: number | null;
  uploadProgress: number;
  uploadStatus: UploadStatus;
  currentUploadProduct: string | undefined;
  imageList: { sku: string; filename: string; url?: string }[];
  imageMapping: Record<string, string>;
  imagesByFilename: Record<string, string>;
  workbook: WorkBook | null;
  sheetNames: string[];
  selectedSheetName: string | null;
  rawRows: RawRow[];
  excelHeaders: string[];
  columnMapping: ColumnMapping | null;
  mappingConfirmed: boolean;
};

type UploadActions = {
  setProducts: (products: Product[]) => void;
  setCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  setSelectedProduct: (index: number | null) => void;
  updateProduct: (index: number, product: Partial<Product>) => void;
  addVariant: (productIndex: number, variant: Product["variants"][0]) => void;
  removeVariant: (productIndex: number, variantIndex: number) => void;
  updateVariant: (
    productIndex: number,
    variantIndex: number,
    variant: Partial<Product["variants"][0]>
  ) => void;
  setUploadProgress: (value: number) => void;
  setUploadStatus: (status: UploadStatus) => void;
  setCurrentUploadProduct: (title?: string) => void;
  resetUpload: () => void;
  setImageList: (list: { sku: string; filename: string; url?: string }[]) => void;
  setImageMapping: (mapping: Record<string, string>) => void;
  setImagesByFilename: (map: Record<string, string>) => void;
  setWorkbook: (workbook: WorkBook | null) => void;
  setSheetNames: (sheetNames: string[]) => void;
  setSelectedSheetName: (name: string | null) => void;
  setRawRows: (rows: RawRow[]) => void;
  setExcelHeaders: (headers: string[]) => void;
  setColumnMapping: (mapping: ColumnMapping | null) => void;
  setMappingConfirmed: (confirmed: boolean) => void;
};

const initialState: UploadState = {
  products: [],
  currentStep: 1,
  selectedProductIndex: null,
  uploadProgress: 0,
  uploadStatus: "idle",
  currentUploadProduct: undefined,
  imageList: [],
  imageMapping: {},
  imagesByFilename: {},
  workbook: null,
  sheetNames: [],
  selectedSheetName: null,
  rawRows: [],
  excelHeaders: [],
  columnMapping: null,
  mappingConfirmed: false,
};

export const useUploadStore = create<UploadState & UploadActions>((set) => ({
  ...initialState,

  setProducts: (products) => set({ products }),

  setCurrentStep: (currentStep) =>
    set({ currentStep, selectedProductIndex: currentStep === 2 ? 0 : null }),

  setSelectedProduct: (selectedProductIndex) => set({ selectedProductIndex }),

  updateProduct: (index, updates) =>
    set((state) => {
      const products = [...state.products];
      if (index < 0 || index >= products.length) return state;
      products[index] = { ...products[index], ...updates };
      return { products };
    }),

  addVariant: (productIndex, variant) =>
    set((state) => {
      const products = [...state.products];
      if (productIndex < 0 || productIndex >= products.length) return state;
      products[productIndex] = {
        ...products[productIndex],
        variants: [...products[productIndex].variants, variant],
      };
      return { products };
    }),

  removeVariant: (productIndex, variantIndex) =>
    set((state) => {
      const products = [...state.products];
      if (productIndex < 0 || productIndex >= products.length) return state;
      const variants = products[productIndex].variants.filter(
        (_, i) => i !== variantIndex
      );
      products[productIndex] = { ...products[productIndex], variants };
      return { products };
    }),

  updateVariant: (productIndex, variantIndex, updates) =>
    set((state) => {
      const products = [...state.products];
      if (productIndex < 0 || productIndex >= products.length) return state;
      const variants = [...products[productIndex].variants];
      if (variantIndex < 0 || variantIndex >= variants.length) return state;
      variants[variantIndex] = { ...variants[variantIndex], ...updates };
      products[productIndex] = { ...products[productIndex], variants };
      return { products };
    }),

  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setUploadStatus: (uploadStatus) => set({ uploadStatus }),
  setCurrentUploadProduct: (currentUploadProduct) =>
    set({ currentUploadProduct }),

  resetUpload: () =>
    set({
      ...initialState,
      products: [],
      imageList: [],
      imageMapping: {},
      imagesByFilename: {},
      workbook: null,
      sheetNames: [],
      selectedSheetName: null,
      rawRows: [],
      excelHeaders: [],
      columnMapping: null,
      mappingConfirmed: false,
    }),

  setImageList: (imageList) => set({ imageList }),
  setImageMapping: (imageMapping) => set({ imageMapping }),
  setImagesByFilename: (imagesByFilename) => set({ imagesByFilename }),
  setWorkbook: (workbook) => set({ workbook }),
  setSheetNames: (sheetNames) => set({ sheetNames }),
  setSelectedSheetName: (selectedSheetName) => set({ selectedSheetName }),
  setRawRows: (rawRows) => set({ rawRows }),
  setExcelHeaders: (excelHeaders) => set({ excelHeaders }),
  setColumnMapping: (columnMapping) => set({ columnMapping }),
  setMappingConfirmed: (mappingConfirmed) => set({ mappingConfirmed }),
}));
