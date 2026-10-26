import React, { useState, useRef } from 'react';
import {
  Upload,
  Plus,
  Trash2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Zap,
  Info,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { LoadItem, SwitchboardAuditResult } from '../types/electromechanical';
import { SAMPLE_SWITCHBOARDS } from '../data/sampleData';
import {
  parseLoadFile,
  performLocalBalance,
  exportToExcel,
  calculateIb,
} from '../utils/electricalMath';

interface TabSwitchboardAuditorProps {
  systemVoltage: number;
  singlePhaseVoltage: number;
  frequency: number;
}

export const TabSwitchboardAuditor: React.FC<TabSwitchboardAuditorProps> = ({
  systemVoltage,
  singlePhaseVoltage,
  frequency,
}) => {
  // Initial default loads
  const [loads, setLoads] = useState<LoadItem[]>(SAMPLE_SWITCHBOARDS[0].loads);
  const [auditResult, setAuditResult] = useState<SwitchboardAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>(SAMPLE_SWITCHBOARDS[0].id);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload (CSV or Excel)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const parsed = await parseLoadFile(file);
      setLoads(parsed);
      setAuditResult(null);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Error al leer el archivo. Verifique el formato CSV o XLSX.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load a preset
  const handleSelectPreset = (presetId: string) => {
    const preset = SAMPLE_SWITCHBOARDS.find((p) => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setLoads(preset.loads);
      setAuditResult(null);
      setErrorMessage(null);
    }
  };

  // Add new blank row
  const handleAddRow = () => {
    const newId = `load-${Date.now()}`;
    setLoads([
      ...loads,
      {
        id: newId,
        Carga: `Nuevo Circuito ${loads.length + 1}`,
        Potencia_kW: 2.0,
        Tipo: 'Monofasica',
        CosPhi: 0.85,
      },
    ]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setLoads(loads.filter((l) => l.id !== id));
  };

  // Update cell
  const handleUpdateRow = (id: string, field: keyof LoadItem, value: unknown) => {
    setLoads(
      loads.map((l) => {
        if (l.id === id) {
          return { ...l, [field]: value };
        }
        return l;
      })
    );
  };

  // Execute Audit with AI (Calls /api/audit-switchboard with fallback to local calculation)
  const handleRunAudit = async () => {
    if (loads.length === 0) {
      setErrorMessage('Agregue al menos una carga para calcular.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/audit-switchboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loads,
          systemVoltage,
          singlePhaseVoltage,
          frequency,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor HTTP ${res.status}`);
      }

      const data: SwitchboardAuditResult = await res.json();
      setAuditResult(data);
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('Fallback to local balance engine due to server issue:', error);
      // Seamless local calculation fallback
      const localResult = performLocalBalance(loads, systemVoltage, singlePhaseVoltage);
      localResult.diagnosticoTecnico += `\n\n*(Nota: Cálculo resuelto mediante el motor local de ingeniería de alta precisión AEA 90364).*`;
      setAuditResult(localResult);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute quick local balance
  const handleRunLocalOnly = () => {
    if (loads.length === 0) return;
    const localResult = performLocalBalance(loads, systemVoltage, singlePhaseVoltage);
    setAuditResult(localResult);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!auditResult) {
      const quick = performLocalBalance(loads, systemVoltage, singlePhaseVoltage);
      exportToExcel(quick.cargasAuditadas, quick.resumenBalance, 'balance_cargas_auditado.xlsx');
    } else {
      exportToExcel(auditResult.cargasAuditadas, auditResult.resumenBalance, 'balance_cargas_auditado.xlsx');
    }
  };

  // Calculate quick stats for live table preview
  const currentTotalKw = loads.reduce((sum, l) => sum + (Number(l.Potencia_kW) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Auditor Técnico y Balance de Cargas
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              Sube un listado preliminar de cargas en formato <strong>CSV o Excel</strong>. El sistema calcula la corriente de diseño (<strong>$I_b$</strong>), propone protecciones termomagnéticas calibradas según norma <strong>AEA 90364 / IEC 60898</strong>, sugiere sección de conductores y equilibra las fases <strong>R, S, T</strong> minimizando el desbalance.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center gap-4 text-xs font-mono shrink-0">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Cargas</span>
              <span className="text-lg font-bold text-amber-400">{loads.length}</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Potencia Total</span>
              <span className="text-lg font-bold text-sky-400">{currentTotalKw.toFixed(1)} kW</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* File Upload & Presets */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Subir Archivo (CSV / Excel)</span>
            </button>

            {/* Presets Selector */}
            <div className="relative inline-flex items-center">
              <span className="text-xs text-slate-400 mr-2 hidden sm:inline">Ejemplos predefinidos:</span>
              <select
                value={selectedPreset}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 rounded-lg px-3 py-2 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {SAMPLE_SWITCHBOARDS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.loads.length} cargas)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>

            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agregar Carga</span>
            </button>

            <button
              onClick={() => {
                setLoads([]);
                setAuditResult(null);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/80 hover:border-rose-800/50 rounded-lg transition-colors cursor-pointer"
              title="Limpiar planilla"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunLocalOnly}
              className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Calcular localmente sin invocar IA"
            >
              <RefreshCw className="w-3.5 h-3.5 inline mr-1 text-sky-400" />
              <span>Balance Local</span>
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isLoading || loads.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Procesando Auditoría AEA 90364...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Ejecutar Auditoría y Balance con IA</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error message if any */}
      {errorMessage && (
        <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Editable Loads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">
              Listado Preliminar de Cargas del Tablero
            </h3>
            <span className="text-xs text-slate-400">
              (Puedes editar los valores directamente en la tabla)
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {loads.length} circuito{loads.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Carga / Circuito</th>
                <th className="py-3 px-4 w-32">Potencia (kW)</th>
                <th className="py-3 px-4 w-36">Tipo</th>
                <th className="py-3 px-4 w-28">Cos φ</th>
                <th className="py-3 px-4 w-28 text-right">Ib Est. (A)</th>
                <th className="py-3 px-3 w-12 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200 font-sans">
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No hay cargas cargadas. Haz clic en "Agregar Carga" o selecciona un ejemplo predefinido.
                  </td>
                </tr>
              ) : (
                loads.map((load, index) => {
                  const estIb = calculateIb(
                    load.Potencia_kW,
                    load.Tipo,
                    load.CosPhi,
                    systemVoltage,
                    singlePhaseVoltage
                  );
                  return (
                    <tr key={load.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={load.Carga}
                          onChange={(e) => handleUpdateRow(load.id, 'Carga', e.target.value)}
                          className="w-full bg-slate-950/60 border border-slate-700/60 hover:border-slate-600 focus:border-amber-500 rounded px-2.5 py-1 text-slate-100 text-xs font-medium focus:outline-none"
                          placeholder="Nombre de la carga"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          step="0.1"
                          min="0.05"
                          value={load.Potencia_kW}
                          onChange={(e) =>
                            handleUpdateRow(load.id, 'Potencia_kW', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-slate-950/60 border border-slate-700/60 hover:border-slate-600 focus:border-amber-500 rounded px-2.5 py-1 text-amber-400 font-mono text-xs font-bold focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={load.Tipo}
                          onChange={(e) =>
                            handleUpdateRow(load.id, 'Tipo', e.target.value as 'Monofasica' | 'Trifasica')
                          }
                          className="w-full bg-slate-950/60 border border-slate-700/60 hover:border-slate-600 focus:border-amber-500 rounded px-2.5 py-1 text-slate-200 text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="Monofasica">Monofásica ({singlePhaseVoltage}V)</option>
                          <option value="Trifasica">Trifásica ({systemVoltage}V)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          max="1.0"
                          value={load.CosPhi}
                          onChange={(e) =>
                            handleUpdateRow(load.id, 'CosPhi', parseFloat(e.target.value) || 0.85)
                          }
                          className="w-full bg-slate-950/60 border border-slate-700/60 hover:border-slate-600 focus:border-amber-500 rounded px-2.5 py-1 text-slate-200 font-mono text-xs focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-sky-400">
                        {estIb.toFixed(1)} A
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleDeleteRow(load.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Eliminar fila"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit & Phase Balance Results View */}
      {auditResult && (
        <div className="space-y-6 pt-2">
          {/* Phase Balance Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Phase R Card */}
            <div className="bg-slate-900 border-t-4 border-t-rose-500 border-x border-b border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-rose-400 text-sm">FASE R (L1)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {auditResult.resumenBalance.potenciaR_kW} kW
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {auditResult.resumenBalance.corrienteR_A} <span className="text-sm font-normal text-slate-400">A</span>
                </div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (auditResult.resumenBalance.corrienteR_A /
                          (auditResult.interruptorCabecera?.In_A || 100)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Phase S Card */}
            <div className="bg-slate-900 border-t-4 border-t-amber-500 border-x border-b border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-amber-400 text-sm">FASE S (L2)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {auditResult.resumenBalance.potenciaS_kW} kW
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {auditResult.resumenBalance.corrienteS_A} <span className="text-sm font-normal text-slate-400">A</span>
                </div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (auditResult.resumenBalance.corrienteS_A /
                          (auditResult.interruptorCabecera?.In_A || 100)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Phase T Card */}
            <div className="bg-slate-900 border-t-4 border-t-sky-500 border-x border-b border-slate-800 rounded-xl p-4 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-sky-400 text-sm">FASE T (L3)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {auditResult.resumenBalance.potenciaT_kW} kW
                </span>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  {auditResult.resumenBalance.corrienteT_A} <span className="text-sm font-normal text-slate-400">A</span>
                </div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (auditResult.resumenBalance.corrienteT_A /
                          (auditResult.interruptorCabecera?.In_A || 100)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Summary & Unbalance Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Desbalance de Fases</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      auditResult.resumenBalance.porcentajeDesbalance <= 5
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : auditResult.resumenBalance.porcentajeDesbalance <= 10
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {auditResult.resumenBalance.estadoBalance}
                  </span>
                </div>
                <div className="mt-2 text-3xl font-extrabold font-mono text-amber-400">
                  {auditResult.resumenBalance.porcentajeDesbalance}%
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-xs flex justify-between items-center text-slate-300 font-mono">
                <span>Corriente Neutro (In):</span>
                <span className="font-bold text-white">{auditResult.resumenBalance.corrienteNeutro_A} A</span>
              </div>
            </div>
          </div>

          {/* Main Breaker Bar */}
          {auditResult.interruptorCabecera && (
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Interruptor Cabecera General Sugerido (AEA 90364)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Termomagnético Tetrapolar ({auditResult.interruptorCabecera.polos}P) &bull; Curva {auditResult.interruptorCabecera.curva} &bull; Icu &ge; {auditResult.interruptorCabecera.poderCorte_kA} kA &bull; ID: {auditResult.interruptorCabecera.diferencialCabecera}
                  </p>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-amber-400 bg-slate-950 px-4 py-1.5 rounded-lg border border-amber-500/40">
                In = {auditResult.interruptorCabecera.In_A} A
              </div>
            </div>
          )}

          {/* Audited Result Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="px-5 py-3.5 bg-slate-850 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white text-sm">
                  Planilla de Cargas Auditada con Asignación de Fase y Protecciones
                </h3>
              </div>

              {/* Download Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Memoria (Excel)</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 w-8 text-center">#</th>
                    <th className="py-3 px-4">Carga</th>
                    <th className="py-3 px-3 text-right">Potencia</th>
                    <th className="py-3 px-3 text-right">Ib (A)</th>
                    <th className="py-3 px-3 text-center">Fase</th>
                    <th className="py-3 px-3 text-center">Protección In</th>
                    <th className="py-3 px-3 text-center">Curva</th>
                    <th className="py-3 px-3 text-center">Cable (mm²)</th>
                    <th className="py-3 px-3 text-center">Diferencial</th>
                    <th className="py-3 px-4">Notas Normativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {auditResult.cargasAuditadas.map((item, idx) => {
                    // Color badge based on phase
                    let phaseBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                    if (item.Fase === 'R') phaseBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
                    if (item.Fase === 'S') phaseBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
                    if (item.Fase === 'T') phaseBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold';
                    if (item.Fase === 'Trifasica' || item.Fase === 'R-S-T')
                      phaseBadgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold';

                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-100">
                          {item.Carga}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {item.Potencia_kW} kW
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-300">
                          {item.Ib_A} A
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-mono border ${phaseBadgeClass}`}
                          >
                            {item.Fase}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                          {item.Proteccion_In_A} A
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          Curva {item.CurvaTermomagnetica || 'C'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                          {item.SeccionCable_mm2} mm²
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                          {item.Diferencial_mA ? `${item.Diferencial_mA} mA` : '30 mA'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                          {item.Notas || (item.Tipo === 'Trifasica' ? 'Circuito trifásico equilibrado' : 'Circuito monofásico')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technical Diagnostics Report */}
          {auditResult.diagnosticoTecnico && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <Info className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-white text-sm">
                  Memoria Técnica y Diagnóstico Normativo (AEA 90364)
                </h3>
              </div>
              <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed whitespace-pre-line">
                {auditResult.diagnosticoTecnico}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
