import { LoadItem } from '../types/electromechanical';

export interface SwitchboardPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  loads: LoadItem[];
}

export const SAMPLE_SWITCHBOARDS: SwitchboardPreset[] = [
  {
    id: 'taller-metalmecanico',
    name: 'Taller Metalmecánico (TGBT)',
    category: 'Industrial',
    description: 'Tablero General de Baja Tensión con tornos, inyectora, compresor de aire y circuitos monofásicos.',
    loads: [
      { id: '1', Carga: 'Compresor a Tornillo Atlas', Potencia_kW: 11.0, Tipo: 'Trifasica', CosPhi: 0.85 },
      { id: '2', Carga: 'Torno CNC Mazak', Potencia_kW: 15.0, Tipo: 'Trifasica', CosPhi: 0.88 },
      { id: '3', Carga: 'Inyectora Hidráulica', Potencia_kW: 22.0, Tipo: 'Trifasica', CosPhi: 0.84 },
      { id: '4', Carga: 'Fresadora Universal', Potencia_kW: 5.5, Tipo: 'Trifasica', CosPhi: 0.82 },
      { id: '5', Carga: 'Soldadora MIG-MAG 1', Potencia_kW: 4.2, Tipo: 'Monofasica', CosPhi: 0.75 },
      { id: '6', Carga: 'Soldadora MIG-MAG 2', Potencia_kW: 4.2, Tipo: 'Monofasica', CosPhi: 0.75 },
      { id: '7', Carga: 'Iluminación Campanas LED Nave', Potencia_kW: 2.8, Tipo: 'Monofasica', CosPhi: 0.95 },
      { id: '8', Carga: 'Tomas de Uso General (TUG)', Potencia_kW: 3.5, Tipo: 'Monofasica', CosPhi: 0.85 },
      { id: '9', Carga: 'Oficina Técnica y Servidor', Potencia_kW: 2.2, Tipo: 'Monofasica', CosPhi: 0.90 },
      { id: '10', Carga: 'Climatización Oficinas (Split)', Potencia_kW: 3.2, Tipo: 'Monofasica', CosPhi: 0.86 },
      { id: '11', Carga: 'Sierra Sinfín de Banco', Potencia_kW: 1.8, Tipo: 'Monofasica', CosPhi: 0.80 },
      { id: '12', Carga: 'Extractor Ventilador Eólico/Forzado', Potencia_kW: 1.5, Tipo: 'Monofasica', CosPhi: 0.82 },
    ],
  },
  {
    id: 'edificio-comercial',
    name: 'Edificio Comercial y Oficinas',
    category: 'Comercial',
    description: 'Alimentación de servicios generales, bombas de agua sanitarias, ascensor e iluminación.',
    loads: [
      { id: '1', Carga: 'Ascensor Principal 8 Pasajeros', Potencia_kW: 7.5, Tipo: 'Trifasica', CosPhi: 0.82 },
      { id: '2', Carga: 'Bomba Elevadora de Agua 1', Potencia_kW: 3.7, Tipo: 'Trifasica', CosPhi: 0.84 },
      { id: '3', Carga: 'Bomba Elevadora de Agua 2 (Reserva)', Potencia_kW: 3.7, Tipo: 'Trifasica', CosPhi: 0.84 },
      { id: '4', Carga: 'Iluminación Palieres y Escaleras', Potencia_kW: 1.8, Tipo: 'Monofasica', CosPhi: 0.96 },
      { id: '5', Carga: 'Portón Automático Cochera', Potencia_kW: 0.75, Tipo: 'Monofasica', CosPhi: 0.78 },
      { id: '6', Carga: 'Presurizadora Incendio (Jockey)', Potencia_kW: 2.2, Tipo: 'Trifasica', CosPhi: 0.85 },
      { id: '7', Carga: 'CCTV y Central de Alarmas', Potencia_kW: 0.9, Tipo: 'Monofasica', CosPhi: 0.92 },
      { id: '8', Carga: 'Extractor Cochera Subsuelo', Potencia_kW: 2.2, Tipo: 'Monofasica', CosPhi: 0.83 },
      { id: '9', Carga: 'Tomas de Servicio y Mantenimiento', Potencia_kW: 2.5, Tipo: 'Monofasica', CosPhi: 0.85 },
    ],
  },
  {
    id: 'estacion-bombeo',
    name: 'Estación de Bombeo de Efluentes',
    category: 'Saneamiento',
    description: 'Electrobombas sumergibles, agitador, soplador y dosificador químico.',
    loads: [
      { id: '1', Carga: 'Electrobomba Sumergible Pozo 1', Potencia_kW: 15.0, Tipo: 'Trifasica', CosPhi: 0.85 },
      { id: '2', Carga: 'Electrobomba Sumergible Pozo 2', Potencia_kW: 15.0, Tipo: 'Trifasica', CosPhi: 0.85 },
      { id: '3', Carga: 'Soplador de Aireación Difusa', Potencia_kW: 7.5, Tipo: 'Trifasica', CosPhi: 0.86 },
      { id: '4', Carga: 'Agitador Sumergible de Fondo', Potencia_kW: 3.0, Tipo: 'Trifasica', CosPhi: 0.81 },
      { id: '5', Carga: 'Bomba Dosificadora Hipoclorito', Potencia_kW: 0.55, Tipo: 'Monofasica', CosPhi: 0.80 },
      { id: '6', Carga: 'Tablero PLC, SCADA y Caudalímetro', Potencia_kW: 1.2, Tipo: 'Monofasica', CosPhi: 0.92 },
      { id: '7', Carga: 'Iluminación Perimetral LED', Potencia_kW: 1.5, Tipo: 'Monofasica', CosPhi: 0.95 },
    ],
  },
];

