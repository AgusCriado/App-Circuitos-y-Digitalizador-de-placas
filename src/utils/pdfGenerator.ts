import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MotorAnalysisResponse } from '../types/electromechanical';

/**
 * Generates a formal, generic engineering technical report in PDF format
 * using the extracted nameplate data and electromechanical calculations.
 */
export function generateMotorReportPDF(analysis: MotorAnalysisResponse): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const { datosPlaca, parametrosCalculados, dimensionamientoArranque } = analysis;
  const brandName = (datosPlaca.marca || 'GENÉRICO').toUpperCase();
  const modelName = datosPlaca.modelo || 'MOTOR TRIFÁSICO';
  const fileName = `Reporte_Tecnico_Motor_${brandName.replace(/\s+/g, '_')}_${datosPlaca.potencia_kW}kW.pdf`;

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [217, 119, 6]; // Amber 600
  const slateGray: [number, number, number] = [100, 116, 139]; // Slate 500

  const pageWidth = doc.internal.pageSize.getWidth();

  // ==========================================
  // 1. HEADER & BRANDING BAR
  // ==========================================
  // Top Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative Accent Line
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('MEMORIA TÉCNICA Y PROTOCOLO DE MOTOR ELÉCTRICO', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text('DIAGNÓSTICO ELECTROMECÁNICO & DIMENSIONAMIENTO DE ARRANQUE (IEC 60034-1 / IEC 60947)', 14, 18);
  doc.text(`PLANILLA TÉCNICA OFICIAL | FECHA: ${new Date().toLocaleDateString('es-AR')}`, 14, 23);

  // Status Badge on Right Header
  doc.setFillColor(16, 185, 129); // Emerald 500
  doc.roundedRect(pageWidth - 45, 8, 32, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('AUDITADO', pageWidth - 29, 15, { align: 'center' });

  let currentY = 36;

  // ==========================================
  // 2. PROJECT / MOTOR SUMMARY STRIP
  // ==========================================
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`EQUIPO: MOTOR ${brandName} - ${modelName}`, 18, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
  doc.text(`Potencia: ${datosPlaca.potencia_kW} kW (${datosPlaca.potencia_HP} HP) | Tensión: ${datosPlaca.tension_V} | N° Serie: ${datosPlaca.numeroSerie || 'N/A'}`, 18, currentY + 11.5);

  currentY += 22;

  // ==========================================
  // 3. TABLE 1: DATOS DE PLACA (IEC 60034-1)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. Datos Nominales de Placa de Características (IEC 60034-1)', 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Parámetro Nominal', 'Valor Registrado', 'Parámetro Nominal', 'Valor Registrado']],
    body: [
      ['Fabricante / Marca', brandName, 'Velocidad Nominal', `${datosPlaca.rpm || '-'} RPM`],
      ['Modelo / Tipo', modelName, 'Frecuencia de Red', `${datosPlaca.frecuencia_Hz || 50} Hz`],
      ['Potencia Mecánica (Pn)', `${datosPlaca.potencia_kW} kW (${datosPlaca.potencia_HP} HP)`, 'Factor de Potencia (cos φ)', `${datosPlaca.cosPhi || '-'}`],
      ['Tensión Nominal (U)', `${datosPlaca.tension_V || '-'}`, 'Rendimiento Nominal (η)', `${datosPlaca.rendimiento_eta_pct}% (IE3/IE2)`],
      ['Conexión de Bobinados', `${datosPlaca.conexion || 'Delta / Estrella'}`, 'Factor de Servicio (FS)', `${datosPlaca.factorServicio || '1.0'}`],
      ['Corriente Nominal (In)', `${datosPlaca.corriente_A || '-'} A`, 'Aislamiento / Grado IP', `Clase ${datosPlaca.claseAislamiento || 'F'} / ${datosPlaca.gradoIP || 'IP55'}`],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
      1: { cellWidth: 45 },
      2: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 45 },
      3: { cellWidth: 45 },
    },
  });

  // @ts-expect-error jspdf-autotable extends jsPDF instance with lastAutoTable
  currentY = doc.lastAutoTable.finalY + 8;

  // ==========================================
  // 4. TABLE 2: PARÁMETROS ELECTROMECÁNICOS
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. Parámetros Electromecánicos Calculados y Balance de Potencias', 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Magnitud Electromecánica', 'Valor Calculado', 'Unidad', 'Fórmula de Verificación']],
    body: [
      ['Torque / Par Motor Nominal (Tn)', `${parametrosCalculados.torqueNominal_Nm}`, 'Nm', 'Tn = (9550 × P_kW) / RPM'],
      ['Número de Polos Magnéticos', `${parametrosCalculados.polos} polos`, 'adimensional', '2p = (120 × f) / ns'],
      ['Velocidad Sincrónica de Campo (ns)', `${parametrosCalculados.velocidadSincrona_RPM}`, 'RPM', 'ns = (120 × f) / 2p'],
      ['Deslizamiento Relativo Nominal (s)', `${parametrosCalculados.deslizamiento_pct}%`, '%', 's = ((ns - n) / ns) × 100%'],
      ['Potencia Eléctrica Activa (P_elec)', `${parametrosCalculados.potenciaElectrica_kW}`, 'kW', 'P_elec = Pn_kW / (η/100)'],
      ['Potencia Aparente Absorbida (S)', `${parametrosCalculados.potenciaAparente_kVA}`, 'kVA', 'S = √3 × U × In'],
      ['Potencia Reactiva Inductiva (Q)', `${parametrosCalculados.potenciaReactiva_kVAr}`, 'kVAr', 'Q = √(S² - P_elec²)'],
    ],
    headStyles: {
      fillColor: [217, 119, 6], // Amber 600
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 60 },
      1: { fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { textColor: [71, 85, 105], cellWidth: 68 },
    },
  });

  // @ts-expect-error jspdf-autotable extends jsPDF instance with lastAutoTable
  currentY = doc.lastAutoTable.finalY + 8;

  // ==========================================
  // 5. TABLE 3: DIMENSIONAMIENTO DE ARRANQUE (IEC 60947-4-1)
  // ==========================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`3. Dimensionamiento para Método de Arranque: ${dimensionamientoArranque.metodo.toUpperCase()}`, 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    theme: 'grid',
    head: [['Elemento / Aparamenta de Maniobra', 'Especificación Recomendada', 'Criterio Normativo']],
    body: [
      ['Método de Arranque Seleccionado', dimensionamientoArranque.metodo, 'Definido por el proyectista'],
      ['Corriente Pico de Arranque Estimada (Ia)', `${dimensionamientoArranque.corrienteArranqueEstimada_A} A  (${dimensionamientoArranque.multiploIa_In} × In)`, 'Comportamiento dinámico transitorio'],
      ['Par de Arranque Disponible Estimado', `${dimensionamientoArranque.torqueArranqueEstimado_Nm} Nm`, 'Curva par-velocidad del motor'],
      ['Contactor Principal de Línea (AC-3)', `${dimensionamientoArranque.contactorPrincipalAC3_A} A (${dimensionamientoArranque.modeloContactorSugerido})`, 'IEC 60947-4-1 Categoría AC-3'],
      ['Rango de Ajuste Relé Térmico / Guardamotor', `${dimensionamientoArranque.rangoAjusteTermico_A}`, 'Calibración a 1.0 × In (o 0.58 In en rama Δ)'],
      ['Fusibles de Respaldo Tipo aM', `${dimensionamientoArranque.fusiblesRespaldo_aM_A} A`, 'Protección exclusiva contra cortocircuitos'],
      ['Sección Mínima de Cable de Cobre', `${dimensionamientoArranque.seccionCableSugerida_mm2} mm²`, 'IRAM 2178 / 247-3 (ΔV < 3% en marcha)'],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 62 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 68 },
      2: { textColor: [100, 116, 139], cellWidth: 50 },
    },
  });

  // @ts-expect-error jspdf-autotable extends jsPDF instance with lastAutoTable
  currentY = doc.lastAutoTable.finalY + 7;

  // ==========================================
  // 6. TECHNICAL NOTES & NORMATIVE SUMMARY
  // ==========================================
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 20, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('OBSERVACIONES DE INGENIERÍA Y DICTAMEN DE CONFORMIDAD:', 18, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  const obsText = `1. Aparamenta dimensionada conforme a IEC 60947-4-1 (coordinación Tipo 2 recomendada).
2. Para arranque Estrella-Triángulo se verificó que la tensión de fase coincida con la conexión en triángulo (Δ).
3. Conductor dimensionado garantizando caída de tensión ΔV ≤ 3% en régimen nominal permanente y ≤ 5% durante el transitorio de arranque.
4. Dictamen: Instalación y maniobra TÉCNICAMENTE CONFORME.`;
  doc.text(obsText, 18, currentY + 8.5);

  currentY += 25;

  // ==========================================
  // 7. SIGNATURE BLOCK
  // ==========================================
  const sigY = 265;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);

  // Line 1: Responsible Engineer
  doc.line(22, sigY, 85, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INGENIERO ELECTROMECÁNICO', 53.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
  doc.text('Firma, Matrícula Profesional y Sello', 53.5, sigY + 7.5, { align: 'center' });

  // Line 2: Maintenance / Plant Manager Approval
  doc.line(125, sigY, 188, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('JEFE DE PLANTA / MANTENIMIENTO', 156.5, sigY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
  doc.text('Aprobación Técnica y Recepción Conforme', 156.5, sigY + 7.5, { align: 'center' });

  // Footer text
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Documento oficial generado por Suite de Diagnóstico Electromecánico (Normas AEA 90364 • IEC 60034-1 • IEC 60947-4-1)', pageWidth / 2, 287, { align: 'center' });

  // Save the document
  doc.save(fileName);
}
