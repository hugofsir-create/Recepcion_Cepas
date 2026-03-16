
import React, { useState, useEffect } from 'react';
import { ProductLabel } from '../types';
import { X, Save } from 'lucide-react';

interface EditLabelModalProps {
  label: ProductLabel | null;
  onClose: () => void;
  onSave: (updatedLabel: ProductLabel) => void;
}

const EditLabelModal: React.FC<EditLabelModalProps> = ({ label, onClose, onSave }) => {
  const [formData, setFormData] = useState<ProductLabel | null>(null);

  useEffect(() => {
    if (label) setFormData({ ...label });
  }, [label]);

  if (!label || !formData) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-100 italic">EDITAR ETIQUETA <span className="text-blue-500">{label.uniqueCode}</span></h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">SKU</label>
              <input name="sku" value={formData.sku} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cajas / Pallet (Estándar)</label>
              <input type="number" name="standardQty" value={formData.standardQty || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad Cajas (Actual)</label>
              <input type="number" name="boxCount" value={formData.boxCount || ''} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Lote</label>
              <input name="batch" value={formData.batch} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 uppercase" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Recepción</label>
              <input type="date" name="receptionDate" value={formData.receptionDate} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Vencimiento</label>
              <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100" />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
              <Save size={18} />
              GUARDAR CAMBIOS
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditLabelModal;
