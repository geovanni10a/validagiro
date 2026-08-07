export type BarcodeFormat = 'EAN_8' | 'EAN_13' | 'UPC_A' | 'UPC_E' | 'INTERNAL';
export type BarcodeSource = 'CAMERA' | 'MANUAL';
export type DraftStatus = 'DRAFT' | 'PENDING' | 'SYNCING' | 'NEEDS_REVIEW' | 'ERROR' | 'SENT';

export interface ProductRecord {
  id: string;
  name: string;
  brand?: string | null;
  categoryId: string;
  categoryName?: string;
  unitOfMeasure: string;
  packageContent?: { value: string; unit: string } | null;
  salePrice: { amount: string; currency: 'BRL' };
  automaticPromotionEligible: boolean;
  version: number;
}

export interface ProductFormData {
  name: string;
  brand: string;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: 'UNIT' | 'KG' | 'L';
  packageContentValue: string;
  packageContentUnit: string;
  salePrice: string;
  automaticPromotionEligible: 'true' | 'false';
}

export interface BatchFormData {
  expiryDate: string;
  batchNumber: string;
  quantity: string;
  locationId: string;
  locationName: string;
  entryDate: string;
  unitCost: string;
  observation: string;
}

export interface IntakeDraft {
  id: string;
  clientRequestId: string;
  /** UUID v4 persistente da instalação. Opcional somente para migrar drafts legados. */
  deviceId?: string;
  barcode: string;
  barcodeFormat: BarcodeFormat;
  barcodeSource: BarcodeSource;
  status: DraftStatus;
  productMode?: 'CREATE' | 'EXISTING';
  existingProduct?: ProductRecord;
  product?: ProductFormData;
  batch?: BatchFormData;
  questionnaireVersion: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  serverFieldErrors?: Record<string, string>;
  reviewReason?: 'FIELD_ERRORS' | 'PRODUCT_CONFLICT' | 'CONFLICT';
}

export interface Category { id: string; name: string }
export interface Location { id: string; code: string; name: string; path?: string }

export type RootStackParamList = {
  Home: undefined;
  CameraPermission: undefined;
  Scanner: undefined;
  ManualBarcode: { fromScanner?: boolean } | undefined;
  Lookup: { barcode: string; format: BarcodeFormat; source: BarcodeSource; draftId?: string };
  NewProduct: undefined;
  ProductForm: undefined;
  BatchForm: undefined;
  Review: undefined;
  Result: { offline: boolean };
  Queue: undefined;
  SessionExpired: { returnTo: 'Queue' | 'Review' | 'Lookup' };
  ProductConflict: undefined;
};
