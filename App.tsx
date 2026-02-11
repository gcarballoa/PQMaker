
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, FileText, Download, Building2, User, Settings2, Share2, 
  Calendar, FileDigit, Image as ImageIcon, Gavel, CreditCard, RefreshCcw,
  ChevronDown, ChevronUp 
} from 'lucide-react';
import { ClientData, BudgetItem, BudgetConfig, CompanyData, DocumentMetadata, OfferConditions } from './types';
import { COMPANY_CONFIG, FOOTER_CONFIG } from './constants';
import { generatePDF } from './services/pdfService';

const CR_BANKS = [
  "Banco Nacional (BNCR)",
  "Banco de Costa Rica (BCR)",
  "BAC Credomatic",
  "Banco Popular",
  "Scotiabank",
  "Davivienda",
  "Banco Promerica",
  "Banco Lafise",
  "Banco General",
  "Banco Cathay",
  "Banco BCT"
];

const App: React.FC = () => {
  // Refs for focus management
  const addItemBtnRef = useRef<HTMLButtonElement>(null);

  // UI States for collapsible sections
  const [isIssuerExpanded, setIsIssuerExpanded] = useState(true);
  const [isDocMetadataExpanded, setIsDocMetadataExpanded] = useState(true);
  const [isClientExpanded, setIsClientExpanded] = useState(true);

  // Issuer State (The user's own business data)
  const [issuer, setIssuer] = useState<CompanyData>({ ...COMPANY_CONFIG });
  
  // Offer Conditions State
  const [offerConditions, setOfferConditions] = useState<OfferConditions>({
    validezDias: 30,
    tiempoEntrega: '3-5 días hábiles',
    garantia: '1 año contra defectos de fábrica',
    condicionesPago: 'Contado'
  });

  // Document Metadata State
  const [docMetadata, setDocMetadata] = useState<DocumentMetadata>(() => {
    const today = new Date();
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30);
    return {
      proformaNumber: '',
      date: today.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      vendor: ''
    };
  });

  // Effect to sync expiry date when validity days or emission date changes
  useEffect(() => {
    const emission = new Date(docMetadata.date);
    if (!isNaN(emission.getTime())) {
      const days = Number(offerConditions.validezDias) || 0;
      const expiry = new Date(emission);
      expiry.setDate(emission.getDate() + days);
      setDocMetadata(prev => ({ ...prev, expiryDate: expiry.toISOString().split('T')[0] }));
    }
  }, [offerConditions.validezDias, docMetadata.date]);

  // Client State
  const [client, setClient] = useState<ClientData>({
    companyName: '',
    companyPhone: '',
    companyEmail: '',
    contactName: '',
    contactPhone: '',
    contactEmail: ''
  });

  const [items, setItems] = useState<BudgetItem[]>([
    { id: crypto.randomUUID(), quantity: '', description: '', unitPrice: '' }
  ]);

  const [config, setConfig] = useState<BudgetConfig>({
    discountPercent: '',
    taxPercent: 13,
    currency: 'CRC',
    exchangeRate: 515.00 // Default placeholder
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIssuer(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { id: crypto.randomUUID(), quantity: '', description: '', unitPrice: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // Base calculations
  const rate = Number(config.exchangeRate) || 1;
  const isUSD = config.currency === 'USD';

  const subtotalBase = useMemo(() => {
    return items.reduce((acc, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return acc + (qty * price);
    }, 0);
  }, [items]);

  const displaySubtotal = isUSD ? subtotalBase / rate : subtotalBase;
  const discountVal = Number(config.discountPercent) || 0;
  const discountAmount = displaySubtotal * (discountVal / 100);
  const taxableAmount = displaySubtotal - discountAmount;
  const taxVal = Number(config.taxPercent) || 0;
  const taxAmount = taxableAmount * (taxVal / 100);
  const total = taxableAmount + taxAmount;

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      await generatePDF(issuer, FOOTER_CONFIG, client, items, config, docMetadata, offerConditions, {
        subtotal: displaySubtotal,
        discountAmount,
        taxableAmount,
        taxAmount,
        total
      });
    } catch (error) {
      console.error("PDF Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const symbol = isUSD ? '$' : '₡';
  const inputBaseClass = "w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900";

  return (
    <div className="min-h-screen pb-12 bg-gray-50">
      {/* Platform Branding Header */}
      <header className="bg-white border-b border-gray-200 py-6 mb-8 shadow-sm">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src={issuer.logo} alt="PresuMaker Logo" className="w-16 h-16 rounded shadow-sm object-cover" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">PresuMaker</h1>
              <p className="text-gray-500 text-sm">Generador de Presupuestos</p>
            </div>
          </div>
          <div className="text-right text-gray-600 text-sm hidden md:block">
            <p className="font-semibold">{issuer.name}</p>
            <p>{issuer.address}</p>
            <p>{issuer.phone} | {issuer.email}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl space-y-8">
        
        {/* Quick Actions Sticky Bar */}
        <div className="sticky top-4 z-20 flex justify-end mb-4">
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl scale-100 hover:scale-105 active:scale-95"
          >
            {isGenerating ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Download size={24} />
                GENERAR PDF ({config.currency})
              </>
            )}
          </button>
        </div>

        {/* Issuer Data Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b pb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Building2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Datos de Mi Empresa (Emisor)</h2>
            </div>
            <button 
              onClick={() => setIsIssuerExpanded(!isIssuerExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              title={isIssuerExpanded ? "Colapsar" : "Expandir"}
            >
              {isIssuerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {isIssuerExpanded && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-indigo-300 transition-colors bg-gray-50 cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <img src={issuer.logo} alt="Preview" className="w-32 h-32 object-cover rounded-lg mb-2 shadow-sm bg-white" />
                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm mb-2">
                      <ImageIcon size={14} /> CAMBIAR LOGO
                    </span>
                    <p className="text-[10px] text-gray-400 text-center leading-tight">
                      Formatos sugeridos: PNG, JPG.<br/>Dimensiones: 400x400px (1:1)
                    </p>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre Comercial</label>
                    <input type="text" className={inputBaseClass} value={issuer.name} onChange={(e) => setIssuer({ ...issuer, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cédula Física/Jurídica</label>
                    <input type="text" className={inputBaseClass} value={issuer.idNumber} onChange={(e) => setIssuer({ ...issuer, idNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono</label>
                    <input type="text" className={inputBaseClass} value={issuer.phone} onChange={(e) => setIssuer({ ...issuer, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
                    <input type="email" className={inputBaseClass} value={issuer.email} onChange={(e) => setIssuer({ ...issuer, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Sitio Web (URL)</label>
                    <input type="text" className={inputBaseClass} value={issuer.website} onChange={(e) => setIssuer({ ...issuer, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">WhatsApp</label>
                    <input type="text" placeholder="+506 ...." className={inputBaseClass} value={issuer.whatsapp} onChange={(e) => setIssuer({ ...issuer, whatsapp: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-indigo-500">
                  <CreditCard size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Métodos de Pago</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cuenta SINPE</label>
                    <input type="text" placeholder="Número de teléfono" className={inputBaseClass} value={issuer.sinpe} onChange={(e) => setIssuer({ ...issuer, sinpe: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Cuenta IBAN</label>
                    <input type="text" placeholder="CR00..." className={inputBaseClass} value={issuer.iban} onChange={(e) => setIssuer({ ...issuer, iban: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Banco</label>
                    <select className={inputBaseClass} value={issuer.bank} onChange={(e) => setIssuer({ ...issuer, bank: e.target.value })}>
                      <option value="" className="text-gray-900">Seleccione un banco</option>
                      {CR_BANKS.map(bank => <option key={bank} value={bank} className="text-gray-900">{bank}</option>)}
                      <option value="Otro" className="text-gray-900">Otro</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Document Metadata Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b pb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <FileDigit size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Información del Documento</h2>
            </div>
            <button 
              onClick={() => setIsDocMetadataExpanded(!isDocMetadataExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              title={isDocMetadataExpanded ? "Colapsar" : "Expandir"}
            >
              {isDocMetadataExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isDocMetadataExpanded && (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1"># Proforma</label>
                  <input type="text" placeholder="001-2025" className={`${inputBaseClass} font-bold text-indigo-700`} value={docMetadata.proformaNumber} onChange={(e) => setDocMetadata({ ...docMetadata, proformaNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fecha Emisión</label>
                  <input type="date" className={inputBaseClass} value={docMetadata.date} onChange={(e) => setDocMetadata({ ...docMetadata, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vencimiento (Auto)</label>
                  <input type="date" className="w-full px-4 py-2 rounded-lg border border-gray-100 bg-gray-50 outline-none text-gray-500 cursor-not-allowed" value={docMetadata.expiryDate} readOnly />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vendedor</label>
                  <input type="text" placeholder="Nombre del vendedor" className={inputBaseClass} value={docMetadata.vendor} onChange={(e) => setDocMetadata({ ...docMetadata, vendor: e.target.value })} />
                </div>
              </div>

              {/* Offer Conditions */}
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-indigo-500">
                  <Gavel size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Condiciones de la oferta</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Validez Presupuesto (Días)</label>
                    <input type="number" placeholder="Ej: 30" className={`${inputBaseClass} font-bold`} value={offerConditions.validezDias} onChange={(e) => setOfferConditions({ ...offerConditions, validezDias: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tiempo de Entrega</label>
                    <input type="text" placeholder="Ej: 3-5 días hábiles" className={inputBaseClass} value={offerConditions.tiempoEntrega} onChange={(e) => setOfferConditions({ ...offerConditions, tiempoEntrega: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vigencia de Garantía</label>
                    <input type="text" placeholder="Ej: 1 año" className={inputBaseClass} value={offerConditions.garantia} onChange={(e) => setOfferConditions({ ...offerConditions, garantia: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Condiciones de Pago</label>
                    <select 
                      className={inputBaseClass} 
                      value={offerConditions.condicionesPago} 
                      onChange={(e) => setOfferConditions({ ...offerConditions, condicionesPago: e.target.value })}
                    >
                      <option value="Contado">Contado</option>
                      <option value="Crédito">Crédito</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Client Data Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b pb-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Building2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Datos del Cliente</h2>
            </div>
            <button 
              onClick={() => setIsClientExpanded(!isClientExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
              title={isClientExpanded ? "Colapsar" : "Expandir"}
            >
              {isClientExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isClientExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Empresa Destino</label>
                  <input type="text" placeholder="Nombre de la empresa" className={inputBaseClass} value={client.companyName} onChange={(e) => setClient({ ...client, companyName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono Empresa</label>
                    <input type="text" placeholder="2222-3333" className={inputBaseClass} value={client.companyPhone} onChange={(e) => setClient({ ...client, companyPhone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Empresa</label>
                    <input type="email" placeholder="info@cliente.com" className={inputBaseClass} value={client.companyEmail} onChange={(e) => setClient({ ...client, companyEmail: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Persona de Contacto</label>
                  <input type="text" placeholder="Nombre del contacto" className={inputBaseClass} value={client.contactName} onChange={(e) => setClient({ ...client, contactName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Teléfono Contacto</label>
                    <input type="text" placeholder="8888-0000" className={inputBaseClass} value={client.contactPhone} onChange={(e) => setClient({ ...client, contactPhone: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Correo Contacto</label>
                    <input type="email" placeholder="contacto@cliente.com" className={inputBaseClass} value={client.contactEmail} onChange={(e) => setClient({ ...client, contactEmail: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Items Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="flex items-center gap-2 mb-6 border-b pb-4 text-indigo-600">
            <FileText size={20} />
            <h2 className="text-lg font-semibold uppercase tracking-tight">Ítems del Presupuesto</h2>
          </div>
          
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-3 w-10 text-center">#</th>
                <th className="pb-3 w-16">Cant.</th>
                <th className="pb-3">Descripción</th>
                <th className="pb-3 w-32 text-right">Precio Unit. (CRC)</th>
                <th className="pb-3 w-36 text-right">Total ({symbol})</th>
                <th className="pb-3 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unitPrice) || 0;
                const rowTotalBase = qty * price;
                const displayRowTotal = isUSD ? rowTotalBase / rate : rowTotalBase;
                const isLastItem = index === items.length - 1;

                return (
                  <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-2 text-xs text-gray-400 font-bold text-center">{index + 1}</td>
                    <td className="py-2">
                      <input type="number" placeholder="0" className="w-full px-2 py-1.5 rounded border border-gray-200 focus:border-indigo-500 outline-none text-center bg-white text-gray-900 text-sm" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="py-2">
                      <input type="text" placeholder="Descripción del producto o servicio" className="w-full px-2 py-1.5 rounded border border-gray-200 focus:border-indigo-500 outline-none bg-white text-gray-900 text-sm" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                    </td>
                    <td className="py-2">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-full text-right px-2 py-1.5 rounded border border-gray-200 focus:border-indigo-500 outline-none bg-white text-gray-900 text-sm" 
                        value={item.unitPrice} 
                        onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)}
                        onKeyDown={(e) => {
                          if (isLastItem && (e.key === 'Tab' || e.key === 'Enter')) {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addItemBtnRef.current?.focus();
                            }
                          }
                        }}
                      />
                    </td>
                    <td className="py-2 text-right font-bold text-gray-700 text-sm">
                      {symbol}{displayRowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-center">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors" disabled={items.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="flex justify-end mt-4 border-t pt-4">
            <button 
              ref={addItemBtnRef}
              onClick={handleAddItem} 
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all font-bold text-sm shadow-sm border border-indigo-100 active:scale-95"
            >
              <Plus size={18} />
              AGREGAR ÍTEM
            </button>
          </div>

          <p className="mt-6 text-[10px] text-gray-400 italic">
            * Nota: Ingrese los precios unitarios en colones (CRC). El sistema los convertirá automáticamente si selecciona USD en los Ajustes Finales.
          </p>
        </section>

        {/* Config & Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-12">
          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6 text-indigo-600 border-b pb-4">
              <Settings2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Ajustes Finales</h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descuento (%)</label>
                  <input type="number" placeholder="0" className={inputBaseClass} value={config.discountPercent} onChange={(e) => setConfig({ ...config, discountPercent: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">IVA / Impuesto (%)</label>
                  <input type="number" placeholder="0" className={inputBaseClass} value={config.taxPercent} onChange={(e) => setConfig({ ...config, taxPercent: e.target.value })} />
                </div>
              </div>

              {/* Currency Settings */}
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-3 text-indigo-700">
                  <RefreshCcw size={16} />
                  <span className="text-xs font-bold uppercase">Configuración de Moneda</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Moneda Destino</label>
                    <div className="flex rounded-lg overflow-hidden border border-indigo-200">
                      <button 
                        onClick={() => setConfig({ ...config, currency: 'CRC' })}
                        className={`flex-1 py-1 text-xs font-bold transition-colors ${!isUSD ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        CRC (₡)
                      </button>
                      <button 
                        onClick={() => setConfig({ ...config, currency: 'USD' })}
                        className={`flex-1 py-1 text-xs font-bold transition-colors ${isUSD ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>
                  {isUSD && (
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Tipo de Cambio (₡)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="w-full px-3 py-1 text-xs rounded border border-indigo-200 focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-bold text-indigo-800"
                        value={config.exchangeRate} 
                        onChange={(e) => setConfig({ ...config, exchangeRate: e.target.value })} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-indigo-900 p-8 rounded-xl shadow-xl text-white">
            <h2 className="text-xl font-bold mb-6 border-b border-indigo-800 pb-4">Resumen del Total ({config.currency})</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-indigo-200">
                <span className="font-medium">Subtotal</span>
                <span>{symbol}{displaySubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span className="font-medium">Descuento ({Number(config.discountPercent) || 0}%)</span>
                <span>-{symbol}{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-indigo-200">
                <span className="font-medium">Impuesto ({Number(config.taxPercent) || 0}%)</span>
                <span>{symbol}{taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="pt-6 border-t border-indigo-800 flex justify-between items-center">
              <span className="text-lg font-bold">TOTAL NETO</span>
              <span className="text-3xl font-black">{symbol}{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            
            <button onClick={handleGeneratePDF} disabled={isGenerating} className="w-full mt-8 flex items-center justify-center gap-3 py-4 bg-white text-indigo-900 rounded-xl font-black hover:bg-indigo-50 transition-colors disabled:opacity-50 shadow-lg">
              {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-indigo-900 border-t-transparent rounded-full" /> : <><Download size={20} />Confirmar y Generar PDF</>}
            </button>
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 py-10 bg-white">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p className="font-bold text-indigo-600">PresuMaker Platform</p>
          <p className="mt-1">© {new Date().getFullYear()} CarbaTK Soluciones. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
