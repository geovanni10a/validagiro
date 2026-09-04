export type UnitOfMeasure = 'UNIT' | 'KG' | 'L';

export type Category = { id: string; name: string };
export type Location = { id: string; code: string; name: string; path?: string | null };

export type Product = {
  id: string;
  barcode: string;
  name: string;
  brand?: string | null;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: UnitOfMeasure;
  packageContentValue?: number | null;
  packageContentUnit?: string | null;
  salePrice?: number | null;
  automaticPromotionEligible: boolean;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type Batch = {
  id: string;
  productId: string;
  batchNumber?: string | null;
  quantity: number;
  expiryDate: string;
  locationId: string;
  locationName: string;
  entryDate: string;
  unitCost?: number | null;
  observation?: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type InventoryItem = { product: Product; batch: Batch };

export type IntakeDraft = {
  id: string;
  barcode: string;
  product?: Partial<Product>;
  batch?: Partial<Batch>;
  updatedAt: string;
};

export type ProductInput = Omit<Product, 'id' | 'createdAt'>;
export type BatchInput = Omit<Batch, 'id' | 'productId' | 'createdAt'>;

export type ExpiryLevel = 'LONG' | 'ATTENTION' | 'URGENT' | 'CRITICAL' | 'EXPIRED';

export type SyncSnapshot = {
  products: Product[];
  batches: Batch[];
  serverTime?: string;
};

export type SyncResult = {
  uploadedProducts: number;
  uploadedBatches: number;
  downloadedProducts: number;
  downloadedBatches: number;
  syncedAt: string;
};
