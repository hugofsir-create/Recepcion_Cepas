
export interface MaterialMaster {
  sku: string;
  description: string;
  qtyPerPallet: number;
}

export interface ProductLabel {
  id: string;
  sku: string;
  description: string;
  receptionDate: string;
  batch: string;
  expirationDate: string;
  uniqueCode: string;
  boxCount: number; // Quantity in THIS pallet
  standardQty: number; // Standard quantity per pallet from master
  totalBatchQty: number; // Total quantity from shipment
  palletIndex: number; // e.g., 1
  totalPallets: number; // e.g., 3
}

export interface AppState {
  labels: ProductLabel[];
  masterData: Record<string, MaterialMaster>;
  currentSequence: string;
}
