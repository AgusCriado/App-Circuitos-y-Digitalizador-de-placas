import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { performLocalBalance } from './src/utils/electricalMath.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Generous limit for high-resolution motor nameplate images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Helper to get Gemini Client with recommended user agent
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

// Endpoint: Audit Switchboard & Phase Balancing (AEA 90364)
app.post('/api/audit-switchboard', async (req: Request, res: Response) => {
  try {
    const { loads, systemVoltage = 380, singlePhaseVoltage = 220, frequency = 50 } = req.body;

    if (!Array.isArray(loads) || loads.length === 0) {
      return res.status(400).json({ error: 'Debe proporcionar una lista válida de cargas.' });
    }

    const ai = getGeminiClient();

    const prompt = `
Actúa como un Ingeniero Eléctrico Senior experto en diseño de instalaciones eléctricas y normativa AEA 90364 e IEC 60898/60947.
Analiza la siguiente tabla preliminar de cargas para un tablero eléctrico de baja tensión (Tensión trifásica: ${systemVoltage}V, monofásica: ${singlePhaseVoltage}V, frecuencia: ${frequency}Hz):

${JSON.stringify(loads, null, 2)}

Realiza las siguientes tareas con rigor técnico:
1. Para cada carga:
   - Verifica o calcula la corriente de diseño (Ib en Amperes).
     * Cargas monofásicas: Ib = (Potencia_kW * 1000) / (V_fase * cosPhi)
     * Cargas trifásicas: Ib = (Potencia_kW * 1000) / (sqrt(3) * V_linea * cosPhi)
   - Asigna una fase (R, S, T) a cada carga monofásica para lograr el balance de fases más perfecto posible (las cargas trifásicas se etiquetan como "Trifásica" o "R-S-T").
   - Define el calibre comercial normalizado de la protección termomagnética (In en A) según curva C o D (In >= Ib). Calibres comerciales estándar: [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 630].
   - Sugiere la sección mínima de cable de cobre aislado (mm2) según AEA 90364 (ej: 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95 mm2) para que Iz >= In.
   - Sugiere sensibilidad de protección diferencial asociada (ID en mA, ej: 30mA para tomas/usos generales, 300mA para circuitos de distribución o cabecera).

2. Proporciona un resumen de balance de fases:
   - Corriente total estimada en Fase R (A)
   - Corriente total estimada en Fase S (A)
   - Corriente total estimada en Fase T (A)
   - Potencia activa total asignada a R (kW), S (kW), T (kW)
   - Porcentaje de desbalance: ((Imax - Imin) / Ipromedio) * 100%
   - Corriente estimada por neutro Ineutro (A)
   - Estado del balance: "Excelente (<5%)", "Aceptable (<10%)" o "Requiere Ajuste (>10%)"

3. Diagnóstico técnico y recomendaciones según AEA 90364:
   - Observaciones sobre factor de simultaneidad, reserva de capacidad (20-30% sugerido en AEA), tipo de interruptor cabecera sugerido, y corrección de factor de potencia si se detecta cos phi bajo.

Devuelve ESTRICTAMENTE un objeto JSON válido sin texto previo ni posterior, con esta estructura exacta:
{
  "cargasAuditadas": [
    {
      "id": "1",
      "Carga": "nombre de la carga",
      "Potencia_kW": 0.0,
      "Tipo": "Monofasica" | "Trifasica",
      "CosPhi": 0.85,
      "Ib_A": 0.0,
      "Fase": "R" | "S" | "T" | "Trifasica",
      "Proteccion_In_A": 0,
      "CurvaTermomagnetica": "C" | "D" | "B",
      "SeccionCable_mm2": 0.0,
      "Diferencial_mA": 30,
      "Notas": "observación técnica"
    }
  ],
  "resumenBalance": {
    "corrienteR_A": 0.0,
    "corrienteS_A": 0.0,
    "corrienteT_A": 0.0,
    "potenciaR_kW": 0.0,
    "potenciaS_kW": 0.0,
    "potenciaT_kW": 0.0,
    "potenciaTotal_kW": 0.0,
    "porcentajeDesbalance": 0.0,
    "corrienteNeutro_A": 0.0,
    "estadoBalance": "Excelente" | "Aceptable" | "Desbalanceado"
  },
  "interruptorCabecera": {
    "In_A": 0,
    "polos": 4,
    "curva": "C",
    "poderCorte_kA": 10,
    "diferencialCabecera": "300mA tipo AC o A selectivo"
  },
  "diagnosticoTecnico": "Texto detallado en formato markdown con la memoria técnica, justificación normativa AEA 90364 y recomendaciones."
}
`;

    let data: any = null;
    try {
      // Primary: gemini-3.1-flash-lite (fast, high throughput, zero 503 errors)
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      const rawText = response.text || '{}';
      try {
        data = JSON.parse(rawText);
      } catch {
        const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        data = JSON.parse(cleaned);
      }
    } catch (modelErr: unknown) {
      console.warn('Gemini 3.1 Flash Lite failed, attempting secondary model:', modelErr);
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });
        const rawText = response.text || '{}';
        data = JSON.parse(rawText.replace(/^```json\s*/, '').replace(/\s*```$/, ''));
      } catch (backupErr: unknown) {
        console.warn('AI models unavailable, computing with electricalMath engine:', backupErr);
        const fallback = performLocalBalance(loads, Number(systemVoltage) || 380, Number(singlePhaseVoltage) || 220);
        fallback.diagnosticoTecnico += '\n\n*(Auditoría y balance resueltos mediante el motor analítico de ingeniería AEA 90364).*';
        data = fallback;
      }
    }

    return res.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/audit-switchboard:', error);
    // Even in outer catch, return a computed result rather than breaking the user UI
    const fallback = performLocalBalance(req.body.loads || [], 380, 220);
    return res.json(fallback);
  }
});

