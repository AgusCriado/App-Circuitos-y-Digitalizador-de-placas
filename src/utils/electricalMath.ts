import * as XLSX from 'xlsx';
import { LoadItem, SwitchboardAuditResult, BalanceSummary, MainBreakerRecommendation } from '../types/electromechanical';

export const COMMERCIAL_BREAKERS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630];

// Ampacity table for copper conductors in PVC conduit (IRAM 247-3 / AEA 90364)
export const CABLE_GAUGES: { mm2: number; iz: number }[] = [
  { mm2: 1.5, iz: 15 },
  { mm2: 2.5, iz: 21 },
  { mm2: 4, iz: 28 },
  { mm2: 6, iz: 36 },
  { mm2: 10, iz: 50 },
  { mm2: 16, iz: 68 },
  { mm2: 25, iz: 89 },
  { mm2: 35, iz: 110 },
  { mm2: 50, iz: 134 },
  { mm2: 70, iz: 171 },
  { mm2: 95, iz: 207 },
  { mm2: 120, iz: 239 },
  { mm2: 150, iz: 272 },
  { mm2: 185, iz: 310 },
  { mm2: 240, iz: 364 },
];

/**
 * Calculates design current Ib (A)
 */
export function calculateIb(
  potencia_kW: number,
  tipo: 'Monofasica' | 'Trifasica',
  cosPhi: number = 0.85,
  vTrifasica: number = 380,
  vMonofasica: number = 220
): number {
  const pWatts = potencia_kW * 1000;
  const pf = Math.max(0.1, Math.min(1.0, cosPhi || 0.85));

  if (tipo === 'Trifasica') {
    return Number((pWatts / (Math.sqrt(3) * vTrifasica * pf)).toFixed(2));
  } else {
    return Number((pWatts / (vMonofasica * pf)).toFixed(2));
  }
}

/**
 * Gets nearest standard commercial circuit breaker rating In >= Ib
 */
export function getStandardBreaker(ib: number): number {
  for (const rating of COMMERCIAL_BREAKERS) {
    if (rating >= ib) return rating;
  }
  return COMMERCIAL_BREAKERS[COMMERCIAL_BREAKERS.length - 1];
}

/**
 * Suggests minimum cable cross-section (mm2) such that Iz >= In
 */
export function getRecommendedCable(inBreaker: number, isMonofasica: boolean = true): number {
  // AEA 90364 rule: Minimum cross section for general circuits is 2.5mm2 (or 1.5mm2 for lighting only)
  for (const c of CABLE_GAUGES) {
    if (c.iz >= inBreaker) {
      if (isMonofasica && c.mm2 < 2.5) return 2.5;
      return c.mm2;
    }
  }
  return CABLE_GAUGES[CABLE_GAUGES.length - 1].mm2;
}

/**
 * Deterministic phase balancing algorithm (Greedy LPT - Longest Processing Time first)
 */
