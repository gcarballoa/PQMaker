
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, FileText, Download, Building2, User, Settings2, Share2, 
  Calendar, FileDigit, Image as ImageIcon, Gavel, CreditCard, RefreshCcw,
  ChevronDown, ChevronUp, AlertCircle, LogOut, Lock, User as UserIcon,
  Users, ShieldCheck, UserPlus
} from 'lucide-react';
import { ClientData, BudgetItem, BudgetConfig, CompanyData, DocumentMetadata, OfferConditions } from './types';
import { COMPANY_CONFIG, FOOTER_CONFIG } from './constants';
import { VALID_CREDENTIALS, UserCredential, UserRole } from './credentials';
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
  // Users List State (initialized with default credentials)
  const [systemUsers, setSystemUsers] = useState<UserCredential[]>(() => {
    const saved = localStorage.getItem('pqmaker_users');
    return saved ? JSON.parse(saved) : VALID_CREDENTIALS;
  });

  // Persist users to localStorage
  useEffect(() => {
    localStorage.setItem('pqmaker_users', JSON.stringify(systemUsers));
  }, [systemUsers]);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserCredential | null>(() => {
    const saved = sessionStorage.getItem('pqmaker_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const isAuthenticated = !!currentUser;
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState(false);

  // New User Form State (Admin only)
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'operador' as UserRole });
  const [isUsersExpanded, setIsUsersExpanded] = useState(false);

  // Refs for focus management
  const addItemBtnRef = useRef<HTMLButtonElement>(null);

  // UI States for collapsible sections
  const [isIssuerExpanded, setIsIssuerExpanded] = useState(true);
  const [isDocMetadataExpanded, setIsDocMetadataExpanded] = useState(true);
  const [isClientExpanded, setIsClientExpanded] = useState(true);

  // Issuer State
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

  // Phone Formatter Utility
  const formatPhone = (val: string) => {
    if (!val) return '';
    const isPlus = val.trim().startsWith('+');
    const digits = val.replace(/\D/g, '');
    if (digits.length === 0) return isPlus ? '+' : '';
    let prefix = '';
    let rest = '';
    if (isPlus) {
      prefix = digits.substring(0, 3);
      rest = digits.substring(3);
    } else {
      prefix = '506';
      rest = digits;
    }
    let result = `+${prefix}`;
    if (rest.length > 0) {
      result += ' ' + rest.substring(0, 4);
      const others = rest.substring(4);
      for (let i = 0; i < others.length; i += 4) {
        result += '-' + others.substring(i, i + 4);
      }
    }
    return result;
  };

  // IBAN Formatter Utility
  const formatIBAN = (val: string) => {
    if (!val) return '';
    let digits = val.toUpperCase().replace(/[^0-9]/g, '');
    digits = digits.slice(0, 17);
    return 'CR' + digits;
  };

  // Email Validation Utility
  const isValidEmail = (email: string) => {
    if (!email) return true;
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    return emailRegex.test(email);
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const userMatch = systemUsers.find(
      c => c.username === loginUser && c.password === loginPass
    );
    if (userMatch) {
      setCurrentUser(userMatch);
      setLoginError(false);
      sessionStorage.setItem('pqmaker_current_user', JSON.stringify(userMatch));
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('pqmaker_current_user');
    setLoginUser('');
    setLoginPass('');
  };

  // Admin User Management
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    if (systemUsers.find(u => u.username === newUser.username)) {
      alert("El nombre de usuario ya existe.");
      return;
    }

    setSystemUsers([...systemUsers, { ...newUser }]);
    setNewUser({ username: '', password: '', role: 'operador' });
    alert("Usuario creado exitosamente.");
  };

  const handleDeleteUser = (username: string) => {
    if (username === currentUser?.username) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    if (window.confirm(`¿Seguro que deseas eliminar al usuario ${username}?`)) {
      setSystemUsers(systemUsers.filter(u => u.username !== username));
    }
  };

  // Effect to sync expiry date
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
    { id: crypto.randomUUID(), code: '', quantity: '', description: '', unitPrice: '' }
  ]);

  const [config, setConfig] = useState<BudgetConfig>({
    discountPercent: '',
    taxPercent: 13,
    currency: 'CRC',
    exchangeRate: 515.00 
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
    setItems([...items, { id: crypto.randomUUID(), code: '', quantity: '', description: '', unitPrice: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

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

  const isFormValid = useMemo(() => {
    return (
      isValidEmail(issuer.email) &&
      isValidEmail(client.companyEmail) &&
      isValidEmail(client.contactEmail)
    );
  }, [issuer.email, client.companyEmail, client.contactEmail]);

  const handleGeneratePDF = async () => {
    if (!isFormValid) {
      alert("Por favor corrija los correos electrónicos antes de generar el PDF.");
      return;
    }
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
  const inputBaseClass = "w-full px-4 py-2 rounded-lg border focus:ring-2 outline-none transition-all bg-white text-gray-900";
  const emailInputClass = (val: string) => `${inputBaseClass} ${
    !isValidEmail(val) 
      ? "border-red-500 focus:ring-red-200 focus:border-red-600 bg-red-50" 
      : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
  }`;

  // Auth View
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-500">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-800 transition-all duration-300">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-600 dark:bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
              <FileText className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-white">PQMaker</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Ingreso al Sistema</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider">Usuario</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                  type="text" 
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" 
                  placeholder="admin"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" 
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-bold animate-shake">
                <AlertCircle size={18} />
                Credenciales incorrectas
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-black text-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-[0.98]"
            >
              INGRESAR
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 dark:text-gray-600 text-xs font-medium">© {new Date().getFullYear()} CarbaTK Soluciones</p>
          </div>
        </div>
      </div>
    );
  }

  // Main App View
  return (
    <div className="min-h-screen pb-12 bg-gray-50 dark:bg-gray-950 transition-colors duration-500">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-6 mb-8 shadow-sm">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <img src={issuer.logo} alt="PQMaker Logo" className="w-16 h-16 rounded shadow-sm object-cover" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">PQMaker</h1>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase rounded-full tracking-wider border border-indigo-200 dark:border-indigo-800">
                  {currentUser?.role}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Hola, <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser?.username}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right text-gray-600 dark:text-gray-400 text-sm hidden lg:block">
              <p className="font-semibold">{issuer.name}</p>
              <p>{issuer.address}</p>
              <p>{issuer.phone} | {issuer.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
            >
              <LogOut size={18} />
              SALIR
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-5xl space-y-8">
        <div className="sticky top-4 z-20 flex justify-end mb-4">
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || !isFormValid}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-black hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-xl scale-100 hover:scale-105 active:scale-95"
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

        {/* User Management Section (ADMIN ONLY) */}
        {currentUser?.role === 'administrador' && (
          <section className="bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-indigo-200 dark:border-indigo-900/50 pb-4">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Users size={20} />
                <h2 className="text-lg font-bold uppercase tracking-tight">Gestión de Usuarios</h2>
              </div>
              <button 
                onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors text-indigo-400"
              >
                {isUsersExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {isUsersExpanded && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Create User Form */}
                  <form onSubmit={handleCreateUser} className="space-y-4 bg-white dark:bg-gray-900 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400">
                      <UserPlus size={18} />
                      <h3 className="text-sm font-black uppercase">Nuevo Usuario</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Usuario</label>
                        <input 
                          type="text" 
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                          value={newUser.username}
                          onChange={e => setNewUser({...newUser, username: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Contraseña</label>
                        <input 
                          type="password" 
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                          value={newUser.password}
                          onChange={e => setNewUser({...newUser, password: e.target.value})}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rol de Acceso</label>
                        <select 
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                        >
                          <option value="operador">Operador (Solo generación)</option>
                          <option value="administrador">Administrador (Control total)</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md">
                      CREAR USUARIO
                    </button>
                  </form>

                  {/* Users Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-[10px] font-black text-indigo-400 uppercase border-b border-indigo-100 dark:border-indigo-900/30">
                        <tr>
                          <th className="pb-2">Usuario</th>
                          <th className="pb-2">Rol</th>
                          <th className="pb-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-50 dark:divide-indigo-900/20">
                        {systemUsers.map(u => (
                          <tr key={u.username} className="group">
                            <td className="py-2 text-gray-700 dark:text-gray-300 font-bold">{u.username}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${u.role === 'administrador' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-2 text-right">
                              <button 
                                onClick={() => handleDeleteUser(u.username)}
                                disabled={u.username === currentUser?.username}
                                className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-0"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Existing Sections Updated */}
        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Building2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Datos de Mi Empresa (Emisor)</h2>
            </div>
            <button 
              onClick={() => setIsIssuerExpanded(!isIssuerExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500"
            >
              {isIssuerExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {isIssuerExpanded && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800/50 cursor-pointer relative">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <img src={issuer.logo} alt="Preview" className="w-32 h-32 object-cover rounded-lg mb-2 shadow-sm bg-white dark:bg-gray-800" />
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-sm mb-2">
                      <ImageIcon size={14} /> CAMBIAR LOGO
                    </span>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Nombre Comercial</label>
                    <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.name} onChange={(e) => setIssuer({ ...issuer, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Cédula Física/Jurídica</label>
                    <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.idNumber} onChange={(e) => setIssuer({ ...issuer, idNumber: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Teléfono</label>
                    <input type="text" placeholder="+506 0000-0000" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.phone} onChange={(e) => setIssuer({ ...issuer, phone: formatPhone(e.target.value) })} />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Correo Electrónico</label>
                      {!isValidEmail(issuer.email) && <span className="text-[10px] text-red-600 dark:text-red-400 font-bold animate-pulse">Email inválido</span>}
                    </div>
                    <input 
                      type="email" 
                      placeholder="correo@empresa.com"
                      className={`${emailInputClass(issuer.email)} dark:bg-gray-800 dark:text-white dark:border-gray-700`} 
                      value={issuer.email} 
                      onChange={(e) => setIssuer({ ...issuer, email: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Sitio Web (URL)</label>
                    <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.website} onChange={(e) => setIssuer({ ...issuer, website: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">WhatsApp</label>
                    <input type="text" placeholder="+506 0000-0000" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.whatsapp} onChange={(e) => setIssuer({ ...issuer, whatsapp: formatPhone(e.target.value) })} />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-4 text-indigo-500 dark:text-indigo-400">
                  <CreditCard size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Métodos de Pago</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Cuenta SINPE</label>
                    <input type="text" placeholder="+506 0000-0000" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.sinpe} onChange={(e) => setIssuer({ ...issuer, sinpe: formatPhone(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Cuenta IBAN</label>
                    <input type="text" placeholder="CR + 17 dígitos" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.iban} onChange={(e) => setIssuer({ ...issuer, iban: formatIBAN(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Banco</label>
                    <select className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={issuer.bank} onChange={(e) => setIssuer({ ...issuer, bank: e.target.value })}>
                      <option value="">Seleccione un banco</option>
                      {CR_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <FileDigit size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Información del Documento</h2>
            </div>
            <button onClick={() => setIsDocMetadataExpanded(!isDocMetadataExpanded)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500">
              {isDocMetadataExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isDocMetadataExpanded && (
            <div className="animate-in fade-in duration-300 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1"># Proforma</label>
                  <input type="text" placeholder="001-2025" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-indigo-300 focus:ring-indigo-500 font-bold`} value={docMetadata.proformaNumber} onChange={(e) => setDocMetadata({ ...docMetadata, proformaNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Fecha Emisión</label>
                  <input type="date" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={docMetadata.date} onChange={(e) => setDocMetadata({ ...docMetadata, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Vencimiento (Auto)</label>
                  <input type="date" className="w-full px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 outline-none text-gray-500 dark:text-gray-600 cursor-not-allowed" value={docMetadata.expiryDate} readOnly />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Vendedor</label>
                  <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={docMetadata.vendor} onChange={(e) => setDocMetadata({ ...docMetadata, vendor: e.target.value })} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4 border-b dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Building2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Datos del Cliente</h2>
            </div>
            <button onClick={() => setIsClientExpanded(!isClientExpanded)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500">
              {isClientExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {isClientExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Empresa Destino</label>
                  <input type="text" placeholder="Nombre de la empresa" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={client.companyName} onChange={(e) => setClient({ ...client, companyName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Teléfono Empresa</label>
                    <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={client.companyPhone} onChange={(e) => setClient({ ...client, companyPhone: formatPhone(e.target.value) })} />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Correo Empresa</label>
                      {!isValidEmail(client.companyEmail) && <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">Invalido</span>}
                    </div>
                    <input type="email" className={emailInputClass(client.companyEmail)} value={client.companyEmail} onChange={(e) => setClient({ ...client, companyEmail: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Contacto</label>
                  <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={client.contactName} onChange={(e) => setClient({ ...client, contactName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Teléfono Contacto</label>
                    <input type="text" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={client.contactPhone} onChange={(e) => setClient({ ...client, contactPhone: formatPhone(e.target.value) })} />
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Correo Contacto</label>
                      {!isValidEmail(client.contactEmail) && <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">Invalido</span>}
                    </div>
                    <input type="email" className={emailInputClass(client.contactEmail)} value={client.contactEmail} onChange={(e) => setClient({ ...client, contactEmail: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto">
          <div className="flex items-center gap-2 mb-6 border-b dark:border-gray-800 pb-4 text-indigo-600 dark:text-indigo-400">
            <FileText size={20} />
            <h2 className="text-lg font-semibold uppercase tracking-tight">Ítems del Presupuesto</h2>
          </div>
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="text-left text-xs font-bold text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-800">
                <th className="pb-3 w-10 text-center">#</th>
                <th className="pb-3 w-24">Código</th>
                <th className="pb-3 w-16">Cant.</th>
                <th className="pb-3">Descripción</th>
                <th className="pb-3 w-32 text-right">Precio Unit. (CRC)</th>
                <th className="pb-3 w-36 text-right">Total ({symbol})</th>
                <th className="pb-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {items.map((item, index) => {
                const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                const displayRowTotal = isUSD ? rowTotal / rate : rowTotal;
                return (
                  <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-2 text-xs text-gray-400 font-bold text-center">{index + 1}</td>
                    <td className="py-2">
                      <input type="text" placeholder="SKU-001" className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none text-sm" value={item.code} onChange={(e) => updateItem(item.id, 'code', e.target.value)} />
                    </td>
                    <td className="py-2">
                      <input type="number" className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none text-center text-sm" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="py-2">
                      <input type="text" className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none text-sm" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                    </td>
                    <td className="py-2">
                      <input type="number" step="0.01" className="w-full text-right px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white outline-none text-sm" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} />
                    </td>
                    <td className="py-2 text-right font-bold text-gray-700 dark:text-gray-300 text-sm">
                      {symbol}{displayRowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-center">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 dark:text-gray-700 hover:text-red-500 transition-colors" disabled={items.length === 1}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex justify-end mt-4 border-t dark:border-gray-800 pt-4">
            <button ref={addItemBtnRef} onClick={handleAddItem} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all font-bold text-sm shadow-sm border border-indigo-100 dark:border-indigo-900/50"><Plus size={18} /> AGREGAR ÍTEM</button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-12">
          <section className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-6 text-indigo-600 dark:text-indigo-400 border-b dark:border-gray-800 pb-4">
              <Settings2 size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">Ajustes Finales</h2>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Descuento (%)</label>
                  <input type="number" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={config.discountPercent} onChange={(e) => setConfig({ ...config, discountPercent: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">IVA (%)</label>
                  <input type="number" className={`${inputBaseClass} border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-indigo-500`} value={config.taxPercent} onChange={(e) => setConfig({ ...config, taxPercent: e.target.value })} />
                </div>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400">
                  <RefreshCcw size={16} /><span className="text-xs font-bold uppercase">Moneda</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex rounded-lg border border-indigo-200 dark:border-indigo-900/50 overflow-hidden">
                    <button onClick={() => setConfig({ ...config, currency: 'CRC' })} className={`flex-1 py-1 text-xs font-bold transition-colors ${config.currency === 'CRC' ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400'}`}>CRC (₡)</button>
                    <button onClick={() => setConfig({ ...config, currency: 'USD' })} className={`flex-1 py-1 text-xs font-bold transition-colors ${config.currency === 'USD' ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400'}`}>USD ($)</button>
                  </div>
                  {isUSD && <input type="number" step="0.01" className="w-full px-3 py-1 text-xs rounded border border-indigo-200 dark:border-indigo-900/50 dark:bg-gray-800 dark:text-white font-bold" value={config.exchangeRate} onChange={(e) => setConfig({ ...config, exchangeRate: e.target.value })} />}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-indigo-900 dark:bg-indigo-950 p-8 rounded-xl shadow-xl text-white transition-colors duration-500">
            <h2 className="text-xl font-bold mb-6 border-b border-indigo-800 dark:border-indigo-900 pb-4">Resumen ({config.currency})</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-indigo-200 dark:text-indigo-400"><span>Subtotal</span><span>{symbol}{displaySubtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-emerald-400"><span>Descuento</span><span>-{symbol}{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-indigo-200 dark:text-indigo-400"><span>Impuesto</span><span>{symbol}{taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="pt-6 border-t border-indigo-800 dark:border-indigo-900 flex justify-between items-center"><span className="text-lg font-bold">TOTAL</span><span className="text-3xl font-black">{symbol}{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
            {!isFormValid && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-200 leading-tight">Uno o más correos electrónicos no tienen el formato correcto (ej: usuario@dominio.com)</p>
              </div>
            )}
            <button onClick={handleGeneratePDF} disabled={isGenerating || !isFormValid} className="w-full mt-8 flex items-center justify-center gap-3 py-4 bg-white dark:bg-gray-100 text-indigo-900 dark:text-indigo-950 rounded-xl font-black hover:bg-indigo-50 dark:hover:bg-white disabled:opacity-50 transition-colors shadow-lg">
              {isGenerating ? <div className="animate-spin h-5 w-5 border-2 border-indigo-900 border-t-transparent rounded-full" /> : <><Download size={20} />Generar PDF</>}
            </button>
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 py-10 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 text-center text-gray-400 dark:text-gray-600 text-sm">
          <p className="font-bold text-indigo-600 dark:text-indigo-400">PQMaker Platform</p>
          <p className="mt-1">© {new Date().getFullYear()} CarbaTK Soluciones. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
