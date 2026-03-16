
import React, { useState } from 'react';
import { MaterialMaster } from '../types';
import { FileSpreadsheet, Plus, Trash2, Layers, AlertCircle, Package } from 'lucide-react';

interface BulkInputGridProps {
  masterData: Record<string, MaterialMaster>;
  onGenerate: (entries: { sku: string; totalQty: number; qtyPerPallet: number; batch: string; expDate: string; receptionDate: string }[]) => void;
}

const BulkInputGrid: React.FC<BulkInputGridProps> = ({ masterData, onGenerate }) => {
  const [rows, setRows] = useState([
    { sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] },
    { sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] },
    { sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] },
    { sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] },
    { sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] },
  ]);

  const addRows = () => {
    setRows([...rows, ...Array(5).fill({ sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] })]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    const newRows = [...rows];
    const updatedRow = { ...newRows[index], [field]: value };
    
    // Al cambiar SKU, intentamos autocompletar Cajas/Pallet desde el maestro
    if (field === 'sku') {
      const skuUpper = value.trim().toUpperCase();
      if (masterData[skuUpper]) {
        updatedRow.qtyPerPallet = masterData[skuUpper].qtyPerPallet.toString();
      }
    }
    
    newRows[index] = updatedRow;
    setRows(newRows);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    const validEntries = rows
      .filter(r => r.sku.trim() !== '' && r.qty.trim() !== '')
      .map(r => ({
        sku: r.sku.trim().toUpperCase(),
        totalQty: parseInt(r.qty, 10) || 0,
        qtyPerPallet: parseInt(r.qtyPerPallet, 10) || (parseInt(r.qty, 10) || 0), // Si no hay, usa el total
        batch: r.batch.trim().toUpperCase(),
        expDate: r.expDate,
        receptionDate: r.receptionDate
      }));
    
    if (validEntries.length === 0) {
      alert("No hay datos válidos para procesar (SKU y Cantidad son obligatorios).");
      return;
    }
    
    onGenerate(validEntries);
    setRows(Array(5).fill({ sku: '', qty: '', qtyPerPallet: '', batch: '', expDate: '', receptionDate: new Date().toISOString().split('T')[0] }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
        <div>
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 italic uppercase tracking-tighter">
            <Layers className="text-blue-500" size={20} />
            Ingreso por Lotes (Multi-Fila)
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Recepción de múltiples SKUs simultáneos</p>
        </div>
        <button 
          onClick={addRows}
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all"
        >
          <Plus size={14} /> +5 FILAS
        </button>
      </div>

      <div className="flex-1 overflow-auto max-h-[500px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-950 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">SKU</th>
              <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Cajas Totales</th>
              <th className="px-4 py-4 font-black text-blue-500/50 uppercase tracking-widest border-b border-slate-800 bg-blue-500/5">Cajas / Pallet</th>
              <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Lote</th>
              <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Recepción</th>
              <th className="px-4 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Vencimiento</th>
              <th className="px-4 py-4 w-10 border-b border-slate-800"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map((row, idx) => {
              const isKnown = masterData[row.sku.toUpperCase()];
              return (
                <tr key={idx} className={`hover:bg-slate-800/30 transition-colors ${isKnown ? 'bg-blue-500/5' : ''}`}>
                  <td className="p-1">
                    <input 
                      className={`w-full bg-transparent px-3 py-3 outline-none font-mono font-bold ${isKnown ? 'text-blue-400' : 'text-slate-200'}`}
                      placeholder="Escribir SKU..."
                      value={row.sku}
                      onChange={(e) => updateRow(idx, 'sku', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="number"
                      className="w-full bg-transparent px-3 py-3 outline-none text-slate-200 font-bold" 
                      placeholder="0"
                      value={row.qty}
                      onChange={(e) => updateRow(idx, 'qty', e.target.value)}
                    />
                  </td>
                  <td className="p-1 bg-blue-500/5">
                    <div className="relative">
                      <input 
                        type="number"
                        className={`w-full bg-transparent px-3 py-3 outline-none font-bold ${isKnown ? 'text-blue-400' : 'text-slate-400'}`} 
                        placeholder="Ej: 48"
                        value={row.qtyPerPallet}
                        onChange={(e) => updateRow(idx, 'qtyPerPallet', e.target.value)}
                      />
                      {isKnown && <Package size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500/50" />}
                    </div>
                  </td>
                  <td className="p-1">
                    <input 
                      className="w-full bg-transparent px-3 py-3 outline-none text-slate-400 uppercase font-mono" 
                      placeholder="LOTE"
                      value={row.batch}
                      onChange={(e) => updateRow(idx, 'batch', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="date"
                      className="w-full bg-transparent px-3 py-3 outline-none text-slate-500" 
                      value={row.receptionDate}
                      onChange={(e) => updateRow(idx, 'receptionDate', e.target.value)}
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="date"
                      className="w-full bg-transparent px-3 py-3 outline-none text-slate-500" 
                      value={row.expDate}
                      onChange={(e) => updateRow(idx, 'expDate', e.target.value)}
                    />
                  </td>
                  <td className="p-1 text-center">
                    <button onClick={() => removeRow(idx)} className="text-slate-700 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500">
          <AlertCircle size={14} className="text-blue-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Los pallets se crearán dividiendo Cant. Total / Cajas Pallet</span>
        </div>
        <button 
          onClick={handleProcess}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-3"
        >
          <FileSpreadsheet size={20} />
          PROCESAR RECEPCIÓN MASIVA
        </button>
      </div>
    </div>
  );
};

export default BulkInputGrid;
