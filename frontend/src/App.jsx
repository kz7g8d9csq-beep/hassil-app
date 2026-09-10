import { useState, useEffect, useRef } from 'react';
import API from './services/api';
import QRCode from 'qrcode';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mihwar_user');
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
  const [isLoading, setIsLoading] = useState(false);
  
  // التنقل بين شاشات الـ ERP المتكاملة
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeSalesStep, setActiveSalesStep] = useState(6);
  const [showQuickAction, setShowQuickAction] = useState(false);

  const [businessName, setBusinessName] = useState('محور ERP');
  const [businessCity, setBusinessCity] = useState('المملكة العربية السعودية');
  const [businessVat, setBusinessVat] = useState(() => localStorage.getItem('mihwar_vat') || '300000000000003');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(() => localStorage.getItem('mihwar_payment_link') || '');

  // بيانات وهمية مؤقتة للواجهة (لحين ربط كل قسم بالباك إند)
  const [clients, setClients] = useState([{id: 1, name: 'شركة أفق للتجارة', phone: '0500000000'}]);
  const [inventory, setInventory] = useState([
    {id: 1, name: 'Late landed cost 1783978884332', price: 1500, stock: 120},
    {id: 2, name: 'WAVG 1783978561289', price: 200, stock: 45},
    {id: 3, name: 'مادة خام (بلاستيك)', price: 15, stock: 500}
  ]);
  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([{id: 1, name: 'أحمد حلمي', role: 'مهندس برمجيات', salary: 12000}]);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(15);
  
  const [activeModalDoc, setActiveModalDoc] = useState(null);

  const theme = {
    primary: '#26574f',    
    secondary: '#0b1b3d',  
    accent: '#408079',     
    bgMain: '#f3f4f6',     
    cardBg: '#ffffff',     
    textDark: '#1e293b',   
    textMuted: '#64748b',  
    border: '#e2e8f0'      
  };

  useEffect(() => {
    if (user) setBusinessName(user.businessName || 'محور ERP');
  }, [user]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    if (authView === 'login') {
      try {
        const res = await API.post('/api/login', { email: authEmail, password: authPassword });
        const loggedInUser = res.data.user;
        setUser(loggedInUser);
        localStorage.setItem('mihwar_user', JSON.stringify(loggedInUser));
        API.defaults.headers.common['user-id'] = loggedInUser.id;
      } catch (err) { alert(err.response?.data?.error || 'فشل تسجيل الدخول، تأكد من صحة البيانات'); }
    } else {
      try {
        const res = await API.post('/api/register', { businessName: authBusinessName, clientName: authClientName, email: authEmail, phone: authPhone, password: authPassword });
        const newUser = res.data.user;
        setUser(newUser);
        localStorage.setItem('mihwar_user', JSON.stringify(newUser));
        API.defaults.headers.common['user-id'] = newUser.id;
        alert('تم إنشاء مساحة العمل بنجاح! مرحباً بك في محور.');
      } catch (err) { alert(err.response?.data?.error || 'فشل إنشاء الحساب'); }
    }
    setIsLoading(false);
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem('mihwar_user'); delete API.defaults.headers.common['user-id']; setAuthView('login'); };

  const handleProductSelect = (e) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    const prod = inventory.find(p => p.id == prodId);
    if(prod) setAmount(prod.price);
  };

  const handleSaveInvoice = () => {
    if(!selectedClientId || !selectedProductId) { alert('الرجاء اختيار العميل والمنتج'); return; }
    const prod = inventory.find(p => p.id == selectedProductId);
    const client = clients.find(c => c.id == selectedClientId);
    const subtotal = Number(amount) * qty;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;
    const newInvoice = { id: Date.now(), invoiceNumber: `INV-${Math.floor(Math.random()*1000000)}`, client: client, items: [{ description: prod.name, quantity: qty, unitPrice: amount }], subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), totalAmount: totalAmount.toFixed(2), createdAt: new Date(), notes: 'غير مدفوعة' };
    setInvoices([newInvoice, ...invoices]);
    alert('تم إنشاء الفاتورة بنجاح');
    setActiveTab('reports');
  };

  const exportToCSV = (type) => {
    let headers = ['رقم المستند', 'العميل', 'المبلغ', 'التاريخ'];
    let rows = invoices.map(inv => [inv.invoiceNumber, inv.client?.name, inv.totalAmount, new Date(inv.createdAt).toLocaleDateString('ar-SA')]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `تقرير_محور.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: '#fff' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#f8fafc', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <p style={{ margin: '0 0 5px 0', color: theme.textMuted, fontSize: '14px', fontWeight: 'bold' }}>{authView === 'login' ? 'مرحباً بعودتك' : 'ابدأ رحلتك الآن'}</p>
            <h1 style={{ margin: '0 0 10px 0', color: theme.secondary, fontSize: '32px' }}>{authView === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء مساحة عمل جديدة'}</h1>
            <p style={{ margin: '0 0 30px 0', color: theme.textMuted, fontSize: '13px' }}>{authView === 'login' ? 'أدخل بياناتك للوصول إلى مساحة العمل.' : 'قم بتأسيس شركتك في محور للبدء في إدارة أعمالك.'}</p>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {authView === 'register' && (
                <>
                  <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>الاسم التجاري للمنشأة</label><input type="text" value={authBusinessName} onChange={(e)=>setAuthBusinessName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>اسم المالك أو المدير</label><input type="text" value={authClientName} onChange={(e)=>setAuthClientName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff' }} /></div>
                </>
              )}
              <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>البريد الإلكتروني</label><input type="email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} /></div>
              <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>كلمة المرور</label><input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} /></div>
              <button type="submit" disabled={isLoading} style={{ background: theme.primary, color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <span>{isLoading ? 'جاري المعالجة...' : (authView === 'login' ? 'دخول آمن' : 'تأسيس المنشأة')}</span>{!isLoading && <span>←</span>}
              </button>
              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>
                <span style={{ color: theme.textMuted }}>{authView === 'login' ? 'ليس لديك حساب منشأة؟ ' : 'لديك مساحة عمل مسبقاً؟ '}</span>
                <span onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ color: theme.primary, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>{authView === 'login' ? 'سجل منشأتك الآن' : 'تسجيل الدخول'}</span>
              </div>
            </form>
          </div>
        </div>
        <div style={{ flex: 1, background: '#1c2c27', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(64,128,121,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}><div style={{ width: '40px', height: '40px', background: theme.accent, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px' }}>ılı</div><div><h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' }}>محور</h2><p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>ERP • منصة الأعمال</p></div></div>
          <p style={{ color: theme.accent, fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>— إدارة أذكى. قرار أسرع.</p>
          <h1 style={{ fontSize: '56px', margin: '0 0 20px 0', lineHeight: '1.2' }}>كل أعمالك<br/>في محور واحد.</h1>
          <p style={{ fontSize: '16px', opacity: 0.8, maxWidth: '400px', lineHeight: '1.6', marginBottom: '50px' }}>من المبيعات والمخزون إلى الموارد البشرية والتصنيع، رؤية موحدة تمنحك السيطرة الكاملة.</p>
        </div>
      </div>
    );
  }

  const stats = { sales: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) + 575, purchases: 1883.70, salaries: 13037.50, inventoryVal: 14448.00 };

  return (
    <div style={{ fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: theme.bgMain, minHeight: '100vh', color: theme.textDark }}>
      
      {/* Navbar العلوي */}
      <header style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `1px solid ${theme.border}`, paddingLeft: '20px' }}>
            <div style={{ width: '28px', height: '28px', background: theme.secondary, borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>ılı</div>
            <span style={{ fontWeight: 'bold', color: theme.secondary, fontSize: '18px' }}>محور</span>
          </div>
          <div style={{ fontSize: '13px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>مساحة العمل</span><span>&lt;</span><strong style={{ color: theme.textDark }}>{activeTab === 'dashboard' ? 'لوحة التحكم' : activeTab === 'sales' ? 'المبيعات' : activeTab === 'hr' ? 'الموارد البشرية' : 'إدارة النظام'}</strong>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
          <div style={{ background: theme.bgMain, borderRadius: '6px', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${theme.border}` }}><span style={{ color: theme.textMuted }}>🔍</span><input type="text" placeholder="ابحث عن فاتورة، منتج، عميل أو موظف..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }} /><span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: theme.textMuted }}>⌘ K</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px', cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{ width: '35px', height: '35px', background: '#eab308', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>{user.name ? user.name.substring(0, 2) : 'ما'}</div>
            <div style={{ lineHeight: '1.2' }}><p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{user.role}</p><p style={{ margin: 0, fontSize: '11px', color: theme.textMuted }}>تسجيل خروج</p></div>
          </div>
        </div>
      </header>

      {/* شريط الأقسام المتكامل (Modules Navbar) */}
      <div style={{ background: theme.secondary, color: '#fff', padding: '0 25px', display: 'flex', gap: '5px', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { id: 'dashboard', label: '📊 لوحة التحكم' },
          { id: 'sales', label: '🛍️ المبيعات والعملاء' },
          { id: 'purchases', label: '🛒 المشتريات والموردين' },
          { id: 'inventory', label: '📦 المخزون' },
          { id: 'manufacturing', label: '🏭 التصنيع والإنتاج' },
          { id: 'hr', label: '👥 الموارد البشرية' },
          { id: 'accounting', label: '💰 المحاسبة والمالية' },
          { id: 'reports', label: '📈 التقارير' },
          { id: 'settings', label: '⚙️ الإعدادات' }
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? theme.primary : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '15px 15px', fontWeight: activeTab === tab.id ? 'bold' : 'normal', borderBottom: activeTab === tab.id ? `3px solid #eab308` : '3px solid transparent', transition: 'all 0.2s' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ padding: '30px', maxWidth: '1400px', margin: 'auto' }}>

        {/* === 1. لوحة التحكم === */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
              <div><p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#eab308', fontWeight: 'bold' }}>• مساحة عمل: {businessName}</p><h1 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>صباح الخير، {user.name}</h1></div>
              <button onClick={() => setShowQuickAction(!showQuickAction)} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>⊕ إجراء سريع</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}><p style={{ color: theme.textMuted }}>إجمالي المبيعات</p><h2 style={{ margin: 0, color: theme.secondary }}>{stats.sales} ر.س</h2></div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}><p style={{ color: theme.textMuted }}>إجمالي المشتريات</p><h2 style={{ margin: 0, color: theme.secondary }}>{stats.purchases} ر.س</h2></div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}><p style={{ color: theme.textMuted }}>صافي الرواتب</p><h2 style={{ margin: 0, color: theme.secondary }}>{stats.salaries} ر.س</h2></div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}><p style={{ color: theme.textMuted }}>قيمة المخزون</p><h2 style={{ margin: 0, color: theme.secondary }}>{stats.inventoryVal} ر.س</h2></div>
            </div>
          </div>
        )}

        {/* === 2. المبيعات === */}
        {activeTab === 'sales' && (
          <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: theme.secondary }}>إصدار فاتورة مبيعات</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div><label>العميل</label><select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc' }}><option value="">-- اختر العميل --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label>المنتج</label><select value={selectedProductId} onChange={handleProductSelect} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc' }}><option value="">-- اختر المنتج --</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label>الكمية</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}` }} /></div>
              <div><label>سعر الوحدة</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}` }} /></div>
            </div>
            <button onClick={handleSaveInvoice} style={{ background: theme.primary, color: '#fff', padding: '12px 25px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontWeight: 'bold' }}>إصدار الفاتورة</button>
          </div>
        )}

        {/* === 3. المخزون === */}
        {activeTab === 'inventory' && (
          <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: theme.secondary }}>إدارة المخزون والمستودعات</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}><th style={{ padding: '12px' }}>المنتج</th><th style={{ padding: '12px' }}>السعر</th><th style={{ padding: '12px' }}>الكمية المتوفرة</th></tr></thead>
              <tbody>{inventory.map(i => <tr key={i.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '12px', fontWeight: 'bold' }}>{i.name}</td><td style={{ padding: '12px' }}>{i.price} ر.س</td><td style={{ padding: '12px', color: '#16a34a', fontWeight: 'bold' }}>{i.stock} وحدة</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {/* === 4. الموارد البشرية === */}
        {activeTab === 'hr' && (
          <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: theme.secondary }}>إدارة الموظفين والرواتب</h2>
              <button style={{ background: theme.primary, color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>+ إضافة موظف</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}><th style={{ padding: '12px' }}>اسم الموظف</th><th style={{ padding: '12px' }}>المسمى الوظيفي</th><th style={{ padding: '12px' }}>الراتب الأساسي</th></tr></thead>
              <tbody>{employees.map(e => <tr key={e.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '12px', fontWeight: 'bold' }}>{e.name}</td><td style={{ padding: '12px' }}>{e.role}</td><td style={{ padding: '12px', color: '#16a34a' }}>{e.salary} ر.س</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {/* الشاشات الأخرى تحت الإنشاء */}
        {['purchases', 'manufacturing', 'accounting'].includes(activeTab) && (
          <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '50px', textAlign: 'center' }}>
            <span style={{ fontSize: '40px' }}>🚧</span>
            <h2 style={{ color: theme.secondary }}>هذا القسم قيد التطوير</h2>
            <p style={{ color: theme.textMuted }}>جاري ربط هذا القسم مع محرك قاعدة البيانات (TiDB) ليكون جاهزاً قريباً.</p>
          </div>
        )}

        {/* === 8. التقارير === */}
        {activeTab === 'reports' && (
          <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: theme.secondary }}>التقارير المحفوظة</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead><tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.textMuted }}><th style={{ padding: '12px' }}>المعرف</th><th style={{ padding: '12px' }}>العميل</th><th style={{ padding: '12px' }}>القيمة</th><th style={{ padding: '12px' }}>معاينة</th></tr></thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>لا توجد فواتير.</td></tr> : invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '15px' }}>#{inv.invoiceNumber}</td><td style={{ padding: '15px', fontWeight: 'bold' }}>{inv.client?.name}</td><td style={{ padding: '15px', color: '#16a34a' }}>{inv.totalAmount} ر.س</td><td style={{ padding: '15px' }}><button onClick={() => setActiveModalDoc({ type: 'invoice', inv })} style={{ background: theme.accent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>PDF</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;