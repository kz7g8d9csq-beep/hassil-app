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

  const [authView, setAuthView] = useState('login'); // login, register, forgot
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

  // لوحة ألوان عصرية ونظيفة (Modern Palette)
  const theme = {
    primary: '#0f766e',      // أخضر بترولي عميق وفاخر
    primaryHover: '#115e59',
    secondary: '#0f172a',    // كحلي داكن ملكي
    accent: '#14b8a6',       // زبرجد مضيء
    bgMain: '#f8fafc',       // خلفية رمادية فاتحة جداً مريحة للعين
    cardBg: '#ffffff',       // بطاقات بيضاء نقية
    textDark: '#0f172a',     
    textMuted: '#64748b',    
    border: '#e2e8f0',       
    shadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
  };

  useEffect(() => { if (user) setBusinessName(user.businessName || 'محور ERP'); }, [user]);

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
    } else if (authView === 'register') {
      try {
        const res = await API.post('/api/register', { businessName: authBusinessName, clientName: authClientName, email: authEmail, phone: authPhone, password: authPassword });
        const newUser = res.data.user;
        setUser(newUser);
        localStorage.setItem('mihwar_user', JSON.stringify(newUser));
        API.defaults.headers.common['user-id'] = newUser.id;
        alert('تم إنشاء مساحة العمل بنجاح! مرحباً بك في محور.');
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
    const newInvoice = { id: Date.now(), invoiceNumber: `INV-${Math.floor(Math.random()*1000000)}`, client: client, items: [{ description: prod.name, quantity: qty, unitPrice: amount }], subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), totalAmount: totalAmount.toFixed(2), createdAt: new Date(), notes: 'غير مدفوعة' };
    setInvoices([newInvoice, ...invoices]);
    alert('تم إصدار الفاتورة بنجاح وحفظها في النظام');
    setActiveTab('reports');
  };

  const exportToCSV = () => {
    let headers = ['رقم المستند', 'العميل', 'المبلغ', 'التاريخ'];
    let rows = invoices.map(inv => [inv.invoiceNumber, inv.client?.name, inv.totalAmount, new Date(inv.createdAt).toLocaleDateString('ar-SA')]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `تقرير_محور.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // === تصميم شاشة الدخول الفاخرة ===
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
            <p style={{ margin: '0 0 30px 0', color: theme.textMuted, fontSize: '14px', lineHeight: '1.5' }}>
              {authView === 'forgot' ? 'أدخل بريدك الإلكتروني لتعيين كلمة مرور جديدة بكل سهولة.' : (authView === 'login' ? 'أدخل بيانات حسابك لإدارة منشأتك بذكاء.' : 'أنشئ مساحة عمل لشركتك وابدأ الإدارة الفورية.')}
            </p>
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {authView === 'register' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: theme.textDark, marginBottom: '6px', fontWeight: '600' }}>الاسم التجاري للمنشأة</label>
                    <input type="text" placeholder="مثال: شركة أفق للتجارة" value={authBusinessName} onChange={(e)=>setAuthBusinessName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, outline: 'none', background: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: theme.textDark, marginBottom: '6px', fontWeight: '600' }}>اسم المدير المسؤول</label>
                    <input type="text" placeholder="اسمك الكريم" value={authClientName} onChange={(e)=>setAuthClientName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, outline: 'none', background: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: theme.textDark, marginBottom: '6px', fontWeight: '600' }}>البريد الإلكتروني</label>
                <input type="email" placeholder="name@company.com" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, outline: 'none', background: '#f8fafc', fontSize: '14px', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: theme.textDark, marginBottom: '6px', fontWeight: '600' }}>
                  {authView === 'forgot' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
                </label>
                <input type="password" placeholder="••••••••" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: `1px solid ${theme.border}`, outline: 'none', background: '#f8fafc', fontSize: '14px', direction: 'ltr', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>

              {authView === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginTop: '2px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textMuted, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: theme.primary, width: '16px', height: '16px' }} /> تذكرني
                  </label>
                  <span onClick={() => setAuthView('forgot')} style={{ color: theme.primary, cursor: 'pointer', fontWeight: '700' }}>نسيت كلمة المرور؟</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} style={{ background: theme.primary, color: '#fff', padding: '15px', borderRadius: '10px', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)', transition: 'background 0.2s', marginTop: '10px' }}>
                {isLoading ? 'جاري المعالجة...' : (authView === 'forgot' ? 'تحديث كلمة المرور' : (authView === 'login' ? 'تسجيل الدخول' : 'إنشاء مساحة العمل'))}
              </button>

              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
                {authView === 'forgot' ? (
                  <span onClick={() => setAuthView('login')} style={{ color: theme.primary, fontWeight: '700', cursor: 'pointer' }}>العودة لتسجيل الدخول</span>
                ) : (
                  <>
                    <span style={{ color: theme.textMuted }}>{authView === 'login' ? 'ليس لديك مساحة عمل؟ ' : 'لديك حساب بالفعل؟ '}</span>
                    <span onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ color: theme.primary, fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}>
                      {authView === 'login' ? 'سجل شركتك الآن' : 'سجل دخولك'}
                    </span>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        <div style={{ flex: '1 1 50%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          <span style={{ color: theme.accent, fontSize: '14px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px' }}>منصة الأعمال الذكية</span>
          <h1 style={{ fontSize: '48px', margin: '0 0 20px 0', lineHeight: '1.2', fontWeight: '800' }}>إدارة متكاملة<br/>برؤية مستقبلية.</h1>
          <p style={{ fontSize: '16px', opacity: 0.75, maxWidth: '450px', lineHeight: '1.7', margin: 0 }}>ارتقِ بكفاءة شركتك عبر ربط المبيعات، المخزون، الحسابات، والموارد البشرية في نظام سحابي فائق الأمان والسرعة.</p>
        </div>
      </div>
    );
  }

  const stats = { sales: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) + 575, purchases: 1883.70, salaries: 13037.50, inventoryVal: 14448.00 };

  // === الواجهة الرئيسية الملكية الفخمة ===
  return (
    <div style={{ fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: theme.bgMain, minHeight: '100vh', color: theme.textDark }}>
      
      {/* شريط التنقل العلوي الملكي */}
      <header style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: `1px solid ${theme.border}`, paddingLeft: '25px' }}>
            <div style={{ width: '32px', height: '32px', background: theme.primary, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>ılı</div>
            <span style={{ fontWeight: '800', color: theme.secondary, fontSize: '18px', letterSpacing: '0.5px' }}>محور</span>
          </div>
          <div style={{ fontSize: '13px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px' }}>
            <span>🏢 مساحة العمل:</span><strong style={{ color: theme.secondary }}>{businessName}</strong>
          </div>
        </div>

        <div style={{ flex: 1, maxWidth: '450px', margin: '0 30px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textMuted }}>🔍</span>
            <input type="text" placeholder="ابحث السجلات، الفواتير، أو الموظفين..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }} />
            <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: theme.textMuted, fontWeight: 'bold' }}>⌘K</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button style={{ background: '#f1f5f9', border: 'none', width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', position: 'relative' }}>
            🔔<span style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', background: '#ef4444', borderRadius: '50%' }}></span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px', cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{ width: '38px', height: '38px', background: theme.accent, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>
              {user.name ? user.name.substring(0, 2) : 'ما'}
            </div>
            <div style={{ lineHeight: '1.2' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: theme.secondary }}>{user.name}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>تسجيل خروج ↪</p>
            </div>
          </div>
        </div>
      </header>

      {/* شريط الأقسام السحابي (Modules Navigation) */}
      <div style={{ background: theme.secondary, color: '#fff', padding: '0 30px', display: 'flex', gap: '4px', fontSize: '13px', overflowX: 'auto', whiteSpace: 'nowrap', boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.05)' }}>
        {[
          { id: 'dashboard', label: '📊 لوحة التحكم' },
          { id: 'sales', label: '🛍️ المبيعات والعملاء' },
          { id: 'purchases', label: '🛒 المشتريات' },
          { id: 'inventory', label: '📦 المخزون' },
          { id: 'manufacturing', label: '🏭 التصنيع' },
          { id: 'hr', label: '👥 الموارد البشرية' },
          { id: 'accounting', label: '💰 المحاسبة' },
          { id: 'reports', label: '📈 التقارير' },
          { id: 'settings', label: '⚙️ الإعدادات' }
        ].map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ background: activeTab === tab.id ? theme.primary : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '16px 20px', fontWeight: activeTab === tab.id ? '8px' : '500', borderBottom: activeTab === tab.id ? `3px solid ${theme.accent}` : '3px solid transparent', transition: 'all 0.2s', borderRadius: '4px 4px 0 0' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <main style={{ padding: '35px', maxWidth: '1400px', margin: 'auto' }}>

        {/* 1. لوحة التحكم */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: '0 0 5px 0', fontSize: '26px', color: theme.secondary, fontWeight: '800' }}>مرحباً بك، {user.name} 👋</h1>
                <p style={{ margin: 0, fontSize: '14px', color: theme.textMuted }}>نظرة شاملة ومحدثة لحركة الأداء المالي والتشغيلي لشركتك اليوم.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                <button onClick={exportToCSV} style={{ background: '#fff', border: `1px solid ${theme.border}`, padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', color: theme.textMuted, boxShadow: theme.shadow }}>📥 تصدير البيانات</button>
                <button onClick={() => setShowQuickAction(!showQuickAction)} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)' }}>⊕ إجراء سريع ▼</button>
                {showQuickAction && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '220px', zIndex: 50, padding: '8px 0' }}>
                    <div onClick={()=>{setActiveTab('sales'); setShowQuickAction(false);}} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: theme.secondary }}>🧾 فاتورة مبيعات جديدة</div>
                    <div onClick={()=>{setActiveTab('inventory'); setShowQuickAction(false);}} style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: theme.secondary }}>📦 إضافة صنف للمخزون</div>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted, fontWeight: '700' }}>إجمالي المبيعات</p>
                <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary, fontWeight: '800' }}>{stats.sales.toLocaleString()} <span style={{ fontSize: '14px', color: theme.textMuted }}>ر.س</span></h2>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted, fontWeight: '700' }}>إجمالي المشتريات</p>
                <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary, fontWeight: '800' }}>{stats.purchases.toLocaleString()} <span style={{ fontSize: '14px', color: theme.textMuted }}>ر.س</span></h2>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted, fontWeight: '700' }}>صافي الرواتب والأجور</p>
                <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary, fontWeight: '800' }}>{stats.salaries.toLocaleString()} <span style={{ fontSize: '14px', color: theme.textMuted }}>ر.س</span></h2>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '14px', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted, fontWeight: '700' }}>إجمالي قيمة المخزون</p>
                <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary, fontWeight: '800' }}>{stats.inventoryVal.toLocaleString()} <span style={{ fontSize: '14px', color: theme.textMuted }}>ر.س</span></h2>
              </div>
            </div>
          </div>
        )}

        {/* 2. المبيعات */}
        {activeTab === 'sales' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
              <div><h1 style={{ margin: 0, fontSize: '26px', color: theme.secondary, fontWeight: '800' }}>إدارة المبيعات والفواتير</h1></div>
              <button onClick={handleSaveInvoice} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)' }}>⊕ إصدار الفاتورة</button>
            </div>

            <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px', boxShadow: theme.shadow }}>
              <div style={{ marginBottom: '35px', background: '#f8fafc', padding: '20px', borderRadius: '10px', border: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: '0 0 15px 0', color: theme.secondary, fontSize: '15px', fontWeight: '800' }}>دورة المعاملات التجارية</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '3px', background: '#cbd5e1', zIndex: 1 }}></div>
                  {[ { id: 1, label: 'عرض سعر' }, { id: 2, label: 'الاعتماد' }, { id: 3, label: 'طلب البيع' }, { id: 4, label: 'حجز مخزون' }, { id: 5, label: 'التسليم' }, { id: 6, label: 'الفاتورة' }, { id: 7, label: 'التحصيل' }, { id: 8, label: 'المرتجع' } ].map(step => (
                    <div key={step.id} onClick={() => setActiveSalesStep(step.id)} style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '6px', background: activeSalesStep === step.id ? theme.secondary : '#fff', padding: '6px 12px', borderRadius: '20px', border: `1px solid ${activeSalesStep === step.id ? theme.secondary : '#cbd5e1'}`, cursor: 'pointer', color: activeSalesStep === step.id ? '#fff' : theme.textDark }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{step.id}</span>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div><label style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '700', display: 'block', marginBottom: '6px' }}>العميل</label><select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none' }}><option value="">-- اختر العميل --</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '700', display: 'block', marginBottom: '6px' }}>المنتج</label><select value={selectedProductId} onChange={handleProductSelect} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none' }}><option value="">-- اختر المنتج من المخزون --</option>{inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '700', display: 'block', marginBottom: '6px' }}>الكمية</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} /></div>
                <div><label style={{ fontSize: '13px', color: theme.textMuted, fontWeight: '700', display: 'block', marginBottom: '6px' }}>سعر الوحدة (ر.س)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} /></div>
              </div>
            </div>
          </div>
        )}

        {/* 3. المخزون */}
        {activeTab === 'inventory' && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px', boxShadow: theme.shadow }}>
            <h2 style={{ margin: '0 0 20px 0', color: theme.secondary, fontWeight: '800' }}>مستودعات المنشأة والأرصدة</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}`, color: theme.textMuted, fontSize: '13px' }}><th style={{ padding: '14px' }}>اسم المنتج / الصنف</th><th style={{ padding: '14px' }}>سعر البيع</th><th style={{ padding: '14px' }}>الرصيد الفعلي</th></tr></thead>
              <tbody>{inventory.map(i => <tr key={i.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '14px', fontWeight: '700', color: theme.secondary }}>{i.name}</td><td style={{ padding: '14px', color: theme.textDark }}>{i.price} ر.س</td><td style={{ padding: '14px', color: '#0d9488', fontWeight: '800' }}>{i.stock} وحدة متوفرة</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {/* 4. الموارد البشرية */}
        {activeTab === 'hr' && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px', boxShadow: theme.shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: theme.secondary, fontWeight: '800' }}>سجل الموظفين ومسيرات الرواتب</h2>
              <button style={{ background: theme.primary, color: '#fff', padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>+ إضافة موظف جديد</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead><tr style={{ background: '#f8fafc', borderBottom: `2px solid ${theme.border}`, color: theme.textMuted, fontSize: '13px' }}><th style={{ padding: '14px' }}>الموظف</th><th style={{ padding: '14px' }}>المسمى الوظيفي</th><th style={{ padding: '14px' }}>الراتب الأساسي</th></tr></thead>
              <tbody>{employees.map(e => <tr key={e.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '14px', fontWeight: '700', color: theme.secondary }}>{e.name}</td><td style={{ padding: '14px', color: theme.textDark }}>{e.role}</td><td style={{ padding: '14px', color: '#0d9488', fontWeight: '800' }}>{e.salary} ر.س</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {/* الأقسام الأخرى */}
        {['purchases', 'manufacturing', 'accounting'].includes(activeTab) && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '60px', textAlign: 'center', boxShadow: theme.shadow }}>
            <span style={{ fontSize: '45px' }}>🚀</span>
            <h2 style={{ color: theme.secondary, fontWeight: '800', margin: '15px 0 5px 0' }}>وحدة {activeTab.toUpperCase()} قيد التشغيل المتقدم</h2>
            <p style={{ color: theme.textMuted, margin: 0 }}>يتم الآن ربط تدفق البيانات المالي لهذا القسم مع محرك قواعد البيانات السحابي في TiDB.</p>
          </div>
        )}

        {/* 8. التقارير */}
        {activeTab === 'reports' && (
          <div style={{ background: theme.cardBg, borderRadius: '14px', border: `1px solid ${theme.border}`, padding: '30px', boxShadow: theme.shadow }}>
            <h2 style={{ margin: '0 0 20px 0', color: theme.secondary, fontWeight: '800' }}>سجل المستندات والفواتير الصادرة</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
              <thead><tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.textMuted }}><th style={{ padding: '14px' }}>رقم المستند</th><th style={{ padding: '14px' }}>العميل</th><th style={{ padding: '14px' }}>الإجمالي النهائي</th><th style={{ padding: '14px' }}>إجراءات</th></tr></thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: theme.textMuted }}>لا توجد فواتير مصدرة حتى الآن. أجرِ معاملة مبيعات جديدة لظهر هنا.</td></tr> : invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: `1px solid ${theme.border}` }}><td style={{ padding: '14px', fontWeight: '700' }}>#{inv.invoiceNumber}</td><td style={{ padding: '14px', fontWeight: '600' }}>{inv.client?.name}</td><td style={{ padding: '14px', color: '#0d9488', fontWeight: '800' }}>{inv.totalAmount} ر.س</td><td style={{ padding: '14px' }}><button onClick={() => setActiveModalDoc({ type: 'invoice', inv })} style={{ background: theme.accent, color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>معاينة PDF</button></td></tr>
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