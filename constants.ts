
import { CompanyData, FooterData } from './types';

export const COMPANY_CONFIG: CompanyData = {
  name: "CarbaTK Soluciones",
  address: "San José, Costa Rica",
  phone: "+506 6274-8990",
  email: "info@carbatk.com",
  website: "www.carbatk.com",
  idNumber: "109240206",
  logo: "https://picsum.photos/id/2/200/200",
  whatsapp: "+506 6274-8990",
  sinpe: "6274-8990",
  iban: "",
  bank: ""
};

export const FOOTER_CONFIG: FooterData = {
  paymentMethods: [] // No longer used, handled dynamically in PDF service
};
