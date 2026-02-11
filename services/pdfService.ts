
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyData, FooterData, ClientData, BudgetItem, BudgetConfig, DocumentMetadata, OfferConditions } from '../types';

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
  // Increased from 10 to 14 to fit more items by taking advantage of smaller row heights
  const itemsPerPage = 14; 
  const totalPages = Math.ceil(items.length / itemsPerPage);

  const isUSD = config.currency === 'USD';
  const displaySymbol = isUSD ? '$' : 'CRC '; 

  const formatCurrency = (num: number) => 
    num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const drawHeader = (pageNum: number) => {
    // Top Accent
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Logo
    try {
      if (issuer.logo && issuer.logo.startsWith('data:image')) {
        doc.addImage(issuer.logo, 'PNG', margin, 15, 25, 25);
      }
    } catch (e) {
      console.warn("Logo could not be added to PDF", e);
    }

    // Company Information (Issuer)
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

    // Document Details
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.setFont('helvetica', 'bold');
    doc.text('Presupuesto', pageWidth - margin, 20, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Proforma #: ${metadata.proformaNumber || '---'}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Pago: ${offerConditions.condicionesPago || 'Contado'}`, pageWidth - margin, 33, { align: 'right' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Emisión: ${metadata.date}`, pageWidth - margin, 38, { align: 'right' });
    doc.text(`Vence: ${metadata.expiryDate}`, pageWidth - margin, 43, { align: 'right' });
    doc.text(`Vendedor: ${metadata.vendor || '---'}`, pageWidth - margin, 48, { align: 'right' });

    // Client Info Box
    const boxY = 55;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), 35, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text('DIRIGIDO A:', margin + 5, boxY + 7);
    
    doc.text(client.companyName || 'Cliente Particular', margin + 5, boxY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Contacto: ${client.contactName || 'N/A'}`, margin + 5, boxY + 20);
    doc.text(`Tel: ${client.companyPhone || client.contactPhone || '-'}`, margin + 5, boxY + 25);
    doc.text(`Email: ${client.companyEmail || client.contactEmail || '-'}`, margin + 5, boxY + 30);

    const midX = pageWidth / 2 + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ATENCIÓN:', midX, boxY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Vigencia: ${offerConditions.validezDias || '---'} días naturales`, midX, boxY + 15);
    if (isUSD) {
      const formattedRate = Number(config.exchangeRate).toFixed(2);
      doc.text(`T. Cambio aplicado: CRC ${formattedRate}`, midX, boxY + 20);
    }
  };

  const drawFooter = (pageNum: number, totalPages: number, isLastPage: boolean) => {
    const footerY = pageHeight - 65;
    
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

    // Page Number bottom right
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
        qty.toString(),
        item.description,
        `${displaySymbol}${formatCurrency(price)}`,
        `${displaySymbol}${formatCurrency(rowTotal)}`
      ];
    });

    autoTable(doc, {
      startY: 100,
      head: [['#', 'Cant.', 'Descripción', `P. Unit (${config.currency})`, `Total (${config.currency})`]],
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
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 38, halign: 'right' },
        4: { cellWidth: 38, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        // Reduced from 4 to 2.5 to decrease row height and fit more items
        cellPadding: 2.5 
      }
    });

    drawFooter(i + 1, totalPages, i === totalPages - 1);
  }

  const blob = doc.output('bloburl');
  window.open(blob, '_blank');
};
