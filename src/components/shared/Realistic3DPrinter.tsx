/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";
import { Settings, Zap, Thermometer } from "lucide-react";

interface Realistic3DPrinterProps {
  weight?: number;
  printHours?: number;
  finalPrice?: number;
  className?: string;
  isCompact?: boolean;
}

// --- SUB-COMPONENTS FOR BETTER MAINTAINABILITY ---

const PrinterSpool = memo(({ progress }: { progress: number }) => (
  <div className="absolute top-12 -left-10 z-50 flex items-center">
    <motion.div 
      className="w-20 h-20 rounded-full border-[8px] border-white bg-slate-100 flex items-center justify-center shadow-md relative overflow-hidden"
      animate={{ rotate: progress * 2.5 }}
      transition={{ type: "tween", ease: "linear" }}
    >
      {/* Filament layers on spool */}
      <div 
        className="absolute inset-0 bg-emerald-500/20" 
        style={{ 
          clipPath: `circle(${45 - (progress / 100) * 10}% at 50% 50%)`,
          border: '12px solid transparent'
        }} 
      />
      <div className="w-18 h-18 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center relative z-10">
          <div className="absolute inset-2 border border-slate-50 rounded-full" />
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
      </div>
    </motion.div>
  </div>
));

const ExtruderHead = memo(({ headX }: { headX: number }) => (
  <motion.div
    className="absolute -top-6 w-18 h-20 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-end overflow-hidden shadow-sm"
    animate={{ left: `${headX}%` }}
    transition={{ duration: 0.1, ease: "linear" }}
  >
    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent" />
    <div className="absolute top-4 w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
         <Settings size={16} className="text-slate-300" />
      </motion.div>
    </div>
    {/* Hotend nozzle tip */}
    <div className="relative mb-1">
      <div className="w-4 h-4 bg-amber-500 rounded-full z-10 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-3 bg-emerald-500/40 blur-[1px] rounded-full animate-bounce" />
    </div>
  </motion.div>
));

const FilamentLine = memo(({ gantryTop, headX, isCompact }: { gantryTop: number; headX: number; isCompact: boolean }) => {
  // LOGIC AUDIT: 2026-05-10
  // startY must be relative to chamber top. 
  // Spool center is at 48px from parent top. 
  // Chamber starts at 16px (compact) or 40px (standard) from parent top.
  const chamberHeight = isCompact ? 200 : 320;
  const chamberOffset = isCompact ? 16 : 40;
  const startY = ((48 - chamberOffset) / chamberHeight) * 100;
  const startX = -8; 
  
  // Gantry is left-6 right-6 (24px each). In 515px width, that's ~4.6%.
  // Head width w-18 (72px) is ~14%. Center is 7%.
  const endX = 4.6 + (headX / 100) * (100 - 9.2) + 7;
  
  // endY is (gantryTop - 24) relative to chamber height. Clamp to prevent negative SVG coords.
  const endY = Math.max(2, ((gantryTop - 24) / chamberHeight) * 100);

  return (
    <svg 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible"
    >
      <motion.path
        animate={{ 
          d: `M ${startX} ${startY} Q ${startX + (endX - startX) * 0.4} ${startY - 15}, ${endX} ${endY}`
        }}
        transition={{ duration: 0.1, ease: "linear" }}
        stroke="#10b981"
        strokeWidth="0.6"
        strokeOpacity="0.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
});

const PrintedObject = memo(({ modelHeight, isCompact }: { modelHeight: number, isCompact: boolean }) => {
  const maxHeight = isCompact ? 80 : 180;
  
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 flex items-end justify-center">
      <motion.div
        animate={{ height: modelHeight }}
        transition={{ type: "spring", stiffness: 45, damping: 15 }}
        className="relative overflow-hidden flex items-end"
        style={{ width: "130px" }}
      >
        <div style={{ height: maxHeight, width: "130px" }} className="relative flex items-end">
          <motion.svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <path d="M50 5 L95 45 L50 95 L5 45 Z" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2.5" />
            <path d="M50 5 L50 95 M5 45 L95 45" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" />
            <circle cx="50" cy="50" r="14" fill="white" fillOpacity="0.8" stroke="#10b981" strokeWidth="0.8" />
            <circle cx="50" cy="50" r="6" fill="#10b981" className="animate-pulse" />
          </motion.svg>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-emerald-500/15 rounded-full blur-sm" />
      </motion.div>
    </div>
  );
});