export interface MotorPreset {
  id: string;
  name: string;
  brand: string;
  power: string;
  voltage: string;
  description: string;
  dataUrl: string; // SVG rendered as base64 data url
}

// Helper to create crisp SVG nameplates encoded as data URLs
function createPlateSvg(brand: string, model: string, kw: number, hp: number, rpm: number, v1: number, v2: number, i1: number, i2: number, cosPhi: number, eta: number, ip: string, hz = 50): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#cfd8dc" />
      <stop offset="50%" stop-color="#eceff1" />
      <stop offset="100%" stop-color="#b0bec5" />
    </linearGradient>
    <pattern id="rivet" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="3" fill="#37474f" />
    </pattern>
  </defs>
  <!-- Plate Background -->
  <rect x="5" y="5" width="590" height="370" rx="10" fill="url(#metal)" stroke="#263238" stroke-width="4"/>
  <!-- Rivet Holes -->
  <circle cx="20" cy="20" r="6" fill="#263238" />
  <circle cx="580" cy="20" r="6" fill="#263238" />
  <circle cx="20" cy="360" r="6" fill="#263238" />
  <circle cx="580" cy="360" r="6" fill="#263238" />

  <!-- Header Banner -->
  <rect x="25" y="25" width="550" height="52" fill="#0d47a1" rx="4"/>
  <text x="45" y="60" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="28" fill="#ffffff" letter-spacing="2">${brand.toUpperCase()}</text>
  <text x="320" y="57" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="16" fill="#ffca28">3~ MOTOR IEC 60034-1</text>

  <!-- Model and Frame -->
  <line x1="25" y1="88" x2="575" y2="88" stroke="#37474f" stroke-width="2"/>
  <text x="35" y="112" font-family="monospace" font-size="15" font-weight="bold" fill="#1a237e">TYPE / MODEL: ${model}</text>
  <text x="370" y="112" font-family="monospace" font-size="15" font-weight="bold" fill="#1a237e">INS. CL.: F  |  ${ip}</text>

  <!-- Power and Speed -->
  <rect x="25" y="125" width="550" height="42" fill="#e2e8f0" stroke="#64748b"/>
  <text x="35" y="152" font-family="monospace" font-size="18" font-weight="bold" fill="#0f172a">kW: ${kw}  /  HP: ${hp}</text>
  <text x="330" y="152" font-family="monospace" font-size="18" font-weight="bold" fill="#0f172a">RPM: ${rpm}  |  Hz: ${hz}</text>

  <!-- Voltage and Current Grid -->
  <rect x="25" y="177" width="550" height="90" fill="#ffffff" stroke="#37474f" stroke-width="1.5"/>
  <line x1="25" y1="210" x2="575" y2="210" stroke="#90a4ae" stroke-width="1"/>
  <line x1="180" y1="177" x2="180" y2="267" stroke="#90a4ae" stroke-width="1"/>
  <line x1="330" y1="177" x2="330" y2="267" stroke="#90a4ae" stroke-width="1"/>
  <line x1="450" y1="177" x2="450" y2="267" stroke="#90a4ae" stroke-width="1"/>

  <text x="40" y="200" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#455a64">VOLTAGE (V)</text>
  <text x="210" y="200" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#455a64">CONN.</text>
  <text x="360" y="200" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#455a64">CURRENT (A)</text>
  <text x="475" y="200" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#455a64">COS φ</text>

  <text x="50" y="235" font-family="monospace" font-size="16" font-weight="bold" fill="#b71c1c">${v1} V</text>
  <text x="235" y="235" font-family="monospace" font-size="18" font-weight="bold" fill="#0d47a1">Δ</text>
  <text x="370" y="235" font-family="monospace" font-size="17" font-weight="bold" fill="#b71c1c">${i1} A</text>
  <text x="485" y="235" font-family="monospace" font-size="16" font-weight="bold" fill="#263238">${cosPhi}</text>

  <text x="50" y="258" font-family="monospace" font-size="16" font-weight="bold" fill="#b71c1c">${v2} V</text>
  <text x="235" y="258" font-family="monospace" font-size="18" font-weight="bold" fill="#0d47a1">Y</text>
  <text x="370" y="258" font-family="monospace" font-size="17" font-weight="bold" fill="#b71c1c">${i2} A</text>
  <text x="485" y="258" font-family="monospace" font-size="16" font-weight="bold" fill="#263238">${cosPhi}</text>

  <!-- Efficiency & Duty Footer -->
  <rect x="25" y="278" width="550" height="75" fill="#f1f5f9" stroke="#64748b"/>
  <text x="35" y="304" font-family="monospace" font-size="14" font-weight="bold" fill="#0f172a">EFFICIENCY (η): ${eta}% (IE3 Premium)</text>
  <text x="360" y="304" font-family="monospace" font-size="14" font-weight="bold" fill="#0f172a">DUTY: S1  |  SF: 1.15</text>
  <text x="35" y="333" font-family="monospace" font-size="13" fill="#475569">SERVO/BEARINGS: 6308-2Z  |  Ia/In: 7.2  |  AMB: 40°C</text>
  <text x="450" y="343" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1e293b">MADE IN BRAZIL</text>
