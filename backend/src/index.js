const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const generateClientCode = () => `CL-${Math.floor(10000 + Math.random() * 90000)}`;

// 1. تسجيل حساب جديد
app.post('/api/register', async (req, res) => {
  try {
    let { businessName, clientName, email, phone, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبة' });
    email = email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'هذا البريد الإلكتروني مسجل بالفعل' });

    const user = await prisma.user.create({
      data: { businessName: businessName || 'مؤسسة تجارية', clientName: clientName || '', email, phone: phone || '', password: password.trim() }
    });
    res.status(201).json({ success: true, user: { id: user.id, businessName: user.businessName, clientName: user.clientName, email: user.email, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. تسجيل الدخول
app.post('/api/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'الرجاء إدخال البريد وكلمة المرور' });
    email = email.trim().toLowerCase();
    password = password.trim();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.password !== password) return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    res.json({ success: true, user: { id: user.id, businessName: user.businessName, clientName: user.clientName, email: user.email, phone: user.phone } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. استعادة كلمة المرور
app.post('/api/forgot-password', async (req, res) => {
  try {
    let { email, phone, newPassword } = req.body;
    if (!email) return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني' });
    email = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(404).json({ error: 'البريد الإلكتروني غير مسجل لدينا' });

    if (newPassword) {
      await prisma.user.update({ where: { id: user.id }, data: { password: newPassword.trim() } });
      return res.json({ success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح!' });
    }
    res.json({ success: true, message: 'تم التحقق من الحساب بنجاح.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. الإعدادات (اسم المؤسسة، الشعار، والثيم)
app.get('/api/settings', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json(user || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const { businessName, logoUrl, themeColor } = req.body;
    
    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (themeColor !== undefined) updateData.phone = themeColor; // نستخدم حقل phone مؤقتاً لتخزين الثيم أو نضيفه بالجدول، وتفادياً لأي خطأ سنخزنه مباشرة في الذاكرة أو نحدثه

    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. العملاء
app.get('/api/clients', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const clients = await prisma.client.findMany({ where: { userId }, include: { invoices: true } });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const { name, phone, email, notes } = req.body;
    const clientCode = generateClientCode();
    const formattedNotes = notes ? `[${clientCode}] ${notes}` : `[${clientCode}]`;
    const client = await prisma.client.create({ data: { name, phone, email, notes: formattedNotes, userId } });
    res.json({ ...client, clientCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const { name, phone, email } = req.body;
    const updated = await prisma.client.update({ where: { id: clientId }, data: { name, phone, email } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    await prisma.client.delete({ where: { id: clientId } });
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. الفواتير
app.get('/api/invoices', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const invoices = await prisma.invoice.findMany({ where: { userId }, include: { client: true, items: true }, orderBy: { id: 'desc' } });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const userId = Number(req.headers['user-id']);
    if (!userId) return res.status(401).json({ error: 'غير مصرح' });
    const { clientId, items, notes } = req.body;
    let subtotal = 0;
    const formattedItems = (items || []).map(item => {
      const total = Number(item.quantity) * Number(item.unitPrice);
      subtotal += total;
      return { description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), total };
    });

    const taxRate = 0.15;
    const taxAmount = Number((subtotal * taxRate).toFixed(2));
    const totalAmount = Number((subtotal + taxAmount).toFixed(2));
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);

    const invoice = await prisma.invoice.create({
      data: { userId, clientId: Number(clientId), invoiceNumber, subtotal, taxRate, taxAmount, totalAmount, notes, items: { create: formattedItems } },
      include: { items: true, client: true }
    });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const { amount, description, notes } = req.body;
    const baseAmount = Number(amount || 0);
    const taxAmount = Number((baseAmount * 0.15).toFixed(2));
    const totalAmount = Number((baseAmount + taxAmount).toFixed(2));

    await prisma.invoiceItem.deleteMany({ where: { invoiceId } });
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: baseAmount,
        taxAmount,
        totalAmount,
        notes,
        items: { create: [{ description: description || 'خدمة عامة', quantity: 1, unitPrice: baseAmount, total: baseAmount }] }
      },
      include: { items: true, client: true }
    });
    res.json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    await prisma.invoiceItem.deleteMany({ where: { invoiceId } });
    await prisma.invoice.delete({ where: { id: invoiceId } });
    res.json({ message: 'تم الحذف' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));