const PrinterChamber = memo(({ isCompact, modelHeight, headX, gantryTop }: { isCompact: boolean, modelHeight: number, headX: number, gantryTop: number }) => {
  return (
    <div className={`relative mx-auto ${isCompact ? 'mt-4 mb-3 w-[94%] h-[200px]' : 'mt-10 mb-6 w-[92%] h-[320px]'} bg-white rounded-[3rem] border border-slate-200/50 overflow-hidden shadow-inner`}>
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.03] via-transparent to-amber-500/[0.03] pointer-events-none" />
      <div className="absolute top-0 left-10 right-10 h-1 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent blur-sm" />
      
      <div className="absolute left-10 top-8 bottom-8 w-3 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-full" />
      <div className="absolute right-10 top-8 bottom-8 w-3 bg-gradient-to-r from-slate-400 via-slate-100 to-slate-400 rounded-full" />

      <div className="absolute left-16 top-6 bottom-6 w-1 bg-slate-200 opacity-40 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ccc 0px, #ccc 2px, #eee 2px, #eee 4px)' }} />
      <div className="absolute right-16 top-6 bottom-6 w-1 bg-slate-200 opacity-40 rounded-full" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ccc 0px, #ccc 2px, #eee 2px, #eee 4px)' }} />

      <FilamentLine gantryTop={gantryTop} headX={headX} isCompact={isCompact} />

      <motion.div
        className="absolute left-6 right-6 h-5 bg-gradient-to-b from-slate-300 via-slate-100 to-slate-400 rounded-md z-30 border-t border-white shadow-sm"
        animate={{ 
          top: gantryTop,
          y: [0, -1, 0, 1, 0] // Subtle industrial vibration
        }}
        transition={{ 
          top: { type: "spring", stiffness: 45, damping: 15 },
          y: { duration: 0.2, repeat: Infinity, ease: "linear" }
        }}
      >
        <div className="absolute inset-x-4 top-1.5 h-1.5 bg-slate-800/10 rounded-full overflow-hidden">
            <div className="w-full h-full opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 4px)' }} />
        </div>
        <ExtruderHead headX={headX} />
      </motion.div>

      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-slate-200 rounded-tl-xl opacity-50" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-slate-200 rounded-tr-xl opacity-50" />

      <PrintedObject modelHeight={modelHeight} isCompact={isCompact} />

      <div className="absolute bottom-6 left-10 right-10 h-10 bg-gradient-to-r from-slate-300 via-slate-50 to-slate-300 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(45deg, #000 2px, transparent 2px), linear-gradient(-45deg, #000 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-2 bg-slate-400 rounded-sm" />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-2 bg-slate-400 rounded-sm" />
      </div>
    </div>
  );
});