</svg>`;

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export const SAMPLE_MOTORS: MotorPreset[] = [
  {
    id: 'weg-15kw',
    name: 'WEG W22 15 kW (20 HP)',
    brand: 'WEG',
    power: '15 kW / 20 HP',
    voltage: '380/660 V Δ/Y',
    description: 'Motor industrial trifásico de alta eficiencia IE3, 1465 RPM (4 polos), para bomba o compresor.',
    dataUrl: createPlateSvg('WEG', 'W22 160M 4P', 15, 20, 1465, 380, 660, 29.5, 17.0, 0.84, 92.4, 'IP55'),
  },
  {
    id: 'siemens-7-5kw',
    name: 'Siemens SIMOTICS 7.5 kW (10 HP)',
    brand: 'Siemens',
    power: '7.5 kW / 10 HP',
    voltage: '220/380 V Δ/Y',
    description: 'Motor 2 polos (2920 RPM) ideal para bombas centrífugas de alta presión o ventiladores.',
    dataUrl: createPlateSvg('SIEMENS', 'SIMOTICS 1LE1001-1CA0', 7.5, 10, 2920, 220, 380, 25.0, 14.5, 0.88, 90.1, 'IP55'),
  },
  {
    id: 'abb-30kw',
    name: 'ABB Process 30 kW (40 HP)',
    brand: 'ABB',
    power: '30 kW / 40 HP',
    voltage: '380/660 V Δ/Y',
    description: 'Motor 6 polos (980 RPM) para molinos, trituradoras o cargas pesadas con alto par inicial.',
    dataUrl: createPlateSvg('ABB', 'M3BP 225SMB 6', 30, 40, 980, 380, 660, 60.5, 34.8, 0.82, 93.6, 'IP65'),
  },
  {
    id: 'baldor-3kw',
    name: 'Baldor / Czerweny 3 kW (4 HP)',
    brand: 'Czerweny',
    power: '3 kW / 4 HP',
    voltage: '220/380 V Δ/Y',
    description: 'Motor compacto 4 polos (1420 RPM) para maquinaria de taller y cintas transportadoras.',
    dataUrl: createPlateSvg('CZERWENY', '3AL 100L4', 3.0, 4.0, 1420, 220, 380, 11.2, 6.5, 0.81, 85.5, 'IP54'),
  },
];
