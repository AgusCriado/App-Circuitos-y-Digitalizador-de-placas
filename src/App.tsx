import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Camera,
  Calculator,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { Header } from './components/Header';
import { TabSwitchboardAuditor } from './components/TabSwitchboardAuditor';
import { TabMotorDigitizer } from './components/TabMotorDigitizer';
import { TabCalculators } from './components/TabCalculators';

export default function App() {
  const [activeTab, setActiveTab] = useState<'auditor' | 'placas' | 'calculos'>('auditor');

  // Network parameters (defaults: 380V / 220V, 50 Hz standard AEA / Mercosur / IEC)
  const [systemVoltage, setSystemVoltage] = useState<number>(380);
  const [singlePhaseVoltage, setSinglePhaseVoltage] = useState<number>(220);
  const [frequency, setFrequency] = useState<number>(50);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        systemVoltage={systemVoltage}
        setSystemVoltage={setSystemVoltage}
        singlePhaseVoltage={singlePhaseVoltage}
        setSinglePhaseVoltage={setSinglePhaseVoltage}
        frequency={frequency}
        setFrequency={setFrequency}
      />

      {/* Main Tabs Navigation Bar */}
      <div className="bg-slate-900/80 border-b border-slate-800 backdrop-blur sticky top-[69px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
            {/* Tab 1: Auditor de Tableros */}
            <button
              onClick={() => setActiveTab('auditor')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'auditor'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 Auditor de Tableros & Balance</span>
            </button>

            {/* Tab 2: Digitalizador de Placas */}
            <button
              onClick={() => setActiveTab('placas')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'placas'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>📷 Digitalizador de Placas de Motores</span>
            </button>

            {/* Tab 3: Cálculos Rápidos */}
            <button
              onClick={() => setActiveTab('calculos')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'calculos'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>⚡ Cálculos Rápidos (ΔV%, FP, kW/HP)</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'auditor' && (
          <TabSwitchboardAuditor
            systemVoltage={systemVoltage}
            singlePhaseVoltage={singlePhaseVoltage}
            frequency={frequency}
          />
        )}

        {activeTab === 'placas' && <TabMotorDigitizer />}

        {activeTab === 'calculos' && (
          <TabCalculators
            systemVoltage={systemVoltage}
            singlePhaseVoltage={singlePhaseVoltage}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="text-amber-400">⚙️</span>
            <span>Suite de Diagnóstico Electromecánico</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Diseñado para Ingeniería Eléctrica y Mantenimiento</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Norma AEA 90364
            </span>
            <span className="text-slate-600">&bull;</span>
            <span>IEC 60034-1</span>
            <span className="text-slate-600">&bull;</span>
            <span>IEC 60947-4-1 (AC-3)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
