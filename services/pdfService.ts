
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyData, FooterData, ClientData, BudgetItem, BudgetConfig, DocumentMetadata, OfferConditions } from '../types';

/**
 * Convierte un número a su representación en letras (Español)
 */
const numeroALetras = (num: number, moneda: 'CRC' | 'USD'): string => {
  const Unidades = (num: number) => {
    switch (num) {
      case 1: return 'UN';
      case 2: return 'DOS';
      case 3: return 'TRES';
      case 4: return 'CUATRO';
      case 5: return 'CINCO';
      case 6: return 'SEIS';
      case 7: return 'SIETE';
      case 8: return 'OCHO';
      case 9: return 'NUEVE';
      default: return '';
    }
  };

  const Decenas = (num: number) => {
    const decena = Math.floor(num / 10);
    const unidad = num - (decena * 10);
    switch (decena) {
      case 1:
        switch (unidad) {
          case 0: return 'DIEZ';
          case 1: return 'ONCE';
          case 2: return 'DOCE';
          case 3: return 'TRECE';
          case 4: return 'CATORCE';
          case 5: return 'QUINCE';
          default: return 'DIECI' + Unidades(unidad);
        }
      case 2:
        if (unidad === 0) return 'VEINTE';
        return 'VEINTI' + Unidades(unidad);
      case 3: return DecenasY('TREINTA', unidad);
      case 4: return DecenasY('CUARENTA', unidad);
      case 5: return DecenasY('CINCUENTA', unidad);
      case 6: return DecenasY('SESENTA', unidad);
      case 7: return DecenasY('SETENTA', unidad);
      case 8: return DecenasY('OCHENTA', unidad);
      case 9: return DecenasY('NOVENTA', unidad);
      case 0: return Unidades(unidad);
      default: return '';
    }
  };

  const DecenasY = (strSin: string, numUnidad: number) => {
    if (numUnidad > 0) return strSin + ' Y ' + Unidades(numUnidad);
    return strSin;
  };

  const Centenas = (num: number) => {
    const centenas = Math.floor(num / 100);
    const decenas = num - (centenas * 100);
    switch (centenas) {
      case 1:
        if (decenas > 0) return 'CIENTO ' + Decenas(decenas);
        return 'CIEN';
      case 2: return 'DOSCIENTOS ' + Decenas(decenas);
      case 3: return 'TRESCIENTOS ' + Decenas(decenas);
      case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
      case 5: return 'QUINIENTOS ' + Decenas(decenas);
      case 6: return 'SEISCIENTOS ' + Decenas(decenas);
      case 7: return 'SETECIENTOS ' + Decenas(decenas);
      case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
      case 9: return 'NOVECIENTOS ' + Decenas(decenas);
      case 0: return Decenas(decenas);
      default: return '';
    }
  };

  const Miles = (num: number) => {
    const divisor = 1000;
    const miles = Math.floor(num / divisor);
    const resto = num % divisor;
    
    let strMiles = '';
    if (miles === 1) strMiles = 'MIL';
    else if (miles > 1) strMiles = Centenas(miles) + ' MIL';
    
    const strCentenas = Centenas(resto);
    if (strMiles === '') return strCentenas;
    if (strCentenas === '') return strMiles;
    return strMiles + ' ' + strCentenas;
  };

  const Millones = (num: number) => {
    const divisor = 1000000;
    const millones = Math.floor(num / divisor);
    const resto = num % divisor;
    
    let strMillones = '';
    if (millones === 1) strMillones = 'UN MILLON';
    else if (millones > 1) strMillones = Centenas(millones) + ' MILLONES';
    
    const strMiles = Miles(resto);
    if (strMillones === '') return strMiles;
    if (strMiles === '') return strMillones;
    return strMillones + ' ' + strMiles;
  };

  const entero = Math.floor(num);
  const decimales = Math.round((num - entero) * 100);
  const sufijoMoneda = moneda === 'USD' ? 'DÓLARES' : 'COLONES';
  
  let resultado = Millones(entero);
  if (entero === 0) resultado = 'CERO';
  
  return `${resultado} ${sufijoMoneda} CON ${decimales.toString().padStart(2, '0')}/100`;
};

