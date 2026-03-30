
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Truck } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 3000; // 3 seconds
    const intervalTime = 30;
    const increment = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white"
    >
      <div className="flex flex-col items-center max-w-sm w-full px-8">
        <div className="w-full space-y-6">
          <div className="flex justify-between items-end">
            <motion.span 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-black italic tracking-tighter text-blue-500"
            >
              Calico S.A.
            </motion.span>
            <span className="text-xs font-mono text-slate-500">{Math.round(progress)}%</span>
          </div>
          
          <div className="relative pt-6">
            <motion.div 
              className="absolute top-0 text-blue-500"
              animate={{ left: `${progress}%` }}
              transition={{ ease: "linear" }}
              style={{ x: '-50%' }}
            >
              <Truck size={24} className="fill-blue-500/20" />
            </motion.div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
          </div>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-[10px] text-center font-bold uppercase tracking-[0.3em] text-slate-600"
          >
            Iniciando Sistemas Logísticos
          </motion.p>
        </div>
      </div>

      <div className="absolute bottom-8 text-[10px] font-bold text-slate-800 uppercase tracking-widest">
        LogisPro v1.0 • Calico S.A.
      </div>
    </motion.div>
  );
};

export default SplashScreen;
