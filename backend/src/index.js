const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// طبقة الحماية وعزل البيانات
app.use(async (req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  const url = req.path.toLowerCase();
  if (url.includes('login') || url.includes('register') || url.includes('forgot')) {
    return next();
  }

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

// نظام التسجيل والدخول
app.post(['/register', '/api/register', '/api/api/register'], async (req, res) => {
  const { businessName, clientName, email, phone, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    const cleanEmail = email.trim().toLowerCase();
    
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً' });

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({ data: { name: businessName || 'شركة جديدة' } });
      const adminRole = await tx.role.create({ data: { companyId: company.id, name: 'مدير النظام', permissions: ['ALL_ACCESS'] } });
      const user = await tx.user.create({
        data: {
          companyId: company.id, roleId: adminRole.id, name: clientName || 'مدير',
          email: cleanEmail, password: password, phone: phone || null
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
    const user = await prisma.user.findUnique({ where: { email: cleanEmail }, include: { company: true, role: true } });
    if (!user || user.password !== password) return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    if (!user.isActive) return res.status(403).json({ error: 'هذا الحساب موقوف' });

    const userData = { id: user.id, email: user.email, name: user.name, role: user.role?.name || 'مستخدم', businessName: user.company?.name || 'محور ERP' };
    res.json({ message: 'تم تسجيل الدخول بنجاح', user: userData });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

app.post(['/forgot-password', '/api/forgot-password', '/api/api/forgot-password'], async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!email || !newPassword) return res.status(400).json({ error: 'الرجاء إدخال الإيميل وكلمة المرور الجديدة' });
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) return res.status(404).json({ error: 'البريد الإلكتروني غير مسجل' });

    await prisma.user.update({ where: { email: cleanEmail }, data: { password: newPassword } });
    res.json({ message: 'تم إعادة تعيين كلمة المرور بنجاح' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ أثناء استعادة كلمة المرور' });
  }
});

// مسارات المخزون (المحدثة لضمان عدم حدوث خطأ عند الحفظ)
app.get(['/inventory', '/api/inventory', '/api/api/inventory'], async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { companyId: req.companyId } });
    res.json(products);
  } catch (error) {
    console.error('Inventory Fetch Error:', error);
    res.status(500).json({ error: 'خطأ في جلب بيانات المخزون' });
  }
});

app.post(['/inventory', '/api/inventory', '/api/api/inventory'], async (req, res) => {
  const { name, price, stock } = req.body;
  try {
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'اسم المنتج والسعر مطلوبان' });
    }

    const newProduct = await prisma.product.create({
      data: {
        companyId: req.companyId,
        name,
        price: Number(price),
        stock: Number(stock) || 0,
        sku: `SKU-${Math.floor(Math.random() * 900000) + 100000}`
      }
    });

    res.json({ message: 'تم إضافة المنتج للمخزون بنجاح', product: newProduct });
  } catch (error) {
    console.error('Inventory Create Error:', error);
    res.status(500).json({ error: 'حدث خطأ في قاعدة البيانات أثناء حفظ المنتج' });
  }
});

// الإعدادات العامة
app.get(['/settings', '/api/settings', '/api/api/settings'], async (req, res) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.companyId } });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Mihwar ERP Backend is running on port ${PORT}`);
});