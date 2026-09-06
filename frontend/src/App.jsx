import { useState, useEffect, useRef } from 'react';
import API from './services/api';
import QRCode from 'qrcode';

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

  const [lang, setLang] = useState('ar');
  const [themeMode, setThemeMode] = useState('auto');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // الأقسام الجديدة
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, new_invoice, invoices, clients, inventory, expenses, settings

  // إعدادات المنشأة
  const [businessName, setBusinessName] = useState('نظام حاصل للفوترة');
  const [businessCity, setBusinessCity] = useState('المملكة العربية السعودية - جدة');
  const [businessLogo, setBusinessLogo] = useState('');
  const [businessVat, setBusinessVat] = useState(() => localStorage.getItem('hassil_vat') || '300000000000003');
  
  // إعدادات الربط (المرحلة الثالثة)
  const [zidToken, setZidToken] = useState(() => localStorage.getItem('hassil_zid_token') || '');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(() => localStorage.getItem('hassil_payment_link') || '');

  // البيانات
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]); // المرحلة الثانية: المنتجات
  const [expenses, setExpenses] = useState([]); // المرحلة الثانية: المصروفات
  const [searchTerm, setSearchTerm] = useState('');

  // حالات الإدخال للمنتجات والمصروفات
  const [invItemName, setInvItemName] = useState('');
  const [invItemPrice, setInvItemPrice] = useState('');
  const [expDescription, setExpDescription] = useState('');
  const [expAmount, setExpAmount] = useState('');
  
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
  
  const [activeModalDoc, setActiveModalDoc] = useState(null);

  useEffect(() => {
    const updateTheme = () => {
      if (themeMode === 'dark') setIsDarkMode(true);
      else if (themeMode === 'light') setIsDarkMode(false);
      else { const hour = new Date().getHours(); setIsDarkMode(hour < 6 || hour >= 18); }
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
    // جلب المنتجات والمصروفات (ستعمل عندما تضيفها للباك إند، حالياً سنعتمد على مصفوفات فارغة مؤقتاً)
    API.get('/inventory').then(res => setInventory(res.data)).catch(() => setInventory([]));
    API.get('/expenses').then(res => setExpenses(res.data)).catch(() => setExpenses([]));
  };

  const fetchSettings = () => {
    API.get('/settings').then(res => {
      if (res.data?.businessName) setBusinessName(res.data.businessName);
      if (res.data?.logoUrl) setBusinessLogo(res.data.logoUrl);
    }).catch(() => {});
  };

  // توليد ZATCA QR Code وطباعته للاختبار اليدوي (المرحلة الأولى)
  const generateZatcaQR = async (seller, vatNo, timestamp, total, vat) => {
    try {
      const toHex = (val) => { const hex = val.toString(16); return hex.length === 1 ? '0' + hex : hex; };
      const getTLV = (tag, value) => {
        const valString = String(value);
        const tagHex = toHex(tag);
        const utf8Bytes = new TextEncoder().encode(valString);
        const lengthHex = toHex(utf8Bytes.length);
        const valHex = Array.from(utf8Bytes).map(b => toHex(b)).join('');
        return tagHex + lengthHex + valHex;
      };
      
      const hexString = getTLV(1, seller) + getTLV(2, vatNo) + getTLV(3, timestamp) + getTLV(4, total) + getTLV(5, vat);
      const bytes = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const base64 = btoa(String.fromCharCode.apply(null, bytes));
      
      console.log("==== كود هيئة الزكاة المشفر (انسخه وافحصه) ====");
      console.log(base64);
      console.log("======================================");

      return await QRCode.toDataURL(base64, { margin: 1, width: 130, color: { dark: '#1e3a8a', light: '#ffffff' } });
    } catch (e) {
      console.error('QR Generation Error:', e);
      return '';
    }
  };

  // تصدير Excel CSV (المرحلة الأولى)
  const exportToCSV = (type) => {
    let headers = [];
    let rows = [];
    let fileName = '';

    if (type === 'invoices') {
      headers = ['رقم الفاتورة', 'اسم العميل', 'المبلغ الصافي', 'الضريبة', 'الإجمالي', 'الحالة', 'تاريخ الإصدار'];
      rows = invoices.map(inv => [inv.invoiceNumber, inv.client?.name || '---', inv.subtotal, inv.taxAmount, inv.totalAmount, inv.notes?.includes('مدفوعة') ? 'مدفوعة' : 'غير مدفوعة', new Date(inv.createdAt || Date.now()).toLocaleDateString('ar-SA')]);
      fileName = 'تقرير_الفواتير.csv';
    } else if (type === 'clients') {
      headers = ['اسم العميل', 'رقم الجوال', 'البريد الإلكتروني'];
      rows = clients.map(c => [c.name, c.phone, c.email || '---']);
      fileName = 'قائمة_العملاء.csv';
    } else if (type === 'expenses') {
      headers = ['وصف المصروف', 'المبلغ', 'التاريخ'];
      rows = expenses.map(e => [e.description, e.amount, new Date(e.createdAt || Date.now()).toLocaleDateString('ar-SA')]);
      fileName = 'تقرير_المصروفات.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", fileName);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // محاكاة مزامنة منصة زد (المرحلة الثالثة)
  const handleZidSync = () => {
    if (!zidToken) { alert('يرجى إضافة رمز ربط منصة زد (Zid Token) من الإعدادات أولاً.'); return; }
    alert('تم الاتصال بـ API منصة زد! جاري سحب الطلبات الجديدة وتحويلها لفواتير... (هذه العملية تتطلب برمجة الباك إند لاحقاً).');
  };

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('hassil_vat', businessVat);
    localStorage.setItem('hassil_zid_token', zidToken);
    localStorage.setItem('hassil_payment_link', paymentLinkUrl);
    API.put('/settings', { businessName, logoUrl: businessLogo }).then(() => alert('تم حفظ الإعدادات وواجهات الربط بنجاح!')).catch(err => alert('Error: ' + err.message));
  };

  // حفظ المصروفات (المرحلة الثانية)
  const handleSaveExpense = (e) => {
    e.preventDefault();
    const newExp = { id: Date.now(), description: expDescription, amount: Number(expAmount), createdAt: new Date() };
    API.post('/expenses', newExp).then(() => { alert('تم الحفظ'); fetchData(); setExpDescription(''); setExpAmount(''); }).catch(() => {
      // حفظ محلي مؤقت في حال لم يتم تحديث الباك إند بعد
      setExpenses([newExp, ...expenses]); setExpDescription(''); setExpAmount(''); alert('تم حفظ المصروف (محلياً لحين ربط الباك إند)');
    });
  };

  // حفظ المنتجات (المرحلة الثانية)
  const handleSaveInventory = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now(), name: invItemName, price: Number(invItemPrice) };
    API.post('/inventory', newItem).then(() => { alert('تمت الإضافة'); fetchData(); setInvItemName(''); setInvItemPrice(''); }).catch(() => {
      setInventory([newItem, ...inventory]); setInvItemName(''); setInvItemPrice(''); alert('تم إضافة المنتج (محلياً لحين ربط الباك إند)');
    });
  };

  // اختيار منتج من القائمة وتعبئة الفاتورة تلقائياً
  const handleInventorySelect = (e) => {
    const item = inventory.find(i => i.id === Number(e.target.value));
    if (item) {
      setDescription(item.name);
      setAmount(item.price);
    }
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    let finalNotes = `الحالة: ${status === 'Paid' ? 'مدفوعة' : 'غير مدفوعة'}`;
    if (paymentMode === 'with_term') finalNotes += ` | مدة السداد: يجب الدفع قبل تاريخ ${dueDate} كحد أقصى`;
    else finalNotes += ` | مدة السداد: فوري`;
    if (notes) finalNotes += ` | ملاحظات: ${notes}`;

    if (editingInvoiceId) {
      API.put(`/invoices/${editingInvoiceId}`, { amount: Number(amount), description, notes: finalNotes }).then(() => { alert('تم التحديث'); cancelEditInvoice(); fetchData(); setActiveTab('invoices'); }).catch(err => alert(err.message));
    } else {
      if (!selectedClientId) { alert('اختر العميل أولاً'); return; }
      API.post('/invoices', { clientId: selectedClientId, items: [{ description: description || 'خدمة عامة', quantity: 1, unitPrice: Number(amount) }], notes: finalNotes }).then(() => { alert('تم الإصدار بنجاح'); cancelEditInvoice(); fetchData(); setActiveTab('invoices'); }).catch(err => alert(err.message));
    }
  };

  const cancelEditInvoice = () => { setEditingInvoiceId(null); setDescription(''); setAmount(''); setPaymentMode('no_term'); setDueDate(''); setStatus('Paid'); setNotes(''); };

  // إرسال واتساب آلي مع رابط الدفع (المرحلة الثالثة)
  const handleWhatsAppShare = (inv) => {
    let phone = inv.client?.phone || '';
    phone = phone.replace(/\D/g, ''); 
    if (phone.startsWith('05')) phone = '966' + phone.substring(1); 
    else if (phone.startsWith('5') && phone.length === 9) phone = '966' + phone; 
    
    let message = `أهلاً بك ${inv.client?.name || ''}\nتم إصدار فاتورة ضريبية برقم: ${inv.invoiceNumber}\nالإجمالي: ${inv.totalAmount} ر.س\n`;
    if (inv.notes?.includes('غير مدفوعة') && paymentLinkUrl) {
      message += `\n💳 لسداد الفاتورة إلكترونياً، يرجى زيارة الرابط التالي:\n${paymentLinkUrl}\n`;
    }
    message += `\nشكراً لتعاملك معنا في ${businessName}.`;
    window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrintOrPDF = async (inv) => { setActiveModalDoc({ type: 'invoice', inv }); };
  const handlePrintReceipt = async (inv) => { setActiveModalDoc({ type: 'receipt', inv }); };

  // ... (نفس كود شاشة تسجيل الدخول AuthView أبقيناه كما هو للاختصار)
  if (!user) {
    return (
      <div style={{ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1b2a' }}>
        <div style={{ display: 'flex', width: '900px', maxWidth: '95%', background: '#ffffff', borderRadius: '24px', overflow: 'hidden', padding: '40px' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ textAlign: 'center', color: '#0d1b2a', margin: '0 0 20px' }}>نظام حاصل للفوترة وإدارة الأعمال</h2>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} required placeholder="البريد الإلكتروني" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required placeholder="كلمة المرور" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ background: '#0d1b2a', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>تسجيل الدخول / إنشاء حساب</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // حسابات الأرباح والمصروفات
  const totalSales = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalTaxes = invoices.reduce((sum, inv) => sum + Number(inv.taxAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netProfit = totalSales - totalTaxes - totalExpenses; // صافي الربح الحقيقي
  const paidInvoicesCount = invoices.filter(inv => inv.notes?.includes('مدفوعة')).length;

  const bgMain = isDarkMode ? '#0f172a' : '#f8fafc';
  const cardBg = isDarkMode ? '#1e293b' : '#fff';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';

  return (
    <div style={{ fontFamily: 'Tahoma, sans-serif', direction: 'rtl', minHeight: '100vh', boxSizing: 'border-box' }}>
      <div style={{ padding: '30px', background: bgMain, color: textColor, minHeight: '100vh' }}>
        
        {/* الشريط العلوي */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', background: cardBg, padding: '15px 30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {businessLogo && <img src={businessLogo} alt="Logo" style={{ maxHeight: '45px', objectFit: 'contain' }} />}
            <div>
              <h1 style={{ color: textColor, margin: 0, fontSize: '22px' }}>{businessName}</h1>
              <p style={{ color: '#64748b', margin: '2px 0 0 0', fontSize: '13px' }}>{user.email}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <select value={themeMode} onChange={e => setThemeMode(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
              <option value="auto">🌗 تلقائي</option><option value="light">☀️ نهاري</option><option value="dark">🌙 ليلي</option>
            </select>
            <button onClick={() => { setUser(null); localStorage.removeItem('hassil_user'); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>تسجيل الخروج</button>
          </div>
        </div>

        {/* أزرار التنقل الرئيسية */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', background: cardBg, padding: '10px', borderRadius: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'dashboard' ? '#2563eb' : '#f1f5f9', color: activeTab === 'dashboard' ? '#fff' : '#475569' }}>📊 لوحة التقارير</button>
          <button onClick={() => setActiveTab('new_invoice')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'new_invoice' ? '#2563eb' : '#f1f5f9', color: activeTab === 'new_invoice' ? '#fff' : '#475569' }}>🧾 إصدار فاتورة</button>
          <button onClick={() => setActiveTab('invoices')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'invoices' ? '#2563eb' : '#f1f5f9', color: activeTab === 'invoices' ? '#fff' : '#475569' }}>📂 الفواتير والطلبات</button>
          <button onClick={() => setActiveTab('clients')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'clients' ? '#2563eb' : '#f1f5f9', color: activeTab === 'clients' ? '#fff' : '#475569' }}>👥 العملاء</button>
          <button onClick={() => setActiveTab('inventory')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'inventory' ? '#2563eb' : '#f1f5f9', color: activeTab === 'inventory' ? '#fff' : '#475569' }}>📦 المخزون والخدمات</button>
          <button onClick={() => setActiveTab('expenses')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'expenses' ? '#2563eb' : '#f1f5f9', color: activeTab === 'expenses' ? '#fff' : '#475569' }}>💸 المصروفات التشغيلية</button>
          <button onClick={() => setActiveTab('settings')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold', background: activeTab === 'settings' ? '#2563eb' : '#f1f5f9', color: activeTab === 'settings' ? '#fff' : '#475569' }}>⚙️ الإعدادات والربط</button>
        </div>

        {/* 1. لوحة التقارير (محدثة بصافي الربح) */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: '#2563eb', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>إجمالي المبيعات الدخل</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{totalSales.toFixed(2)} SAR</h2>
              </div>
              <div style={{ background: '#0284c7', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>ضرائب ZATCA (15%)</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{totalTaxes.toFixed(2)} SAR</h2>
              </div>
              <div style={{ background: '#eab308', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>إجمالي المصروفات (التكاليف)</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{totalExpenses.toFixed(2)} SAR</h2>
              </div>
              <div style={{ background: netProfit >= 0 ? '#16a34a' : '#dc2626', color: '#fff', padding: '25px', borderRadius: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '14px', opacity: 0.9 }}>صافي الربح الفعلي</p>
                <h2 style={{ margin: 0, fontSize: '26px' }}>{netProfit.toFixed(2)} SAR</h2>
              </div>
            </div>
          </div>
        )}

        {/* 2. إصدار فاتورة (محدثة باختيار المنتجات) */}
        {activeTab === 'new_invoice' && (
          <div style={{ background: cardBg, padding: '35px', borderRadius: '12px', maxWidth: '650px', margin: 'auto' }}>
            <h2 style={{ marginTop: 0, color: textColor, marginBottom: '20px' }}>{editingInvoiceId ? 'تعديل الفاتورة' : 'إصدار فاتورة ضريبية'}</h2>
            <form onSubmit={handleSaveInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {!editingInvoiceId && (
                <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                  <option value="">-- اختر العميل --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <label style={{ fontSize: '13px', color: '#475569', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>اختيار سريع من المخزون:</label>
                <select onChange={handleInventorySelect} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <option value="">-- اختر منتج/خدمة لتعبئة السعر تلقائياً --</option>
                  {inventory.map(item => <option key={item.id} value={item.id}>{item.name} - {item.price} ر.س</option>)}
                </select>
              </div>

              <input type="text" placeholder="أو اكتب وصف المنتج / الخدمة يدوياً" value={description} onChange={e => setDescription(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
              <input type="number" placeholder="المبلغ الأساسي (ر.س)" value={amount} onChange={e => setAmount(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />

              <div style={{ display: 'flex', gap: '15px' }}>
                <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                  <option value="Paid">مدفوعة</option><option value="Unpaid">غير مدفوعة</option>
                </select>
                <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }}>
                  <option value="no_term">فوري (بدون مدة استحقاق)</option><option value="with_term">آجل (بمدة سداد)</option>
                </select>
              </div>

              {paymentMode === 'with_term' && (
                <input type="text" placeholder="تاريخ السداد (مثال: 2026/10/05)" value={dueDate} onChange={e => setDueDate(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid #f87171', background: cardBg, color: textColor }} />
              )}
              
              <button type="submit" style={{ background: '#16a34a', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>{editingInvoiceId ? 'تحديث الفاتورة' : 'إصدار وحفظ الفاتورة'}</button>
            </form>
          </div>
        )}

        {/* 3. إدارة الفواتير والمزامنة (المرحلة الأولى والثالثة) */}
        {activeTab === 'invoices' && (
          <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, color: textColor }}>قائمة الفواتير والطلبات</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handleZidSync} style={{ background: '#8b5cf6', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🛒 مزامنة طلبات Zid</button>
                <button onClick={() => exportToCSV('invoices')} style={{ background: '#10b981', color: '#fff', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>📥 تصدير Excel</button>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${borderColor}` }}>
                  <th style={{ padding: '14px' }}>رقم الفاتورة</th><th style={{ padding: '14px' }}>العميل</th><th style={{ padding: '14px' }}>الإجمالي</th><th style={{ padding: '14px' }}>الحالة</th><th style={{ padding: '14px' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const isPaid = inv.notes?.includes('مدفوعة');
                  return (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#2563eb' }}>{inv.invoiceNumber}</td>
                      <td style={{ padding: '14px' }}>{inv.client?.name}</td>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#16a34a' }}>{inv.totalAmount} SAR</td>
                      <td style={{ padding: '14px' }}><span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', background: isPaid ? '#dcfce7' : '#fee2e2', color: isPaid ? '#16a34a' : '#dc2626' }}>{isPaid ? 'مدفوعة' : 'غير مدفوعة'}</span></td>
                      <td style={{ padding: '14px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button onClick={() => handlePrintOrPDF(inv)} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>PDF</button>
                        {isPaid && <button onClick={() => handlePrintReceipt(inv)} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>سند</button>}
                        <button onClick={() => handleWhatsAppShare(inv)} style={{ background: '#25D366', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>واتساب</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. المخزون والخدمات (المرحلة الثانية) */}
        {activeTab === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '25px', alignItems: 'flex-start' }}>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: textColor }}>إضافة منتج / خدمة</h3>
              <form onSubmit={handleSaveInventory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input type="text" placeholder="اسم المنتج أو الخدمة" value={invItemName} onChange={e => setInvItemName(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <input type="number" placeholder="السعر (الأساسي)" value={invItemPrice} onChange={e => setInvItemPrice(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>حفظ في المخزون</button>
              </form>
            </div>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: textColor }}>قائمة المنتجات والخدمات</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${borderColor}` }}>
                    <th style={{ padding: '14px' }}>المنتج / الخدمة</th><th style={{ padding: '14px' }}>السعر الأساسي</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '14px', fontWeight: 'bold' }}>{item.name}</td>
                      <td style={{ padding: '14px', color: '#16a34a' }}>{item.price} ر.س</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. المصروفات التشغيلية (المرحلة الثانية) */}
        {activeTab === 'expenses' && (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '25px', alignItems: 'flex-start' }}>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ marginTop: 0, color: textColor }}>تسجيل مصروف جديد</h3>
              <form onSubmit={handleSaveExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <input type="text" placeholder="وصف المصروف (إيجار، رواتب، تسويق...)" value={expDescription} onChange={e => setExpDescription(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <input type="number" placeholder="المبلغ" value={expAmount} onChange={e => setExpAmount(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: cardBg, color: textColor }} />
                <button type="submit" style={{ background: '#eab308', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>تسجيل المصروف</button>
              </form>
            </div>
            <div style={{ background: cardBg, padding: '30px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: textColor }}>سجل المصروفات</h3>
                <button onClick={() => exportToCSV('expenses')} style={{ background: '#10b981', color: '#fff', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>📥 تصدير Excel</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: `2px solid ${borderColor}` }}>
                    <th style={{ padding: '14px' }}>الوصف</th><th style={{ padding: '14px' }}>المبلغ</th><th style={{ padding: '14px' }}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, idx) => (
                    <tr key={idx} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '14px' }}>{exp.description}</td>
                      <td style={{ padding: '14px', fontWeight: 'bold', color: '#dc2626' }}>{exp.amount} ر.س</td>
                      <td style={{ padding: '14px' }}>{new Date(exp.createdAt || Date.now()).toLocaleDateString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. الإعدادات والربط (المرحلة الثالثة) */}
        {activeTab === 'settings' && (
          <div style={{ background: cardBg, padding: '35px', borderRadius: '12px', maxWidth: '600px', margin: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: textColor, marginBottom: '20px' }}>إعدادات المنشأة وواجهات الربط (API)</h2>
            <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <h3 style={{ color: '#2563eb', margin: '10px 0 0 0', fontSize: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>1. الإعدادات الأساسية</h3>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>اسم المنشأة:</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>الرقم الضريبي ZATCA (15 رقم):</label>
                <input type="text" value={businessVat} onChange={e => setBusinessVat(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>شعار المنشأة:</label>
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize: '14px', width: '100%' }} />
              </div>

              <h3 style={{ color: '#8b5cf6', margin: '15px 0 0 0', fontSize: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>2. الربط مع المتاجر (Zid API)</h3>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: '#475569' }}>مفتاح الربط (Token) لمنصة زد لسحب الطلبات آلياً:</label>
                <input type="password" value={zidToken} onChange={e => setZidToken(e.target.value)} placeholder="Zid API Access Token" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              </div>

              <h3 style={{ color: '#10b981', margin: '15px 0 0 0', fontSize: '16px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>3. بوابات الدفع الإلكتروني (Moyasar / Stripe)</h3>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: '#475569' }}>رابط الدفع العام (سيظهر تلقائياً على الفواتير غير المدفوعة):</label>
                <input type="url" value={paymentLinkUrl} onChange={e => setPaymentLinkUrl(e.target.value)} placeholder="https://pay.moyasar.com/..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              </div>

              <button type="submit" style={{ background: '#0f172a', color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '15px' }}>حفظ الإعدادات والربط</button>
            </form>
          </div>
        )}

      </div>

      {/* نافذة طباعة PDF الأصلية (المرحلة الأولى والثالثة) */}
      {activeModalDoc && (
        <div id="hassil-print-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.82)', backdropFilter: 'blur(5px)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px 10px' }}>
          <div className="no-print-area" style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', color: '#fff', padding: '12px 20px', borderRadius: '12px', marginBottom: '18px' }}>
            <span style={{ fontWeight: 'bold' }}>{activeModalDoc.type === 'invoice' ? `فاتورة (${activeModalDoc.inv.invoiceNumber})` : `سند (${activeModalDoc.inv.invoiceNumber})`}</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📥 حفظ PDF</button>
              <button onClick={() => setActiveModalDoc(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✖️ إغلاق</button>
            </div>
          </div>
          
          <div id="hassil-modal-print-content" style={{ width: '100%', maxWidth: '800px', background: '#fff', padding: '40px', borderRadius: '12px', direction: 'rtl' }}>
            {activeModalDoc.type === 'invoice' ? (
              <div style={{ border: '2px solid #1e3a8a', padding: '4px', borderRadius: '8px' }}>
                <div style={{ border: '1px solid #1e3a8a', padding: '30px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#000' }}>فاتورة ضريبية</h2>
                      <p style={{ color: '#64748b', margin: '0 0 4px 0', fontSize: '14px' }}>رقم الفاتورة: <strong>{activeModalDoc.inv.invoiceNumber}</strong></p>
                      <p style={{ color: '#64748b', margin: '0 0 4px 0', fontSize: '14px' }}>الرقم الضريبي: <strong>{businessVat}</strong></p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      {businessLogo && <img src={businessLogo} alt="Logo" style={{ maxHeight: '70px', maxWidth: '180px', objectFit: 'contain' }}/>}
                      <h2 style={{ color: '#1e3a8a', margin: '8px 0 4px 0', fontSize: '20px' }}>{businessName}</h2>
                    </div>
                  </div>
                  
                  <div style={{ border: '1px solid #cbd5e1', padding: '15px', marginTop: '15px', borderRadius: '6px', textAlign: 'center', background: '#f8fafc' }}>
                    <p style={{ margin: '4px 0', fontSize: '14px' }}>العميل: <strong>{activeModalDoc.inv.client?.name}</strong> | جوال: <strong dir="ltr">{activeModalDoc.inv.client?.phone}</strong></p>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'center' }}>
                    <thead><tr style={{ background: '#1e3a8a', color: '#fff' }}><th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>الوصف</th><th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>السعر</th><th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>المجموع</th></tr></thead>
                    <tbody><tr><td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.items?.[0]?.description}</td><td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.subtotal}</td><td style={{ padding: '12px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.subtotal}</td></tr></tbody>
                  </table>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'center' }}>
                    <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>الصافي</th><th style={{ padding: '12px', border: '1px solid #cbd5e1' }}>ضريبة 15%</th><th style={{ padding: '12px', border: '1px solid #cbd5e1', background: '#dcfce7', color: '#16a34a' }}>الإجمالي</th></tr></thead>
                    <tbody><tr><td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{activeModalDoc.inv.subtotal}</td><td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#dc2626' }}>{activeModalDoc.inv.taxAmount}</td><td style={{ padding: '12px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#16a34a', fontSize: '18px' }}>{activeModalDoc.inv.totalAmount}</td></tr></tbody>
                  </table>
                  
                  {/* دمج رابط الدفع (المرحلة الثالثة) */}
                  {!activeModalDoc.inv.notes?.includes('مدفوعة') && paymentLinkUrl && (
                    <div style={{ border: '2px dashed #3b82f6', borderRadius: '8px', padding: '15px', marginTop: '20px', textAlign: 'center', background: '#eff6ff' }}>
                      <h4 style={{ color: '#1d4ed8', margin: '0 0 8px 0' }}>💳 لسداد الفاتورة إلكترونياً، يرجى زيارة الرابط:</h4>
                      <a href={paymentLinkUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px', textDecoration: 'none' }}>{paymentLinkUrl}</a>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              // تصميم سند القبض مختصر
              <div style={{ border: '2px solid #16a34a', padding: '30px', borderRadius: '8px', textAlign: 'center', background: '#f0fdf4' }}>
                <h1 style={{ color: '#16a34a' }}>سند قبض رسمي</h1>
                <h2 style={{ color: '#000' }}>مبلغ: {activeModalDoc.inv.totalAmount} ر.س</h2>
                <p>استلمنا من: <strong>{activeModalDoc.inv.client?.name}</strong></p>
                <p>وذلك مقابل فاتورة رقم: <strong>{activeModalDoc.inv.invoiceNumber}</strong></p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;