// Endpoint: Motor Nameplate Digitizer & Starting Study (IEC 60034 / IEC 60947)
app.post('/api/analyze-plate', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', startingMethod = 'Directo (DOL)' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Se requiere una imagen en base64 de la placa del motor.' });
    }

    const ai = getGeminiClient();

    // Accurately extract mimeType and base64 payload
    let cleanMime = 'image/jpeg';
    let base64Data = imageBase64;
    const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      cleanMime = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    } else {
      cleanMime = mimeType || 'image/jpeg';
      base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
    }

    const prompt = `
Actúa como un Ingeniero Electromecánico Senior especialista en máquinas eléctricas rotativas y normativa IEC 60034 e IEC 60947.
Analiza minuciosamente la fotografía o imagen de la placa de características de este motor eléctrico.
IMPORTANTE: Extrae con máxima fidelidad los datos REALES que están impresos o estampados en la imagen suministrada (Marca, Modelo, Potencia, Tensión, Corriente, RPM, Frecuencia, Cos Phi, Rendimiento, etc.). NO inventes valores que contradigan la imagen.

El usuario ha seleccionado el método de arranque previsto: "${startingMethod}".

Realiza el siguiente análisis:
1. EXTRACCIÓN DE DATOS DE PLACA:
   - Fabricante / Marca
   - Modelo / Tipo / Carcasa (Frame)
   - Número de serie / Año de fabricación
   - Potencia nominal mecánica Pn (en kW y en HP; 1 HP = 0.746 kW o 1 CV = 0.736 kW)
   - Tensiones nominales U (ej. 220/380 V, 380/660 V, 400 V, 460 V) y conexiones asociadas (Delta Δ / Estrella Y)
   - Corrientes nominales In (A) para cada nivel de tensión
   - Corriente nominal base en Amperes (número decimal para cálculos, ej: 29.5)
   - Velocidad nominal n (RPM)
   - Frecuencia nominal f (Hz, ej: 50 o 60 Hz)
   - Factor de potencia nominal (cos phi)
   - Rendimiento nominal eta (en % ej: 92.4%). Si falta en placa, estímalo: P_electrica = sqrt(3)*U*I*cosPhi, eta = (P_mecanica / P_electrica) * 100.
   - Factor de servicio (FS)
   - Clase de aislamiento (F, H, B)
   - Grado de protección IP (ej. IP55, IP56, IP65, IP23)
   - Régimen de servicio (S1, S2, etc.)

2. CÁLCULO DE PARÁMETROS ELECTROMECÁNICOS BASADOS EN LOS DATOS REALES:
   - Número de polos magnéticos (2, 4, 6, 8) y velocidad síncrona ns (RPM = 120*f / 2p)
   - Deslizamiento nominal s (%) = ((ns - n) / ns) * 100
   - Potencia eléctrica activa absorbida P_elec (kW) = Pn_kW / (eta/100)
   - Potencia aparente S (kVA) = sqrt(3) * U * I / 1000
   - Potencia reactiva Q (kVAr) = sqrt(max(0, S^2 - P_elec^2))
   - Torque nominal Tn (Nm) = (9550 * Pn_kW) / RPM

3. INGENIERÍA DE ARRANQUE PARA "${startingMethod}":
   - Corriente pico estimada de arranque Ia (A) y múltiplo Ia/In
   - Torque de arranque estimado (Nm)
   - Calibre categoría AC-3 para contactor principal (A) y modelo sugerido
   - Rango de ajuste térmico / guardamotor
   - Fusibles de respaldo aM (A)
   - Sección recomendada de conductor de cobre (mm2)
   - Memoria técnica explicativa en formato Markdown

Devuelve ESTRICTAMENTE un JSON con la siguiente estructura (sin formato Markdown adicional):
{
  "datosPlaca": {
    "marca": "string",
    "modelo": "string",
    "numeroSerie": "string",
    "potencia_kW": 0.0,
    "potencia_HP": 0.0,
    "tension_V": "string",
    "conexion": "string",
    "corriente_A": "string",
    "corrienteNominalBase_A": 0.0,
    "rpm": 0,
    "frecuencia_Hz": 50,
    "cosPhi": 0.0,
    "rendimiento_eta_pct": 0.0,
    "factorServicio": "string",
    "claseAislamiento": "string",
    "gradoIP": "string",
    "regimen": "string"
  },
  "parametrosCalculados": {
    "polos": 4,
    "velocidadSincrona_RPM": 1500,
    "deslizamiento_pct": 0.0,
    "potenciaElectrica_kW": 0.0,
    "potenciaAparente_kVA": 0.0,
    "potenciaReactiva_kVAr": 0.0,
    "torqueNominal_Nm": 0.0
  },
  "dimensionamientoArranque": {
    "metodo": "${startingMethod}",
    "corrienteArranqueEstimada_A": 0.0,
    "multiploIa_In": 0.0,
    "torqueArranqueEstimado_Nm": 0.0,
    "contactorPrincipalAC3_A": 0,
    "modeloContactorSugerido": "string",
    "rangoAjusteTermico_A": "string",
    "fusiblesRespaldo_aM_A": 0,
    "seccionCableSugerida_mm2": 0.0,
    "aptoEstrellaTriangulo": true,
    "recomendacionesEspeciales": "string"
  },
  "memoriaTecnicaMarkdown": "string con informe técnico completo en formato Markdown"
}
`;

    let contentsPayload: any[];
    if (cleanMime === 'image/svg+xml') {
      const svgText = Buffer.from(base64Data, 'base64').toString('utf-8');
      contentsPayload = [
        {
          text: `A continuación se presentan los datos y texto vectoriales de la placa de motor en SVG:\n${svgText}\n\n${prompt}`,
        },
      ];
    } else {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(cleanMime)) {
        cleanMime = 'image/jpeg';
      }
      contentsPayload = [
        {
          inlineData: {
            mimeType: cleanMime,
            data: base64Data,
          },
        },
        {
          text: prompt,
        },
      ];
    }

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
    ];

    let data: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: contentsPayload,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          });
          const rawText = response.text || '{}';
          try {
            data = JSON.parse(rawText);
          } catch {
            const cleaned = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            data = JSON.parse(cleaned);
          }
          if (data) break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} attempt ${attempt} failed:`, err.message || err.status);
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 700));
          }
        }
      }
      if (data) break;
    }

    if (!data) {
      throw lastError || new Error('El servicio de IA está experimentando alta demanda momentánea.');
    }

    // If Gemini returned an array (e.g. [{ ... }]), unwrap the first item
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }

    return res.json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/analyze-plate:', error);
    let userMsg = 'Error al digitalizar la placa del motor.';
    const rawMsg = error.message || '';
    if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
      userMsg = 'El servicio de IA está experimentando alta demanda temporal en los servidores de Google (503). Por favor reintente o ingrese los datos de la placa manualmente.';
    } else if (rawMsg) {
      userMsg = rawMsg;
    }
    return res.status(503).json({
      error: userMsg,
    });
  }
});

// Configure Vite or Static Serve
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Suite Electromecánica corriendo en http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