export const generatePDF = async (
  issuer: CompanyData,
  footerConfig: FooterData,
  client: ClientData,
  items: BudgetItem[],
  config: BudgetConfig,
  metadata: DocumentMetadata,
  offerConditions: OfferConditions,
  totals: {
    subtotal: number;
    discountAmount: number;
    taxableAmount: number;
    taxAmount: number;
    total: number;
  }
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const itemsPerPage = 14; 
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const isUSD = config.currency === 'USD';
  const displaySymbol = isUSD ? '$' : 'CRC '; 

  // Ajustado a 'en-US' para miles con "," y decimales con "."
  const formatCurrency = (num: number) => 
    num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 5, 'F');

    try {
      if (issuer.logo && issuer.logo.startsWith('data:image')) {
        doc.addImage(issuer.logo, 'PNG', margin, 15, 25, 25);
      }
    } catch (e) {
      console.warn("Logo could not be added to PDF", e);
    }

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text(issuer.name, margin + 30, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Cédula: ${issuer.idNumber}`, margin + 30, 27);
    doc.text(`${issuer.address}`, margin + 30, 31);
    doc.text(`${issuer.phone} | ${issuer.email}`, margin + 30, 35);
    
    let socialText = issuer.website || '';
    if (issuer.whatsapp) socialText += ` | WA: ${issuer.whatsapp}`;
    doc.setFontSize(8);
    doc.text(socialText, margin + 30, 39);

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.text('Presupuesto', pageWidth - margin, 20, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Proforma #: ${metadata.proformaNumber || '---'}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Pago: ${offerConditions.condicionesPago || 'Contado'}`, pageWidth - margin, 33, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);

    const emissionVal = metadata.date;
    doc.setFont('helvetica', 'bold');
    doc.text('Emisión: ', pageWidth - margin - doc.getTextWidth(emissionVal), 38, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(emissionVal, pageWidth - margin, 38, { align: 'right' });

    const expiryVal = metadata.expiryDate;
    doc.setFont('helvetica', 'bold');
    doc.text('Vence: ', pageWidth - margin - doc.getTextWidth(expiryVal), 43, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(expiryVal, pageWidth - margin, 43, { align: 'right' });

    const vendorVal = metadata.vendor || '---';
    doc.setFont('helvetica', 'bold');
    doc.text('Vendedor: ', pageWidth - margin - doc.getTextWidth(vendorVal), 48, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(vendorVal, pageWidth - margin, 48, { align: 'right' });

    const boxY = 55;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), 35, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text('DIRIGIDO A:', margin + 5, boxY + 7);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente: ', margin + 5, boxY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(client.companyName || 'Cliente Particular', margin + 5 + doc.getTextWidth('Cliente: '), boxY + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Tel. Empresa: ', margin + 5, boxY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(client.companyPhone || 'N/A', margin + 5 + doc.getTextWidth('Tel. Empresa: '), boxY + 22);

    doc.setFont('helvetica', 'bold');
    doc.text('C. Cotizaciones: ', margin + 5, boxY + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(client.companyEmail || 'N/A', margin + 5 + doc.getTextWidth('C. Cotizaciones: '), boxY + 29);

    const midX = pageWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ATENCIÓN:', midX, boxY + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre: ', midX, boxY + 15);
    doc.setFont('helvetica', 'normal');
    doc.text(client.contactName || 'N/A', midX + doc.getTextWidth('Nombre: '), boxY + 15);

    doc.setFont('helvetica', 'bold');
    doc.text('Tel. ', midX, boxY + 22);
    doc.setFont('helvetica', 'normal');
    doc.text(client.contactPhone || 'N/A', midX + doc.getTextWidth('Tel. '), boxY + 22);

    doc.setFont('helvetica', 'bold');
    doc.text('Email: ', midX, boxY + 29);
    doc.setFont('helvetica', 'normal');
    doc.text(client.contactEmail || 'N/A', midX + doc.getTextWidth('Email: '), boxY + 29);
  };

  const drawFooter = (pageNum: number, totalPages: number, isLastPage: boolean) => {
    const footerY = pageHeight - 75;
    
    if (isLastPage) {
      const totalsX = pageWidth - margin - 85;
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Subtotal (${config.currency}):`, totalsX, footerY);
      doc.text(`${displaySymbol}${formatCurrency(totals.subtotal)}`, pageWidth - margin, footerY, { align: 'right' });
      
      doc.text(`Descuento (${Number(config.discountPercent) || 0}%):`, totalsX, footerY + 6);
      doc.text(`-${displaySymbol}${formatCurrency(totals.discountAmount)}`, pageWidth - margin, footerY + 6, { align: 'right' });
      
      doc.text(`Impuesto (${Number(config.taxPercent) || 0}%):`, totalsX, footerY + 12);
      doc.text(`${displaySymbol}${formatCurrency(totals.taxAmount)}`, pageWidth - margin, footerY + 12, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229);
      doc.text(`TOTAL ${config.currency}:`, totalsX, footerY + 22);
      doc.text(`${displaySymbol}${formatCurrency(totals.total)}`, pageWidth - margin, footerY + 22, { align: 'right' });

      // MONTO EN LETRAS
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const textoTotal = `TOTAL: ${numeroALetras(totals.total, config.currency)}`;
      doc.text(textoTotal, pageWidth - margin, footerY + 28, { align: 'right' });

      // TIPO DE CAMBIO
      if (isUSD) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const formattedRate = Number(config.exchangeRate).toFixed(2);
        doc.text(`T. Cambio: CRC ${formattedRate}`, pageWidth - margin, footerY + 33, { align: 'right' });
      }
    }

    const conditionsY = pageHeight - 35;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, conditionsY - 5, pageWidth - margin, conditionsY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'bold');
    doc.text('TÉRMINOS Y CONDICIONES:', margin, conditionsY);
    
    doc.setFont('helvetica', 'normal');
    const dynamicTerms = [
      `Vigencia del presupuesto: ${offerConditions.validezDias || 'N/A'} días naturales.`,
      `Tiempo estimado de entrega: ${offerConditions.tiempoEntrega || 'N/A'}.`,
      `Garantía ofrecida: ${offerConditions.garantia || 'N/A'}.`,
      `Condiciones de pago: ${offerConditions.condicionesPago || 'Contado'}.`,
      `Precios sujetos a cambios sin previo aviso.`
    ];

    dynamicTerms.forEach((term, i) => {
      doc.text(`• ${term}`, margin, conditionsY + 5 + (i * 4));
    });

    const paymentX = pageWidth / 2 + 5;
    doc.setFont('helvetica', 'bold');
    doc.text('MÉTODOS DE PAGO:', paymentX, conditionsY);
    doc.setFont('helvetica', 'normal');
    
    const paymentMethods = [
      { method: "SINPE", details: issuer.sinpe || "N/A" },
      { method: "Cuenta IBAN", details: issuer.iban || "N/A" },
      { method: "Banco", details: issuer.bank || "N/A" }
    ];

    paymentMethods.forEach((pm, i) => {
      doc.text(`${pm.method}: ${pm.details}`, paymentX, conditionsY + 5 + (i * 4));
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  const rate = Number(config.exchangeRate) || 1;

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) doc.addPage();
    
    drawHeader(i + 1);
    
    const startIndex = i * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
    const tableData = pageItems.map((item, idx) => {
      const qty = Number(item.quantity) || 0;
      const basePrice = Number(item.unitPrice) || 0;
      const price = isUSD ? basePrice / rate : basePrice;
      const rowTotal = qty * price;

      return [
        (startIndex + idx + 1).toString(),
        item.code || '',
        qty.toString(),
        item.description,
        `${displaySymbol}${formatCurrency(price)}`,
        `${displaySymbol}${formatCurrency(rowTotal)}`
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['#', 'Código', 'Cant.', 'Descripción', `P. Unit (${config.currency})`, `Total (${config.currency})`]],
      body: tableData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { 
        fillColor: [79, 70, 229], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 2.5 
      }
    });

    // Obtener la posición final de la tabla para agregar el texto "última línea"
    const finalY = (doc as any).lastAutoTable.finalY;
    
    if (i === totalPages - 1) {
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'italic');
      doc.text('--- última línea ---', pageWidth / 2, finalY + 5, { align: 'center' });
    }

    drawFooter(i + 1, totalPages, i === totalPages - 1);
  }

  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
};
