import React, { useState } from 'react';
import { Activity, Cpu, Sliders, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  systemVoltage: number;
  setSystemVoltage: (v: number) => void;
  singlePhaseVoltage: number;
  setSinglePhaseVoltage: (v: number) => void;
  frequency: number;
  setFrequency: (f: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemVoltage,
  setSystemVoltage,
  singlePhaseVoltage,
  setSinglePhaseVoltage,
  frequency,
  setFrequency,
}) => {
  const [showConfig, setShowConfig] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand and Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black text-2xl">
            ⚙️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Suite de Diagnóstico Electromecánico
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PRO v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Auditoría de Tableros (AEA 90364) &bull; Máquinas Rotativas (IEC 60034) &bull; Aparamenta (IEC 60947)
            </p>
          </div>
        </div>

        {/* Badges & Grid Config */}
        <div className="flex items-center gap-2.5">
          {/* Active grid parameters summary */}
          <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-slate-300">
            <span className="text-slate-400">Red:</span>
            <span className="font-mono font-bold text-amber-400">{systemVoltage}/{singlePhaseVoltage}V</span>
            <span className="text-slate-500">&bull;</span>
            <span className="font-mono font-bold text-sky-400">{frequency}Hz</span>
          </div>

          {/* Config Button */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Ajustar parámetros de red eléctrica"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Config Red</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Gemini AI</span>
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Grid Settings Drawer / Bar */}
      {showConfig && (
        <div className="bg-slate-950/95 border-b border-amber-500/30 px-4 py-3 text-xs text-slate-300 transition-all">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-amber-400 font-medium">
              <Cpu className="w-4 h-4" />
              <span>Parámetros de la Red Eléctrica de Referencia:</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2">
                <span className="text-slate-400">Tensión Trifásica:</span>
                <select
                  value={systemVoltage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSystemVoltage(v);
                    setSinglePhaseVoltage(v === 400 ? 230 : v === 220 ? 127 : 220);
                  }}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                >
                  <option value={380}>380 V (Argentina / Mercosur)</option>
                  <option value={400}>400 V (Europa / IEC)</option>
                  <option value={220}>220 V (Trifásico 220V / 127V)</option>
                  <option value={440}>440 V (Industrial América)</option>
                  <option value={480}>480 V (NEMA)</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-slate-400">Tensión Monofásica:</span>
                <input
                  type="number"
                  value={singlePhaseVoltage}
                  onChange={(e) => setSinglePhaseVoltage(Number(e.target.value))}
                  className="w-18 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                />
                <span className="text-slate-400">V</span>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-slate-400">Frecuencia:</span>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                >
                  <option value={50}>50 Hz</option>
                  <option value={60}>60 Hz</option>
                </select>
              </label>

              <button
                onClick={() => setShowConfig(false)}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
