
import React, { useState, useEffect } from 'react';
import { MaterialMaster } from '../types';
import { Plus, Trash2, Search, Package, BookOpen, AlertCircle, Edit2, X } from 'lucide-react';

interface MasterDataManagerProps {
  masterData: Record<string, MaterialMaster>;
  onAdd: (product: MaterialMaster) => void;
  onDelete: (sku: string) => void;
}

const MasterDataManager: React.FC<MasterDataManagerProps> = ({ masterData, onAdd, onDelete }) => {
  const [newProduct, setNewProduct] = useState({
    sku: '',
    description: '',
    qtyPerPallet: ''
  });
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const handleEdit = (product: MaterialMaster) => {
    setEditingSku(product.sku);
    setNewProduct({
      sku: product.sku,
      description: product.description,
      qtyPerPallet: product.qtyPerPallet.toString()
    });
    // Scroll to top on mobile to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingSku(null);
    setNewProduct({ sku: '', description: '', qtyPerPallet: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.description || !newProduct.qtyPerPallet) {
      alert("Por favor completa todos los campos del producto.");
      return;
    }

    const skuUpper = newProduct.sku.trim().toUpperCase();

    // Si estamos editando y cambiamos el SKU a uno que ya existe (y no es el mismo que estamos editando)
    if (!editingSku && masterData[skuUpper]) {
      if (!confirm("El SKU ya existe en el maestro. ¿Deseas sobreescribir los datos?")) return;
    }

    onAdd({
      sku: skuUpper,
      description: newProduct.description.trim(),
      qtyPerPallet: parseInt(newProduct.qtyPerPallet, 10)
    });

    // Si el SKU cambió durante la edición, borramos el viejo (opcional, aquí asumimos actualización por SKU)
    if (editingSku && editingSku !== skuUpper) {
      onDelete(editingSku);
    }

    cancelEdit();
  };

  // Fix: Explicitly cast Object.values(masterData) to MaterialMaster[] to resolve 'unknown' type property access errors.
  const filteredMaster = (Object.values(masterData) as MaterialMaster[]).filter(item => 
    item.sku.includes(filter.toUpperCase()) || 
    item.description.toLowerCase().includes(filter.toLowerCase())
  );

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Formulario Lateral */}
      <div className="lg:col-span-4">
        <form onSubmit={handleSubmit} className={`bg-slate-900 border ${editingSku ? 'border-blue-500/50 shadow-blue-500/10' : 'border-slate-800'} p-6 rounded-3xl shadow-2xl space-y-5 sticky top-6 transition-all`}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 italic uppercase tracking-tighter">
              {editingSku ? <Edit2 className="text-blue-500" size={20} /> : <Plus className="text-blue-500" size={20} />}
              {editingSku ? 'Editando Producto' : 'Nuevo Registro'}
            </h3>
            {editingSku && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="text-slate-500 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={labelClass}>SKU / Código</label>
              <input 
                value={newProduct.sku}
                onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                placeholder="Ej: PRD-001"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea 
                value={newProduct.description}
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                placeholder="Nombre descriptivo del material"
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </div>
            <div>
              <label className={labelClass}>Cajas Estándar / Pallet</label>
              <input 
                type="number"
                value={newProduct.qtyPerPallet}
                onChange={e => setNewProduct({...newProduct, qtyPerPallet: e.target.value})}
                placeholder="Ej: 48"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              type="submit"
              className={`w-full ${editingSku ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-black py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95`}
            >
              {editingSku ? 'ACTUALIZAR PRODUCTO' : 'GUARDAR EN MAESTRO'}
            </button>
            {editingSku && (
              <button 
                type="button"
                onClick={cancelEdit}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-2 text-xs rounded-xl transition-all"
              >
                CANCELAR EDICIÓN
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Listado de Productos */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/50">
            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2 italic uppercase tracking-tighter">
                <BookOpen className="text-blue-500" size={20} />
                Catálogo de Materiales
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{filteredMaster.length} productos registrados</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                placeholder="Buscar en maestro..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[600px]">
            {filteredMaster.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-700 opacity-40">
                <AlertCircle size={40} className="mb-2" />
                <p className="font-black uppercase text-xs">Sin productos</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">SKU</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Descripción</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">Cajas/Pallet</th>
                    <th className="px-6 py-4 w-24 border-b border-slate-800">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredMaster.map((item) => (
                    <tr 
                      key={item.sku} 
                      className={`hover:bg-slate-800/30 transition-colors group ${editingSku === item.sku ? 'bg-blue-500/10' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`font-mono font-bold ${editingSku === item.sku ? 'text-white' : 'text-blue-400'}`}>{item.sku}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className={`font-medium line-clamp-1 ${editingSku === item.sku ? 'text-white' : 'text-slate-200'}`}>
                          {item.description}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Package size={12} className="text-slate-500" />
                          <span className={`font-bold ${editingSku === item.sku ? 'text-white' : 'text-slate-100'}`}>{item.qtyPerPallet}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-blue-400 hover:text-white p-2 bg-blue-500/0 hover:bg-blue-500/20 rounded-lg transition-all"
                            title="Editar producto"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => onDelete(item.sku)}
                            className="text-slate-500 hover:text-red-500 p-2 bg-slate-800/0 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Eliminar del maestro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDataManager;
