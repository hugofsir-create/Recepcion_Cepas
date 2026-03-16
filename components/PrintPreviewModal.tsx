
import React from 'react';
import { ProductLabel } from '../types';
import LabelItem from './LabelItem';
import { X, Printer, ZoomIn } from 'lucide-react';

interface PrintPreviewModalProps {
  label: ProductLabel | null;
  onClose: () => void;
  onPrint: (label: ProductLabel) => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({ label, onClose, onPrint }) => {
  if (!label) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-6xl max-h-[95vh] flex flex-col items-center">
        
        {/* Header del Modal */}
        <div className="w-full flex justify-between items-center mb-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ZoomIn size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Previsualización de Impresión</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Formato Final A4 Landscape (Escalado para pantalla)</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => onPrint(label)}
              className="flex items-center gap-2 bg-white text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs hover:bg-blue-50 transition-all shadow-xl"
            >
              <Printer size={16} /> IMPRIMIR AHORA
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Contenedor de la Etiqueta con Escala */}
        <div className="w-full overflow-auto flex justify-center items-start p-8 bg-slate-900/50 rounded-[2.5rem] border border-slate-800 shadow-inner custom-scrollbar">
          <div className="origin-top scale-[0.4] md:scale-[0.5] lg:scale-[0.6] xl:scale-[0.7] shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="bg-white">
               <LabelItem label={label} isPrintView={true} />
            </div>
          </div>
        </div>

        <div className="mt-6 text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">
          — Vista previa exacta del documento final —
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
