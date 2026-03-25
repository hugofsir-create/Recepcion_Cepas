
import React, { useState, useMemo, useEffect } from 'react';
import { ProductLabel, MaterialMaster } from './types';
import { splitIntoPallets } from './utils/helpers';
import LabelForm from './components/LabelForm';
import LabelItem from './components/LabelItem';
import BulkInputGrid from './components/BulkInputGrid';
import EditLabelModal from './components/EditLabelModal';
import MasterDataManager from './components/MasterDataManager';
import InventorySummary from './components/InventorySummary';
import PrintPreviewModal from './components/PrintPreviewModal';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence } from 'framer-motion';
import { 
  Printer, Trash2, Box, Database, Layers,
  Search, Edit3, PackageCheck, FileSpreadsheet, AlertTriangle, BookOpen, Download, Upload, BarChart3, FileQuestion, Eye, RotateCcw
} from 'lucide-react';

const App: React.FC = () => {
  const [labels, setLabels] = useState<ProductLabel[]>(() => {
    const saved = localStorage.getItem('logispro_labels');
    return saved ? JSON.parse(saved) : [];
  });
  const [masterData, setMasterData] = useState<Record<string, MaterialMaster>>(() => {
    const saved = localStorage.getItem('logispro_master');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentCode, setCurrentCode] = useState<string>(() => {
    const saved = localStorage.getItem('logispro_seq');
    return saved || "AA001";
  });

  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'inventory' | 'master'>('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLabel, setEditingLabel] = useState<ProductLabel | null>(null);
  const [previewingLabel, setPreviewingLabel] = useState<ProductLabel | null>(null);
  const [printingSingle, setPrintingSingle] = useState<ProductLabel | null>(null);
  const [printingSubset, setPrintingSubset] = useState<ProductLabel[] | null>(null);
  const [isPrintingSelected, setIsPrintingSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500); // A bit more than 3s to ensure progress bar finishes
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('logispro_labels', JSON.stringify(labels));
    localStorage.setItem('logispro_master', JSON.stringify(masterData));
    localStorage.setItem('logispro_seq', currentCode);
  }, [labels, masterData, currentCode]);

  const handleImportMaster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        // @ts-ignore
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // @ts-ignore
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        
        if (!jsonData || jsonData.length === 0) {
          alert("El archivo parece estar vacío.");
          return;
        }

        const clean = (s: string) => s.toString().toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");

        const headers = Object.keys(jsonData[0]);
        const colSku = headers.find(h => clean(h) === "sku");
        const colDesc = headers.find(h => clean(h).includes("desc") || clean(h) === "nombre");
        const colQty = headers.find(h => clean(h).includes("caj") || clean(h).includes("pall") || clean(h).includes("estandar"));

        if (!colSku) {
          alert("Error: No se encontró una columna llamada 'SKU' en el archivo.");
          return;
        }

        const newMaster: Record<string, MaterialMaster> = { ...masterData };
        let count = 0;

        jsonData.forEach((row: any) => {
          const skuRaw = row[colSku]?.toString().trim();
          if (skuRaw) {
            const sku = skuRaw.toUpperCase();
            newMaster[sku] = {
              sku,
              description: colDesc ? row[colDesc]?.toString().trim() || "Sin descripción" : "Sin descripción",
              qtyPerPallet: colQty ? parseInt(row[colQty], 10) || 0 : 0
            };
            count++;
          }
        });

        setMasterData(newMaster);
        alert(`¡Importación exitosa!\nSe cargaron/actualizaron ${count} productos en el maestro.`);
      } catch (err) {
        console.error(err);
        alert("Error crítico al procesar el archivo Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const csvContent = "SKU,Descripcion,Cajas Por Pallet\nPROD001,EJEMPLO PRODUCTO A,48\nPROD002,EJEMPLO PRODUCTO B,24";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_maestro_logispro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addIndividualLabel = (data: any) => {
    const { labels: newLabels, nextSeq } = splitIntoPallets(
      data.sku.toUpperCase(),
      parseInt(data.totalBatchQty || "0"),
      data.batch,
      data.expirationDate,
      data.receptionDate,
      masterData,
      currentCode,
      data.description,
      parseInt(data.qtyPerPallet || "0")
    );
    const labelsWithIds = newLabels.map(l => ({ ...l, id: crypto.randomUUID() })) as ProductLabel[];
    setLabels(prev => [...prev, ...labelsWithIds]);
    setCurrentCode(nextSeq);
  };

  const handleBulkGenerate = (entries: any[]) => {
    let tempSeq = currentCode;
    let allNewLabels: ProductLabel[] = [];
    
    entries.forEach(entry => {
      const { labels: splitLabels, nextSeq } = splitIntoPallets(
        entry.sku,
        entry.totalQty,
        entry.batch,
        entry.expDate,
        entry.receptionDate,
        masterData,
        tempSeq,
        undefined,
        entry.qtyPerPallet
      );
      const ready = splitLabels.map(l => ({ ...l, id: crypto.randomUUID() })) as ProductLabel[];
      allNewLabels = [...allNewLabels, ...ready];
      tempSeq = nextSeq;
    });
    
    setLabels(prev => [...prev, ...allNewLabels]);
    setCurrentCode(tempSeq);

    // Trigger print for new labels
    setPrintingSubset(allNewLabels);
    setTimeout(() => {
      window.print();
      setPrintingSubset(null);
    }, 200);
  };

  const handlePrintSingle = (label: ProductLabel) => {
    setPrintingSingle(label);
    setPrintingSubset(null);
    setIsPrintingSelected(false);
    setPreviewingLabel(null);
    setTimeout(() => {
      window.print();
      setPrintingSingle(null);
    }, 150);
  };

  const handlePrintAll = () => {
    setPrintingSingle(null);
    setPrintingSubset(null);
    setIsPrintingSelected(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintSelected = () => {
    if (selectedIds.length === 0) return;
    setIsPrintingSelected(true);
    setPrintingSingle(null);
    setPrintingSubset(null);
    setTimeout(() => {
      window.print();
      setIsPrintingSelected(false);
    }, 150);
  };

  const updateLabel = (updated: ProductLabel) => {
    setLabels(prev => prev.map(l => l.id === updated.id ? updated : l));
    setEditingLabel(null);
  };

  const removeLabel = (id: string) => {
    if(confirm("¿Confirmas la salida de este pallet?")) {
      setLabels(prev => prev.filter(l => l.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Confirmas la salida masiva de ${selectedIds.length} pallets?`)) {
      setLabels(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLabels.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLabels.map(l => l.id));
    }
  };

  const updateMaster = (newProduct: MaterialMaster) => {
    setMasterData(prev => ({ ...prev, [newProduct.sku.toUpperCase()]: newProduct }));
  };

  const deleteFromMaster = (sku: string) => {
    if(confirm(`¿Eliminar ${sku} del maestro?`)) {
      const newData = { ...masterData };
      delete newData[sku];
      setMasterData(newData);
    }
  };

  const exportBackup = () => {
    const backup = {
      labels,
      masterData,
      currentCode,
      version: '1.0',
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logispro_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.labels) setLabels(data.labels);
        if (data.masterData) setMasterData(data.masterData);
        if (data.currentCode) setCurrentCode(data.currentCode);
        alert("Backup restaurado con éxito.");
      } catch (err) {
        alert("Error al leer el archivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const clearAll = () => {
    if(confirm("¿BORRAR TODO EL INVENTARIO ACTUAL?")) {
      setLabels([]);
      setCurrentCode("AA001");
    }
  };

  const resetSequence = () => {
    if(confirm("¿Reiniciar el contador de etiquetas a AA001?")) {
      setCurrentCode("AA001");
    }
  };

  const filteredLabels = useMemo(() => {
    return labels.filter(l => 
      l.sku.includes(searchTerm.toUpperCase()) || 
      l.batch.includes(searchTerm.toUpperCase()) ||
      l.uniqueCode.includes(searchTerm.toUpperCase())
    );
  }, [labels, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 py-12 pb-24">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-900/30">
            <Box className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-50 leading-none tracking-tight italic">LOGIS<span className="text-blue-500">PRO</span></h1>
            <p className="text-xs text-slate-400 mt-1.5 font-bold uppercase tracking-widest flex items-center gap-2">
              <PackageCheck size={14} className="text-blue-500" />
              Gestión de Etiquetas A4 Landscape
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={resetSequence}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 rounded-xl border border-slate-700 transition-all text-slate-400"
            title="Reiniciar secuencia a AA001"
          >
            <RotateCcw size={18} />
            <span className="text-xs font-black uppercase">Reiniciar Seq</span>
          </button>

          <button 
            onClick={downloadTemplate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all text-slate-300"
            title="Descargar plantilla Excel/CSV"
          >
            <FileQuestion size={18} />
            <span className="text-xs font-black uppercase">Plantilla</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-green-600/10 hover:bg-green-600/20 rounded-xl cursor-pointer border border-green-500/20 transition-all group">
            <FileSpreadsheet size={18} className="text-green-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-green-400 uppercase">Importar Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportMaster} className="hidden" />
          </label>

          {selectedIds.length > 0 && (
            <button
              onClick={handlePrintSelected}
              className="flex items-center space-x-2 bg-blue-600 text-white px-7 py-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-xl font-black text-sm active:scale-95 animate-in fade-in zoom-in duration-300"
            >
              <Printer size={18} />
              <span>IMPRIMIR SELECCIONADOS ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={handlePrintAll}
            disabled={labels.length === 0}
            className="flex items-center space-x-2 bg-white text-slate-950 px-7 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-xl font-black text-sm active:scale-95"
          >
            <Printer size={18} />
            <span>IMPRIMIR TODO</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 no-print">
        <aside className={`${activeTab === 'bulk' || activeTab === 'master' || activeTab === 'inventory' ? 'lg:col-span-12' : 'lg:col-span-4'} space-y-6 transition-all duration-500`}>
          <div className="bg-slate-900/80 p-1 rounded-2xl border border-slate-800 flex max-w-2xl mx-auto lg:mx-0">
            {(['individual', 'bulk', 'inventory', 'master'] as const).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === tab ? 'bg-slate-800 text-blue-400 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab === 'individual' ? 'Manual' : tab === 'bulk' ? 'Masivo' : tab === 'inventory' ? 'Inventario' : 'Maestro'}
              </button>
            ))}
          </div>

          {activeTab === 'individual' && (
            <div className="animate-in fade-in slide-in-from-left-4">
              <LabelForm onAdd={addIndividualLabel} nextCode={currentCode} masterData={masterData} />
            </div>
          )}

          {activeTab === 'bulk' && (
            <BulkInputGrid masterData={masterData} onGenerate={handleBulkGenerate} />
          )}

          {activeTab === 'inventory' && (
            <InventorySummary labels={labels} masterData={masterData} />
          )}

          {activeTab === 'master' && (
            <MasterDataManager masterData={masterData} onAdd={updateMaster} onDelete={deleteFromMaster} />
          )}

          {activeTab !== 'inventory' && activeTab !== 'bulk' && activeTab !== 'master' && (
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl animate-in fade-in space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-100 flex items-center space-x-2 mb-4 uppercase italic">
                  <Database size={16} className="text-blue-500" />
                  <span>Estado Stock</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Cajas</span>
                    <span className="text-xl font-black text-blue-400">{labels.reduce((sum, l) => sum + l.boxCount, 0)}</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Pallets</span>
                    <span className="text-xl font-black text-slate-100">{labels.length}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
                <button 
                  onClick={exportBackup}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Download size={14} /> Exportar Backup
                </button>
                <label className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">
                  <Upload size={14} /> Importar Backup
                  <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                </label>
                <button 
                  onClick={clearAll} 
                  className="w-full mt-2 text-[9px] font-black text-red-500/30 hover:text-red-500 transition-all uppercase tracking-widest text-center"
                >
                  Vaciar Inventario
                </button>
              </div>
            </div>
          )}
        </aside>

        {(activeTab === 'individual') && (
          <main className="lg:col-span-8 space-y-6 transition-all duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-50 flex items-center space-x-3 italic uppercase tracking-tighter">
                <Layers size={22} className="text-blue-500" />
                <span>Pallets en Inventario</span>
              </h2>
              <div className="relative flex-1 max-w-sm flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    placeholder="Filtrar por SKU, Lote o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                {filteredLabels.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  >
                    {selectedIds.length === filteredLabels.length ? 'Deseleccionar' : 'Sel. Todo'}
                  </button>
                )}
              </div>
            </div>

            {selectedIds.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <span className="text-sm font-black text-red-400 uppercase tracking-tight">
                    {selectedIds.length} Pallets seleccionados
                  </span>
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  ELIMINAR SELECCIONADOS
                </button>
              </div>
            )}

            {filteredLabels.length === 0 ? (
              <div className="py-32 border-2 border-dashed border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-700">
                <Box size={40} className="mb-4 opacity-10" />
                <p className="font-black uppercase text-xs tracking-widest opacity-30">No hay etiquetas para mostrar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredLabels.map((label) => (
                  <div key={label.id} className="relative group animate-in zoom-in-95 duration-300">
                    <div className={`absolute top-3 left-3 z-20 transition-all ${selectedIds.includes(label.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(label.id)}
                        onChange={() => toggleSelect(label.id)}
                        className="w-6 h-6 rounded-lg bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div onClick={() => toggleSelect(label.id)} className="cursor-pointer">
                      <LabelItem label={label} />
                    </div>
                    <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10">
                      <button 
                        onClick={() => setPreviewingLabel(label)} 
                        className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-500 transition-all"
                        title="Ver Formato Real"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handlePrintSingle(label)} 
                        className="bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-500 transition-all"
                        title="Imprimir solo esta etiqueta"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingLabel(label)} 
                        className="bg-slate-700 text-white p-2 rounded-xl shadow-lg hover:bg-slate-600 transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => removeLabel(label.id)} 
                        className="bg-slate-800 text-slate-400 p-2 rounded-xl shadow-lg hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      <EditLabelModal label={editingLabel} onClose={() => setEditingLabel(null)} onSave={updateLabel} />
      
      <PrintPreviewModal 
        label={previewingLabel} 
        onClose={() => setPreviewingLabel(null)} 
        onPrint={handlePrintSingle} 
      />

      {/* SECCIÓN DE IMPRESIÓN */}
      <div id="print-section" className="hidden print:block">
        <div className="flex flex-col bg-white text-black min-h-screen">
          {printingSingle ? (
            <LabelItem label={printingSingle} isPrintView={true} />
          ) : printingSubset ? (
            printingSubset.map((label) => (
              <LabelItem key={label.id} label={label} isPrintView={true} />
            ))
          ) : isPrintingSelected ? (
            labels.filter(l => selectedIds.includes(l.id)).map((label) => (
              <LabelItem key={label.id} label={label} isPrintView={true} />
            ))
          ) : (
            labels.map((label) => (
              <LabelItem key={label.id} label={label} isPrintView={true} />
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default App;
