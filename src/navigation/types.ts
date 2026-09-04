import type { Batch, BatchInput, IntakeDraft, Product, ProductInput } from '../types';

export type RootStackParamList = {
  Main: undefined;
  Scanner: undefined;
  ManualBarcode: { fromScanner?: boolean } | undefined;
  Lookup: { barcode: string };
  ProductForm: { barcode: string };
  BatchForm: { product: Product | ProductInput; isNew: boolean; draft?: IntakeDraft };
  Review: { product: Product | ProductInput; batch: BatchInput; isNew: boolean; draftId?: string };
  Success: { product: Product | ProductInput; batch: BatchInput };
  ProductDetail: { barcode: string };
  EditBatch: { product: Product; batch: Batch };
  Drafts: undefined;
  Settings: undefined;
  Warehouse3D: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Estoque: undefined;
  Alertas: undefined;
  Mapa: undefined;
};
