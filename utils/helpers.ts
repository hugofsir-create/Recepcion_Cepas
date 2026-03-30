
import { ProductLabel, MaterialMaster } from '../types';

export function getNextSequence(current: string): string {
  if (!current) return "AA001";
  const letters = current.substring(0, 2);
  const numbers = parseInt(current.substring(2), 10);
  
  if (numbers < 999) {
    return `${letters}${(numbers + 1).toString().padStart(3, '0')}`;
  } else {
    let char1 = letters.charCodeAt(0);
    let char2 = letters.charCodeAt(1);
    if (char2 < 90) char2++;
    else { char2 = 65; char1++; }
    return `${String.fromCharCode(char1)}${String.fromCharCode(char2)}001`;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  // Usar UTC para evitar desfases de zona horaria (YYYY-MM-DD se interpreta como UTC 00:00)
  return new Date(dateStr).toLocaleDateString('es-ES', { timeZone: 'UTC' });
}

/**
 * Divide una cantidad total en múltiples etiquetas de pallet.
 */
export function splitIntoPallets(
  sku: string,
  totalQty: number,
  batch: string,
  expirationDate: string,
  receptionDate: string,
  master: Record<string, MaterialMaster>,
  startSequence: string,
  overrideDescription?: string,
  overrideQtyPerPallet?: number,
  tripNumber?: string
): { labels: Omit<ProductLabel, 'id'>[], nextSeq: string } {
  // Priorizar datos manuales del formulario, si no existen, usar maestro, si no, usar valores por defecto
  const item = master[sku];
  const description = overrideDescription || item?.description || "Producto Nuevo";
  const perPallet = overrideQtyPerPallet || item?.qtyPerPallet || totalQty;
  
  const labels: Omit<ProductLabel, 'id'>[] = [];
  let remaining = totalQty;
  let currentSeq = startSequence;
  let palletCount = 0;
  
  const totalPalletsNeeded = Math.ceil(totalQty / perPallet) || 1;
 
  while (remaining > 0) {
    palletCount++;
    const qtyForThisPallet = Math.min(remaining, perPallet);
    
    labels.push({
      sku: sku.toUpperCase(),
      description: description,
      receptionDate,
      batch: batch.toUpperCase(),
      expirationDate,
      uniqueCode: currentSeq,
      boxCount: qtyForThisPallet,
      standardQty: perPallet,
      totalBatchQty: totalQty,
      palletIndex: palletCount,
      totalPallets: totalPalletsNeeded,
      tripNumber: tripNumber?.toUpperCase()
    });
    
    currentSeq = getNextSequence(currentSeq);
    remaining -= qtyForThisPallet;
  }

  return { labels, nextSeq: currentSeq };
}
