
import React from 'react';
import { ProductLabel } from '../types';
import { formatDate } from '../utils/helpers';

interface LabelItemProps {
  label: ProductLabel;
  isPrintView?: boolean;
}

const LabelItem: React.FC<LabelItemProps> = ({ label, isPrintView = false }) => {
  const formatMonthYear = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' }).toUpperCase();
  };

  // Dimensiones optimizadas para A4 Landscape (297x210mm)
  const containerClasses = isPrintView 
    ? 'border-[4mm] border-black bg-white p-[10mm] flex flex-col justify-between overflow-hidden h-[195mm] w-[280mm] text-black relative page-break mx-auto mt-[5mm]' 
    : 'border border-slate-700 bg-slate-900 p-4 flex flex-col justify-between overflow-hidden h-64 w-full rounded-xl shadow-lg shadow-black/20 relative';

  const borderClass = isPrintView ? 'border-black' : 'border-slate-800';

  if (!isPrintView) {
    return (
      <div className={containerClasses}>
        <div className="flex justify-between items-start border-b border-slate-800 pb-2">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block uppercase">SKU</span>
            <span className="text-sm font-mono font-black text-blue-400">{label.sku} {label.tripNumber && <span className="text-slate-500 text-[8px] ml-1">VIAJE: {label.tripNumber}</span>}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-500 block uppercase">ID</span>
            <span className="text-[10px] px-2 py-0.5 font-black text-red-400 bg-red-500/10 rounded-lg">{label.uniqueCode}</span>
          </div>
        </div>
        <div className="flex-1 py-2">
          <p className="text-xs font-medium text-slate-100 line-clamp-2">{label.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[9px] border-t border-slate-800 pt-2">
          <div>
            <span className="text-slate-500 block">LOTE: {label.batch}</span>
            <span className="text-slate-500 block">REC: {formatDate(label.receptionDate)}</span>
            <span className="text-slate-500 block">EST: {label.standardQty}</span>
          </div>
          <div className="text-right">
            <span className="text-red-400 block font-bold">VENCE: {formatMonthYear(label.expirationDate)}</span>
            <span className="text-slate-100 block font-bold">PALLET: {label.palletIndex}/{label.totalPallets}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      {/* 1. SECCIÓN SKU: EL DATO MÁS IMPORTANTE ARRIBA */}
      <div className={`flex justify-between items-start border-b-[4mm] ${borderClass} pb-4`}>
        <div className="flex-1">
          <span className="text-3xl font-black text-gray-500 uppercase tracking-tighter mb-1 block">SKU PRODUCTO {label.tripNumber && <span className="text-blue-600 ml-4">VIAJE: {label.tripNumber}</span>}</span>
          <span className="text-[12rem] leading-none font-mono font-black text-black tracking-tighter">
            {label.sku}
          </span>
        </div>
        <div className="text-right flex flex-col items-end pt-4">
          <span className="text-2xl font-black text-gray-500 uppercase mb-2">CÓDIGO RASTREO</span>
          <span className="text-[6rem] font-black text-black leading-none">
            {label.uniqueCode}
          </span>
        </div>
      </div>

      {/* 2. DESCRIPCIÓN Y DATOS TÉCNICOS */}
      <div className="grid grid-cols-3 gap-8 py-4 items-center">
        <div className="col-span-2">
          <span className="text-2xl font-black text-gray-500 uppercase mb-1 block">DESCRIPCIÓN DEL MATERIAL</span>
          <p className="text-6xl font-black leading-[1.1] text-black uppercase line-clamp-2">
            {label.description}
          </p>
        </div>
        <div className="bg-gray-100 border-[2mm] border-black rounded-[6mm] p-4 text-center flex flex-col justify-center min-h-[40mm]">
          <span className="text-xl font-black text-gray-700 uppercase block mb-1">CAJAS POR PALLET</span>
          <span className="text-7xl font-black text-black leading-none">
            {label.standardQty || label.boxCount || "-"}
          </span>
        </div>
      </div>

      {/* 3. SECCIÓN VENCIMIENTO (OPTIMIZADA) */}
      <div className={`flex flex-col items-center justify-center border-y-[3mm] ${borderClass} py-5 bg-gray-50`}>
        <span className="text-3xl font-black text-black uppercase mb-3 tracking-[0.2em] underline decoration-4 underline-offset-8">
          FECHA DE VENCIMIENTO
        </span>
        <div className="inline-block border-[2.5mm] border-black rounded-[8mm] px-14 py-3 bg-white">
          <span className="text-[7.2rem] leading-none font-black text-black whitespace-nowrap">
            {formatMonthYear(label.expirationDate)}
          </span>
        </div>
      </div>

      {/* 4. DATOS SECUNDARIOS: RECEPCIÓN Y LOTE */}
      <div className="grid grid-cols-2 gap-12 py-5 border-b-[2mm] border-gray-200">
        <div>
          <span className="text-2xl font-black text-gray-400 uppercase mb-2 block">RECEPCIÓN</span>
          <span className="text-6xl font-black text-gray-800">{formatDate(label.receptionDate)}</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-gray-400 uppercase mb-2 block">LOTE / BATCH</span>
          <span className="text-6xl font-black text-gray-800">{label.batch || "SIN LOTE"}</span>
        </div>
      </div>

      {/* 5. FOOTER: CANTIDADES Y PALLET */}
      <div className="flex justify-between items-end pt-5">
        <div className="flex gap-6 min-w-[55%]">
          <div className="flex-1 bg-blue-50 p-6 rounded-[8mm] border-4 border-blue-200">
            <div className="text-center w-full">
              <span className="text-2xl font-black text-blue-600 uppercase mb-1 block">CANTIDAD EN ESTE PALLET</span>
              <span className="text-[7rem] font-black text-blue-900 leading-none">{label.boxCount}</span>
            </div>
          </div>
          <div className="flex-1 bg-gray-50 p-6 rounded-[8mm] border-4 border-gray-200">
            <div className="text-center w-full">
              <span className="text-2xl font-black text-gray-500 uppercase mb-1 block">TOTAL DEL LOTE</span>
              <span className="text-[7rem] font-black text-gray-800 leading-none">{label.totalBatchQty}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="bg-black text-white px-12 py-6 rounded-[10mm] inline-block shadow-2xl">
            <span className="text-xl font-black text-gray-400 uppercase mb-2 block text-center">CONTENEDOR</span>
            <span className="text-8xl font-black block leading-none">
              {label.palletIndex} <span className="text-4xl text-gray-500 align-middle">/</span> {label.totalPallets}
            </span>
          </div>
        </div>
      </div>

      {/* LÍNEA DE CRÉDITO LOGISPRO */}
      <div className="absolute bottom-2 left-[10mm] right-[10mm] flex justify-between items-center opacity-30">
        <span className="text-lg font-black italic">LOGISPRO v1.0 CLOUD</span>
        <span className="text-lg font-black uppercase tracking-widest">CONTROL DE ALMACÉN CENTRAL</span>
      </div>
    </div>
  );
};

export default LabelItem;
