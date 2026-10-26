import React, { useState } from 'react';
import { Calculator, Zap, Cpu, ArrowRightLeft, ShieldCheck } from 'lucide-react';

interface TabCalculatorsProps {
  systemVoltage: number;
  singlePhaseVoltage: number;
}

export const TabCalculators: React.FC<TabCalculatorsProps> = ({
  systemVoltage,
  singlePhaseVoltage,
}) => {
  // 1. Voltage Drop Calculator State
  const [vdType, setVdType] = useState<'trifasica' | 'monofasica'>('trifasica');
  const [vdPowerKw, setVdPowerKw] = useState<number>(15);
  const [vdLengthMeters, setVdLengthMeters] = useState<number>(45);
  const [vdSectionMm2, setVdSectionMm2] = useState<number>(10);
  const [vdCosPhi, setVdCosPhi] = useState<number>(0.85);

  // 2. Power Factor Correction Calculator State
  const [pfActivePowerKw, setPfActivePowerKw] = useState<number>(50);
  const [pfCurrentCosPhi, setPfCurrentCosPhi] = useState<number>(0.75);
  const [pfTargetCosPhi, setPfTargetCosPhi] = useState<number>(0.96);

  // 3. Unit Converter State
  const [convKw, setConvKw] = useState<number>(7.5);
  const [convCosPhi, setConvCosPhi] = useState<number>(0.85);

  // Voltage Drop Calculations:
  // Copper conductivity gamma = 56 m / (ohm * mm2) at 20°C, ~48 at operating temp 70°C
  const gammaCu = 48.0;
  const vdVoltage = vdType === 'trifasica' ? systemVoltage : singlePhaseVoltage;
  const vdCurrentA =
    vdType === 'trifasica'
      ? (vdPowerKw * 1000) / (Math.sqrt(3) * vdVoltage * vdCosPhi)
      : (vdPowerKw * 1000) / (vdVoltage * vdCosPhi);

  // Delta V (Volts):
  // Trifasica: sqrt(3) * (L * I * cosPhi) / (gamma * S)
  // Monofasica: 2 * (L * I * cosPhi) / (gamma * S)
  const deltaVVolts =
    vdType === 'trifasica'
      ? (Math.sqrt(3) * vdLengthMeters * vdCurrentA * vdCosPhi) / (gammaCu * vdSectionMm2)
      : (2 * vdLengthMeters * vdCurrentA * vdCosPhi) / (gammaCu * vdSectionMm2);

  const deltaVPct = Number(((deltaVVolts / vdVoltage) * 100).toFixed(2));
  const isVdOk = deltaVPct <= 3.0; // AEA 90364 standard max 3% for lighting/power terminals

  // Power Factor Compensation:
  // Qc (kVAr) = P (kW) * (tan(phi1) - tan(phi2))
  const phi1 = Math.acos(Math.min(1.0, Math.max(0.1, pfCurrentCosPhi)));
  const phi2 = Math.acos(Math.min(1.0, Math.max(0.1, pfTargetCosPhi)));
  const tanPhi1 = Math.tan(phi1);
  const tanPhi2 = Math.tan(phi2);
  const deltaTan = Math.max(0, tanPhi1 - tanPhi2);
  const capacitorQcKvar = Number((pfActivePowerKw * deltaTan).toFixed(2));

  // Current reduction with capacitor:
  const iBefore = (pfActivePowerKw * 1000) / (Math.sqrt(3) * systemVoltage * pfCurrentCosPhi);
  const iAfter = (pfActivePowerKw * 1000) / (Math.sqrt(3) * systemVoltage * pfTargetCosPhi);
  const iReductionPct = Number((((iBefore - iAfter) / iBefore) * 100).toFixed(1));

  // Conversions:
  const convHp = Number((convKw / 0.7457).toFixed(2));
  const convCv = Number((convKw / 0.7355).toFixed(2));
  const convKva = Number((convKw / convCosPhi).toFixed(2));
  const convCurrent3Ph = Number(((convKw * 1000) / (Math.sqrt(3) * systemVoltage * convCosPhi)).toFixed(1));
  const convCurrent1Ph = Number(((convKw * 1000) / (singlePhaseVoltage * convCosPhi)).toFixed(1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calculator className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Herramientas de Cálculo Rápido Electromecánico
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verificaciones complementarias según normas AEA 90364 e IEC 60364-5-52.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tool 1: Caída de Tensión */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Caída de Tensión (ΔV%)</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">AEA 90364 &le; 3%</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Tipo de Sistema:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVdType('trifasica')}
                    className={`py-1.5 px-2 rounded border text-xs font-semibold cursor-pointer ${
                      vdType === 'trifasica'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Trifásica ({systemVoltage}V)
                  </button>
                  <button
                    onClick={() => setVdType('monofasica')}
                    className={`py-1.5 px-2 rounded border text-xs font-semibold cursor-pointer ${
                      vdType === 'monofasica'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Monofásica ({singlePhaseVoltage}V)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Potencia (kW):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={vdPowerKw}
                    onChange={(e) => setVdPowerKw(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Longitud L (m):</label>
                  <input
                    type="number"
                    step="5"
                    min="1"
                    value={vdLengthMeters}
                    onChange={(e) => setVdLengthMeters(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Sección Cable (mm²):</label>
                  <select
                    value={vdSectionMm2}
                    onChange={(e) => setVdSectionMm2(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono cursor-pointer"
                  >
                    {[1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240].map((s) => (
                      <option key={s} value={s}>
                        {s} mm²
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cos φ:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    value={vdCosPhi}
                    onChange={(e) => setVdCosPhi(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Result Box */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Caída Calculada</span>
                <span className="text-xl font-bold font-mono text-white">
                  {deltaVVolts.toFixed(1)} V
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Porcentaje</span>
                <span
                  className={`text-xl font-black font-mono ${
                    isVdOk ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {deltaVPct}%
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className={`w-3.5 h-3.5 ${isVdOk ? 'text-emerald-400' : 'text-rose-400'}`} />
              <span>
                {isVdOk
                  ? 'Cumple límite normativo AEA (ΔV ≤ 3% en terminales).'
                  : 'Excede límite del 3%. Recomendable aumentar sección de cable.'}
              </span>
            </div>
          </div>
        </div>

        {/* Tool 2: Banco de Capacitores / Cos Phi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-white text-sm">Corrección Factor de Potencia</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Banco kVAr</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Potencia Activa P (kW):</label>
                <input
                  type="number"
                  step="5"
                  min="1"
                  value={pfActivePowerKw}
                  onChange={(e) => setPfActivePowerKw(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Cos φ Actual:</label>
                  <input
                    type="number"
                    step="0.02"
                    min="0.5"
                    max="0.99"
                    value={pfCurrentCosPhi}
                    onChange={(e) => setPfCurrentCosPhi(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cos φ Objetivo:</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.9"
                    max="1.0"
                    value={pfTargetCosPhi}
                    onChange={(e) => setPfTargetCosPhi(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Result Box */}
          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Potencia Reactiva Qc</span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {capacitorQcKvar} kVAr
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Alivio Corriente</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  -{iReductionPct}%
                </span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">
              Corriente en alimentador se reduce de <strong>{iBefore.toFixed(1)} A</strong> a <strong>{iAfter.toFixed(1)} A</strong>.
            </div>
          </div>
        </div>

        {/* Tool 3: Conversor Electromecánico */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-sm">Conversor de Magnitudes</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">kW &bull; HP &bull; A</span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Potencia (kW):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={convKw}
                    onChange={(e) => setConvKw(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cos φ estimado:</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    value={convCosPhi}
                    onChange={(e) => setConvCosPhi(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                  />
                </div>
              </div>

              {/* Equivalence List */}
              <div className="space-y-1.5 pt-2 font-mono text-xs">
                <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">Caballos de Fuerza (HP):</span>
                  <span className="text-white font-bold">{convHp} HP</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">Caballos Vapor (CV):</span>
                  <span className="text-white font-bold">{convCv} CV</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">Potencia Aparente (kVA):</span>
                  <span className="text-amber-400 font-bold">{convKva} kVA</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">Corriente 3~ ({systemVoltage}V):</span>
                  <span className="text-sky-400 font-bold">{convCurrent3Ph} A</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-slate-950/70 border border-slate-800">
                  <span className="text-slate-400">Corriente 1~ ({singlePhaseVoltage}V):</span>
                  <span className="text-emerald-400 font-bold">{convCurrent1Ph} A</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
