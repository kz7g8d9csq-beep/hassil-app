import { useState, useEffect } from 'react';
import API from './services/api';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hassil_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      API.defaults.headers.common['user-id'] = parsed.id;
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
  const [themeColor, setThemeColor] = useState('#1e3a8a');

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

  // قاموس الترجمة الشامل لكل التطبيق
  const t = {
    ar: {
      dashboard: '📊 لوحة التقارير',
      newInvoice: '🧾 إصدار فاتورة',
      invoices: '📂 الفواتير',
      clients: '👥 العملاء',
      settings: '⚙️ إعدادات المنشأة',
      totalSales: 'إجمالي المبيعات',
      zatcaTaxes: 'ضرائب ZATCA (15%)',
      paidInvs: 'الفواتير المدفوعة',
      unpaidInvs: 'الفواتير غير المدفوعة',
      logout: 'تسجيل الخروج',
      welcome: 'أهلاً بك في لوحة تحكم نظام حاصل 🚀',
      welcomeSub: 'استخدم القائمة العلوية لإدارة الفواتير والعملاء وتعديل المظهر واللغة بكل مرونة.',
      invoiceTitle: 'إصدار فاتورة ضريبية جديدة',
      editInvoiceTitle: 'تعديل الفاتورة',
      clientSelect: 'اختر العميل:',
      clientSelectPlaceholder: '-- حدد العميل بالاسم أو الرمز --',
      itemDesc: 'وصف المنتج أو الخدمة:',
      itemDescPlaceholder: 'مثال: استشارات برمجية...',
      baseAmount: 'المبلغ الأساسي (ر.س):',
      invoiceStatus: 'حالة الفاتورة:',
      paid: 'مدفوعة',
      unpaid: 'غير مدفوعة',
      paymentTerm: 'مدة السداد:',
      noTerm: 'بدون مدة سداد',
      withTerm: 'بمدة سداد',
      dueDateLabel: 'تاريخ السداد النهائي:',
      subtotalText: 'المبلغ الصافي:',
      taxText: 'ضريبة القيمة المضافة (15%):',
      totalText: 'الإجمالي النهائي:',
      saveInvoice: 'إصدار وحفظ الفاتورة',
      updateInvoice: 'تحديث الفاتورة',
      cancel: 'إلغاء',
      invoicesListTitle: 'قائمة الفواتير الصادرة وسندات القبض',
      searchPlaceholder: '🔍 ابحث باسم العميل أو برمز العميل...',
      invNumber: 'رقم الفاتورة',
      clientNameHeader: 'العميل (ورمزه)',
      netAmount: 'المبلغ الصافي',
      taxHeader: 'الضريبة (%15)',
      totalHeader: 'الإجمالي النهائي',
      statusHeader: 'الحالة',
      actionsHeader: 'الإجراءات',
      pdfBtn: 'فاتورة PDF',
      receiptBtn: 'سند قبض',
      waBtn: 'واتساب',
      editBtn: 'تعديل',
      deleteBtn: 'حذف',
      addClientTitle: 'إضافة عميل جديد',
      editClientTitle: 'تعديل بيانات العميل',
      clientNameLabel: 'اسم العميل',
      clientPhoneLabel: 'رقم الجوال',
      clientEmailLabel: 'البريد الإلكتروني',
      saveClientBtn: 'إضافة (مع رمز آلي)',
      updateClientBtn: 'حفظ التعديل',
      clientsListTitle: 'قائمة العملاء ورموزهم الفريدة',
      clientSearchPlaceholder: '🔍 ابحث بالاسم أو بررمز العميل (CL-XXXXX)...',
      clientCodeHeader: 'الرمز الآلي',
      settingsTitle: 'إعدادات المنشأة والشعار',
      bizNameLabel: 'اسم المؤسسة / المتجر:',
      logoLabel: 'شعار المؤسسة (من الجهاز):',
      saveSettingsBtn: 'حفظ التعديلات والإعدادات',
      darkMode: 'المظهر الليلي',
      lightMode: 'المظهر النهاري',
      autoMode: 'تلقائي (حسب الوقت)'
    },
    en: {
      dashboard: '📊 Dashboard',
      newInvoice: '🧾 New Invoice',
      invoices: '📂 Invoices',
      clients: '👥 Clients',
      settings: '⚙️ Business Settings',
      totalSales: 'Total Sales',
      zatcaTaxes: 'ZATCA Taxes (15%)',
      paidInvs: 'Paid Invoices',
      unpaidInvs: 'Unpaid Invoices',
      logout: 'Logout',
      welcome: 'Welcome to Hassil Dashboard 🚀',
      welcomeSub: 'Use the top menu to manage invoices, clients, theme and language flexibly.',
      invoiceTitle: 'Issue New Tax Invoice',
      editInvoiceTitle: 'Edit Invoice',
      clientSelect: 'Select Client:',
      clientSelectPlaceholder: '-- Select client by name or code --',
      itemDesc: 'Product or Service Description:',
      itemDescPlaceholder: 'Example: Software Consulting...',
      baseAmount: 'Base Amount (SAR):',
      invoiceStatus: 'Invoice Status:',
      paid: 'Paid',
      unpaid: 'Unpaid',
      paymentTerm: 'Payment Term:',
      noTerm: 'No Term',
      withTerm: 'With Term',
      dueDateLabel: 'Due Date:',
      subtotalText: 'Subtotal:',
      taxText: 'VAT (15%):',
      totalText: 'Grand Total:',
      saveInvoice: 'Issue & Save Invoice',
      updateInvoice: 'Update Invoice',
      cancel: 'Cancel',
      invoicesListTitle: 'Issued Invoices & Receipt Vouchers',
      searchPlaceholder: '🔍 Search by client name or code...',
      invNumber: 'Invoice #',
      clientNameHeader: 'Client (Code)',
      netAmount: 'Subtotal',
      taxHeader: 'Tax (15%)',
      totalHeader: 'Grand Total',
      statusHeader: 'Status',
      actionsHeader: 'Actions',
      pdfBtn: 'PDF Invoice',
      receiptBtn: 'Receipt',
      waBtn: 'WhatsApp',
      editBtn: 'Edit',
      deleteBtn: 'Delete',
      addClientTitle: 'Add New Client',
      editClientTitle: 'Edit Client Info',
      clientNameLabel: 'Client Name',
      clientPhoneLabel: 'Phone Number',
      clientEmailLabel: 'Email Address',
      saveClientBtn: 'Add (Auto Code)',
      updateClientBtn: 'Save Changes',
      clientsListTitle: 'Clients List & Unique Codes',
      clientSearchPlaceholder: '🔍 Search by name or client code (CL-XXXXX)...',
      clientCodeHeader: 'Auto Code',
      settingsTitle: 'Business & Logo Settings',
      bizNameLabel: 'Business / Store Name:',
      logoLabel: 'Business Logo (from device):',
      saveSettingsBtn: 'Save Changes & Settings',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      autoMode: 'Auto (Time-based)'
    }
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
    if (phone.startsWith('05')) { phone = '966' + phone.substring(1); } else if (phone.startsWith('5') && phone.length === 9) { phone = '966' + phone; }
    const message = `Hello ${inv.client?.name || ''},\nInvoice #: ${inv.invoiceNumber}\nTotal: ${inv.totalAmount} SAR\nThank you for dealing with ${businessName}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrintOrPDF = (inv) => {
    const isPaid = inv.notes?.includes('Paid') || inv.notes?.includes('مدفوعة');
    const dateMatch = inv.notes?.match(/تاريخ\s+([0-9\/\-]+)/);
    const dueDateDisplay = dateMatch ? dateMatch[1] : 'Immediate';
    const showWarning = !!dateMatch && !isPaid;

    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>Tax Invoice - ${inv.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Tahoma', Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-container { width: 100%; max-width: 210mm; margin: auto; border: 2px solid ${themeColor}; padding: 30px; border-radius: 8px; box-sizing: border-box; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .header-table td { vertical-align: middle; }
          .company-info { display: flex; align-items: center; gap: 15px; }
          .company-info h2 { color: ${themeColor}; margin: 0 0 5px; font-size: 26px; }
          .company-info p { margin: 2px 0; color: #475569; font-size: 15px; }
          .logo-img { max-height: 75px; max-width: 150px; object-fit: contain; display: block; }
          .invoice-meta { text-align: ${lang === 'ar' ? 'left' : 'right'}; }
          .invoice-meta h1 { margin: 0 0 10px; font-size: 26px; color: #0f172a; }
          .dates-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .dates-table td, .dates-table th { border: 1px solid #cbd5e1; padding: 10px 15px; font-size: 15px; text-align: center; }
          .dates-table th { background: #f8fafc; color: ${themeColor}; }
          .client-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 15px; margin-bottom: 25px; background: #f8fafc; }
          .client-box h4 { margin: 0 0 10px; color: ${themeColor}; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .client-box p { margin: 5px 0; font-size: 15px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .items-table th, .items-table td { border: 1px solid #94a3b8; padding: 14px; font-size: 15px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
          .items-table th { background: ${themeColor}; color: #fff; }
          .summary-table-wide { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .summary-table-wide td { border: 1px solid #cbd5e1; padding: 14px 15px; font-size: 15px; text-align: center; }
          .summary-table-wide th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 14px 15px; font-size: 15px; color: #0f172a; }
          .official-warning { border: 2px solid #dc2626; background: #fef2f2; color: #b91c1c; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <table class="header-table">
            <tr>
              <td>
                <div class="company-info">
                  ${businessLogo ? `<img src="${businessLogo}" class="logo-img" alt="Logo" />` : ''}
                  <div>
                    <h2>${businessName}</h2>
                    <p>${businessCity}</p>
                  </div>
                </div>
              </td>
              <td class="invoice-meta">
                <h1>Tax Invoice</h1>
                <p><strong>Invoice #:</strong> ${inv.invoiceNumber}</p>
                <p style="font-size: 18px;"><strong>Status:</strong> <span style="color: ${isPaid ? '#16a34a' : '#dc2626'}; font-weight: bold;">${isPaid ? 'Paid' : 'Unpaid'}</span></p>
              </td>
            </tr>
          </table>

          <table class="dates-table">
            <tr>
              <th>Issue Date</th>
              <th>Due Date</th>
            </tr>
            <tr>
              <td>${new Date().toLocaleDateString()}</td>
              <td style="color: ${showWarning ? '#dc2626' : '#111'}; font-weight: bold;">${dueDateDisplay}</td>
            </tr>
          </table>

          <div class="client-box">
            <h4>Client Details</h4>
            <p><strong>Client Name:</strong> ${inv.client?.name || '---'}</p>
            <p><strong>Phone:</strong> ${inv.client?.phone || '---'}</p>
            <p><strong>Email:</strong> ${inv.client?.email || '---'}</p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center; width: 80px;">Qty</th>
                <th style="text-align: center; width: 130px;">Unit Price</th>
                <th style="text-align: center; width: 130px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: center;">${item.unitPrice} SAR</td>
                  <td style="text-align: center;">${item.total} SAR</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="summary-table-wide">
            <tr>
              <th>Subtotal</th>
              <th>VAT (15%)</th>
              <th style="background: #e2e8f0; color: #16a34a; font-size: 18px;">Grand Total</th>
            </tr>
            <tr>
              <td>${inv.subtotal} SAR</td>
              <td style="color: #dc2626;">${inv.taxAmount} SAR</td>
              <td style="font-weight: bold; color: #16a34a; font-size: 18px;">${inv.totalAmount} SAR</td>
            </tr>
          </table>

          ${showWarning ? `<div class="official-warning">⚠️ Warning: Failure to pay within the specified period will result in legal action.</div>` : ''}
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 500);
  };

  const handlePrintReceipt = (inv) => {
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>Receipt Voucher - ${inv.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Tahoma', Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; }
          .receipt-box { width: 100%; max-width: 180mm; margin: auto; border: 3px double ${themeColor}; padding: 35px; border-radius: 10px; box-sizing: border-box; }
          .receipt-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
          .receipt-header h2 { color: ${themeColor}; margin: 0; font-size: 26px; }
          .receipt-header p { margin: 3px 0; color: #64748b; font-size: 14px; }
          .amount-badge { background: #dcfce7; color: #16a34a; padding: 10px 20px; border-radius: 8px; font-size: 20px; font-weight: bold; border: 1px solid #bbf7d0; text-align: center; }
          .receipt-body p { font-size: 17px; line-height: 2.2; margin: 12px 0; color: #334155; }
          .receipt-body strong { color: #0f172a; }
          .footer-signs { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 16px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="receipt-header">
            <div>
              <h2>${businessName}</h2>
              <p>${businessCity}</p>
            </div>
            <div>
              <h1 style="margin: 0; color: #0f172a; font-size: 24px;">Official Receipt Voucher</h1>
              <p>Invoice #: ${inv.invoiceNumber}</p>
            </div>
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <div class="amount-badge">Received Amount: ${inv.totalAmount} SAR</div>
          </div>

          <div class="receipt-body">
            <p>Received from: <strong>${inv.client?.name || '---'}</strong></p>
            <p>Phone: <strong>${inv.client?.phone || '---'}</strong></p>
            <p>Amount: <strong>${inv.totalAmount} SAR</strong> (Inclusive of 15% VAT)</p>
            <p>For: <strong>${inv.items?.[0]?.description || 'General Services'}</strong></p>
            <p>Date: <strong>${new Date().toLocaleDateString()}</strong></p>
          </div>

          <div class="footer-signs">
            <div>Accountant: ........................</div>
            <div>Management Signature: ........................</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 500);
  };

  if (!user) {
    return (
      <div style={{ fontFamily: 'Tahoma, sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDarkMode ? '#090d16' : '#0f172a' }}>
        <div style={{ background: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#f8fafc' : '#111', padding: '40px', borderRadius: '16px', width: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
          <h2 style={{ textAlign: 'center', color: '#2563eb', margin: '0 0 8px', fontSize: '28px' }}>نظام حاصل للفوترة / Hassil</h2>
          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
            {authView === 'register' && (
              <>
                <input type="text" value={authBusinessName} onChange={e => setAuthBusinessName(e.target.value)} required placeholder="Business Name" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box' }} />
                <input type="text" value={authClientName} onChange={e => setAuthClientName(e.target.value)} required placeholder="Owner Name" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box' }} />
              </>
            )}
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required placeholder="Email Address" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
            {(authView === 'register' || authView === 'forgot') && (
              <input type="text" value={authPhone} onChange={e => setAuthPhone(e.target.value)} required placeholder="Phone Number (05XXXXXXXX)" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
            )}
            {(authView === 'login' || authView === 'register') && (
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder="Password" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
            )}
            {authView === 'forgot' && resetVerified && (
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="New Password" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #16a34a', background: isDarkMode ? '#0f172a' : '#fff', color: isDarkMode ? '#fff' : '#000', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
            )}
            <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
              {authView === 'login' && 'Login'}
              {authView === 'register' && 'Register Account'}
              {authView === 'forgot' && (resetVerified ? 'Save New Password' : 'Verify & Send Reset')}
            </button>
          </form>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '13px' }}>
            {authView === 'login' ? (
              <>
                <button type="button" onClick={() => { setAuthView('register'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold' }}>Create Account</button>
                <button type="button" onClick={() => { setAuthView('forgot'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>Forgot Password?</button>
              </>
            ) : (
              <button type="button" onClick={() => { setAuthView('login'); setResetVerified(false); }} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontWeight: 'bold', margin: 'auto' }}>Back to Login</button>
            )}
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
    <div style={{ fontFamily: 'Tahoma, sans-serif', direction: lang === 'ar' ? 'rtl' : 'ltr', padding: '30px', background: bgMain, color: textColor, minHeight: '100vh', boxSizing: 'border-box', transition: 'background 0.3s' }}>
      
      {/* شريط الهيدر العلوي */}
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

      {/* شريط التبويبات الرئيسي */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: cardBg, padding: '10px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'dashboard' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'dashboard' ? '#fff' : subTextColor }}>{txt.dashboard}</button>
        <button onClick={() => setActiveTab('new_invoice')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'new_invoice' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'new_invoice' ? '#fff' : subTextColor }}>{txt.newInvoice}</button>
        <button onClick={() => setActiveTab('invoices')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'invoices' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'invoices' ? '#fff' : subTextColor }}>{txt.invoices}</button>
        <button onClick={() => setActiveTab('clients')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'clients' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'clients' ? '#fff' : subTextColor }}>{txt.clients}</button>
        <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'settings' ? '#2563eb' : (isDarkMode ? '#0f172a' : '#f1f5f9'), color: activeTab === 'settings' ? '#fff' : subTextColor }}>{txt.settings}</button>
      </div>

      {/* لوحة التقارير */}
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

      {/* إصدار الفاتورة */}
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

      {/* إدارة الفواتير */}
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
                    <td style={{ padding: '14px' }}>{inv.client?.name} <span style={{ color: '#0284c7', fontSize: '12px' }}>({extractClientCode(inv.client?.notes)})</span></td>
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

      {/* إدارة العملاء */}
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

      {/* إعدادات المنشأة */}
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
  );
}

export default App;