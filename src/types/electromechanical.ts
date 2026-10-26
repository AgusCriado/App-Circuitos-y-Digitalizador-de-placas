export interface LoadItem {
  id: string;
  Carga: string;
  Potencia_kW: number;
  Tipo: 'Monofasica' | 'Trifasica';
  CosPhi: number;
  Ib_A?: number;
  Fase?: 'R' | 'S' | 'T' | 'Trifasica' | 'R-S-T';
  Proteccion_In_A?: number;
  CurvaTermomagnetica?: 'B' | 'C' | 'D';
  SeccionCable_mm2?: number;
  Diferencial_mA?: number;
  Notas?: string;
}

export interface BalanceSummary {
  corrienteR_A: number;
  corrienteS_A: number;
  corrienteT_A: number;
  potenciaR_kW: number;
  potenciaS_kW: number;
  potenciaT_kW: number;
  potenciaTotal_kW: number;
  porcentajeDesbalance: number;
  corrienteNeutro_A: number;
  estadoBalance: 'Excelente' | 'Aceptable' | 'Desbalanceado';
}

export interface MainBreakerRecommendation {
  In_A: number;
  polos: number;
  curva: string;
  poderCorte_kA: number;
  diferencialCabecera: string;
}

export interface SwitchboardAuditResult {
  cargasAuditadas: LoadItem[];
  resumenBalance: BalanceSummary;
  interruptorCabecera: MainBreakerRecommendation;
  diagnosticoTecnico: string;
}

export interface MotorPlateData {
  marca: string;
  modelo: string;
  numeroSerie: string;
  potencia_kW: number;
  potencia_HP: number;
  tension_V: string;
  conexion: string;
  corriente_A: string;
  corrienteNominalBase_A: number;
  rpm: number;
  frecuencia_Hz: number;
  cosPhi: number;
  rendimiento_eta_pct: number;
  factorServicio: string;
  claseAislamiento: string;
  gradoIP: string;
  regimen: string;
}

export interface MotorCalculatedParams {
  polos: number;
  velocidadSincrona_RPM: number;
  deslizamiento_pct: number;
  potenciaElectrica_kW: number;
  potenciaAparente_kVA: number;
  potenciaReactiva_kVAr: number;
  torqueNominal_Nm: number;
}

export interface MotorStartingStudy {
  metodo: string;
  corrienteArranqueEstimada_A: number;
  multiploIa_In: number;
  torqueArranqueEstimado_Nm: number;
  contactorPrincipalAC3_A: number;
  modeloContactorSugerido: string;
  rangoAjusteTermico_A: string;
  fusiblesRespaldo_aM_A: number;
  seccionCableSugerida_mm2: number;
  aptoEstrellaTriangulo: boolean;
  recomendacionesEspeciales: string;
}

export interface MotorAnalysisResponse {
  datosPlaca: MotorPlateData;
  parametrosCalculados: MotorCalculatedParams;
  dimensionamientoArranque: MotorStartingStudy;
  memoriaTecnicaMarkdown: string;
}
