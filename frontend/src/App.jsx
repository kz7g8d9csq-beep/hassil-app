import { useState, useEffect } from 'react';
import API from './services/api';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hassil_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if(API.defaults) API.defaults.headers.common['user-id'] = parsed.id;
      return parsed;
    }
    return null;
  });

  const [authView, setAuthView] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusinessName, setAuthBusinessName] = useState('');
  const [authClientName, setAuthClientName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  
  const [resetVerified, setResetVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // إعدادات اللغة والمظهر
  const [lang, setLang] = useState('ar');
  const [themeMode, setThemeMode] = useState('auto');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // التنقل بين الأقسام
  const [activeTab, setActiveTab] = useState('dashboard');

  // إعدادات المنشأة والشعار
  const [businessName, setBusinessName] = useState('نظام حاصل للفوترة');
  const [businessCity, setBusinessCity] = useState('المملكة العربية السعودية - جدة');
  const [businessLogo, setBusinessLogo] = useState('');

  // البيانات
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // حقول العميل
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [editingClientId, setEditingClientId] = useState(null);

  // حقول الفاتورة
  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Paid');
  const [paymentMode, setPaymentMode] = useState('no_term');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  
  // حالة المعاينة والطباعة وتصدير PDF (نافذة ذكية)
  const [activeModalDoc, setActiveModalDoc] = useState(null);

  useEffect(() => {
    const updateTheme = () => {
      if (themeMode === 'dark') {
        setIsDarkMode(true);
      } else if (themeMode === 'light') {
        setIsDarkMode(false);
      } else {
        const hour = new Date().getHours();
        setIsDarkMode(hour < 6 || hour >= 18);
      }
    };
    updateTheme();
    const interval = setInterval(updateTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  useEffect(() => {
    if (user) {
      setBusinessName(user.businessName || 'نظام حاصل للفوترة');
      fetchData();
      fetchSettings();
    }
  }, [user]);

  const fetchData = () => {
    API.get('/clients').then(res => setClients(res.data)).catch(() => {});
    API.get('/invoices').then(res => setInvoices(res.data)).catch(() => {});
  };

  const fetchSettings = () => {
    API.get('/settings').then(res => {
      if (res.data?.businessName) setBusinessName(res.data.businessName);
      if (res.data?.logoUrl) setBusinessLogo(res.data.logoUrl);
    }).catch(() => {});
  };

  const extractClientCode = (clientNotes) => {
    const match = (clientNotes || '').match(/\[(CL-\d+)\]/);
    return match ? match[1] : '---';
  };

  const t = {
    ar: { dashboard: '📊 لوحة التقارير', newInvoice: '🧾 إصدار فاتورة', invoices: '📂 الفواتير', clients: '👥 العملاء', settings: '⚙️ إعدادات المنشأة', totalSales: 'إجمالي المبيعات', zatcaTaxes: 'ضرائب ZATCA (15%)', paidInvs: 'الفواتير المدفوعة', unpaidInvs: 'الفواتير غير المدفوعة', logout: 'تسجيل الخروج', welcome: 'أهلاً بك في لوحة تحكم نظام حاصل 🚀', welcomeSub: 'استخدم القائمة العلوية لإدارة الفواتير والعملاء وتعديل المظهر واللغة بكل مرونة.', invoiceTitle: 'إصدار فاتورة ضريبية جديدة', editInvoiceTitle: 'تعديل الفاتورة', clientSelect: 'اختر العميل:', clientSelectPlaceholder: '-- حدد العميل بالاسم أو الرمز --', itemDesc: 'وصف المنتج أو الخدمة:', itemDescPlaceholder: 'مثال: استشارات برمجية...', baseAmount: 'المبلغ الأساسي (ر.س):', invoiceStatus: 'حالة الفاتورة:', paid: 'مدفوعة', unpaid: 'غير مدفوعة', paymentTerm: 'مدة السداد:', noTerm: 'بدون مدة سداد', withTerm: 'بمدة سداد', dueDateLabel: 'تاريخ السداد النهائي:', subtotalText: 'المبلغ الصافي:', taxText: 'ضريبة القيمة المضافة (15%):', totalText: 'الإجمالي النهائي:', saveInvoice: 'إصدار وحفظ الفاتورة', updateInvoice: 'تحديث الفاتورة', cancel: 'إلغاء', invoicesListTitle: 'قائمة الفواتير الصادرة وسندات القبض', searchPlaceholder: '🔍 ابحث باسم العميل أو برمز العميل...', invNumber: 'رقم الفاتورة', clientNameHeader: 'العميل (ورمزه)', netAmount: 'المبلغ الصافي', taxHeader: 'الضريبة (%15)', totalHeader: 'الإجمالي النهائي', statusHeader: 'الحالة', actionsHeader: 'الإجراءات', pdfBtn: 'فاتورة PDF', receiptBtn: 'سند قبض', waBtn: 'واتساب', editBtn: 'تعديل', deleteBtn: 'حذف', addClientTitle: 'إضافة عميل جديد', editClientTitle: 'تعديل بيانات العميل', clientNameLabel: 'اسم العميل', clientPhoneLabel: 'رقم الجوال', clientEmailLabel: 'البريد الإلكتروني', saveClientBtn: 'إضافة (مع رمز آلي)', updateClientBtn: 'حفظ التعديل', clientsListTitle: 'قائمة العملاء ورموزهم الفريدة', clientSearchPlaceholder: '🔍 ابحث بالاسم أو بررمز العميل (CL-XXXXX)...', clientCodeHeader: 'الرمز الآلي', settingsTitle: 'إعدادات المنشأة والشعار', bizNameLabel: 'اسم المؤسسة / المتجر:', logoLabel: 'شعار المؤسسة (من الجهاز):', saveSettingsBtn: 'حفظ التعديلات والإعدادات', darkMode: 'المظهر الليلي', lightMode: 'المظهر النهاري', autoMode: 'تلقائي (حسب الوقت)' },
    en: { dashboard: '📊 Dashboard', newInvoice: '🧾 New Invoice', invoices: '📂 Invoices', clients: '👥 Clients', settings: '⚙️ Business Settings', totalSales: 'Total Sales', zatcaTaxes: 'ZATCA Taxes (15%)', paidInvs: 'Paid Invoices', unpaidInvs: 'Unpaid Invoices', logout: 'Logout', welcome: 'Welcome to Hassil Dashboard 🚀', welcomeSub: 'Use the top menu to manage invoices, clients, theme and language flexibly.', invoiceTitle: 'Issue New Tax Invoice', editInvoiceTitle: 'Edit Invoice', clientSelect: 'Select Client:', clientSelectPlaceholder: '-- Select client by name or code --', itemDesc: 'Product or Service Description:', itemDescPlaceholder: 'Example: Software Consulting...', baseAmount: 'Base Amount (SAR):', invoiceStatus: 'Invoice Status:', paid: 'Paid', unpaid: 'Unpaid', paymentTerm: 'Payment Term:', noTerm: 'No Term', withTerm: 'With Term', dueDateLabel: 'Due Date:', subtotalText: 'Subtotal:', taxText: 'VAT (15%):', totalText: 'Grand Total:', saveInvoice: 'Issue & Save Invoice', updateInvoice: 'Update Invoice', cancel: 'Cancel', invoicesListTitle: 'Issued Invoices & Receipt Vouchers', searchPlaceholder: '🔍 Search by client name or code...', invNumber: 'Invoice #', clientNameHeader: 'Client (Code)', netAmount: 'Subtotal', taxHeader: 'Tax (15%)', totalHeader: 'Grand Total', statusHeader: 'Status', actionsHeader: 'Actions', pdfBtn: 'PDF Invoice', receiptBtn: 'Receipt', waBtn: 'WhatsApp', editBtn: 'Edit', deleteBtn: 'Delete', addClientTitle: 'Add New Client', editClientTitle: 'Edit Client Info', clientNameLabel: 'Client Name', clientPhoneLabel: 'Phone Number', clientEmailLabel: 'Email Address', saveClientBtn: 'Add (Auto Code)', updateClientBtn: 'Save Changes', clientsListTitle: 'Clients List & Unique Codes', clientSearchPlaceholder: '🔍 Search by name or client code (CL-XXXXX)...', clientCodeHeader: 'Auto Code', settingsTitle: 'Business & Logo Settings', bizNameLabel: 'Business / Store Name:', logoLabel: 'Business Logo (from device):', saveSettingsBtn: 'Save Changes & Settings', darkMode: 'Dark Mode', lightMode: 'Light Mode', autoMode: 'Auto (Time-based)' }
  };

  const txt = t[lang];

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (authView === 'login') {
      API.post('/login', { email: authEmail, password: authPassword })
        .then(res => {
          const loggedInUser = res.data.user;
          setUser(loggedInUser);
          localStorage.setItem('hassil_user', JSON.stringify(loggedInUser));
          API.defaults.headers.common['user-id'] = loggedInUser.id;
        })
        .catch(err => alert(err.response?.data?.error || 'Login failed'));
    } else if (authView === 'register') {
      API.post('/register', { businessName: authBusinessName, clientName: authClientName, email: authEmail, phone: authPhone, password: authPassword })
        .then(res => {
          const newUser = res.data.user;
          setUser(newUser);
          localStorage.setItem('hassil_user', JSON.stringify(newUser));
          API.defaults.headers.common['user-id'] = newUser.id;
          alert('Account created successfully!');
        })
        .catch(err => alert(err.response?.data?.error || 'Registration error'));
    } else if (authView === 'forgot') {
      if (!resetVerified) {
        API.post('/forgot-password', { email: authEmail, phone: authPhone })
          .then(res => { alert(res.data.message); setResetVerified(true); })
          .catch(err => alert(err.response?.data?.error || 'Data mismatch'));
      } else {
        API.post('/forgot-password', { email: authEmail, phone: authPhone, newPassword })
          .then(res => { alert(res.data.message); setAuthView('login'); setResetVerified(false); setNewPassword(''); })
          .catch(err => alert(err.response?.data?.error || 'Update failed'));
      }
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('hassil_user');
    delete API.defaults.headers.common['user-id'];
    setClients([]);
    setInvoices([]);
    setAuthView('login');
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setBusinessLogo(compressedBase64);
          API.put('/settings', { businessName, logoUrl: compressedBase64 }).catch(() => {});
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    API.put('/settings', { businessName, logoUrl: businessLogo })
      .then(() => alert('Settings updated successfully!'))
      .catch(err => alert('Error: ' + err.message));
  };

  const handleSaveClient = (e) => {
    e.preventDefault();
    if (editingClientId) {
      API.put(`/clients/${editingClientId}`, { name: clientName, phone: clientPhone, email: clientEmail })
        .then(() => { alert('Client updated'); setEditingClientId(null); setClientName(''); setClientPhone(''); setClientEmail(''); fetchData(); })
        .catch(err => alert(err.message));
    } else {
      API.post('/clients', { name: clientName, phone: clientPhone, email: clientEmail })
        .then(() => { alert('Client added successfully'); setClientName(''); setClientPhone(''); setClientEmail(''); fetchData(); })
        .catch(err => alert(err.message));
    }
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    let finalNotes = `الحالة: ${status === 'Paid' ? 'مدفوعة' : 'غير مدفوعة'}`;
    if (paymentMode === 'with_term') {
      finalNotes += ` | مدة السداد: يجب الدفع قبل تاريخ ${dueDate} كحد أقصى`;
    } else {
      finalNotes += ` | مدة السداد: فوري`;
    }
    if (notes) finalNotes += ` | ملاحظات: ${notes}`;

    if (editingInvoiceId) {
      API.put(`/invoices/${editingInvoiceId}`, { amount: Number(amount), description, notes: finalNotes })
        .then(() => { alert('Invoice updated'); cancelEditInvoice(); fetchData(); setActiveTab('invoices'); })
        .catch(err => alert(err.message));
    } else {
      if (!selectedClientId) { alert('Select a client'); return; }
      API.post('/invoices', { clientId: selectedClientId, items: [{ description: description || 'General Service', quantity: 1, unitPrice: Number(amount) }], notes: finalNotes })
        .then(() => { alert('Invoice issued successfully'); cancelEditInvoice(); fetchData(); setActiveTab('invoices'); })
        .catch(err => alert(err.message));
    }
  };

  const startEditClient = (client) => {
    setEditingClientId(client.id); setClientName(client.name); setClientPhone(client.phone); setClientEmail(client.email || '');
    setActiveTab('clients');
  };

  const startEditInvoice = (inv) => {
    setEditingInvoiceId(inv.id); setDescription(inv.items?.[0]?.description || ''); setAmount(inv.subtotal);
    setStatus(inv.notes?.includes('مدفوعة') ? 'Paid' : 'Unpaid');
    const dateMatch = inv.notes?.match(/تاريخ\s+([0-9\/\-]+)/);
    if (dateMatch) { setPaymentMode('with_term'); setDueDate(dateMatch[1]); } else { setPaymentMode('no_term'); }
    setActiveTab('new_invoice');
  };

  const cancelEditInvoice = () => {
    setEditingInvoiceId(null); setDescription(''); setAmount(''); setPaymentMode('no_term'); setDueDate(''); setStatus('Paid'); setNotes('');
  };

  const handleDeleteClient = (client) => {
    if (window.confirm(`Delete client (${client.name})?`)) {
      API.delete(`/clients/${client.id}`).then(() => { alert('Deleted'); fetchData(); }).catch(() => alert('Cannot delete'));
    }
  };

  const handleDeleteInvoice = (inv) => {
    if (window.confirm('Delete this invoice?')) {
      API.delete(`/invoices/${inv.id}`).then(() => { alert('Deleted'); fetchData(); }).catch(() => alert('Error'));
    }
  };

  const handleWhatsAppShare = (inv) => {
    let phone = inv.client?.phone || '';
    phone = phone.replace(/\D/g, ''); 
    if (phone.startsWith('05')) { 
      phone = '966' + phone.substring(1); 
    } else if (phone.startsWith('5') && phone.length === 9) { 
      phone = '966' + phone; 
    }
    const message = `أهلاً بك ${inv.client?.name || ''}\nرقم الفاتورة: ${inv.invoiceNumber}\nالإجمالي النهائي: ${inv.totalAmount} ر.س\nشكراً لتعاملك معنا في ${businessName}.`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  // فتح معاينة الفاتورة
  const handlePrintOrPDF = (inv) => {
    setActiveModalDoc({ type: 'invoice', inv });
  };

  // فتح معاينة سند القبض
  const handlePrintReceipt = (inv) => {
    setActiveModalDoc({ type: 'receipt', inv });
  };

  // وظيفة الطباعة وحفظ PDF الاعتمادية
  const triggerNativePrint = () => {
    window.print();
  };

  if (!user) {
    return (
      <div style={{ fontFamily: 'Tahoma, sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1b2a', boxSizing: 'border-box' }}>
        <style>
          {`
            @keyframes slideInUp {
              0% { opacity: 0; transform: translateY(40px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes floatAnimation {
              0% { transform: translateY(0px); }
              50% { transform: translateY(-15px); }
              100% { transform: translateY(0px); }
            }
            .animate-container {
              animation: slideInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }
            .animate-character {
              animation: floatAnimation 3.5s ease-in-out infinite;
            }
          `}
        </style>

        <div className="animate-container" style={{ display: 'flex', width: '900px', maxWidth: '95%', background: '#1b263b', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'radial-gradient(circle, #1b263b 0%, #0d1b2a 100%)' }}>
            <div className="animate-character" style={{ width: '220px', height: '300px', backgroundColor: '#000000', borderRadius: '16px', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.6)', border: '2px solid #415a77', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'absolute', top: '90px', width: '50px', height: '70px', backgroundColor: '#ffffff', clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}></div>
              <div style={{ position: 'absolute', top: '100px', width: '10px', height: '50px', backgroundColor: '#000000' }}></div>
            </div>
            <p className="animate-character" style={{ color: '#e0e1dd', marginTop: '25px', fontSize: '17px', fontWeight: 'bold' }}>نظام حاصل للفوترة</p>
          </div>

          <div style={{ flex: 1.2, background: '#ffffff', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ textAlign: 'center', color: '#0d1b2a', margin: '0 0 5px', fontSize: '26px' }}>أهلاً بك</h2>
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>سجل الدخول لإدارة فواتيرك وعملائك</p>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authView === 'register' && (
                <>
                  <input type="text" value={authBusinessName} onChange={e => setAuthBusinessName(e.target.value)} required placeholder="اسم المنشأة" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#000', boxSizing: 'border-box' }} />
                  <input type="text" value={authClientName} onChange={e => setAuthClientName(e.target.value)} required placeholder="اسم المالك" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#000', boxSizing: 'border-box' }} />
                </>
              )}
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required placeholder="البريد الإلكتروني" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              
              {(authView === 'register' || authView === 'forgot') && (
                <input type="text" value={authPhone} onChange={e => setAuthPhone(e.target.value)} required placeholder="رقم الجوال (05XXXXXXXX)" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              )}
              
              {(authView === 'login' || authView === 'register') && (
                <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder="كلمة المرور" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              )}
              
              {authView === 'forgot' && resetVerified && (
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="كلمة المرور الجديدة" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #16a34a', background: '#f8fafc', color: '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              )}
              
              <button type="submit" style={{ background: '#0d1b2a', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                {authView === 'login' && 'تسجيل الدخول'}
                {authView === 'register' && 'إنشاء حساب جديد'}
                {authView === 'forgot' && (resetVerified ? 'حفظ كلمة المرور الجديدة' : 'تحقق وإرسال طلب الإستعادة')}
              </button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px' }}>
              {authView === 'login' ? (
                <>
                  <button type="button" onClick={() => { setAuthView('register'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>إنشاء حساب جديد</button>
                  <button type="button" onClick={() => { setAuthView('forgot'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>هل نسيت كلمة المرور؟</button>
                </>
              ) : (
                <button type="button" onClick={() => { setAuthView('login'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', margin: 'auto' }}>العودة لتسجيل الدخول</button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalTaxes = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);
  const paidInvoicesCount = invoices.filter(inv => inv.notes?.includes('مدفوعة') || inv.notes?.includes('Paid')).length;
  const unpaidInvoicesCount = invoices.length - paidInvoicesCount;

  const filteredInvoices = invoices.filter(inv => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    const nameMatch = (inv.client?.name || '').toLowerCase().includes(query);
    const codeMatch = (inv.client?.notes || '').toLowerCase().includes(query);
    return nameMatch || codeMatch;
  });

  const filteredClients = clients.filter(c => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    const nameMatch = (c.name || '').toLowerCase().includes(query);
    const codeMatch = (c.notes || '').toLowerCase().includes(query);
    return nameMatch || codeMatch;
  });

  const bgMain = isDarkMode ? '#0f172a' : '#f8fafc';
  const cardBg = isDarkMode ? '#1e293b' : '#fff';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const subTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  return (
    <div style={{ fontFamily: 'Tahoma, sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* الواجهة الطبيعية للتطبيق */}
      <div style={{ padding: '30px', background: bgMain, color: textColor, minHeight: '100vh', transition: 'background 0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: cardBg, padding: '15px 30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {businessLogo && <img src={businessLogo} alt="Logo" style={{ maxHeight: '45px', objectFit: 'contain' }} />}
            <div>
              <h1 style={{ color: textColor, margin: 0, fontSize: '22px' }}>{businessName}</h1>
              <p style={{ color: subTextColor, margin: '2px 0 0 0', fontSize: '13px' }}>{user.email}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, cursor: 'pointer', fontSize: '13px' }}>
              <option value="ar">🇸🇦 العربية</option>
              <option value="en">🇬🇧 English</option>
            </select>

            <select value={themeMode} onChange={e => setThemeMode(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor, cursor: 'pointer', fontSize: '13px' }}>
              <option value="auto">🌗 {txt.autoMode}</option>
              <option value="light">☀️ {txt.lightMode}</option>
              <option value="dark">🌙 {txt.darkMode}</option>
            </select>

            <button onClick={handleLogout} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>{txt.logout}</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: cardBg, padding: '10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'dashboard' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'dashboard' ? '#fff' : subTextColor }}>{txt.dashboard}</button>
          <button onClick={() => setActiveTab('new_invoice')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'new_invoice' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'new_invoice' ? '#fff' : subTextColor }}>{txt.newInvoice}</button>
          <button onClick={() => setActiveTab('invoices')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'invoices' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'invoices' ? '#fff' : subTextColor }}>{txt.invoices}</button>
          <button onClick={() => setActiveTab('clients')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'clients' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'clients' ? '#fff' : subTextColor }}>{txt.clients}</button>
          <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'settings' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'settings' ? '#fff' : subTextColor }}>{txt.settings}</button>
        </div>

        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#2563eb', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>{txt.totalSales}</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{totalSales.toFixed(2)} SAR</h2>
              </div>
              <div style={{ background: '#0284c7', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>{txt.zatcaTaxes}</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{totalTaxes.toFixed(2)} SAR</h2>
              </div>
              <div style={{ background: '#16a34a', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>{txt.paidInvs}</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{paidInvoicesCount}</h2>
              </div>
              <div style={{ background: '#dc2626', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>{txt.unpaidInvs}</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{unpaidInvoicesCount}</h2>
              </div>
            </div>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <h2 style={{ color: textColor, margin: '0 0 10px' }}>{txt.welcome}</h2>
              <p style={{ color: subTextColor, fontSize: '16px', margin: 0 }}>{txt.welcomeSub}</p>
            </div>
          </div>
        )}

        {activeTab === 'new_invoice' && (
          <div style={{ background: cardBg, padding: '35px', borderRadius: '12px', maxWidth: '650px', margin: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: textColor, marginBottom: '20px' }}>{editingInvoiceId ? txt.editInvoiceTitle : txt.invoiceTitle}</h2>
            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editingInvoiceId && (
                <div>
                  <label style={{ fontSize: '14px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.clientSelect}</label>
                  <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                    <option value="">{txt.clientSelectPlaceholder}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({extractClientCode(c.notes)})</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: '14px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.itemDesc}</label>
                <input type="text" placeholder={txt.itemDescPlaceholder} value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, boxSizing: 'border-box', background: cardBg, color: textColor }} />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.baseAmount}</label>
                <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, boxSizing: 'border-box', background: cardBg, color: textColor }} />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.invoiceStatus}</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                    <option value="Paid">{txt.paid}</option>
                    <option value="Unpaid">{txt.unpaid}</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '13px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.paymentTerm}</label>
                  <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                    <option value="no_term">{txt.noTerm}</option>
                    <option value="with_term">{txt.withTerm}</option>
                  </select>
                </div>
              </div>

              {paymentMode === 'with_term' && (
                <div style={{ background: isDarkMode ? '#3f1111' : '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <label style={{ fontSize: '13px', color: '#dc2626', display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>{txt.dueDateLabel}</label>
                  <input type="text" placeholder="2026/10/05" value={dueDate} onChange={e => setDueDate(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #f87171', boxSizing: 'border-box', textAlign: 'center', background: cardBg, color: textColor }} />
                </div>
              )}

              <div style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', padding: '15px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                <p style={{ margin: '4px 0' }}>{txt.subtotalText} <strong>{Number(amount || 0).toFixed(2)} SAR</strong></p>
                <p style={{ margin: '4px 0', color: '#dc2626' }}>{txt.taxText} <strong>{(Number(amount || 0) * 0.15).toFixed(2)} SAR</strong></p>
                <p style={{ margin: '4px 0', color: '#16a34a', fontSize: '18px' }}>{txt.totalText} <strong>{(Number(amount || 0) * 1.15).toFixed(2)} SAR</strong></p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ flex: 1, background: '#16a34a', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>{editingInvoiceId ? txt.updateInvoice : txt.saveInvoice}</button>
                {editingInvoiceId && <button type="button" onClick={() => { cancelEditInvoice(); setActiveTab('invoices'); }} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>{txt.cancel}</button>}
              </div>
            </form>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 20px 0', color: textColor }}>{txt.invoicesListTitle}</h2>
            <div style={{ marginBottom: '20px' }}>
              <input type="text" placeholder={txt.searchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '12px 16px', width: '400px', borderRadius: '8px', border: `1px solid ${borderColor}`, outline: 'none', fontSize: '14px', background: cardBg, color: textColor }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', borderBottom: `2px solid ${borderColor}` }}>
                  <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.invNumber}</th>
                  <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.clientNameHeader}</th>
                  <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.netAmount}</th>
                  <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.taxHeader}</th>
                  <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.totalHeader}</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>{txt.statusHeader}</th>
                  <th style={{ padding: '14px', textAlign: 'center' }}>{txt.actionsHeader}</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const isPaid = inv.notes?.includes('Paid') || inv.notes?.includes('مدفوعة');
                  return (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#2563eb' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '14px' }}>{inv.client?.name}</td>
                      <td style={{ padding: '14px' }}>{inv.subtotal} SAR</td>
                      <td style={{ padding: '14px' }}>{inv.taxAmount} SAR</td>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#16a34a' }}>{inv.totalAmount} SAR</td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: isPaid ? '#dcfce7' : '#fee2e2', color: isPaid ? '#16a34a' : '#dc2626' }}>
                          {isPaid ? txt.paid : txt.unpaid}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handlePrintOrPDF(inv)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.pdfBtn}</button>
                        {isPaid && <button onClick={() => handlePrintReceipt(inv)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.receiptBtn}</button>}
                        <button onClick={() => handleWhatsAppShare(inv)} style={{ background: '#25D366', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.waBtn}</button>
                        <button onClick={() => startEditInvoice(inv)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.editBtn}</button>
                        <button onClick={() => handleDeleteInvoice(inv)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.deleteBtn}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'clients' && (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '25px', alignItems: 'flex-start' }}>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: textColor }}>{editingClientId ? txt.editClientTitle : txt.addClientTitle}</h3>
              <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '15px' }}>
                <input type="text" placeholder={txt.clientNameLabel} value={clientName} onChange={e => setClientName(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <input type="text" placeholder={txt.clientPhoneLabel} value={clientPhone} onChange={e => setClientPhone(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <input type="email" placeholder={txt.clientEmailLabel} value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" style={{ flex: 1, background: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{editingClientId ? txt.updateClientBtn : txt.saveClientBtn}</button>
                  {editingClientId && <button type="button" onClick={() => { setEditingClientId(null); setClientName(''); setClientPhone(''); setClientEmail(''); }} style={{ background: '#64748b', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>{txt.cancel}</button>}
                </div>
              </form>
            </div>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 20px 0', color: textColor }}>{txt.clientsListTitle}</h3>
              <div style={{ marginBottom: '20px' }}>
                <input type="text" placeholder={txt.clientSearchPlaceholder} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '12px 16px', width: '100%', borderRadius: '8px', border: `1px solid ${borderColor}`, boxSizing: 'border-box', background: cardBg, color: textColor }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: isDarkMode ? '#0f172a' : '#f8fafc', borderBottom: `2px solid ${borderColor}` }}>
                    <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.clientCodeHeader}</th>
                    <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.clientNameLabel}</th>
                    <th style={{ padding: '14px', textAlign: lang === 'ar' ? 'right' : 'left' }}>{txt.clientPhoneLabel}</th>
                    <th style={{ padding: '14px', textAlign: 'center' }}>{txt.actionsHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(client => (
                    <tr key={client.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#0284c7' }}>{extractClientCode(client.notes)}</td>
                      <td style={{ padding: '14px', fontWeight: 'bold' }}>{client.name}</td>
                      <td style={{ padding: '14px' }}>{client.phone}</td>
                      <td style={{ padding: '14px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => startEditClient(client)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.editBtn}</button>
                        <button onClick={() => handleDeleteClient(client)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{txt.deleteBtn}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ background: cardBg, padding: '35px', borderRadius: '12px', maxWidth: '500px', margin: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: textColor, marginBottom: '20px' }}>{txt.settingsTitle}</h2>
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.bizNameLabel}</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, boxSizing: 'border-box', background: cardBg, color: textColor }} />
              </div>
              <div>
                <label style={{ fontSize: '14px', color: subTextColor, display: 'block', marginBottom: '6px' }}>{txt.logoLabel}</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: '14px', width: '100%' }} />
              </div>
              {businessLogo && (
                <div style={{ textAlign: 'center', background: isDarkMode ? '#0f172a' : '#f8fafc', padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                  <img src={businessLogo} alt="Logo" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                </div>
              )}
              <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>{txt.saveSettingsBtn}</button>
            </form>
          </div>
        )}
      </div>

      {/* نافذة المعاينة والطباعة والتحميل الذكية (المحرك الأصلي لحفظ الحقوق العربية) */}
      {activeModalDoc && (
        <div
          id="hassil-print-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            padding: '20px 10px',
            boxSizing: 'border-box'
          }}
        >
          <style>
            {`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                #hassil-modal-print-content, #hassil-modal-print-content * {
                  visibility: visible !important;
                }
                #hassil-modal-print-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 15mm 20mm !important;
                  background: #ffffff !important;
                  color: #000000 !important;
                  box-shadow: none !important;
                  border: none !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print-area {
                  display: none !important;
                }
              }
            `}
          </style>

          {/* شريط الإجراءات العلوي */}
          <div
            className="no-print-area"
            style={{
              width: '100%',
              maxWidth: '850px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#1e293b',
              color: '#fff',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '18px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>
                {activeModalDoc.type === 'invoice' ? '🧾' : '📜'}
              </span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {activeModalDoc.type === 'invoice'
                  ? `معاينة الفاتورة الضريبية (${activeModalDoc.inv.invoiceNumber})`
                  : `معاينة سند القبض (${activeModalDoc.inv.invoiceNumber})`}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={triggerNativePrint}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                }}
              >
                📥 تحميل PDF / طباعة
              </button>

              <button
                type="button"
                onClick={() => setActiveModalDoc(null)}
                style={{
                  background: '#475569',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                ✖️ إغلاق
              </button>
            </div>
            
            <div style={{ width: '100%', textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              💡 تلميح: لحفظ الملف كـ PDF باللغة العربية الصحيحة، اضغط على الزر الأخضر، ثم اختر الوجهة: "حفظ بتنسيق PDF".
            </div>
          </div>

          {/* محتوى المستند المراد طباعته وتصديره كـ PDF */}
          <div
            style={{
              width: '100%',
              maxWidth: '850px',
              overflowX: 'auto',
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: '30px'
            }}
          >
            <div
              id="hassil-modal-print-content"
              style={{
                width: '100%',
                maxWidth: '800px',
                minWidth: '650px',
                background: '#ffffff',
                color: '#1e293b',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                direction: lang === 'ar' ? 'rtl' : 'ltr',
                fontFamily: 'Tahoma, Arial, sans-serif',
                boxSizing: 'border-box'
              }}
            >
              {activeModalDoc.type === 'invoice' ? (
                /* ============= تصميم الفاتورة الضريبية ============= */
                <div style={{ border: '2px solid #1e3a8a', padding: '4px', borderRadius: '8px' }}>
                  <div style={{ border: '1px solid #1e3a8a', padding: '30px', borderRadius: '6px' }}>
                    
                    {/* ترويسة الفاتورة */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#000' }}>فاتورة ضريبية</h2>
                        <p style={{ color: '#64748b', margin: '0 0 4px 0', fontSize: '14px' }}>رقم الفاتورة: <strong style={{ color: '#000' }}>{activeModalDoc.inv.invoiceNumber}</strong></p>
                        <p style={{ margin: '0', fontSize: '15px', fontWeight: 'bold', color: '#000' }}>
                          الحالة: <span style={{ color: activeModalDoc.inv.notes?.includes('مدفوعة') ? '#16a34a' : '#dc2626' }}>{activeModalDoc.inv.notes?.includes('مدفوعة') ? 'مدفوعة' : 'غير مدفوعة'}</span>
                        </p>
                      </div>
                      <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                        <h2 style={{ color: '#1e3a8a', margin: '0 0 4px 0', fontSize: '22px' }}>{businessName}</h2>
                        <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>{businessCity}</p>
                      </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
                      <thead>
                        <tr>
                          <th style={{ background: '#f8fafc', color: '#1e3a8a', border: '1px solid #cbd5e1', padding: '10px', width: '50%' }}>تاريخ الإصدار</th>
                          <th style={{ background: '#f8fafc', color: '#1e3a8a', border: '1px solid #cbd5e1', padding: '10px', width: '50%' }}>تاريخ الاستحقاق (آخر موعد للسداد)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>{new Date().toLocaleDateString('ar-SA')}</td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '10px', color: '#dc2626', fontWeight: 'bold' }}>
                            {(() => {
                              const match = activeModalDoc.inv.notes?.match(/تاريخ\s+([0-9\/\-]+)/);
                              return match ? match[1] : 'فوراً';
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div style={{ border: '1px solid #cbd5e1', padding: '15px', marginTop: '15px', borderRadius: '6px', textAlign: 'center', background: '#f8fafc' }}>
                      <h4 style={{ color: '#1e3a8a', margin: '0 0 10px 0', fontSize: '16px' }}>بيانات العميل</h4>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>اسم العميل: <strong>{activeModalDoc.inv.client?.name || '---'}</strong></p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>رقم الجوال: <strong dir="ltr">{activeModalDoc.inv.client?.phone || '---'}</strong></p>
                      <p style={{ margin: '4px 0', fontSize: '14px' }}>البريد الإلكتروني: <strong dir="ltr">{activeModalDoc.inv.client?.email || '---'}</strong></p>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>وصف المنتج أو الخدمة</th>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>الكمية</th>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>السعر الفردي</th>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.items?.[0]?.description || 'خدمة عامة'}</td>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>1</td>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{Number(activeModalDoc.inv.subtotal || 0).toFixed(2)} ر.س</td>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{Number(activeModalDoc.inv.subtotal || 0).toFixed(2)} ر.س</td>
                        </tr>
                      </tbody>
                    </table>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '33.33%' }}>المبلغ الصافي</th>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '33.33%' }}>ضريبة القيمة المضافة (15%)</th>
                          <th style={{ padding: '12px', border: '1px solid #cbd5e1', width: '33.33%', background: '#dcfce7', color: '#16a34a' }}>الإجمالي النهائي</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{Number(activeModalDoc.inv.subtotal || 0).toFixed(2)} ر.س</td>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#dc2626' }}>{Number(activeModalDoc.inv.taxAmount || 0).toFixed(2)} ر.س</td>
                          <td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#16a34a', fontSize: '18px' }}>{Number(activeModalDoc.inv.totalAmount || 0).toFixed(2)} ر.س</td>
                        </tr>
                      </tbody>
                    </table>

                    {!activeModalDoc.inv.notes?.includes('مدفوعة') && (
                      <div style={{ border: '1px solid #dc2626', borderRadius: '6px', padding: '12px', marginTop: '20px', textAlign: 'center', color: '#dc2626', background: '#fef2f2', fontSize: '14px' }}>
                        <strong>⚠️ تنبيه: في حال عدم السداد خلال المدة المحددة أعلاه، سيتم اتخاذ الإجراءات القانونية اللازمة وإبلاغ الجهات المعنية.</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ============= تصميم سند القبض الرسمي ============= */
                <div style={{ border: '2px solid #3b82f6', padding: '4px', borderRadius: '8px' }}>
                  <div style={{ border: '1px solid #3b82f6', padding: '35px', borderRadius: '6px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                      <div>
                        <h2 style={{ color: '#1e3a8a', margin: '0 0 5px 0', fontSize: '22px' }}>سند قبض رسمي</h2>
                        <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>رقم الفاتورة المرتبطة: <strong style={{ color: '#000' }}>{activeModalDoc.inv.invoiceNumber}</strong></p>
                      </div>
                      <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                        <h2 style={{ color: '#1e3a8a', margin: '0 0 5px 0', fontSize: '22px' }}>{businessName}</h2>
                        <p style={{ margin: '0', fontSize: '14px', color: '#64748b' }}>المملكة العربية السعودية - جدة</p>
                      </div>
                    </div>

                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '15px', textAlign: 'center', margin: '20px 0', borderRadius: '6px' }}>
                      <h3 style={{ margin: '0', color: '#16a34a', fontSize: '18px' }}>المبلغ المقبوض: {Number(activeModalDoc.inv.totalAmount || 0).toFixed(2)} ريال سعودي فقط لا غير</h3>
                    </div>

                    <div style={{ fontSize: '16px', lineHeight: '2.2', textAlign: 'center' }}>
                      <p style={{ margin: '8px 0' }}>استلمنا من المكرم / الأستاذ(ة): <strong>{activeModalDoc.inv.client?.name || '---'}</strong></p>
                      <p style={{ margin: '8px 0' }}>رقم الجوال: <strong dir="ltr">{activeModalDoc.inv.client?.phone || '---'}</strong></p>
                      <p style={{ margin: '8px 0' }}>مبلغ وقدره: <strong>{Number(activeModalDoc.inv.totalAmount || 0).toFixed(2)} ر.س</strong> (شامل ضريبة القيمة المضافة 15%)</p>
                      <p style={{ margin: '8px 0' }}>وذلك مقابل: <strong>سداد قيمة الفاتورة الضريبية رقم ({activeModalDoc.inv.invoiceNumber})</strong></p>
                      <p style={{ margin: '8px 0' }}>تاريخ الاستلام / الإصدار: <strong>{new Date().toLocaleDateString('ar-SA')}</strong></p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', fontWeight: 'bold' }}>
                      <p style={{ margin: '0' }}>المحاسب / المسؤول: ........................</p>
                      <p style={{ margin: '0' }}>ختم وتوقيع المنشأة: ........................</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;