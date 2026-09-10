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

// وضعنا جميع احتمالات مسار الرابط لتفادي أي خطأ من الواجهة الأمامية
app.post(['/register', '/api/register', '/api/api/register'], async (req, res) => {
  const { businessName, clientName, email, phone, password } = req.body;

  try {
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً في النظام' });

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

app.use(async (req, res, next) => {
  // السماح بطلبات الفحص المسبق (CORS Preflight) بالمرور بدون مشاكل
  if (req.method === 'OPTIONS') return next();

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
    res.status(500).json({ error: 'خطأ في التحقق من الصلاحيات' });
  }
});

// ==========================================
// 3. مسارات نظام ERP
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mihwar ERP Backend is running on port ${PORT}`);
});