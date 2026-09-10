import { useState, useEffect } from 'react';
import API from './services/api';

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
  
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeSalesStep, setActiveSalesStep] = useState(6);
  const [showQuickAction, setShowQuickAction] = useState(false);

  const [businessName, setBusinessName] = useState('محور ERP');
  const [businessVat, setBusinessVat] = useState(() => localStorage.getItem('mihwar_vat') || '300000000000003');

  const [clients, setClients] = useState([{id: 1, name: 'شركة أفق للتجارة', phone: '0500000000'}]);
  
  // المخزون الحقيقي المتصل بـ TiDB
  const [inventory, setInventory] = useState([]);
  const [newProdName, setNewProdName] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdStock, setNewProdStock] = useState('');

  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([{id: 1, name: 'أحمد حلمي', role: 'مهندس برمجيات', salary: 12000}]);
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(15);
  const [activeModalDoc, setActiveModalDoc] = useState(null);

  const theme = {
    primary: '#0f766e',
    primaryHover: '#115e59',
    secondary: '#0f172a',
    accent: '#14b8a6',
    bgMain: '#f8fafc',
    cardBg: '#ffffff',
    textDark: '#0f172a',
    textMuted: '#64748b',
    border: '#e2e8f0',
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  };

  useEffect(() => { 
    if (user) {
      setBusinessName(user.businessName || 'محور ERP');
      fetchInventory();
    }
  }, [user]);

  const fetchInventory = async () => {
    try {
      const res = await API.get('/api/inventory');
      if (res.data) setInventory(res.data);
    } catch (err) {
      console.error('فشل جلب المخزون', err);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice) {
      alert('الرجاء إدخال اسم المنتج والسعر');
      return;
    }
    try {
      await API.post('/api/inventory', {
        name: newProdName,
        price: newProdPrice,
        stock: newProdStock || 0
      });
      alert('تم حفظ المنتج في قاعدة البيانات بنجاح!');
      setNewProdName('');
      setNewProdPrice('');
      setNewProdStock('');
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.error || 'حدث خطأ أثناء حفظ المنتج');
    }
  };

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
      } catch (err) { alert(err.response?.data?.error || 'فشل تسجيل الدخول'); }
    } else if (authView === 'register') {
      try {
        const res = await API.post('/api/register', { businessName: authBusinessName, clientName: authClientName, email: authEmail, phone: authPhone, password: authPassword });
        const newUser = res.data.user;
        setUser(newUser);
        localStorage.setItem('mihwar_user', JSON.stringify(newUser));
        API.defaults.headers.common['user-id'] = newUser.id;
        alert('تم إنشاء مساحة العمل بنجاح!');
      } catch (err) { alert(err.response?.data?.error || 'فشل إنشاء الحساب'); }
    } else if (authView === 'forgot') {
      try {
        const res = await API.post('/api/forgot-password', { email: authEmail, newPassword: authPassword });
        alert(res.data.message);
        setAuthView('login'); 
        setAuthPassword(''); 
      } catch (err) { alert(err.response?.data?.error || 'فشل استعادة كلمة المرور'); }
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
    const newInvoice = { id: Date.now(), invoiceNumber: `INV-${Math.floor(Math.random()*1000000)}`, client: client, items: [{ description: prod.name, quantity: qty, unitPrice: amount }], subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), totalAmount: totalAmount.toFixed(2), createdAt: new Date() };
    setInvoices([newInvoice, ...invoices]);
    alert('تم إصدار الفاتورة بنجاح');
    setActiveTab('reports');
  };

  const exportToCSV = () => {
    let headers = ['رقم المستند', 'العميل', 'المبلغ', 'التاريخ'];
    let rows = invoices.map(inv => [inv.invoiceNumber, inv.client?.name, inv.totalAmount, new Date(inv.createdAt).toLocaleDateString('ar-SA')]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `تقرير_محور.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: '#f8fafc' }}>
        <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#ffffff', boxShadow: '10px 0 25px rgba(0,0,0,0.02)', zIndex: 10 }}>
          <div style={{ width: '100%', maxWidth: '420px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '30px' }}>
              <div style={{ width: '38px', height: '38px', background: theme.primary, borderRadius: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>ılı</div>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: theme.secondary }}>محور ERP</span>
            </div>
            <h1 style={{ margin: '0 0 8px 0', color: theme.secondary, fontSize: '28px', fontWeight: '800' }}>
              {authView === 'forgot' ? 'استعادة كلمة المرور' : (authView === 'login' ? 'مرحباً بك مجدداً' : 'انضم إلى محور اليوم')}
            </h1>
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '20px' }}>
              {authView === 'register' && (
                <>
                  <div><label style={{ fontSize: '13px', fontWeight: '600' }}>الاسم التجاري للمنشأة</label><input type="text" value={authBusinessName} onChange={(e)=>setAuthBusinessName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafc', boxSizing: 'border-box' }} /></div>
                  <div><label style={{ fontSize: '13px', fontWeight: '600' }}>اسم المدير المسؤول</label><input type="text" value={authClientName} onChange={(e)=>setAuthClientName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafc', boxSizing: 'border-box' }} /></div>
                </>
              )}
              <div><label style={{ fontSize: '13px', fontWeight: '600' }}>البريد الإلكتروني</label><input type="email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafc', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: '13px', fontWeight: '600' }}>{authView === 'forgot' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}</label><input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: '#f8fafc', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} /></div>
              {authView === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <label><input type="checkbox" defaultChecked /> تذكرني</label>
                  <span onClick={() => setAuthView('forgot')} style={{ color: theme.primary, cursor: 'pointer', fontWeight: '700' }}>نسيت كلمة المرور؟</span>
                </div>
              )}
              <button type="submit" disabled={isLoading} style={{ background: theme.primary, color: '#fff', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                {isLoading ? 'جاري المعالجة...' : (authView === 'forgot' ? 'تحديث كلمة المرور' : (authView === 'login' ? 'تسجيل الدخول' : 'إنشاء مساحة العمل'))}
              </button>
              <div style={{ textAlign: 'center', fontSize: '14px' }}>
                {authView === 'forgot' ? (
                  <span onClick={() => setAuthView('login')} style={{ color: theme.primary, fontWeight: '700', cursor: 'pointer' }}>العودة لتسجيل الدخول</span>
                ) : (
                  <span onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ color: theme.primary, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
                    {authView === 'login' ? 'سجل شركتك الآن' : 'سجل دخولك'}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
        <div style={{ flex: '1 1 50%', background: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px' }}>
          <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', fontWeight: '800' }}>إدارة متكاملة<br/>برؤية مستقبلية.</h1>
          <p style={{ fontSize: '16px', opacity: 0.75 }}>نظام سحابي متطور لربط كافة أقسام منشأتك.</p>
        </div>
      </div>
    );
  }

  const stats = { 
    sales: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) + 575, 
    purchases: 1883.70, 
    salaries: 13037.50, 
    inventoryVal: inventory.reduce((sum, i) => sum + (Number(i.price) * Number(i.stock)), 0) 
  };

  return (
    <div style={{ fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: theme.bgMain, minHeight: '100vh', color: theme.textDark }}>
      
      {/* Navbar العلوي الملكي */}
      <header style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <span style={{ fontWeight: '800', color: theme.secondary, fontSize: '18px' }}>محور</span>
          <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>🏢 مساحة العمل: <strong>{businessName}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }} onClick={handleLogout}>
          <div style={{ lineHeight: '1.2', textAlign: 'left' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: '800' }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#ef4444' }}>تسجيل خروج ↪</p>
          </div>
        </div>
      </header>

      {/* شريط الأقسام الفخم */}
      <div style={{ background: theme.secondary, color: '#fff', padding: '0 30px', display: 'flex', gap: '4px', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {[
          { id: 'dashboard', label: '📊 لوحة التحكم' },
          { id: 'sales', label: '🛍️ المبيعات' },
          { id: 'purchases', label: '🛒 المشتريات' },
          { id: 'inventory', label: '📦 المخزون (حي)' },
          { id: 'manufacturing', label: '🏭 التصنيع' },
          { id: 'hr', label: '👥 الموارد البشرية' },
          { id: 'accounting', label: '💰 المحاسبة' },
          { id: 'reports', label: '📈 التقارير' },
          { id: 'settings', label: '⚙️ الإعدادات' }
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? theme.primary : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '16px 20px', fontWeight: activeTab === tab.id ? 'bold' : 'normal' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ padding: '35px', maxWidth: '1400px', margin: 'auto' }}>
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ margin: '0 0 20px 0', fontSize: '26px', color: theme.secondary }}>مرحباً بك، {user.name} 👋</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}` }}><p>إجمالي المبيعات</p><h2>{stats.sales.toLocaleString()} ر.س</h2></div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}` }}><p>قيمة المخزون (من قاعدة البيانات)</p><h2 style={{ color: '#0d9488' }}>{stats.inventoryVal.toLocaleString()} ر.س</h2></div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
            <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '25px' }}>
              <h3 style={{ marginTop: 0, color: theme.secondary }}>➕ إضافة منتج جديد</h3>
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>اسم المنتج</label><input type="text" value={newProdName} onChange={e=>setNewProdName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>سعر البيع (ر.س)</label><input type="number" value={newProdPrice} onChange={e=>setNewProdPrice(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: '12px', fontWeight: 'bold' }}>الكمية الأولية بالمخزون</label><input type="number" value={newProdStock} onChange={e=>setNewProdStock(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}`, boxSizing: 'border-box' }} /></div>
                <button type="submit" style={{ background: theme.primary, color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>حفظ في قاعدة البيانات</button>
              </form>
            </div>

            <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '25px' }}>
              <h3 style={{ marginTop: 0, color: theme.secondary }}>📦 مستودع المنتجات (متصل بـ TiDB)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
                <thead><tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}` }}><th style={{ padding: '10px' }}>المنتج</th><th style={{ padding: '10px' }}>السعر</th><th style={{ padding: '10px' }}>الرصيد الفعلي</th></tr></thead>
                <tbody>
                  {inventory.length === 0 ? (
                    <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>لا توجد منتجات مسجلة في المستودع. أضف منتجاً جديداً الآن!</td></tr>
                  ) : inventory.map(i => (
                    <tr key={i.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{i.name}</td>
                      <td style={{ padding: '12px' }}>{i.price} ر.س</td>
                      <td style={{ padding: '12px', color: '#0d9488', fontWeight: 'bold' }}>{i.stock} وحدة</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: theme.secondary }}>إصدار فاتورة مبيعات</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div><label>العميل</label><select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}><option value="">-- اختر العميل --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label>المنتج (يسحب من مخزون TiDB)</label><select value={selectedProductId} onChange={handleProductSelect} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }}><option value="">-- اختر من المستودع الحقيقي --</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.name} ({p.price} ر.س)</option>)}</select></div>
              <div><label>الكمية</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }} /></div>
              <div><label>السعر</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${theme.border}` }} /></div>
            </div>
            <button onClick={handleSaveInvoice} style={{ background: theme.primary, color: '#fff', padding: '12px 25px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>حفظ الفاتورة</button>
          </div>
        )}

        {['purchases', 'manufacturing', 'hr', 'accounting', 'settings'].includes(activeTab) && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '50px', textAlign: 'center' }}>
            <span style={{ fontSize: '40px' }}>⚙️</span>
            <h2 style={{ color: theme.secondary }}>وحدة {activeTab.toUpperCase()} جاهزة للربط</h2>
            <p style={{ color: theme.textMuted }}>هذا القسم مفعل في واجهة النظام وبانتظار تفعيل جدوله السحابي.</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px' }}>
            <h2 style={{ marginTop: 0, color: theme.secondary }}>الفواتير والتقارير</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead><tr style={{ borderBottom: `2px solid ${theme.border}` }}><th style={{ padding: '10px' }}>رقم الفاتورة</th><th style={{ padding: '10px' }}>العميل</th><th style={{ padding: '10px' }}>المبلغ</th></tr></thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center' }}>لا توجد فواتير.</td></tr> : invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '10px' }}>#{inv.invoiceNumber}</td><td style={{ padding: '10px' }}>{inv.client?.name}</td><td style={{ padding: '10px', color: '#0d9488', fontWeight: 'bold' }}>{inv.totalAmount} ر.س</td></tr>
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