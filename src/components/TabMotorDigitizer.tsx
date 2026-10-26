import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  Zap,
  Cpu,
  FileText,
  Download,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Gauge,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { SAMPLE_MOTORS } from '../data/sampleData';
import { MotorAnalysisResponse } from '../types/electromechanical';
import { StartingSchematic } from './StartingSchematic';
import { generateMotorReportPDF } from '../utils/pdfGenerator';

export const TabMotorDigitizer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string>(SAMPLE_MOTORS[0].dataUrl);
  const [imageMimeType, setImageMimeType] = useState<string>('image/svg+xml');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(SAMPLE_MOTORS[0].id);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [selectedStartingMethod, setSelectedStartingMethod] = useState<string>('Directo (DOL)');
  const [analysisResult, setAnalysisResult] = useState<MotorAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const STARTING_METHODS = [
    {
      id: 'Directo (DOL)',
      name: 'Directo (DOL)',
      desc: 'Arranque a plena tensión en la red (Ia ~ 6-8 In)',
    },
    {
      id: 'Estrella-Triángulo',
      name: 'Estrella-Triángulo (Y-Δ)',
      desc: 'Transición por contactores para motores ≥ 4 kW aptos (Ia ~ 2.2-2.8 In)',
    },
    {
      id: 'Arrancador Suave',
      name: 'Arrancador Suave (Soft Starter)',
      desc: 'Rampa de tiristores con control de corriente (Ia ~ 2.5-3.5 In)',
    },
    {
      id: 'Variador de Frecuencia (VFD)',
      name: 'Variador de Frecuencia (VFD)',
      desc: 'Control vectorial continuo V/f (Ia ≤ 1.1 In, par pleno)',
    },
  ];

  // Compress high-resolution images client-side before sending to prevent 503 timeouts
  const compressImage = (file: File): Promise<{ dataUrl: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: e.target?.result as string, mimeType: file.type });
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ dataUrl: compressed, mimeType: 'image/jpeg' });
        };
        img.onerror = () => resolve({ dataUrl: e.target?.result as string, mimeType: file.type });
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve({ dataUrl: '', mimeType: file.type });
      reader.readAsDataURL(file);
    });
  };

  // Handle uploaded image file (from device or camera) with automatic optimization
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor seleccione un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }

    setErrorMessage(null);
    setSelectedPresetId(null); // Mark as custom upload
    setUploadedFileName(file.name);

    try {
      const { dataUrl, mimeType } = await compressImage(file);
      setSelectedImage(dataUrl);
      setImageMimeType(mimeType);
      setAnalysisResult(null); // Reset previous analysis
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setSelectedImage(dataUrl);
        setImageMimeType(file.type);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Select sample motor plate
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_MOTORS.find((m) => m.id === sampleId);
    if (sample) {
      setSelectedPresetId(sampleId);
      setUploadedFileName(null);
      setSelectedImage(sample.dataUrl);
      setImageMimeType('image/svg+xml');
      setAnalysisResult(null);
      setErrorMessage(null);
    }
  };

  // Recalculate electromechanical and starting parameters based on updated motor plate values
  const recalculateFromPlate = (
    currentPlate: MotorAnalysisResponse['datosPlaca'],
    method: string
  ): MotorAnalysisResponse => {
    const pKw = Number(currentPlate.potencia_kW) || 1.0;
    const rpm = Number(currentPlate.rpm) || 1450;
    const f = Number(currentPlate.frecuencia_Hz) || 50;
    const cosPhi = Number(currentPlate.cosPhi) || 0.85;
    const eta = Number(currentPlate.rendimiento_eta_pct) || 90.0;
    const inA = Number(currentPlate.corrienteNominalBase_A) || 
      Number(((pKw / (eta / 100) * 1000) / (Math.sqrt(3) * 380 * cosPhi)).toFixed(1));

    // Determine poles and synchronous speed
    let poles = 4;
    let ns = 1500;
    if (rpm > 2400) {
      poles = 2;
      ns = f === 60 ? 3600 : 3000;
    } else if (rpm > 1200) {
      poles = 4;
      ns = f === 60 ? 1800 : 1500;
    } else if (rpm > 800) {
      poles = 6;
      ns = f === 60 ? 1200 : 1000;
    } else {
      poles = 8;
      ns = f === 60 ? 900 : 750;
    }

    const slip = Number(Math.max(0, ((ns - rpm) / ns) * 100).toFixed(2));
    const pElec = Number((pKw / (eta / 100)).toFixed(2));
    const sKva = Number(((Math.sqrt(3) * 380 * inA) / 1000).toFixed(2));
    const qKvar = Number(Math.sqrt(Math.max(0, sKva ** 2 - pElec ** 2)).toFixed(2));
    const torqueNm = Number(((9550 * pKw) / rpm).toFixed(2));

    const isYD = method.includes('Estrella');
    const isSoft = method.includes('Suave');
    const isVFD = method.includes('Variador');

    const iaA = isYD
      ? Number((inA * 2.4).toFixed(1))
      : isSoft
      ? Number((inA * 3.0).toFixed(1))
      : isVFD
      ? Number((inA * 1.1).toFixed(1))
      : Number((inA * 7.2).toFixed(1));

    const iaIn = isYD ? 2.4 : isSoft ? 3.0 : isVFD ? 1.1 : 7.2;
    const torqueArr = isYD ? Number((torqueNm * 0.7).toFixed(1)) : isVFD ? torqueNm : Number((torqueNm * 2.2).toFixed(1));

    const contactorAc3 = isYD ? Math.round(inA * 0.58) : Math.round(inA * 1.15);
    const contactorModel = isYD
      ? `Juego Y-Δ: KM1/KM2 (${Math.round(inA * 0.58)}A) + KM3 (${Math.round(inA * 0.33)}A)`
      : `Contactor AC-3 Calibre ${contactorAc3} A`;

    const ajusteTermico = isYD
      ? `${(inA * 0.58 * 0.9).toFixed(1)} - ${(inA * 0.58 * 1.1).toFixed(1)} A (en lazo Δ)`
      : `${(inA * 0.9).toFixed(1)} - ${(inA * 1.1).toFixed(1)} A (ajustar a In = ${inA} A)`;

    // Cable sizing rule: minimum ampacity Iz >= In
    let seccion = 2.5;
    if (inA > 150) seccion = 70;
    else if (inA > 100) seccion = 50;
    else if (inA > 70) seccion = 35;
    else if (inA > 50) seccion = 25;
    else if (inA > 35) seccion = 16;
    else if (inA > 24) seccion = 10;
    else if (inA > 16) seccion = 6;
    else if (inA > 10) seccion = 4;

    const mdReport = `## Memoria Técnica de Motor Eléctrico (IEC 60034-1 / IEC 60947-4-1)

- **Equipo / Motor:** ${currentPlate.marca || 'Motor'} ${currentPlate.modelo || ''}
- **Potencia Nominal:** ${pKw} kW (${currentPlate.potencia_HP || (pKw / 0.746).toFixed(1)} HP)
- **Tensión / Conexión:** ${currentPlate.tension_V} (${currentPlate.conexion})
- **Corriente Nominal (In):** ${inA} A
- **Velocidad y Polos:** ${rpm} RPM (${poles} polos, sincrónica ${ns} RPM, deslizamiento ${slip}%)
- **Par Motor Nominal (Tn):** ${torqueNm} Nm
- **Potencia Eléctrica:** ${pElec} kW | Aparente: ${sKva} kVA | Reactiva: ${qKvar} kVAr
- **Método de Arranque:** ${method}
- **Pico de Arranque Estimado:** ${iaA} A (${iaIn} × In)
- **Aparamenta Sugerida:** ${contactorModel}, Guardamotor regulado a ${inA} A, Conductores de ${seccion} mm².
`;

    return {
      datosPlaca: {
        ...currentPlate,
        potencia_kW: pKw,
        potencia_HP: Number(currentPlate.potencia_HP) || Number((pKw / 0.746).toFixed(1)),
        corrienteNominalBase_A: inA,
        rpm,
        cosPhi,
        rendimiento_eta_pct: eta,
      },
      parametrosCalculados: {
        polos: poles,
        velocidadSincrona_RPM: ns,
        deslizamiento_pct: slip,
        potenciaElectrica_kW: pElec,
        potenciaAparente_kVA: sKva,
        potenciaReactiva_kVAr: qKvar,
        torqueNominal_Nm: torqueNm,
      },
      dimensionamientoArranque: {
        metodo: method,
        corrienteArranqueEstimada_A: iaA,
        multiploIa_In: iaIn,
        torqueArranqueEstimado_Nm: torqueArr,
        contactorPrincipalAC3_A: contactorAc3,
        modeloContactorSugerido: contactorModel,
        rangoAjusteTermico_A: ajusteTermico,
        fusiblesRespaldo_aM_A: Math.round(inA * 1.6),
        seccionCableSugerida_mm2: seccion,
        aptoEstrellaTriangulo: currentPlate.tension_V.includes('380') && currentPlate.tension_V.includes('660'),
        recomendacionesEspeciales: 'Verificar selectividad amperométrica y temporización según inercia de carga.',
      },
      memoriaTecnicaMarkdown: mdReport,
    };
  };

  // Quick manual entry helper if AI service is temporarily busy (503)
  const handleStartManualEntry = () => {
    setErrorMessage(null);
    setIsEditingData(true);
    // Baseline template populated with values visible on the motor nameplate
    const manualPlate: MotorAnalysisResponse['datosPlaca'] = {
      marca: 'MALMBERGS',
      modelo: 'FRAME MS 711-2',
      numeroSerie: '1212073091',
      potencia_kW: 0.37,
      potencia_HP: 0.5,
      tension_V: '230/400 V',
      conexion: 'Δ / Y',
      corriente_A: '1.67 / 0.97 A',
      corrienteNominalBase_A: 1.67,
      rpm: 2730,
      frecuencia_Hz: 50,
      cosPhi: 0.78,
      rendimiento_eta_pct: 72.0,
      factorServicio: '1.0',
      claseAislamiento: 'F',
      gradoIP: 'IP55',
      regimen: 'S1',
    };
    const computed = recalculateFromPlate(manualPlate, selectedStartingMethod);
    setAnalysisResult(computed);
  };

  // Perform AI Analysis with Gemini (Calling server endpoint /api/analyze-plate)
  const handleRunAnalysis = async () => {
    if (!selectedImage) {
      setErrorMessage('Debe cargar una imagen de la placa del motor.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/analyze-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMimeType,
          startingMethod: selectedStartingMethod,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        let rawError = errorData.error || `Error del servidor HTTP ${res.status}`;
        if (
          typeof rawError === 'string' &&
          (rawError.includes('503') || rawError.includes('UNAVAILABLE') || rawError.includes('high demand'))
        ) {
          rawError =
            'El servicio de IA está experimentando alta demanda momentánea en Google Cloud (503). Puedes reintentar o transcribir los datos de la placa manualmente para generar el PDF de inmediato.';
        }
        throw new Error(rawError);
      }

      const data: MotorAnalysisResponse = await res.json();
      if (!data || !data.datosPlaca) {
        throw new Error('No se recibieron datos legibles de la placa. Por favor verifique la nitidez de la imagen.');
      }

      // Ensure calculated electromechanical values are computed and consistent
      const fullAnalysis = recalculateFromPlate(data.datosPlaca, selectedStartingMethod);
      setAnalysisResult(fullAnalysis);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error al analizar placa:', error);
      let msg = error.message || 'Error al digitalizar la placa.';
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
        msg =
          'El servicio de IA de Google está experimentando alta demanda momentánea (503). Puedes pulsar "Reintentar con IA" o "Ingresar Datos Directamente" para continuar sin esperas.';
      }
      setErrorMessage(msg);
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Update a field in datosPlaca and automatically update all calculated params
  const handleUpdatePlateField = (field: keyof MotorAnalysisResponse['datosPlaca'], value: unknown) => {
    if (!analysisResult) return;
    const updatedPlate = {
      ...analysisResult.datosPlaca,
      [field]: value,
    };
    const updatedAnalysis = recalculateFromPlate(updatedPlate, selectedStartingMethod);
    setAnalysisResult(updatedAnalysis);
  };

  // Download generic engineering technical report in PDF
  const handleDownloadPDF = () => {
    if (!analysisResult) return;
    generateMotorReportPDF(analysisResult);
  };

  // Copy Markdown to clipboard
  const handleCopyMarkdown = () => {
    if (!analysisResult) return;
    navigator.clipboard.writeText(analysisResult.memoriaTecnicaMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Camera className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Digitalizador de Motores y Memoria de Arranque
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
              Sube una fotografía de la placa de características del motor. El sistema con visión computacional de <strong>Gemini</strong> extrae automáticamente los datos nominales, calcula el rendimiento por balance de pérdidas si estuviese ausente, estima el torque nominal ($T_n$) y dimensiona la aparamenta de maniobra bajo norma <strong>IEC 60034 / IEC 60947</strong>.
            </p>
          </div>
        </div>

        {/* Preset Plates Quick Picker */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>O selecciona una placa industrial preconfigurada para probar:</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SAMPLE_MOTORS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleSelectSample(m.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  selectedImage === m.dataUrl
                    ? 'bg-amber-500/10 border-amber-500/60 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="font-bold text-xs text-white truncate">{m.name}</div>
                <div className="text-[11px] text-amber-400 font-mono mt-0.5">{m.voltage}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{m.power}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload and Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Box & Upload (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                Fotografía de la Placa del Motor
              </span>
              <span className="text-[11px] text-slate-400">JPG, PNG, WEBP</span>
            </div>

            {/* Image Preview Box */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center min-h-[240px] max-h-[320px]">
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Placa del motor seleccionada"
                    className="w-full h-full object-contain max-h-[320px] p-2"
                  />
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md text-[11px] font-bold font-mono shadow-md backdrop-blur bg-slate-900/90 border border-slate-700 flex items-center gap-2">
                    {uploadedFileName ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-300 font-sans">Foto Personalizada:</span>
                        <span className="text-white truncate max-w-[140px]">{uploadedFileName}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <span className="text-amber-300 font-sans">Muestra:</span>
                        <span className="text-white">{SAMPLE_MOTORS.find((m) => m.id === selectedPresetId)?.name || 'WEG 15 kW'}</span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-500 text-xs">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <span>No se ha seleccionado ninguna imagen</span>
                </div>
              )}
            </div>

            {/* Upload Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Subir Foto</span>
              </button>

              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Usar Cámara</span>
              </button>
            </div>
          </div>

          {/* Starting Method Selector Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Método de Arranque Previsto
              </span>
            </div>

            <div className="space-y-2">
              {STARTING_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedStartingMethod === m.id
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="startingMethod"
                    value={m.id}
                    checked={selectedStartingMethod === m.id}
                    onChange={(e) => setSelectedStartingMethod(e.target.value)}
                    className="mt-1 text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">{m.name}</span>
                    <span className="text-[11px] text-slate-400 leading-snug block mt-0.5">
                      {m.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Run Analysis Action */}
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading || !selectedImage}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 text-xs font-extrabold bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Analizando Placa con Gemini Visión...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Digitalizar Placa y Generar Memoria Técnica</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Results & Schematics (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {errorMessage && (
            <div className="bg-gradient-to-r from-rose-950/90 to-slate-900 border border-rose-700/80 text-rose-100 p-4 rounded-xl shadow-lg space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs leading-relaxed font-medium">
                  {errorMessage}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-800/60 pl-8">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-600 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-300" />
                  <span>Reintentar con IA</span>
                </button>
                <button
                  onClick={handleStartManualEntry}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <span>✍️ Ingresar Datos Directamente</span>
                </button>
              </div>
            </div>
          )}

          {!analysisResult && !isLoading && (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-10 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400">
                <Gauge className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Listo para procesar la placa</h3>
              <p className="text-xs max-w-md mx-auto text-slate-400 leading-relaxed">
                Selecciona una placa de muestra o sube tu propia foto y haz clic en <strong>"Digitalizar Placa y Generar Memoria Técnica"</strong> para calcular el torque nominal, estimar parámetros eléctricos y dimensionar contactores y protecciones.
              </p>
            </div>
          )}

          {isLoading && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-300 space-y-4">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-400 mx-auto" />
              <div className="font-bold text-sm text-white">Extrayendo datos de placa y ejecutando física electromecánica...</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Verificando balance de pérdidas (P_electrica = √3 &times; U &times; I &times; cos φ), torque (Tn) y dimensionamiento AC-3 según IEC 60947-4-1.
              </p>
            </div>
          )}

          {analysisResult && (
            <div className="space-y-4">
              {/* Card 1: Datos de Placa Extraídos */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-white text-sm">
                      1. Datos de Placa Extraídos de la Fotografía (IEC 60034-1)
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingData(!isEditingData)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded border transition-colors cursor-pointer ${
                        isEditingData
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isEditingData ? '✓ Guardar Calibración' : '✎ Editar / Calibrar'}
                    </button>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                      {analysisResult.datosPlaca.marca} {analysisResult.datosPlaca.modelo}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
                  {/* Potencia */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Potencia Pn</span>
                    {isEditingData ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="0.5"
                          value={analysisResult.datosPlaca.potencia_kW}
                          onChange={(e) =>
                            handleUpdatePlateField('potencia_kW', parseFloat(e.target.value) || 0)
                          }
                          className="w-20 bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-white font-bold text-xs"
                        />
                        <span className="text-slate-400">kW</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-white font-bold text-sm">
                          {analysisResult.datosPlaca.potencia_kW} kW
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          ({analysisResult.datosPlaca.potencia_HP} HP)
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tensión */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Tensión / Conn</span>
                    {isEditingData ? (
                      <input
                        type="text"
                        value={analysisResult.datosPlaca.tension_V}
                        onChange={(e) => handleUpdatePlateField('tension_V', e.target.value)}
                        className="w-full bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-amber-400 font-bold text-xs mt-1"
                      />
                    ) : (
                      <>
                        <span className="text-amber-400 font-bold text-sm">
                          {analysisResult.datosPlaca.tension_V}
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          {analysisResult.datosPlaca.conexion}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Corriente */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Corriente In</span>
                    {isEditingData ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="0.1"
                          value={analysisResult.datosPlaca.corrienteNominalBase_A}
                          onChange={(e) =>
                            handleUpdatePlateField(
                              'corrienteNominalBase_A',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-sky-400 font-bold text-xs"
                        />
                        <span className="text-slate-400">A</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sky-400 font-bold text-sm">
                          {analysisResult.datosPlaca.corrienteNominalBase_A || analysisResult.datosPlaca.corriente_A} A
                        </span>
                        <span className="text-slate-400 text-[10px] block">Nominal Base</span>
                      </>
                    )}
                  </div>

                  {/* Velocidad */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Velocidad / Frec</span>
                    {isEditingData ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="10"
                          value={analysisResult.datosPlaca.rpm}
                          onChange={(e) =>
                            handleUpdatePlateField('rpm', parseInt(e.target.value) || 0)
                          }
                          className="w-20 bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-emerald-400 font-bold text-xs"
                        />
                        <span className="text-slate-400">RPM</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-emerald-400 font-bold text-sm">
                          {analysisResult.datosPlaca.rpm} RPM
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          {analysisResult.datosPlaca.frecuencia_Hz} Hz
                        </span>
                      </>
                    )}
                  </div>

                  {/* Cos Phi */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Cos φ</span>
                    {isEditingData ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="1"
                        value={analysisResult.datosPlaca.cosPhi}
                        onChange={(e) =>
                          handleUpdatePlateField('cosPhi', parseFloat(e.target.value) || 0.85)
                        }
                        className="w-full bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-white font-bold text-xs mt-1"
                      />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {analysisResult.datosPlaca.cosPhi}
                      </span>
                    )}
                  </div>

                  {/* Rendimiento */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Rendimiento η</span>
                    {isEditingData ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="0.1"
                          value={analysisResult.datosPlaca.rendimiento_eta_pct}
                          onChange={(e) =>
                            handleUpdatePlateField(
                              'rendimiento_eta_pct',
                              parseFloat(e.target.value) || 90
                            )
                          }
                          className="w-20 bg-slate-900 border border-amber-500 rounded px-1.5 py-0.5 text-amber-400 font-bold text-xs"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : (
                      <span className="text-amber-400 font-bold text-sm">
                        {analysisResult.datosPlaca.rendimiento_eta_pct}%
                      </span>
                    )}
                  </div>

                  {/* Aislamiento */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Aislamiento / IP</span>
                    <span className="text-white font-bold text-sm">
                      Cl. {analysisResult.datosPlaca.claseAislamiento || 'F'} &bull; {analysisResult.datosPlaca.gradoIP || 'IP55'}
                    </span>
                  </div>

                  {/* Factor Servicio */}
                  <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Factor Servicio</span>
                    <span className="text-white font-bold text-sm">
                      FS {analysisResult.datosPlaca.factorServicio || '1.15'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Parámetros Electromecánicos Calculados */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Gauge className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-white text-sm">
                    2. Parámetros Electromecánicos Calculados
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-4 text-xs font-mono">
                  {/* Torque Nominal Highlight */}
                  <div className="bg-gradient-to-br from-amber-950/40 to-slate-950 p-3 rounded-xl border border-amber-500/40 col-span-2 sm:col-span-1">
                    <span className="text-amber-400 text-[10px] block uppercase font-bold">Torque Nominal (Tn)</span>
                    <div className="text-2xl font-extrabold text-white mt-1">
                      {analysisResult.parametrosCalculados.torqueNominal_Nm} <span className="text-xs text-amber-400 font-normal">Nm</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Tn = (9550 &times; P) / n
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Potencia Eléctrica Activa</span>
                    <div className="text-lg font-bold text-white mt-1">
                      {analysisResult.parametrosCalculados.potenciaElectrica_kW} kW
                    </div>
                    <span className="text-[10px] text-slate-400 block">Absorbida de la red</span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Potencia Aparente / Reactiva</span>
                    <div className="text-lg font-bold text-sky-400 mt-1">
                      {analysisResult.parametrosCalculados.potenciaAparente_kVA} kVA
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {analysisResult.parametrosCalculados.potenciaReactiva_kVAr} kVAr
                    </span>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Polos / Velocidad Síncrona</span>
                    <div className="text-lg font-bold text-white mt-1">
                      {analysisResult.parametrosCalculados.polos} polos &bull; {analysisResult.parametrosCalculados.velocidadSincrona_RPM} RPM
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Deslizamiento Nominal (s)</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {analysisResult.parametrosCalculados.deslizamiento_pct}%
                    </div>
                    <span className="text-[10px] text-slate-400 block">s = (ns - n) / ns</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Dimensionamiento de Arranque & Aparamenta */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      <Zap className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-white text-sm">
                      3. Dimensionamiento para Arranque: {analysisResult.dimensionamientoArranque.metodo}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4 text-xs font-mono">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Pico de Arranque Est. (Ia)</span>
                    <div className="text-xl font-extrabold text-rose-400 mt-1">
                      {analysisResult.dimensionamientoArranque.corrienteArranqueEstimada_A} A
                    </div>
                    <span className="text-[11px] text-slate-300 block">
                      ({analysisResult.dimensionamientoArranque.multiploIa_In} &times; In)
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Contactor AC-3 Calibre</span>
                    <div className="text-xl font-extrabold text-emerald-400 mt-1">
                      {analysisResult.dimensionamientoArranque.contactorPrincipalAC3_A} A
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {analysisResult.dimensionamientoArranque.modeloContactorSugerido}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Ajuste Protección Térmica</span>
                    <div className="text-sm font-bold text-amber-400 mt-1">
                      {analysisResult.dimensionamientoArranque.rangoAjusteTermico_A}
                    </div>
                    <span className="text-[10px] text-slate-400 block">Guardamotor o relé térmico</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Fusible Respaldo (aM)</span>
                    <div className="text-lg font-bold text-white mt-1">
                      {analysisResult.dimensionamientoArranque.fusiblesRespaldo_aM_A} A
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Sección Cable Sugerida</span>
                    <div className="text-lg font-bold text-sky-400 mt-1">
                      {analysisResult.dimensionamientoArranque.seccionCableSugerida_mm2} mm²
                    </div>
                    <span className="text-[10px] text-slate-400 block">Cobre aislado 70°C/90°C</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[10px] block uppercase">Par de Arranque</span>
                    <div className="text-lg font-bold text-white mt-1">
                      {analysisResult.dimensionamientoArranque.torqueArranqueEstimado_Nm} Nm
                    </div>
                  </div>
                </div>

                {/* Starting Schematic Diagram */}
                <div className="mt-5">
                  <StartingSchematic
                    method={analysisResult.dimensionamientoArranque.metodo}
                    inA={analysisResult.datosPlaca.corrienteNominalBase_A || 25}
                    iaA={analysisResult.dimensionamientoArranque.corrienteArranqueEstimada_A}
                  />
                </div>
              </div>

              {/* Card 4: Memoria Técnica Formal en Markdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-sm">
                      4. Memoria Técnica Formal (Informe de Ingeniería)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyMarkdown}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Reporte (PDF)</span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                  {analysisResult.memoriaTecnicaMarkdown}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