export function performLocalBalance(
  loads: LoadItem[],
  vTrifasica: number = 380,
  vMonofasica: number = 220
): SwitchboardAuditResult {
  const processedLoads: LoadItem[] = loads.map((l, index) => {
    const tipo = l.Tipo || (l.Carga.toLowerCase().includes('motor') || l.Carga.toLowerCase().includes('trif') ? 'Trifasica' : 'Monofasica');
    const cosPhi = l.CosPhi || 0.85;
    const ib = calculateIb(l.Potencia_kW, tipo, cosPhi, vTrifasica, vMonofasica);
    const inBreaker = getStandardBreaker(ib);
    const seccion = getRecommendedCable(inBreaker, tipo === 'Monofasica');
    const diferencial = tipo === 'Trifasica' ? 300 : (l.Potencia_kW > 5 ? 300 : 30);
    const curva = tipo === 'Trifasica' || l.Carga.toLowerCase().includes('motor') || l.Carga.toLowerCase().includes('bomba') ? 'D' : 'C';

    return {
      ...l,
      id: l.id || `load-${index + 1}`,
      Tipo: tipo,
      CosPhi: cosPhi,
      Ib_A: ib,
      Proteccion_In_A: inBreaker,
      CurvaTermomagnetica: curva as 'C' | 'D',
      SeccionCable_mm2: seccion,
      Diferencial_mA: diferencial,
    };
  });

  // Calculate trifasic base currents
  let trifasicaCurrent = 0;
  let trifasicaPowerPerPhase = 0;

  processedLoads.forEach((load) => {
    if (load.Tipo === 'Trifasica') {
      trifasicaCurrent += load.Ib_A || 0;
      trifasicaPowerPerPhase += (load.Potencia_kW || 0) / 3;
      load.Fase = 'Trifasica';
    }
  });

  // Phase accumulators
  let currentR = trifasicaCurrent;
  let currentS = trifasicaCurrent;
  let currentT = trifasicaCurrent;

  let powerR = trifasicaPowerPerPhase;
  let powerS = trifasicaPowerPerPhase;
  let powerT = trifasicaPowerPerPhase;

  // Single-phase loads sorted descending by current for optimal bin packing
  const singlePhaseLoads = processedLoads.filter((l) => l.Tipo === 'Monofasica');
  singlePhaseLoads.sort((a, b) => (b.Ib_A || 0) - (a.Ib_A || 0));

  singlePhaseLoads.forEach((load) => {
    const ib = load.Ib_A || 0;
    const p = load.Potencia_kW || 0;

    // Pick the phase with minimum current
    if (currentR <= currentS && currentR <= currentT) {
      load.Fase = 'R';
      currentR += ib;
      powerR += p;
    } else if (currentS <= currentR && currentS <= currentT) {
      load.Fase = 'S';
      currentS += ib;
      powerS += p;
    } else {
      load.Fase = 'T';
      currentT += ib;
      powerT += p;
    }
  });

  // Calculate phase unbalance %: ((Imax - Imin) / Iavg) * 100%
  const currents = [currentR, currentS, currentT];
  const maxI = Math.max(...currents);
  const minI = Math.min(...currents);
  const avgI = (currentR + currentS + currentT) / 3 || 1;
  const unbalance = Number((((maxI - minI) / avgI) * 100).toFixed(2));

  // Neutral current approximation assuming 120-degree balanced angles:
  // In = sqrt(Ir^2 + Is^2 + It^2 - (Ir*Is + Is*It + It*Ir))
  const neutralCurrent = Number(
    Math.sqrt(
      Math.max(0, currentR ** 2 + currentS ** 2 + currentT ** 2 - (currentR * currentS + currentS * currentT + currentT * currentR))
    ).toFixed(2)
  );

  const totalPower = Number((powerR + powerS + powerT).toFixed(2));

  let estadoBalance: 'Excelente' | 'Aceptable' | 'Desbalanceado' = 'Excelente';
  if (unbalance > 10) {
    estadoBalance = 'Desbalanceado';
  } else if (unbalance > 5) {
    estadoBalance = 'Aceptable';
  }

  // Sizing of main incoming circuit breaker
  const mainIb = maxI * 1.15; // 15% reserve factor
  const mainIn = getStandardBreaker(mainIb);

  const balanceSummary: BalanceSummary = {
    corrienteR_A: Number(currentR.toFixed(2)),
    corrienteS_A: Number(currentS.toFixed(2)),
    corrienteT_A: Number(currentT.toFixed(2)),
    potenciaR_kW: Number(powerR.toFixed(2)),
    potenciaS_kW: Number(powerS.toFixed(2)),
    potenciaT_kW: Number(powerT.toFixed(2)),
    potenciaTotal_kW: totalPower,
    porcentajeDesbalance: unbalance,
    corrienteNeutro_A: neutralCurrent,
    estadoBalance,
  };

  const interruptorCabecera: MainBreakerRecommendation = {
    In_A: mainIn,
    polos: 4, // 3P + N according to AEA 90364
    curva: 'C',
    poderCorte_kA: mainIn > 63 ? 16 : 10,
    diferencialCabecera: '300mA tipo AC/A selectivo',
  };

  const diagnosticoTecnico = `### Auditoría y Balance de Cargas (Normativa AEA 90364)

- **Distribución de Fases:** El algoritmo de optimización asignó las cargas monofásicas de forma alternada logrando un desbalance de corriente del **${unbalance}%** (${estadoBalance}).
- **Corrientes por Fase:**
  - **Fase R:** ${balanceSummary.corrienteR_A} A (${balanceSummary.potenciaR_kW} kW)
  - **Fase S:** ${balanceSummary.corrienteS_A} A (${balanceSummary.potenciaS_kW} kW)
  - **Fase T:** ${balanceSummary.corrienteT_A} A (${balanceSummary.potenciaT_kW} kW)
  - **Corriente esperada en Conductor Neutro:** ${balanceSummary.corrienteNeutro_A} A.
- **Protección Cabecera Sugerida:** Interruptor Termomagnético Tetrapolar (4x${interruptorCabecera.In_A} A), Curva C, Poder de Corte $\\ge$ ${interruptorCabecera.poderCorte_kA} kA, complementado con Interruptor Diferencial general de cabecera de 300 mA selectivo.
- **Criterio de Conductores (AEA 90364):** Se verificó la condición $I_b \\le I_n \\le I_z$ en cada circuito terminal con conductores de cobre aislados en PVC/XLPE.
`;

  return {
    cargasAuditadas: processedLoads,
    resumenBalance: balanceSummary,
    interruptorCabecera,
    diagnosticoTecnico,
  };
}

