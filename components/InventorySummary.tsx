
import React, { useMemo } from 'react';
import { ProductLabel, MaterialMaster } from '../types';
import { Package, Hash, Boxes, TrendingUp, AlertCircle, FileText, Download } from 'lucide-react';
import { formatDate } from '../utils/helpers';

interface InventorySummaryProps {
  labels: ProductLabel[];
  masterData: Record<string, MaterialMaster>;
}

const InventorySummary: React.FC<InventorySummaryProps> = ({ labels, masterData }) => {
  // Consolidamos por SKU + Lote + Vencimiento para que el reporte sea preciso
  const summary = useMemo(() => {
    const counts: Record<string, { 
      sku: string; 
      description: string; 
      totalBoxes: number; 
      palletCount: number;
      batch: string;
      expirationDate: string;
      receptionDate: string;
    }> = {};

    labels.forEach(label => {
      // Usamos una clave combinada para agrupar productos idénticos con mismo vencimiento y recepción
      const key = `${label.sku}-${label.batch}-${label.expirationDate}-${label.receptionDate}`;
      
      if (!counts[key]) {
        counts[key] = {
          sku: label.sku,
          description: label.description || masterData[label.sku]?.description || "Sin descripción",
          totalBoxes: 0,
          palletCount: 0,
          batch: label.batch || "SIN LOTE",
          expirationDate: label.expirationDate,
          receptionDate: label.receptionDate
        };
      }
      counts[key].totalBoxes += label.boxCount;
      counts[key].palletCount += 1;
    });

    return Object.values(counts).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [labels, masterData]);

  const totalBoxesGlobal = labels.reduce((sum, l) => sum + l.boxCount, 0);
  const totalPalletsGlobal = labels.length;

  const handleExportExcel = () => {
    if (summary.length === 0) return;

    try {
      // Preparar los datos para SheetJS
      const dataToExport = summary.map(item => ({
        'SKU': item.sku,
        'Descripción': item.description,
        'Lote': item.batch,
        'Cantidad Total (Cajas)': item.totalBoxes,
        'Pallets': item.palletCount,
        'Fecha Recepción': formatDate(item.receptionDate),
        'Fecha Vencimiento': formatDate(item.expirationDate)
      }));

      // Crear el libro de trabajo (workbook)
      // @ts-ignore
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      // @ts-ignore
      const wb = XLSX.utils.book_new();
      // @ts-ignore
      XLSX.utils.book_append_sheet(wb, ws, "Inventario Actual");

      // Ajustar anchos de columna automáticamente
      const wscols = [
        {wch: 15}, // SKU
        {wch: 40}, // Descripción
        {wch: 15}, // Lote
        {wch: 20}, // Cantidad
        {wch: 10}, // Pallets
        {wch: 18}, // Recepción
        {wch: 18}  // Vencimiento
      ];
      ws['!cols'] = wscols;

      // Descargar archivo
      // @ts-ignore
      XLSX.writeFile(wb, `Inventario_LogisPro_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  if (labels.length === 0) {
    return (
      <div className="py-20 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-700 animate-in fade-in">
        <Boxes size={48} className="mb-4 opacity-10" />
        <p className="font-black uppercase text-xs tracking-widest opacity-30 text-center">
          No hay datos de inventario para contabilizar.<br/>Genera etiquetas para ver el resumen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-900/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest block mb-1">Total Cajas</span>
            <span className="text-3xl font-black text-white">{totalBoxesGlobal}</span>
          </div>
          <Package className="text-blue-400 opacity-50" size={40} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Pallets</span>
            <span className="text-3xl font-black text-slate-100">{totalPalletsGlobal}</span>
          </div>
          <TrendingUp className="text-slate-700" size={40} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Registros de Lote</span>
            <span className="text-3xl font-black text-slate-100">{summary.length}</span>
          </div>
          <Hash className="text-slate-700" size={40} />
        </div>
      </div>

      {/* Detail Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 italic uppercase tracking-tighter">
              <FileText className="text-blue-500" size={20} />
              Consolidado de Inventario
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Reporte agrupado por SKU, Lote y Vencimiento</p>
          </div>
          
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95"
          >
            <Download size={16} />
            EXPORTAR A EXCEL
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950">
              <tr>
                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">SKU / Producto</th>
                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-center">Lote</th>
                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-center">Recepción</th>
                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-center">Vencimiento</th>
                <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 text-center">Pallets</th>
                <th className="px-6 py-4 font-black text-blue-500 uppercase tracking-widest border-b border-slate-800 text-right">Existencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {summary.map((item, idx) => (
                <tr key={`${item.sku}-${idx}`} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="font-mono font-black text-blue-400 text-sm">{item.sku}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 truncate max-w-xs">{item.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-slate-300 font-mono font-bold bg-slate-800 px-2 py-1 rounded">
                      {item.batch}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-slate-400 font-bold">
                      {formatDate(item.receptionDate)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-red-400 font-black">
                      {formatDate(item.expirationDate)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center justify-center bg-slate-800 text-slate-100 px-3 py-1 rounded-full font-black min-w-[3rem]">
                      {item.palletCount}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-black text-slate-50">{item.totalBoxes}</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cajas</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex items-center justify-center gap-2">
          <AlertCircle size={14} className="text-slate-600" />
          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
            Este reporte se genera dinámicamente según las etiquetas activas.
          </span>
        </div>
      </div>
    </div>
  );
};

export default InventorySummary;
