
export interface CompanyData {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  idNumber: string;
  whatsapp?: string;
  sinpe?: string;
  iban?: string;
  bank?: string;
}

export interface OfferConditions {
  validezDias: number | string;
  tiempoEntrega: string;
  garantia: string;
  condicionesPago: string;
}

export interface FooterData {
  paymentMethods: {
    method: string;
    details: string;
  }[];
}

export interface ClientData {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}

export interface DocumentMetadata {
  proformaNumber: string;
  date: string;
  expiryDate: string;
  vendor: string;
}

export interface BudgetItem {
  id: string;
  code: string;
  quantity: number | string;
  description: string;
  unitPrice: number | string;
}

export interface BudgetConfig {
  discountPercent: number | string;
  taxPercent: number | string;
  currency: 'CRC' | 'USD';
  exchangeRate: number | string;
}

export interface CompleteBudget {
  metadata: DocumentMetadata;
  client: ClientData;
  items: BudgetItem[];
  config: BudgetConfig;
  offerConditions: OfferConditions;
  issuer: CompanyData;
  version: string;
}