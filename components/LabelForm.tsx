
import React, { useState, useEffect } from 'react';
import { MaterialMaster } from '../types';
import { Search, Package, Info, Hash, Calendar, PackageCheck, Plus } from 'lucide-react';

interface LabelFormProps {
  onAdd: (data: any) => void;
  nextCode: string;
  masterData: Record<string, MaterialMaster>;
}

const LabelForm: React.FC<LabelFormProps> = ({ onAdd, nextCode, masterData }) => {
  const [formData, setFormData] = useState({
    sku: '',
    description: '',
    qtyPerPallet: '',
    receptionDate: new Date().toISOString().split('T')[0],
    batch: '',
    expirationDate: '',
    totalBatchQty: '',
  });

  const [fromMaster, setFromMaster] = useState(false);

  useEffect(() => {
    const skuSearch = formData.sku.trim().toUpperCase();
    if (skuSearch && masterData[skuSearch]) {
      const item = masterData[skuSearch];
      setFormData(prev => ({
        ...prev,
        description: item.description,
        qtyPerPallet: item.qtyPerPallet.toString()
      }));
      setFromMaster(true);
    } else {
      setFromMaster(false);
    }
  }, [formData.sku, masterData]);

  const handleSubmit = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!formData.sku || !formData.totalBatchQty) {
      alert("Por favor completa los campos obligatorios.");
      return;
    }
    onAdd({ ...formData, shouldPrint });
    setFormData(prev => ({
      ...prev,
      sku: '',
      description: '',
      qtyPerPallet: '',
      batch: '',
      expirationDate: '',
      totalBatchQty: '',
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";

  return (
    <form onSubmit={(e) => handleSubmit(e, true)} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-slate-100 italic uppercase tracking-tighter">Nueva Recepción</h2>
        <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-500/20">
          SEQ: {nextCode}
        </div>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <label className={labelClass}><Search size={12}/> SKU del Producto</label>
          <input 
            required
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Escanear o escribir SKU..."
            className={`${inputClass} ${fromMaster ? 'border-green-500/40' : ''}`}
          />
          {fromMaster && (
            <div className="absolute right-3 top-10 flex items-center gap-1 text-[9px] font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
              <PackageCheck size={10}/> MAESTRO
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}><Info size={12}/> Descripción del Material</label>
          <input 
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Nombre completo del producto"
            className={inputClass}
            readOnly={fromMaster}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}><Package size={12}/> Cajas/Pallet</label>
            <input 
              type="text"
              inputMode="numeric"
              name="qtyPerPallet"
              value={formData.qtyPerPallet}
              onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value.replace(/\D/g, '') }))}
              placeholder="Ej: 48"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}><Hash size={12}/> Cant. Total</label>
            <input 
              required
              type="text"
              inputMode="numeric"
              name="totalBatchQty"
              value={formData.totalBatchQty}
              onChange={(e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value.replace(/\D/g, '') }))}
              placeholder="Ej: 144"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Lote / Partida</label>
          <input 
            name="batch"
            value={formData.batch}
            onChange={handleChange}
            placeholder="Ej: LOTE-A24"
            className={`${inputClass} font-mono uppercase`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}><Calendar size={12}/> Recepción</label>
            <input type="date" name="receptionDate" value={formData.receptionDate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}><Calendar size={12}/> Vencimiento</label>
            <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className={`${inputClass} border-orange-500/30`} />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          type="button"
          onClick={(e) => handleSubmit(e, false)}
          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-2xl transition-all border border-slate-700 flex items-center justify-center gap-2 active:scale-95"
        >
          <Plus size={20}/>
          GENERAR
        </button>
        <button 
          type="submit"
          className="flex-[1.5] bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95"
        >
          <PackageCheck size={20}/>
          GENERAR E IMPRIMIR
        </button>
      </div>
    </form>
  );
};

export default LabelForm;
