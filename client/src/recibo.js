import { jsPDF } from 'jspdf';
import { dinero, fecha, hora } from './api.js';

/**
 * Genera y descarga el comprobante en PDF con formato de ticket de restaurante (80 mm).
 * @param {object} pedido Datos del pedido (id, mesa, nombre, meseroNombre, items, total, creadoEn, cobradoEn)
 * @param {object} opciones { esPrecuenta: boolean, autoDescargar: boolean }
 */
export function generarReciboPdf(pedido, { esPrecuenta = false, autoDescargar = true } = {}) {
  const items = pedido.items ?? [];
  const total = Number(pedido.total ?? items.reduce((s, i) => s + (i.cant * (i.precio ?? i.precio_unitario ?? 0)), 0));

  // Calcula la altura necesaria para que todo el contenido quepa cómodamente
  let extraLineas = 0;
  for (const it of items) {
    if (it.nota) extraLineas += 1;
    if ((it.nombre ?? '').length > 22) extraLineas += 1;
  }
  const alto = Math.max(130, 85 + (items.length * 6) + (extraLineas * 4));

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, alto],
  });

  // Encabezado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("TA'LITO", 40, 10, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Restaurante & Comida Típica', 40, 14, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(
    esPrecuenta ? '*** PRE-CUENTA INFORMATIVA ***' : 'COMPROBANTE DE CONSUMO',
    40,
    18,
    { align: 'center' }
  );

  // Línea divisoria
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, 21, 75, 21);

  // Datos del pedido
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let y = 25;
  doc.text(`Ticket: #${pedido.id}`, 5, y);
  const stamp = pedido.cobradoEn || pedido.creadoEn || new Date().toISOString();
  doc.text(`Fecha: ${fecha(stamp)} ${hora(stamp)}`, 40, y);
  
  y += 4.5;
  doc.text(`Mesa: ${pedido.mesa}`, 5, y);
  doc.text(`Cliente: ${(pedido.nombre || 'Cliente').slice(0, 18)}`, 35, y);

  y += 4.5;
  doc.text(`Mesero: ${pedido.meseroNombre || 'Sin asignar'}`, 5, y);

  // Encabezado de la tabla de platillos
  y += 4;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);

  y += 3.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Cant', 5, y);
  doc.text('Descripción', 16, y);
  doc.text('Total', 75, y, { align: 'right' });

  y += 1.5;
  doc.line(5, y, 75, y);
  y += 4;

  // Renglones de platillos
  doc.setFont('helvetica', 'normal');
  for (const it of items) {
    const cant = it.cant ?? it.cantidad ?? 1;
    const precioUnit = Number(it.precio ?? it.precio_unitario ?? 0);
    const sub = cant * precioUnit;
    const nombre = (it.nombre ?? '').slice(0, 26);

    doc.text(String(cant), 6, y);
    doc.text(nombre, 16, y);
    doc.text(dinero(sub), 75, y, { align: 'right' });

    if (it.nota) {
      y += 3.5;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text(`* ${it.nota.slice(0, 32)}`, 18, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
    }

    y += 4.5;
  }

  // Línea divisoria y total
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL A PAGAR:', 5, y);
  doc.text(dinero(total), 75, y, { align: 'right' });

  y += 6;
  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, y, 75, y);

  // Pie de ticket
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    esPrecuenta
      ? 'Pide tu cuenta en caja o con tu mesero.'
      : '¡Gracias por su visita! Vuelva pronto.',
    40,
    y,
    { align: 'center' }
  );

  y += 3.5;
  doc.text('TA\'LITO - Sabor salvadoreño', 40, y, { align: 'center' });

  const nombreArchivo = `${esPrecuenta ? 'Precuenta' : 'Recibo'}-Talito-Mesa-${pedido.mesa}-#${pedido.id}.pdf`;
  if (autoDescargar) {
    doc.save(nombreArchivo);
  }

  return { doc, nombreArchivo };
}