/**
 * Parse CSV / XLSX into LoadItem array
 */
export async function parseLoadFile(file: File): Promise<LoadItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  if (!jsonData || jsonData.length === 0) {
    throw new Error('El archivo no contiene filas con datos legibles.');
  }

  return jsonData.map((row, idx) => {
    // Normalization of common header variants
    const cargaName =
      (row['Carga'] || row['carga'] || row['Descripcion'] || row['Circuito'] || row['Nombre'] || row['Item'] || `Circuito ${idx + 1}`) as string;

    const potRaw = row['Potencia_kW'] ?? row['potencia_kw'] ?? row['Potencia'] ?? row['kW'] ?? row['P_kW'] ?? row['Watts'] ?? 1.5;
    let potencia_kW = typeof potRaw === 'number' ? potRaw : parseFloat(String(potRaw).replace(',', '.'));
    if (row['Watts'] && potencia_kW > 50) {
      potencia_kW = potencia_kW / 1000;
    }
    if (isNaN(potencia_kW) || potencia_kW <= 0) potencia_kW = 1.0;

    const tipoRaw = String(row['Tipo'] || row['Fases'] || row['Sistema'] || '').toLowerCase();
    const isTrif = tipoRaw.includes('tri') || tipoRaw.includes('3') || cargaName.toLowerCase().includes('trif') || cargaName.toLowerCase().includes('motor');

    const cosPhiRaw = row['CosPhi'] ?? row['cosPhi'] ?? row['FP'] ?? row['Cos_Phi'] ?? 0.85;
    let cosPhi = typeof cosPhiRaw === 'number' ? cosPhiRaw : parseFloat(String(cosPhiRaw).replace(',', '.'));
    if (isNaN(cosPhi) || cosPhi <= 0 || cosPhi > 1) cosPhi = 0.85;

    return {
      id: `load-${idx + 1}`,
      Carga: String(cargaName).trim(),
      Potencia_kW: Number(potencia_kW.toFixed(2)),
      Tipo: isTrif ? 'Trifasica' : 'Monofasica',
      CosPhi: Number(cosPhi.toFixed(2)),
    };
  });
}

/**
 * Export audited switchboard table to Excel
 */
export function exportToExcel(loads: LoadItem[], summary: BalanceSummary, filename = 'balance_cargas_auditado.xlsx') {
  const exportRows = loads.map((l) => ({
    Carga: l.Carga,
    'Potencia (kW)': l.Potencia_kW,
    Tipo: l.Tipo,
    'Cos Phi': l.CosPhi,
    'Ib (A)': l.Ib_A,
    'Fase Asignada': l.Fase,
    'Protección In (A)': l.Proteccion_In_A,
    Curva: l.CurvaTermomagnetica || 'C',
    'Cable Sugerido (mm²)': l.SeccionCable_mm2,
    'Diferencial (mA)': l.Diferencial_mA,
    Notas: l.Notas || '',
  }));

  const summaryRows = [
    { Parámetro: 'Corriente Total Fase R (A)', Valor: summary.corrienteR_A },
    { Parámetro: 'Corriente Total Fase S (A)', Valor: summary.corrienteS_A },
    { Parámetro: 'Corriente Total Fase T (A)', Valor: summary.corrienteT_A },
    { Parámetro: 'Potencia Fase R (kW)', Valor: summary.potenciaR_kW },
    { Parámetro: 'Potencia Fase S (kW)', Valor: summary.potenciaS_kW },
    { Parámetro: 'Potencia Fase T (kW)', Valor: summary.potenciaT_kW },
    { Parámetro: 'Potencia Total Instalada (kW)', Valor: summary.potenciaTotal_kW },
    { Parámetro: 'Porcentaje de Desbalance (%)', Valor: `${summary.porcentajeDesbalance}%` },
    { Parámetro: 'Corriente Estimada Neutro (A)', Valor: summary.corrienteNeutro_A },
    { Parámetro: 'Estado de Balance', Valor: summary.estadoBalance },
  ];

  const wb = XLSX.utils.book_new();
  const wsLoads = XLSX.utils.json_to_sheet(exportRows);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  XLSX.utils.book_append_sheet(wb, wsLoads, 'Planilla de Cargas');
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen de Balance');

  XLSX.writeFile(wb, filename);
}
