
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
  Search, Edit3, PackageCheck, FileSpreadsheet, AlertTriangle, BookOpen, Download, Upload, BarChart3, FileQuestion, Eye, RotateCcw,
  LogIn, LogOut, Cloud
} from 'lucide-react';
import { auth, db, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { 
  collection, doc, setDoc, getDocs, onSnapshot, writeBatch, query, where, getDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't want to crash the whole app if one write fails, but we should log it
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Fallback / Initial Local Data
  const getLocalData = () => {
    try {
      const current = localStorage.getItem('logispro_labels');
      if (current) {
        const parsed = JSON.parse(current);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      
      const salvaged: ProductLabel[] = [];
      const seenIds = new Set<string>();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
          const val = JSON.parse(localStorage.getItem(key) || "");
          if (Array.isArray(val) && val.length > 0) {
            const first = val[0];
            if (first && typeof first === 'object' && (first.sku || first.uniqueCode)) {
              val.forEach((item: any) => {
                const id = item.id || item.uniqueCode || Math.random().toString();
                if (!seenIds.has(id)) { salvaged.push(item); seenIds.add(id); }
              });
            }
          }
        } catch (e) {}
      }
      return salvaged;
    } catch (e) { return []; }
  };

  const getLocalMaster = () => {
    try {
      const current = localStorage.getItem('logispro_master');
      if (current) return JSON.parse(current);
      
      const salvaged: Record<string, MaterialMaster> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
          const val = JSON.parse(localStorage.getItem(key) || "");
          if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const keys = Object.keys(val);
            if (keys.length > 0 && val[keys[0]].sku) Object.assign(salvaged, val);
          }
        } catch (e) {}
      }
      return salvaged;
    } catch (e) { return {}; }
  };

  const [labels, setLabels] = useState<ProductLabel[]>(getLocalData);
  const [masterData, setMasterData] = useState<Record<string, MaterialMaster>>(getLocalMaster);
  const [currentCode, setCurrentCode] = useState<string>(() => localStorage.getItem('logispro_seq') || "AA001");

  const [activeTab, setActiveTab] = useState<'individual' | 'bulk' | 'inventory' | 'master'>('individual');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLabel, setEditingLabel] = useState<ProductLabel | null>(null);
  const [previewingLabel, setPreviewingLabel] = useState<ProductLabel | null>(null);
  const [printingSingle, setPrintingSingle] = useState<ProductLabel | null>(null);
  const [printingSubset, setPrintingSubset] = useState<ProductLabel[] | null>(null);
  const [printingTrip, setPrintingTrip] = useState<string | null>(null);
  const [isPrintingSelected, setIsPrintingSelected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Persist to localStorage only when offline (not logged in)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('logispro_labels', JSON.stringify(labels));
      localStorage.setItem('logispro_master', JSON.stringify(masterData));
      localStorage.setItem('logispro_seq', currentCode);
    }
  }, [labels, masterData, currentCode, user]);

  // Firebase Auth, initial synchronization, and snapshot listener configuration
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      // Unsubscribe any previous snapshot listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (u) {
        setUser(u);
        setIsAuthLoading(false);

        try {
          // Read local storage backups to see what we can sync
          const localLabelsRaw = localStorage.getItem('logispro_labels');
          const localMasterRaw = localStorage.getItem('logispro_master');
          const localSeq = localStorage.getItem('logispro_seq') || "AA001";

          let localLabels: ProductLabel[] = [];
          try { localLabels = localLabelsRaw ? JSON.parse(localLabelsRaw) : []; } catch(e){}

          let localMaster: Record<string, MaterialMaster> = {};
          try { localMaster = localMasterRaw ? JSON.parse(localMasterRaw) : {}; } catch(e){}

          // Fetch cloud equivalents to compare
          const [cloudLabelsSnap, cloudMasterSnap, cloudConfigSnap] = await Promise.all([
            getDocs(collection(db, 'users', u.uid, 'labels')),
            getDocs(collection(db, 'users', u.uid, 'materials')),
            getDoc(doc(db, 'users', u.uid, 'config', 'main'))
          ]);

          const batch = writeBatch(db);
          let syncNeeded = false;

          // Sync labels if cloud is empty
          if (cloudLabelsSnap.empty && localLabels.length > 0) {
            localLabels.forEach(l => {
              batch.set(doc(db, 'users', u.uid, 'labels', l.id), l);
            });
            syncNeeded = true;
          }

          // Sync master if cloud is empty
          if (cloudMasterSnap.empty && Object.keys(localMaster).length > 0) {
            Object.keys(localMaster).forEach(sku => {
              batch.set(doc(db, 'users', u.uid, 'materials', sku), localMaster[sku]);
            });
            syncNeeded = true;
          }

          // Sync config if cloud is empty
          if (!cloudConfigSnap.exists() && localSeq) {
            batch.set(doc(db, 'users', u.uid, 'config', 'main'), { currentSequence: localSeq });
            syncNeeded = true;
          }

          if (syncNeeded) {
            await batch.commit();
            console.log("Local inventory successfully synced to Firebase.");
          }

          // Set up real-time snapshot listeners now that cloud has the correct state
          const unsubLabels = onSnapshot(collection(db, 'users', u.uid, 'labels'), (snap) => {
            const cloudLabels = snap.docs.map(d => d.data() as ProductLabel);
            setLabels(cloudLabels); // Correctly sets labels to empty if all are deleted in the cloud
          }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/labels`));

          const unsubMaster = onSnapshot(collection(db, 'users', u.uid, 'materials'), (snap) => {
            const cloudMaster: Record<string, MaterialMaster> = {};
            snap.docs.forEach(d => {
              const m = d.data() as MaterialMaster;
              cloudMaster[m.sku] = m;
            });
            setMasterData(cloudMaster);
          }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/materials`));

          const unsubConfig = onSnapshot(doc(db, 'users', u.uid, 'config', 'main'), (snap) => {
            if (snap.exists()) {
              const config = snap.data();
              if (config.currentSequence) setCurrentCode(config.currentSequence);
            }
          }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}/config/main`));

          unsubs.push(unsubLabels, unsubMaster, unsubConfig);

        } catch (e) {
          console.error("Error setting up synched listeners:", e);
        }
      } else {
        setUser(null);
        setIsAuthLoading(false);
        // Clean load of local fallback data upon logout
        setLabels(getLocalData());
        setMasterData(getLocalMaster());
        setCurrentCode(localStorage.getItem('logispro_seq') || "AA001");
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  // Wrap set functions to also push to Firestore if logged in
  const pushToFirestore = async (entity: 'label' | 'master' | 'seq', data: any) => {
    if (!user) return;
    try {
      if (entity === 'label') {
        if (Array.isArray(data)) {
          const batch = writeBatch(db);
          data.forEach(l => {
            batch.set(doc(db, 'users', user.uid, 'labels', l.id), l);
          });
          await batch.commit();
        } else {
          await setDoc(doc(db, 'users', user.uid, 'labels', data.id), data);
        }
      } else if (entity === 'master') {
        await setDoc(doc(db, 'users', user.uid, 'materials', data.sku), data);
      } else if (entity === 'seq') {
        await setDoc(doc(db, 'users', user.uid, 'config', 'main'), { currentSequence: data });
      }
    } catch (e) { console.error("Write error:", e); }
  };

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

        if (user) {
          const syncImportedMaster = async () => {
            try {
              let batch = writeBatch(db);
              let opCount = 0;
              for (const sku in newMaster) {
                batch.set(doc(db, 'users', user.uid, 'materials', sku), newMaster[sku]);
                opCount++;
                if (opCount >= 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  opCount = 0;
                }
              }
              if (opCount > 0) {
                await batch.commit();
              }
              console.log("Imported materials successfully synced to Firestore.");
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/materials`);
            }
          };
          syncImportedMaster();
        }

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

  const addIndividualLabel = async (data: any) => {
    const { labels: newLabels, nextSeq } = splitIntoPallets(
      data.sku.toUpperCase(),
      parseInt(data.totalBatchQty || "0"),
      data.batch,
      data.expirationDate,
      data.receptionDate,
      masterData,
      currentCode,
      data.description,
      parseInt(data.qtyPerPallet || "0"),
      data.tripNumber
    );
    const labelsWithIds = newLabels.map(l => ({ ...l, id: crypto.randomUUID() })) as ProductLabel[];
    setLabels(prev => [...prev, ...labelsWithIds]);
    setCurrentCode(nextSeq);

    if (user) {
      try {
        await pushToFirestore('label', labelsWithIds);
        await pushToFirestore('seq', nextSeq);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/labels`);
      }
    }

    if (data.shouldPrint) {
      setPrintingSubset(labelsWithIds);
      setTimeout(() => {
        window.print();
        setPrintingSubset(null);
      }, 200);
    }
  };

  const handleBulkGenerate = async (entries: any[]) => {
    let tempSeq = currentCode;
    let allNewLabels: ProductLabel[] = [];
    const newMasterData = { ...masterData };
    let masterChanged = false;
    
    entries.forEach(entry => {
      // Si el SKU no existe en el maestro o la descripción es diferente a "Producto Nuevo", lo agregamos/actualizamos
      const skuUpper = entry.sku.toUpperCase();
      if (!newMasterData[skuUpper] || (entry.description !== "Producto Nuevo" && newMasterData[skuUpper].description !== entry.description)) {
        newMasterData[skuUpper] = {
          sku: skuUpper,
          description: entry.description,
          qtyPerPallet: entry.qtyPerPallet
        };
        masterChanged = true;
      }

      const { labels: splitLabels, nextSeq } = splitIntoPallets(
        entry.sku,
        entry.totalQty,
        entry.batch,
        entry.expDate,
        entry.receptionDate,
        newMasterData, // Usar el maestro actualizado
        tempSeq,
        entry.description,
        entry.qtyPerPallet,
        entry.tripNumber
      );
      const ready = splitLabels.map(l => ({ ...l, id: crypto.randomUUID() })) as ProductLabel[];
      allNewLabels = [...allNewLabels, ...ready];
      tempSeq = nextSeq;
    });
    
    if (masterChanged) {
      setMasterData(newMasterData);
      if (user) {
        // Sync new master data to cloud
        try {
          const batch = writeBatch(db);
          Object.values(newMasterData).forEach(m => {
            batch.set(doc(db, 'users', user.uid, 'materials', m.sku), m);
          });
          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/materials`);
        }
      }
    }
    setLabels(prev => [...prev, ...allNewLabels]);
    setCurrentCode(tempSeq);

    if (user) {
      try {
        await pushToFirestore('label', allNewLabels);
        await pushToFirestore('seq', tempSeq);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
      }
    }

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
    setPrintingTrip(null);
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
    setPrintingTrip(null);
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
    setPrintingTrip(null);
    setTimeout(() => {
      window.print();
      setIsPrintingSelected(false);
    }, 150);
  };

  const [tripSearch, setTripSearch] = useState('');

  const handlePrintTrip = (trip: string) => {
    if (!trip) return;
    setPrintingTrip(trip);
    setPrintingSingle(null);
    setPrintingSubset(null);
    setIsPrintingSelected(false);
    setTimeout(() => {
      window.print();
      setPrintingTrip(null);
    }, 150);
  };

  const updateLabel = async (updated: ProductLabel) => {
    setLabels(prev => prev.map(l => l.id === updated.id ? updated : l));
    setEditingLabel(null);
    if (user) {
      try {
        await pushToFirestore('label', updated);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/labels/${updated.id}`);
      }
    }
  };

  const removeLabel = async (id: string) => {
    if(confirm("¿Confirmas la salida de este pallet?")) {
      setLabels(prev => prev.filter(l => l.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      if (user) {
        try {
          const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
          await deleteDoc(fsDoc(db, 'users', user.uid, 'labels', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/labels/${id}`);
        }
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Confirmas la salida masiva de ${selectedIds.length} pallets?`)) {
      const idsToRemove = [...selectedIds];
      setLabels(prev => prev.filter(l => !idsToRemove.includes(l.id)));
      setSelectedIds([]);
      if (user) {
        try {
          const { writeBatch, doc: fsDoc } = await import('firebase/firestore');
          const batch = writeBatch(db);
          idsToRemove.forEach(id => {
            batch.delete(fsDoc(db, 'users', user.uid, 'labels', id));
          });
          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/labels`);
        }
      }
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

  const updateMaster = async (newProduct: MaterialMaster) => {
    setMasterData(prev => ({ ...prev, [newProduct.sku.toUpperCase()]: newProduct }));
    if (user) {
      try {
        await pushToFirestore('master', newProduct);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/materials/${newProduct.sku}`);
      }
    }
  };

  const deleteFromMaster = async (sku: string) => {
    if(confirm(`¿Eliminar ${sku} del maestro?`)) {
      const newData = { ...masterData };
      delete newData[sku];
      setMasterData(newData);
      if (user) {
        try {
          const { deleteDoc, doc: fsDoc } = await import('firebase/firestore');
          await deleteDoc(fsDoc(db, 'users', user.uid, 'materials', sku));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/materials/${sku}`);
        }
      }
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
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data.labels) setLabels(data.labels);
        if (data.masterData) setMasterData(data.masterData);
        if (data.currentCode) setCurrentCode(data.currentCode);

        if (user) {
          try {
            // Push labels to firestore
            if (data.labels && Array.isArray(data.labels)) {
              let batch = writeBatch(db);
              let opCount = 0;
              for (const l of data.labels) {
                batch.set(doc(db, 'users', user.uid, 'labels', l.id), l);
                opCount++;
                if (opCount >= 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  opCount = 0;
                }
              }
              if (opCount > 0) await batch.commit();
            }

            // Push master data to firestore
            if (data.masterData && typeof data.masterData === 'object') {
              let batch = writeBatch(db);
              let opCount = 0;
              const keys = Object.keys(data.masterData);
              for (const k of keys) {
                const m = data.masterData[k];
                batch.set(doc(db, 'users', user.uid, 'materials', m.sku), m);
                opCount++;
                if (opCount >= 400) {
                  await batch.commit();
                  batch = writeBatch(db);
                  opCount = 0;
                }
              }
              if (opCount > 0) await batch.commit();
            }

            // Push sequence config
            if (data.currentCode) {
              await setDoc(doc(db, 'users', user.uid, 'config', 'main'), { currentSequence: data.currentCode });
            }

            alert("Backup restaurado y guardado en la nube con éxito.");
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
            alert("El backup local se cargó, pero hubo un error al sincronizar con la nube.");
          }
        } else {
          alert("Backup restaurado localmente con éxito.");
        }
      } catch (err) {
        alert("Error al leer el archivo de backup.");
      }
    };
    reader.readAsText(file);
  };

  const clearAll = async () => {
    if(confirm("¿BORRAR TODO EL INVENTARIO ACTUAL?")) {
      const labelsToDelete = [...labels];
      setLabels([]);
      setCurrentCode("AA001");
      if (user) {
        try {
          const { writeBatch, doc: fsDoc } = await import('firebase/firestore');
          const batch = writeBatch(db);
          labelsToDelete.forEach(l => {
            batch.delete(fsDoc(db, 'users', user.uid, 'labels', l.id));
          });
          batch.set(fsDoc(db, 'users', user.uid, 'config', 'main'), { currentSequence: "AA001" });
          await batch.commit();
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}`);
        }
      }
    }
  };

  const resetSequence = async () => {
    if(confirm("¿Reiniciar el contador de etiquetas a AA001?")) {
      setCurrentCode("AA001");
      if (user) {
        try {
          await pushToFirestore('seq', "AA001");
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/config/main`);
        }
      }
    }
  };

  const filteredLabels = useMemo(() => {
    return labels.filter(l => 
      l.sku.includes(searchTerm.toUpperCase()) || 
      l.batch.includes(searchTerm.toUpperCase()) ||
      l.uniqueCode.includes(searchTerm.toUpperCase()) ||
      (l.tripNumber && l.tripNumber.includes(searchTerm.toUpperCase()))
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
            {user ? (
              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                <Cloud size={16} className="text-green-500 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Sincronizado</span>
                  <span className="text-[10px] font-bold text-slate-100 truncate max-w-[100px]">{user.email}</span>
                </div>
                <button onClick={() => signOut(auth)} className="ml-2 p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-all">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xl shadow-blue-900/20 transition-all font-black text-xs active:scale-95"
              >
                <LogIn size={18} />
                <span className="uppercase">Iniciar Sesión para Guardar</span>
              </button>
            )}

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
                  className="w-full mt-10 text-[9px] font-black text-red-500/10 hover:text-red-500 transition-all uppercase tracking-widest text-center"
                >
                  Vaciar Inventario
                </button>
              </div>

              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Printer size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Imprimir por Viaje</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    placeholder="Nº de Viaje..."
                    value={tripSearch}
                    onChange={(e) => setTripSearch(e.target.value.toUpperCase())}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  />
                  <button
                    onClick={() => handlePrintTrip(tripSearch)}
                    disabled={!tripSearch || !labels.some(l => l.tripNumber === tripSearch)}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-lg active:scale-95"
                  >
                    Imprimir
                  </button>
                </div>
                {!labels.some(l => l.tripNumber === tripSearch) && tripSearch && (
                  <p className="text-[9px] text-red-500/50 font-bold uppercase text-center">No hay etiquetas con este viaje</p>
                )}
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
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-blue-500" size={20} />
                  <span className="text-sm font-black text-slate-100 uppercase tracking-tight">
                    {selectedIds.length} Pallets seleccionados
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handlePrintSelected}
                    className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-green-900/20 flex items-center gap-2 active:scale-95"
                  >
                    <Printer size={14} />
                    IMPRIMIR SELECCIONADOS
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-red-900/20 flex items-center gap-2 active:scale-95"
                  >
                    <Trash2 size={14} />
                    ELIMINAR SELECCIONADOS
                  </button>
                </div>
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
          ) : printingTrip ? (
            labels.filter(l => l.tripNumber === printingTrip).map((label) => (
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
