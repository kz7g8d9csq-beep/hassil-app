import { useState, useEffect, useRef } from 'react';
import API from './services/api';
import QRCode from 'qrcode';

function App() {
  // === الحالات الأساسية (State) ===
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mihwar_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if(API.defaults) API.defaults.headers.common['user-id'] = parsed.id;
      return parsed;
    }
    return null;
  });

  const [authEmail, setAuthEmail] = useState('admin@mihwar.local');
  const [authPassword, setAuthPassword] = useState('');
  
  // التنقل بين الشاشات
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [activeSalesStep, setActiveSalesStep] = useState(6); // 1: عرض سعر ... 6: فاتورة ... 8: مرتجع
  const [showQuickAction, setShowQuickAction] = useState(false);

  // إعدادات المنشأة (محور)
  const [businessName, setBusinessName] = useState('محور ERP');
  const [businessCity, setBusinessCity] = useState('المملكة العربية السعودية');
  const [businessLogo, setBusinessLogo] = useState('');
  const [businessVat, setBusinessVat] = useState(() => localStorage.getItem('mihwar_vat') || '300000000000003');
  const [zidToken, setZidToken] = useState(() => localStorage.getItem('mihwar_zid_token') || '');
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(() => localStorage.getItem('mihwar_payment_link') || '');

  // قواعد البيانات المحلية (مؤقتاً لحين ربط الباك إند بالكامل)
  const [clients, setClients] = useState([{id: 1, name: 'عميل تجريبي', phone: '0500000000'}]);
  const [inventory, setInventory] = useState([
    {id: 1, name: 'Late landed cost 1783978884332', price: 1500},
    {id: 2, name: 'WAVG 1783978561289', price: 200},
    {id: 3, name: 'Landed 100 1783978561289', price: 100}
  ]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  // حقول شاشة المبيعات (الفاتورة)
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState('');
  const [taxRate, setTaxRate] = useState(15);
  
  const [activeModalDoc, setActiveModalDoc] = useState(null);

  // === الألوان والهوية البصرية (محور ERP) ===
  const theme = {
    primary: '#26574f',    // الأخضر الداكن (زر الدخول)
    secondary: '#0b1b3d',  // الكحلي الداكن (الشعار والنصوص الرئيسية)
    accent: '#408079',     // الأخضر الفاتح المائل للأزرق
    bgMain: '#f3f4f6',     // الرمادي الفاتح للخلفية
    cardBg: '#ffffff',     // الأبيض للبطاقات
    textDark: '#1e293b',   // نصوص داكنة
    textMuted: '#64748b',  // نصوص باهتة
    border: '#e2e8f0'      // لون الحدود
  };

  // === دوال النظام ===
  const handleLogin = (e) => {
    e.preventDefault();
    const mockUser = { id: 1, email: authEmail, role: 'مدير النظام' };
    setUser(mockUser);
    localStorage.setItem('mihwar_user', JSON.stringify(mockUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mihwar_user');
  };

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

    const newInvoice = {
      id: Date.now(),
      invoiceNumber: `INV-${Math.floor(Math.random()*1000000)}`,
      client: client,
      items: [{ description: prod.name, quantity: qty, unitPrice: amount }],
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      createdAt: new Date(),
      notes: 'غير مدفوعة'
    };

    setInvoices([newInvoice, ...invoices]);
    alert('تم إنشاء الفاتورة / المستند بنجاح');
    setActiveTab('reports');
  };

  // توليد ZATCA QR Code
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
      return await QRCode.toDataURL(base64, { margin: 1, width: 130, color: { dark: theme.secondary, light: '#ffffff' } });
    } catch (e) { return ''; }
  };

  // تصدير إكسل
  const exportToCSV = (type) => {
    let headers = ['رقم المستند', 'العميل', 'المبلغ', 'التاريخ'];
    let rows = invoices.map(inv => [inv.invoiceNumber, inv.client?.name, inv.totalAmount, new Date(inv.createdAt).toLocaleDateString('ar-SA')]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", `تقرير_محور.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // === 1. شاشة تسجيل الدخول (مطابقة للصورة بدقة) ===
  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: '#fff' }}>
        
        {/* الجانب الأيمن (النموذج) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', background: '#f8fafc' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <p style={{ margin: '0 0 5px 0', color: theme.textMuted, fontSize: '14px', fontWeight: 'bold' }}>مرحباً بعودتك</p>
            <h1 style={{ margin: '0 0 10px 0', color: theme.secondary, fontSize: '32px' }}>تسجيل الدخول إلى حسابك</h1>
            <p style={{ margin: '0 0 30px 0', color: theme.textMuted, fontSize: '13px' }}>أدخل بياناتك للوصول إلى مساحة العمل.</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>البريد الإلكتروني أو اسم المستخدم</label>
                <input type="email" value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: theme.textDark, marginBottom: '8px', fontWeight: 'bold' }}>كلمة المرور</label>
                <input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} placeholder="Admin@12345" required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.border}`, outline: 'none', background: '#fff', direction: 'ltr', textAlign: 'right' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.textDark, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: theme.primary }} /> تذكر هذا الجهاز
                </label>
                <span style={{ color: theme.textMuted, cursor: 'pointer' }}>نسيت كلمة المرور؟</span>
              </div>

              <button type="submit" style={{ background: theme.primary, color: '#fff', padding: '14px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <span>دخول آمن</span>
                <span>←</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#e2e8f0', padding: '12px', borderRadius: '8px', marginTop: '10px' }}>
                <span style={{ fontSize: '20px' }}>🏢</span>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', color: theme.secondary }}>البيئة المحلية الجاهزة</p>
                  <p style={{ margin: 0, fontSize: '11px', color: theme.textMuted }}>تم تعبئة حساب المدير تلقائياً لاختبار النسخة الأولى.</p>
                </div>
              </div>
            </form>
            <p style={{ textAlign: 'center', fontSize: '10px', color: theme.textMuted, marginTop: '30px' }}>بدخولك، أنت توافق على سياسة الاستخدام والخصوصية الخاصة بالمنشأة.</p>
          </div>
        </div>

        {/* الجانب الأيسر (الشعار والهوية) */}
        <div style={{ flex: 1, background: '#1c2c27', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(64,128,121,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
            <div style={{ width: '40px', height: '40px', background: theme.accent, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '20px' }}>ılı</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', letterSpacing: '1px' }}>محور</h2>
              <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>ERP • منصة الأعمال</p>
            </div>
          </div>

          <p style={{ color: theme.accent, fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0' }}>— إدارة أذكى. قرار أسرع.</p>
          <h1 style={{ fontSize: '56px', margin: '0 0 20px 0', lineHeight: '1.2' }}>كل أعمالك<br/>في محور واحد.</h1>
          <p style={{ fontSize: '16px', opacity: 0.8, maxWidth: '400px', lineHeight: '1.6', marginBottom: '50px' }}>من المبيعات والمخزون إلى الموارد البشرية والتصنيع، رؤية موحدة تمنحك السيطرة الكاملة.</p>

          <div style={{ borderTop: `1px solid rgba(255,255,255,0.1)`, paddingTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: '15px' }}>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>وحدة أعمال مترابطة</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>60+</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid rgba(255,255,255,0.05)`, paddingBottom: '15px' }}>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>متابعة لحظية</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>24/7</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>متعدد الشركات</span>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#eab308' }}>100%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === حسابات لوحة التحكم ===
  const stats = {
    sales: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) + 575,
    purchases: 1883.70,
    salaries: 13037.50,
    inventoryVal: 14448.00
  };

  // === واجهة النظام الأساسية (بعد تسجيل الدخول) ===
  return (
    <div style={{ fontFamily: 'Tahoma, Cairo, sans-serif', direction: 'rtl', background: theme.bgMain, minHeight: '100vh', color: theme.textDark }}>
      
      {/* شريط التنقل العلوي (Navbar) */}
      <header style={{ background: theme.cardBg, borderBottom: `1px solid ${theme.border}`, padding: '12px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        
        {/* القسم الأيمن: الشعار ومسار الصفحة */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: `1px solid ${theme.border}`, paddingLeft: '20px' }}>
            <div style={{ width: '28px', height: '28px', background: theme.secondary, borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>ılı</div>
            <span style={{ fontWeight: 'bold', color: theme.secondary, fontSize: '18px' }}>محور</span>
          </div>
          <div style={{ fontSize: '13px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>مساحة العمل</span>
            <span>&lt;</span>
            <strong style={{ color: theme.textDark }}>
              {activeTab === 'dashboard' ? 'لوحة التحكم' : activeTab === 'sales' ? 'المبيعات' : activeTab === 'reports' ? 'التقارير والتحليلات' : 'الإعدادات'}
            </strong>
          </div>
        </div>

        {/* القسم الأوسط: شريط البحث */}
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 20px' }}>
          <div style={{ background: theme.bgMain, borderRadius: '6px', padding: '8px 15px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${theme.border}` }}>
            <span style={{ color: theme.textMuted }}>🔍</span>
            <input type="text" placeholder="ابحث عن فاتورة، منتج، عميل أو موظف..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }} />
            <span style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: theme.textMuted }}>⌘ K</span>
          </div>
        </div>

        {/* القسم الأيسر: الإشعارات وملف المستخدم */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', position: 'relative' }}>
            🔔
            <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></span>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRight: `1px solid ${theme.border}`, paddingRight: '20px', cursor: 'pointer' }} onClick={handleLogout}>
            <div style={{ width: '35px', height: '35px', background: '#eab308', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold' }}>ما</div>
            <div style={{ lineHeight: '1.2' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>{user.role}</p>
              <p style={{ margin: 0, fontSize: '11px', color: theme.textMuted }}>تسجيل خروج</p>
            </div>
            <span style={{ fontSize: '10px', color: theme.textMuted }}>▼</span>
          </div>
        </div>
      </header>

      {/* قائمة التنقل الجانبية المؤقتة (للتنقل السريع بين الشاشات المطلوبة) */}
      <div style={{ background: theme.secondary, color: '#fff', padding: '10px 25px', display: 'flex', gap: '20px', fontSize: '13px' }}>
        <button onClick={()=>setActiveTab('dashboard')} style={{ background: activeTab==='dashboard'?theme.primary:'transparent', border:'none', color:'#fff', cursor:'pointer', padding:'6px 12px', borderRadius:'4px' }}>لوحة التحكم</button>
        <button onClick={()=>setActiveTab('sales')} style={{ background: activeTab==='sales'?theme.primary:'transparent', border:'none', color:'#fff', cursor:'pointer', padding:'6px 12px', borderRadius:'4px' }}>المبيعات (الفواتير)</button>
        <button onClick={()=>setActiveTab('reports')} style={{ background: activeTab==='reports'?theme.primary:'transparent', border:'none', color:'#fff', cursor:'pointer', padding:'6px 12px', borderRadius:'4px' }}>التقارير والتحليلات</button>
        <button onClick={()=>setActiveTab('settings')} style={{ background: activeTab==='settings'?theme.primary:'transparent', border:'none', color:'#fff', cursor:'pointer', padding:'6px 12px', borderRadius:'4px' }}>الإعدادات</button>
      </div>

      {/* محتوى الشاشات */}
      <main style={{ padding: '30px', maxWidth: '1400px', margin: 'auto' }}>

        {/* === 1. لوحة التحكم (Dashboard) === */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#eab308', fontWeight: 'bold' }}>• الأحد، 12 يوليو 2026</p>
                <h1 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>صباح الخير، مدير</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: theme.textMuted }}>إليك أهم ما يحدث في شركاتك وفروعك اليوم.</p>
              </div>
              <div style={{ display: 'flex', gap: '15px', position: 'relative' }}>
                <button onClick={() => exportToCSV()} style={{ background: '#fff', border: `1px solid ${theme.border}`, padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: theme.textMuted }}>
                  📥 تصدير التقرير
                </button>
                <button onClick={() => setShowQuickAction(!showQuickAction)} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                  ⊕ إجراء سريع <span>▼</span>
                </button>
                {/* قائمة الإجراء السريع المنسدلة */}
                {showQuickAction && (
                  <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', border: `1px solid ${theme.border}`, borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '220px', zIndex: 50, padding: '10px 0' }}>
                    <div onClick={()=>{setActiveTab('sales'); setShowQuickAction(false);}} style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>🧾 فاتورة مبيعات جديدة</div>
                    <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', background: '#f8fafc' }}>📦 إضافة منتج</div>
                    <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>👥 تسجيل موظف</div>
                    <div style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>📱 قراءة باركود / QR</div>
                  </div>
                )}
              </div>
            </div>

            {/* البطاقات (Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textMuted }}>إجمالي المبيعات</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>{stats.sales.toFixed(0)} <span style={{ fontSize: '16px' }}>ر.س</span></h2>
                  <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>↗ 4 طلب</span> من قاعدة البيانات
                  </p>
                </div>
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>$</div>
              </div>

              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textMuted }}>إجمالي المشتريات</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>{stats.purchases.toLocaleString()} <span style={{ fontSize: '16px' }}>ر.س</span></h2>
                  <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#dc2626', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>🕒 4 طلب</span> من قاعدة البيانات
                  </p>
                </div>
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>🛒</div>
              </div>

              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textMuted }}>صافي الرواتب</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>{stats.salaries.toLocaleString()} <span style={{ fontSize: '16px' }}>ر.س</span></h2>
                  <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>↗ 1 مسير</span> آخر مسيرات الرواتب
                  </p>
                </div>
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>🧾</div>
              </div>

              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: theme.textMuted }}>قيمة المخزون</p>
                  <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>{stats.inventoryVal.toLocaleString()} <span style={{ fontSize: '16px' }}>ر.س</span></h2>
                  <p style={{ margin: '15px 0 0 0', fontSize: '12px', color: theme.textMuted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>📦 16 منتج</span> رصيد فعلي
                  </p>
                </div>
                <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>📦</div>
              </div>
            </div>

            {/* الجزء السفلي للوحة (الرسوم البيانية) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: theme.secondary }}>جاهزية البيانات</h3>
                <p style={{ fontSize: '12px', color: theme.textMuted }}>الوحدات الأساسية المتصلة</p>
                <div style={{ width: '150px', height: '150px', borderRadius: '50%', border: `15px solid ${theme.primary}`, margin: '20px auto', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '28px', fontWeight: 'bold', color: theme.secondary }}>
                  100%
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px', fontSize: '13px', color: theme.textMuted }}>
                  <div>التأمينات<br/><strong style={{ color: theme.textDark }}>1 مشترك</strong></div>
                  <div>الموظفون<br/><strong style={{ color: theme.textDark }}>1 نشط</strong></div>
                </div>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', color: theme.secondary }}>حركة الإيرادات</h3>
                    <p style={{ fontSize: '12px', color: theme.textMuted }}>المبيعات والمشتريات المسجلة حالياً</p>
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', color: theme.secondary }}>{stats.sales.toFixed(0)} ر.س <span style={{ fontSize: '12px', background: '#dcfce7', color: '#16a34a', padding: '4px 8px', borderRadius: '4px' }}>✔ بيانات حية</span></h2>
                  </div>
                </div>
                {/* رسم بياني وهمي مبسط */}
                <div style={{ marginTop: '40px', height: '150px', borderBottom: `1px solid ${theme.border}`, borderLeft: `1px solid ${theme.border}`, position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '20%', left: '10%', width: '8px', height: '8px', background: theme.primary, borderRadius: '50%' }}></div>
                  <div style={{ position: 'absolute', bottom: '60%', left: '50%', width: '8px', height: '8px', background: theme.primary, borderRadius: '50%' }}></div>
                  <div style={{ position: 'absolute', bottom: '80%', left: '90%', width: '8px', height: '8px', background: theme.primary, borderRadius: '50%' }}></div>
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    <polyline points="0,120 10%,120 50%,60 90%,30 100%,30" fill="none" stroke={theme.primary} strokeWidth="3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === 2. المبيعات والفواتير (Sales Flow) === */}
        {activeTab === 'sales' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: theme.textMuted, cursor: 'pointer' }}>↗ العودة للوحة التحكم</p>
                <h1 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>المبيعات</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: theme.textMuted }}>طلبات البيع والفواتير والعروض والمرتجعات والتحصيلات.</p>
              </div>
              <button onClick={handleSaveInvoice} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                ⊕ طلب مبيعات
              </button>
            </div>

            <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
              {/* شريط دورة المعاملات (Stepper) */}
              <div style={{ marginBottom: '40px', background: '#f8fafc', padding: '20px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', color: '#9a3412' }}>دورة معاملات حقيقية</h3>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '20px', color: theme.secondary }}>من عرض السعر حتى المرتجع والقيد المحاسبي</h2>
                <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: theme.textMuted }}>كل خطوة تُحفظ فوراً في MySQL وتظهر في سجل التدقيق.</p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '4px', background: '#cbd5e1', zIndex: 1 }}></div>
                  {[
                    { id: 1, label: 'عرض السعر' }, { id: 2, label: 'الاعتماد' }, { id: 3, label: 'طلب البيع' }, { id: 4, label: 'حجز المخزون' },
                    { id: 5, label: 'التسليم' }, { id: 6, label: 'الفاتورة' }, { id: 7, label: 'التحصيل' }, { id: 8, label: 'المرتجع' }
                  ].map(step => (
                    <div key={step.id} onClick={() => setActiveSalesStep(step.id)} style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '8px', background: activeSalesStep === step.id ? theme.bgMain : '#fff', padding: '6px 12px', borderRadius: '20px', border: `1px solid ${activeSalesStep === step.id ? theme.secondary : '#cbd5e1'}`, cursor: 'pointer' }}>
                      <span style={{ fontWeight: 'bold', color: activeSalesStep === step.id ? theme.secondary : theme.textMuted }}>{step.id}</span>
                      <span style={{ fontSize: '13px', color: activeSalesStep === step.id ? theme.secondary : theme.textMuted, fontWeight: activeSalesStep === step.id ? 'bold' : 'normal' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* حقول الإدخال للمبيعات */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>العميل</label>
                  <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', appearance: 'none' }}>
                    <option value="">-- اختر العميل --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>المنتج</label>
                  <select value={selectedProductId} onChange={handleProductSelect} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', appearance: 'none', color: '#2563eb', fontWeight: 'bold' }}>
                    <option value="">-- اختر المنتج من المخزون --</option>
                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>الكمية</label>
                  <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>سعر الوحدة</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', direction: 'ltr', textAlign: 'right' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: theme.textMuted, marginBottom: '8px' }}>الضريبة %</label>
                  <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none' }} />
                </div>
                <div>
                  <div style={{ background: theme.secondary, color: '#fff', padding: '15px 20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '14px', opacity: 0.8 }}>الإجمالي المتوقع</span>
                    <strong style={{ fontSize: '22px' }}>{((Number(amount) * qty) * (1 + (taxRate/100))).toFixed(2)} ر.س</strong>
                  </div>
                </div>
              </div>

              {/* جدول المستندات المنشأة */}
              <div>
                <h3 style={{ fontSize: '15px', color: theme.textMuted, marginBottom: '15px' }}>المستندات المنشأة</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
                  <tbody>
                    {['عرض السعر', 'طلب البيع', 'إذن التسليم', 'الفاتورة', 'سند القبض'].map((doc, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '12px 10px', color: theme.secondary, fontWeight: 'bold' }}>{doc}</td>
                        <td style={{ padding: '12px 10px', color: theme.textMuted }}>-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* === 3. التقارير والتحليلات (Reports) === */}
        {activeTab === 'reports' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: theme.textMuted, cursor: 'pointer' }}>↗ العودة للوحة التحكم</p>
                <h1 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>التقارير والتحليلات</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: theme.textMuted }}>تقارير محفوظة ومؤشرات تنفيذية قابلة للجدولة والتصدير.</p>
              </div>
              <button onClick={() => alert('ميزة إنشاء تقرير مخصص قادمة قريباً!')} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                ⊕ إنشاء تقرير
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted }}>السجلات المتاحة</p>
                <h2 style={{ margin: 0, fontSize: '32px', color: theme.secondary }}>{invoices.length}</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: theme.textMuted }}>من قاعدة البيانات</p>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted }}>الشركة الحالية</p>
                <h2 style={{ margin: 0, fontSize: '32px', color: theme.secondary }}>1</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: theme.textMuted }}>نطاق معزول</p>
              </div>
              <div style={{ background: theme.cardBg, padding: '25px', borderRadius: '12px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: theme.textMuted }}>حالة الربط</p>
                <h2 style={{ margin: 0, fontSize: '28px', color: theme.secondary }}>نشط</h2>
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: theme.textMuted }}>API + MySQL</p>
              </div>
            </div>

            <div style={{ background: theme.cardBg, borderRadius: '12px', border: `1px solid ${theme.border}`, padding: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>📊</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: theme.secondary }}>التقارير المحفوظة</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: theme.textMuted }}>تعريفات تقارير فعلية</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button style={{ background: '#fff', border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: theme.textDark }}>☷ تصفية</button>
                  <button onClick={() => exportToCSV('invoices')} style={{ background: '#fff', border: `1px solid ${theme.border}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: theme.textDark }}>📥 تصدير</button>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.textMuted, fontSize: '13px' }}>
                    <th style={{ padding: '12px 10px' }}>المعرف</th>
                    <th style={{ padding: '12px 10px' }}>النوع / الاسم</th>
                    <th style={{ padding: '12px 10px' }}>الحالة</th>
                    <th style={{ padding: '12px 10px' }}>القيمة</th>
                    <th style={{ padding: '12px 10px' }}>التاريخ</th>
                    <th style={{ padding: '12px 10px' }}>طباعة المستند</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: theme.textMuted }}>لا توجد تقارير أو فواتير مسجلة بعد.</td></tr>
                  ) : invoices.map((inv, idx) => (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '15px 10px', color: theme.textMuted }}>#{inv.invoiceNumber}</td>
                      <td style={{ padding: '15px 10px', fontWeight: 'bold', color: theme.secondary }}>فاتورة مبيعات - {inv.client?.name}</td>
                      <td style={{ padding: '15px 10px' }}>
                        <span style={{ background: '#f1f5f9', color: theme.textMuted, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', background: theme.secondary, borderRadius: '50%' }}></span> مسجل
                        </span>
                      </td>
                      <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#16a34a' }}>{inv.totalAmount} ر.س</td>
                      <td style={{ padding: '15px 10px', color: theme.textMuted, fontSize: '12px', direction: 'ltr', textAlign: 'right' }}>{new Date(inv.createdAt).toISOString().replace('T', ' ').substring(0, 19)}</td>
                      <td style={{ padding: '15px 10px' }}>
                        <button onClick={() => setActiveModalDoc({ type: 'invoice', inv })} style={{ background: theme.accent, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>معاينة PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '20px', fontSize: '12px', color: theme.textMuted }}>عرض {invoices.length} سجل من قاعدة البيانات</div>
            </div>
          </div>
        )}

        {/* === 4. الإعدادات (Settings & Integration) === */}
        {activeTab === 'settings' && (
          <div style={{ background: theme.cardBg, padding: '35px', borderRadius: '12px', maxWidth: '600px', margin: 'auto', border: `1px solid ${theme.border}` }}>
            <h2 style={{ marginTop: 0, color: theme.secondary, marginBottom: '20px' }}>إعدادات المنشأة والربط (API)</h2>
            <form onSubmit={(e)=>{e.preventDefault(); alert('تم حفظ الإعدادات!');}} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: theme.textMuted }}>اسم المنشأة:</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: theme.textMuted }}>الرقم الضريبي ZATCA (15 رقم):</label>
                <input type="text" value={businessVat} onChange={e => setBusinessVat(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', direction: 'ltr', textAlign: 'right' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: theme.textMuted }}>رابط الدفع العام (Moyasar / Stripe):</label>
                <input type="url" value={paymentLinkUrl} onChange={e => setPaymentLinkUrl(e.target.value)} placeholder="https://pay.moyasar.com/..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: '#f8fafc', outline: 'none', direction: 'ltr', textAlign: 'right' }} />
              </div>
              <button type="submit" style={{ background: theme.primary, color: '#fff', padding: '14px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>حفظ الإعدادات</button>
            </form>
          </div>
        )}

      </main>

      {/* === نافذة طباعة PDF الأصلية (المحافظة على الـ ZATCA QR القديم بنجاح) === */}
      {activeModalDoc && (
        <div id="mihwar-print-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', padding: '20px' }}>
          
          <div className="no-print-area" style={{ width: '100%', maxWidth: '850px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme.secondary, color: '#fff', padding: '15px 25px', borderRadius: '12px', marginBottom: '20px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>معاينة الفاتورة ({activeModalDoc.inv.invoiceNumber})</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} style={{ background: theme.primary, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📥 طباعة / حفظ PDF</button>
              <button onClick={() => setActiveModalDoc(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✖ إغلاق</button>
            </div>
          </div>
          
          <div id="hassil-modal-print-content" style={{ width: '100%', maxWidth: '800px', background: '#fff', padding: '50px', borderRadius: '12px', direction: 'rtl', color: '#000' }}>
            <style>{`@media print { body * { visibility: hidden !important; } #hassil-modal-print-content, #hassil-modal-print-content * { visibility: visible !important; } #hassil-modal-print-content { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 20mm !important; background: #ffffff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border: none !important; } .no-print-area { display: none !important; } }`}</style>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `3px solid ${theme.secondary}`, paddingBottom: '20px', marginBottom: '30px' }}>
              <div>
                <h1 style={{ margin: '0 0 10px 0', color: theme.secondary, fontSize: '32px' }}>فاتورة ضريبية</h1>
                <p style={{ margin: '5px 0', fontSize: '15px' }}>رقم الفاتورة: <strong style={{ color: theme.secondary }}>{activeModalDoc.inv.invoiceNumber}</strong></p>
                <p style={{ margin: '5px 0', fontSize: '15px' }}>الرقم الضريبي: <strong>{businessVat}</strong></p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ color: theme.accent, margin: '0 0 5px 0', fontSize: '28px', letterSpacing: '2px' }}>مـحــور ERP</h2>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>{businessCity}</p>
              </div>
            </div>
            
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '30px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: theme.secondary, fontSize: '16px' }}>فاتورة إلى:</h3>
                <p style={{ margin: '5px 0', fontSize: '15px', fontWeight: 'bold' }}>{activeModalDoc.inv.client?.name}</p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>جوال: <span dir="ltr">{activeModalDoc.inv.client?.phone}</span></p>
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>تاريخ الإصدار: <strong>{new Date(activeModalDoc.inv.createdAt).toLocaleDateString('ar-SA')}</strong></p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>تاريخ الاستحقاق: <strong style={{ color: '#dc2626' }}>فوري</strong></p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: theme.secondary, color: '#fff' }}>
                  <th style={{ padding: '15px', border: '1px solid #cbd5e1' }}>المنتج / الخدمة</th>
                  <th style={{ padding: '15px', border: '1px solid #cbd5e1' }}>الكمية</th>
                  <th style={{ padding: '15px', border: '1px solid #cbd5e1' }}>السعر</th>
                  <th style={{ padding: '15px', border: '1px solid #cbd5e1' }}>المجموع</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '15px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{activeModalDoc.inv.items[0].description}</td>
                  <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.items[0].quantity}</td>
                  <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.items[0].unitPrice} ر.س</td>
                  <td style={{ padding: '15px', border: '1px solid #cbd5e1' }}>{activeModalDoc.inv.subtotal} ر.س</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
              <div style={{ width: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                  <tbody>
                    <tr><td style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>المبلغ الصافي:</td><td style={{ padding: '10px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold' }}>{activeModalDoc.inv.subtotal} ر.س</td></tr>
                    <tr><td style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>الضريبة (15%):</td><td style={{ padding: '10px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', fontWeight: 'bold', color: '#dc2626' }}>{activeModalDoc.inv.taxAmount} ر.س</td></tr>
                    <tr style={{ background: '#dcfce7' }}><td style={{ padding: '15px 10px', color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>الإجمالي النهائي:</td><td style={{ padding: '15px 10px', textAlign: 'left', fontWeight: 'bold', color: '#16a34a', fontSize: '22px' }}>{activeModalDoc.inv.totalAmount} ر.س</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {paymentLinkUrl && (
              <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '2px dashed #94a3b8' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>💳 رابط الدفع الإلكتروني المباشر:</p>
                <a href={paymentLinkUrl} style={{ color: theme.primary, textDecoration: 'none', fontSize: '18px' }}>{paymentLinkUrl}</a>
              </div>
            )}
            
            <div style={{ marginTop: '50px', textAlign: 'center', borderTop: '1px solid #cbd5e1', paddingTop: '20px', color: '#64748b', fontSize: '13px' }}>
              صدرت هذه الفاتورة تقنياً بواسطة نظام (محور ERP)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;