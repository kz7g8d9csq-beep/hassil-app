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

  const theme = { primary: '#26574f', secondary: '#0b1b3d', accent: '#408079', bgMain: '#f3f4f6', cardBg: '#ffffff', textDark: '#1e293b', textMuted: '#64748b', border: '#e2e8f0' };

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
    alert('تم إنشاء الفاتورة بنجاح');
    setActiveTab('reports');
  };

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: '#fff' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#f8fafc', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <p style={{ margin: '0 0 5px 0', color: theme.textMuted, fontSize: '14px', fontWeight: 'bold' }}>
              {authView === 'forgot' ? 'استعادة الوصول' : (authView === 'login' ? 'مرحباً بعودتك' : 'ابدأ رحلتك الآن')}
            </p>
            <h1 style={{ margin: '0 0 10px 0', color: theme.secondary, fontSize: '32px' }}>
              {authView === 'forgot' ? 'إعادة تعيين كلمة المرور' : (authView === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء مساحة عمل جديدة')}
            </h1>
            
            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {authView === 'register' && (
                <>
                  <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>الاسم التجاري للمنشأة</label><input type="text" value={authBusinessName} onChange={(e)=>setAuthBusinessName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff' }} /></div>
                  <div><label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>اسم المالك أو المدير</label><input type="text" value={authClientName} onChange={(e)=>setAuthClientName(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff' }} /></div>
                </>
              )}
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>البريد الإلكتروني</label>
                <input type="email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>
                  {authView === 'forgot' ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
                </label>
                <input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} />
              </div>

              {authView === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textDark, cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: theme.primary }} /> تذكر هذا الجهاز
                  </label>
                  <span onClick={() => setAuthView('forgot')} style={{ color: theme.primary, cursor: 'pointer', fontWeight: 'bold' }}>نسيت كلمة المرور؟</span>
                </div>
              )}

              <button type="submit" disabled={isLoading} style={{ background: theme.primary, color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                {isLoading ? 'جاري المعالجة...' : (authView === 'forgot' ? 'إعادة التعيين' : (authView === 'login' ? 'دخول آمن' : 'تأسيس المنشأة'))}
              </button>

              <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>
                {authView === 'forgot' ? (
                  <span onClick={() => setAuthView('login')} style={{ color: theme.primary, fontWeight: 'bold', cursor: 'pointer' }}>العودة لتسجيل الدخول</span>
                ) : (
                  <>
                    <span style={{ color: theme.textMuted }}>{authView === 'login' ? 'ليس لديك حساب منشأة؟ ' : 'لديك مساحة عمل مسبقاً؟ '}</span>
                    <span onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} style={{ color: theme.primary, fontWeight: 'bold', cursor: 'pointer' }}>
                      {authView === 'login' ? 'سجل منشأتك الآن' : 'تسجيل الدخول'}
                    </span>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
        <div style={{ flex: 1, background: '#1c2c27', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px' }}>
          <h1 style={{ fontSize: '56px', margin: '0 0 20px 0' }}>كل أعمالك<br/>في محور واحد.</h1>
          <p style={{ fontSize: '16px', opacity: 0.8 }}>من المبيعات والمخزون إلى الموارد البشرية والتصنيع، رؤية موحدة تمنحك السيطرة الكاملة.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: theme.bgMain, minHeight: '100vh', color: theme.textDark }}>
      <header style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: theme.secondary, fontSize: '18px' }}>محور ERP</span>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>تسجيل خروج</button>
      </header>
      <div style={{ background: theme.secondary, color: '#fff', padding: '0 25px', display: 'flex', gap: '5px' }}>
        {['dashboard', 'sales', 'inventory', 'hr', 'reports', 'settings'].map(tab => (
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{ background: activeTab === tab ? theme.primary : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '15px' }}>
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <main style={{ padding: '30px', maxWidth: '1400px', margin: 'auto' }}>
        <div style={{ background: theme.cardBg, borderRadius: '12px', padding: '30px' }}>
          <h2>مرحباً بك في وحدة {activeTab}</h2>
          <p>واجهة النظام جاهزة ومرتبطة بقاعدة البيانات.</p>
        </div>
      </main>
    </div>
  );
}

export default App;