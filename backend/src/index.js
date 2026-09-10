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
// 1. نظام الـ SaaS (تسجيل الشركات والدخول)
// ==========================================

app.post('/api/register', async (req, res) => {
  const { businessName, clientName, email, phone, password } = req.body;

  try {
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const cleanEmail = email.trim().toLowerCase();

    // التحقق مما إذا كان البريد الإلكتروني مسجلاً مسبقاً
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً في النظام' });

    // إنشاء الشركة (Tenant)، ثم الصلاحيات، ثم المستخدم في عملية واحدة (Transaction)
    const result = await prisma.$transaction(async (tx) => {
      // 1. إنشاء كيان الشركة
      const company = await tx.company.create({
        data: { name: businessName || 'شركة جديدة' }
      });

      // 2. إنشاء دور "مدير النظام" للشركة الجديدة
      const adminRole = await tx.role.create({
        data: {
          companyId: company.id,
          name: 'مدير النظام',
          permissions: ['ALL_ACCESS']
        }
      });

      // 3. إنشاء حساب المستخدم وربطه بالشركة والدور
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          roleId: adminRole.id,
          name: clientName || 'مدير',
          email: cleanEmail,
          password: password, // (ملاحظة: في بيئة الإنتاج الفعلية يجب تشفيرها بـ bcrypt)
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

app.post('/api/login', async (req, res) => {
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
      businessName: user.company.name
    };

    res.json({ message: 'تم تسجيل الدخول بنجاح', user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// ==========================================
// 2. طبقة الحماية وعزل البيانات (Tenant Isolation Middleware)
// ==========================================
// أي مسار (Route) يأتي بعد هذا الكود لن يعمل إلا إذا كان المستخدم مسجلاً
// وسيقوم بإرفاق رقم الشركة (companyId) بشكل إجباري في كل طلب

app.use(async (req, res, next) => {
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'غير مصرح لك بالوصول (Missing Auth Header)' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(401).json({ error: 'حساب المستخدم غير موجود' });

    // حقن معرف الشركة في الطلب للاستخدام في جميع مسارات النظام
    req.companyId = user.companyId;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
  }
});

// ==========================================
// 3. مسارات نظام ERP (تعمل تحت حماية الـ Middleware)
// ==========================================

// --- إعدادات المنشأة ---
app.get('/api/settings', async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

app.put('/api/settings', async (req, res) => {
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