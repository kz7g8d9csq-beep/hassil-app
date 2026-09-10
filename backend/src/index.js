const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==========================================
// 1. طبقة الحماية وعزل البيانات (Tenant Isolation Middleware)
// وضعناها في البداية مع "استثناء ذهبي" لمسارات الدخول والتسجيل
// ==========================================
app.use(async (req, res, next) => {
  // السماح بطلبات الفحص المسبق للمتصفح (CORS Preflight)
  if (req.method === 'OPTIONS') return next();

  // الاستثناء الذهبي: السماح بمرور طلبات الدخول والتسجيل مهما كان الرابط
  const url = req.path.toLowerCase();
  if (url.includes('login') || url.includes('register')) {
    return next();
  }

  // تطبيق الحماية الصارمة على باقي مسارات النظام
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'غير مصرح لك بالوصول (Missing Auth Header)' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(401).json({ error: 'حساب المستخدم غير موجود' });

    req.companyId = user.companyId;
    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Middleware Error:', error);
    res.status(500).json({ error: 'خطأ داخلي أثناء التحقق من الصلاحيات' });
  }
});

// ==========================================
// 2. نظام الـ SaaS (تسجيل الشركات والدخول)
// ==========================================

app.post(['/register', '/api/register', '/api/api/register'], async (req, res) => {
  const { businessName, clientName, email, phone, password } = req.body;

  try {
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const cleanEmail = email.trim().toLowerCase();

    // التحقق مما إذا كان البريد الإلكتروني مسجلاً مسبقاً
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً في النظام' });

    // إنشاء الشركة (Tenant)، ثم الصلاحيات، ثم المستخدم
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: businessName || 'شركة جديدة' }
      });

      const adminRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'مدير النظام',
          permissions: ['ALL_ACCESS']
        }
      });

      const user = await tx.user.create({
        data: {
          companyId: company.id,
          roleId: adminRole.id,
          name: clientName || 'مدير',
          email: cleanEmail,
          password: password, 
          phone: phone || null
        }
      });

      return { company, user, role: adminRole };
    });

    res.json({ message: 'تم إنشاء مساحة العمل بنجاح', user: result.user });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء مساحة العمل' });
  }
});

app.post(['/login', '/api/login', '/api/api/login'], async (req, res) => {
  const { email, password } = req.body;

  try {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ 
      where: { email: cleanEmail },
      include: { company: true, role: true }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'هذا الحساب موقوف، الرجاء مراجعة الإدارة' });
    }

    // تجهيز بيانات المستخدم للواجهة الأمامية
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role?.name || 'مستخدم',
      businessName: user.company?.name || 'محور ERP'
    };

    res.json({ message: 'تم تسجيل الدخول بنجاح', user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// ==========================================
// 3. مسارات نظام ERP (الإعدادات وغيرها)
// ==========================================

app.get(['/settings', '/api/settings', '/api/api/settings'], async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

app.put(['/settings', '/api/settings', '/api/api/settings'], async (req, res) => {
  const { businessName, vatNumber } = req.body;
  try {
    await prisma.company.update({
      where: { id: req.companyId },
      data: { name: businessName, vatNumber }
    });
    res.json({ message: 'تم التحديث بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'خطأ في تحديث الإعدادات' });
  }
});

// ==========================================
// تشغيل الخادم
// ==========================================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mihwar ERP Backend is running on port ${PORT}`);
});