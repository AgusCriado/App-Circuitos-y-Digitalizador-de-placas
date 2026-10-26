import React from 'react';
import { Zap, GitBranch, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

interface StartingSchematicProps {
  method: string;
  inA: number;
  iaA?: number;
}

export const StartingSchematic: React.FC<StartingSchematicProps> = ({
  method,
  inA,
  iaA,
}) => {
  const isDOL = method.toLowerCase().includes('directo') || method.toLowerCase().includes('dol');
  const isYD = method.toLowerCase().includes('estrella') || method.toLowerCase().includes('triángulo');
  const isSoft = method.toLowerCase().includes('suave') || method.toLowerCase().includes('soft');
  const isVFD = method.toLowerCase().includes('variador') || method.toLowerCase().includes('vfd');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white text-sm">
            Diagrama Funcional de Potencia & Maniobra ({method})
          </h3>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
          In = <span className="text-amber-400 font-bold">{inA || 0} A</span>
          {iaA ? (
            <>
              {' '}&bull; Ia ≈ <span className="text-rose-400 font-bold">{iaA} A</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Schematic SVG Diagram */}
      <div className="relative bg-slate-950 rounded-lg p-4 border border-slate-800/80 overflow-x-auto">
        {isDOL && (
          <div className="flex flex-col items-center min-w-[500px] text-xs font-mono py-2">
            {/* 3-Phase Bus */}
            <div className="w-full flex justify-center gap-12 text-slate-400 font-bold border-b-2 border-amber-500/60 pb-2 mb-4">
              <span className="text-amber-400">L1 (R)</span>
              <span className="text-amber-400">L2 (S)</span>
              <span className="text-amber-400">L3 (T)</span>
              <span className="text-emerald-400">PE (Tierra)</span>
            </div>

            {/* Q1 Guardamotor */}
            <div className="flex items-center gap-4 my-2">
              <div className="bg-slate-800 border-2 border-sky-500 text-sky-300 px-4 py-2 rounded shadow text-center">
                <div className="font-bold">Q1 - Disyuntor Guardamotor Magnétotérmico</div>
                <div className="text-[11px] text-slate-400">Curva D / Cat. AC-3 (Ajuste: {inA} A)</div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-600 my-1"></div>

            {/* KM1 Contactor */}
            <div className="flex items-center gap-4 my-2">
              <div className="bg-slate-800 border-2 border-emerald-500 text-emerald-300 px-5 py-2.5 rounded shadow text-center">
                <div className="font-bold">KM1 - Contactor Principal de Línea</div>
                <div className="text-[11px] text-slate-400">Categoría AC-3 (Calibre ≥ {Math.round(inA * 1.15)} A) &bull; Bobina 220V/24V</div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-600 my-1"></div>

            {/* F1 Relé Térmico */}
            <div className="flex items-center gap-4 my-2">
              <div className="bg-slate-800 border-2 border-amber-500 text-amber-300 px-4 py-2 rounded shadow text-center">
                <div className="font-bold">F1 - Relé Térmico Bimetálico / Electrónico</div>
                <div className="text-[11px] text-slate-400">Regulado a 1.0 × In ({inA} A) &bull; Clase 10 / 20</div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-600 my-1"></div>

            {/* Motor Terminal */}
            <div className="bg-indigo-950/80 border-2 border-indigo-400 text-indigo-200 px-6 py-3 rounded-xl shadow-lg text-center mt-2">
              <div className="font-bold text-sm text-indigo-300">MOTOR 3~ (U1, V1, W1)</div>
              <div className="text-[11px] text-indigo-200/70 mt-0.5">
                Pico de arranque brusco: <span className="text-rose-400 font-bold font-mono">6 a 8 × In</span> (~{Math.round(inA * 7)} A)
              </div>
            </div>
          </div>
        )}

        {isYD && (
          <div className="flex flex-col items-center min-w-[620px] text-xs font-mono py-2">
            {/* 3-Phase Bus */}
            <div className="w-full flex justify-center gap-14 text-slate-400 font-bold border-b-2 border-amber-500/60 pb-2 mb-4">
              <span className="text-amber-400">L1</span>
              <span className="text-amber-400">L2</span>
              <span className="text-amber-400">L3</span>
              <span className="text-slate-500">6 Borneiras (U1,V1,W1 / U2,V2,W2)</span>
            </div>

            {/* Q1 Guardamotor */}
            <div className="bg-slate-800 border-2 border-sky-500 text-sky-300 px-4 py-2 rounded text-center mb-3">
              <div className="font-bold">Q1 - Protección Magnética de Cabecera</div>
            </div>

            {/* Parallel Contactors */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xl my-2">
              {/* KM1 Línea */}
              <div className="bg-slate-800/90 border-2 border-emerald-500 text-emerald-300 p-2.5 rounded text-center">
                <div className="font-bold">KM1 (Línea)</div>
                <div className="text-[10px] text-slate-400">0.58 × In ({Math.round(inA * 0.58)} A)</div>
                <div className="text-[9px] text-emerald-400 font-sans mt-1">Conecta L1-L2-L3 a U1-V1-W1</div>
              </div>

              {/* KM2 Triángulo */}
              <div className="bg-slate-800/90 border-2 border-amber-500 text-amber-300 p-2.5 rounded text-center">
                <div className="font-bold">KM2 (Triángulo Δ)</div>
                <div className="text-[10px] text-slate-400">0.58 × In ({Math.round(inA * 0.58)} A)</div>
                <div className="text-[9px] text-amber-400 font-sans mt-1">Conecta régimen nominal</div>
              </div>

              {/* KM3 Estrella */}
              <div className="bg-slate-800/90 border-2 border-indigo-400 text-indigo-300 p-2.5 rounded text-center">
                <div className="font-bold">KM3 (Estrella Y)</div>
                <div className="text-[10px] text-slate-400">0.33 × In ({Math.round(inA * 0.33)} A)</div>
                <div className="text-[9px] text-indigo-300 font-sans mt-1">Puentea U2-V2-W2 en arranque</div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full my-2 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>Temporizador KT1: Conmutación Y &rarr; Δ a los 5 - 10 seg (cuando n &ge; 80% n_nom)</span>
            </div>

            {/* Motor Box */}
            <div className="bg-indigo-950/80 border-2 border-indigo-400 text-indigo-200 px-8 py-3 rounded-xl shadow-lg text-center mt-2">
              <div className="font-bold text-sm text-indigo-300">MOTOR 3~ (6 BORNES)</div>
              <div className="text-[11px] text-indigo-200/80 mt-1">
                Reducción de corriente de arranque en red a <span className="text-emerald-400 font-bold">1/3 de DOL (~ 2.2 a 2.8 × In)</span>.
              </div>
            </div>
          </div>
        )}

        {isSoft && (
          <div className="flex flex-col items-center min-w-[500px] text-xs font-mono py-2">
            {/* 3-Phase Bus */}
            <div className="w-full flex justify-center gap-12 text-slate-400 font-bold border-b-2 border-amber-500/60 pb-2 mb-4">
              <span className="text-amber-400">L1</span>
              <span className="text-amber-400">L2</span>
              <span className="text-amber-400">L3</span>
            </div>

            {/* Q1 Guardamotor */}
            <div className="bg-slate-800 border-2 border-sky-500 text-sky-300 px-4 py-2 rounded text-center mb-3">
              <div className="font-bold">Q1 - Protección Cortocircuito (Fusibles Ultrarrápidos aR o Guardamotor)</div>
            </div>

            {/* Soft Starter Unit with SCRs */}
            <div className="w-full max-w-md bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-sky-400 p-4 rounded-xl text-center shadow-lg my-2">
              <div className="flex items-center justify-center gap-2 text-sky-300 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <span>Arrancador Suave Electrónico (Soft Starter)</span>
              </div>
              <div className="text-[11px] text-slate-300 mt-2">
                Pares de Tiristores Antiparalelo (SCRs) con control de ángulo de disparo
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                <div>Rampa de Tensión: 5 - 20 s</div>
                <div>Límite Corriente: 2.5 - 3.5 × In</div>
                <div>Bypass Interno / Externo (KM1)</div>
                <div>Parada Suave (Evita Golpe Ariete)</div>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-600 my-1"></div>

            {/* Motor Box */}
            <div className="bg-indigo-950/80 border-2 border-indigo-400 text-indigo-200 px-6 py-3 rounded-xl shadow-lg text-center mt-2">
              <div className="font-bold text-sm text-indigo-300">MOTOR 3~ (U1, V1, W1)</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">
                Arranque progresivo sin golpes de par mecánicos ni caídas abruptas de tensión en red.
              </div>
            </div>
          </div>
        )}

        {isVFD && (
          <div className="flex flex-col items-center min-w-[520px] text-xs font-mono py-2">
            {/* 3-Phase Bus */}
            <div className="w-full flex justify-center gap-12 text-slate-400 font-bold border-b-2 border-amber-500/60 pb-2 mb-4">
              <span className="text-amber-400">L1</span>
              <span className="text-amber-400">L2</span>
              <span className="text-amber-400">L3</span>
            </div>

            {/* Q1 Guardamotor */}
            <div className="bg-slate-800 border-2 border-sky-500 text-sky-300 px-4 py-2 rounded text-center mb-3">
              <div className="font-bold">Interruptor Automático + Filtro de Red (EMC / Choke)</div>
            </div>

            {/* VFD Stage Diagram */}
            <div className="w-full max-w-lg bg-slate-900 border-2 border-emerald-500 p-4 rounded-xl text-center shadow-lg my-2">
              <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center justify-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>Variador de Frecuencia (VFD / Inversor PWM)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-sky-300 font-bold block">1. Rectificador</span>
                  <span className="text-slate-400">Puente Diodos (AC &rarr; DC)</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-amber-300 font-bold block">2. Bus DC</span>
                  <span className="text-slate-400">Filtro Condensadores</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-emerald-300 font-bold block">3. Inversor</span>
                  <span className="text-slate-400">IGBTs PWM (DC &rarr; AC V/f)</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-300 flex justify-between px-2 pt-2 border-t border-slate-800">
                <span>Corriente de arranque: <b className="text-emerald-400">&le; 1.1 &times; In</b></span>
                <span>Torque nominal a bajas RPM: <b className="text-sky-400">100% Tn</b></span>
              </div>
            </div>

            <div className="w-0.5 h-6 bg-slate-600 my-1"></div>

            {/* Motor Box */}
            <div className="bg-indigo-950/80 border-2 border-indigo-400 text-indigo-200 px-6 py-3 rounded-xl shadow-lg text-center mt-2">
              <div className="font-bold text-sm text-indigo-300">MOTOR 3~ (U1, V1, W1)</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Regulación de velocidad continua 0 - 100%+. Recomendada ventilación forzada si opera &lt; 25 Hz.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Normative Criteria Box */}
      <div className="mt-3 bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-xs text-slate-400 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300">Criterio IEC 60947-4-1:</strong> La categoría de empleo <strong>AC-3</strong> se aplica a motores de jaula de ardilla cuyo corte se produce a plena marcha. Si la aplicación incluye frenado a contracorriente o marcha a impulsos (jogging), dimensionar según categoría <strong>AC-4</strong>.
        </p>
      </div>
    </div>
  );
};