const TelemetryUI = memo(({ isCompact, progress, tempNozzle, tempBed, printHours, finalPrice }: {
  isCompact: boolean;
  progress: number;
  tempNozzle: number;
  tempBed: number;
  printHours: number;
  finalPrice: number;
}) => (
  <div className={`${isCompact ? 'mx-4 mb-4 p-4' : 'mx-10 mb-10 p-7'} bg-white/60 border border-white/80 rounded-[2.8rem] backdrop-blur-3xl relative overflow-hidden group/interface shadow-lg`}>
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5" />
    <div className="relative z-10 flex flex-col gap-5">
      <div className="flex items-center justify-between">
          <div className="flex flex-col">
              <div className="flex items-center gap-1">
                  <span className="text-[13px] font-black text-slate-900 tracking-tight">POLYMAGIC</span>
                  <span className="text-[13px] font-black text-emerald-600 tracking-tight">PRICE</span>
                  <span className="text-[10px] font-extrabold text-slate-400/80 ml-2 tracking-widest">X-SERIES</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 tracking-[0.15em] uppercase">STABLE_PRODUCTION_ACTIVE</span>
              </div>
          </div>
          <div className="flex gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/80 border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-white hover:scale-110 transition-all duration-300">
                  <Settings size={16} className="text-slate-500" />
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center cursor-pointer hover:scale-110 transition-all duration-300">
                  <Zap size={18} className="text-white" />
              </div>
          </div>
      </div>
      <div className="space-y-2">
          <div className="flex justify-between items-end px-1">
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Printing Status</span>
                  <div className="flex items-center gap-2">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Layer {Math.floor(progress) + 1} of 100</span>
                  </div>
              </div>
              <div className="flex flex-col items-end">
                  <span className={`font-black text-slate-900 tracking-tighter tabular-nums leading-none ${isCompact ? 'text-2xl' : 'text-3xl'}`}>{progress.toFixed(1)}%</span>
              </div>
          </div>
          <div className="relative w-full h-4 bg-slate-100/80 rounded-full border border-slate-200/50 overflow-hidden p-[2px]">
              <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-400 rounded-full relative"
                  style={{ width: `${progress}%` }}
              >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <div className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 animate-pulse" />
              </motion.div>
          </div>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100/50">
          <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-5 flex items-center justify-center text-emerald-600">
                      <Thermometer size={14} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Nozzle Temp</span>
                      <span className="text-[12px] font-bold text-slate-900 leading-none">{tempNozzle.toFixed(1)}°C</span>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Thermometer size={14} />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Bed Temp</span>
                      <span className="text-[12px] font-bold text-slate-900 leading-none">{tempBed.toFixed(1)}°C</span>
                  </div>
              </div>
          </div>
          <div className="flex flex-col items-end justify-between">
              <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Time Remaining</span>
                  <div className="flex items-baseline gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <span className="text-sm font-black text-slate-900 tabular-nums">{(printHours * (1 - progress / 100)).toFixed(1)}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Hours</span>
                  </div>
              </div>
              <div className="group/price relative">
                  <div className="relative px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-md">
                      ${finalPrice.toFixed(2)}
                  </div>
              </div>
          </div>
      </div>
    </div>
  </div>
));

export const Realistic3DPrinter = memo(({ 
  weight = 120, 
  printHours = 8, 
  finalPrice = 11.47,
  className = "",
  isCompact = false
}: Realistic3DPrinterProps) => {
  const [progress, setProgress] = useState(42);
  const [tempNozzle, setTempNozzle] = useState(215);
  const [tempBed, setTempBed] = useState(60);
  const [headX, setHeadX] = useState(15);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress((prev) => (prev >= 100 ? 0 : prev + 0.1));
      setTempNozzle(215 + (Math.random() * 0.4 - 0.2));
      setTempBed(60 + (Math.random() * 0.2 - 0.1));
      
      // Smooth sinusoidal head motion
      const x = 50 + Math.sin(elapsed / 800) * 35;
      setHeadX(x);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Sync model height with progress and weight
  const chamberHeight = isCompact ? 200 : 320;
  const maxAllowedHeight = isCompact ? 80 : 180;
  const weightScale = Math.min(1.5, Math.max(0.5, weight / 150));
  const modelHeight = (progress / 100) * weightScale * (maxAllowedHeight * 0.8);

  // Unified gantry calculation with boundary safety (Logic Audit 2026-05-10)
  // Ensures gantry doesn't crash into the top (min 30px) or bottom
  const gantryTop = Math.max(30, chamberHeight - 120 - modelHeight);

  return (
    <div className={`relative w-full ${isCompact ? 'max-w-[340px]' : 'max-w-[560px]'} mx-auto select-none group ${className}`}>

      <motion.div 
        className="relative transition-all duration-1000 ease-out"
        initial={{ rotateX: 0, rotateY: 0 }}
        animate={{ rotateX: 0, rotateY: 0 }}
        whileHover={{ rotateX: 0, rotateY: 0 }}
      >
        <div className="relative bg-white border-[5px] border-slate-200/80 rounded-[3.8rem] p-3 shadow-2xl">
          <div className="absolute top-10 right-14 flex items-center gap-2 opacity-20 group-hover:opacity-50 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-mono text-[8px] font-black tracking-[0.2em] text-slate-500 uppercase">Industrial_Design_Certified</span>
          </div>

          <div className="relative bg-gradient-to-br from-[#fcfdfe] to-[#f8fafc] rounded-[3.4rem]">
            <PrinterSpool progress={progress} />
            <PrinterChamber isCompact={isCompact} modelHeight={modelHeight} headX={headX} gantryTop={gantryTop} />
            <TelemetryUI 
              isCompact={isCompact} 
              progress={progress} 
              tempNozzle={tempNozzle} 
              tempBed={tempBed} 
              printHours={printHours} 
              finalPrice={finalPrice} 
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

Realistic3DPrinter.displayName = "Realistic3DPrinter";
;
