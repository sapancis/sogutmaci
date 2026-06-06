const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Data paths
const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure dirs exist
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helpers
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// ─── Middleware ──────────────────────────────────────────────────

// Gzip/Brotli sıkıştırma — tüm yanıtları küçültür (%60-80)
app.use(compression({ level: 6, threshold: 1024 }));

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance + Security headers
app.use((req, res, next) => {
  // Cache control
  if (req.path.match(/\.(ico|png|jpg|jpeg|gif|svg|webp)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 yıl
  } else if (req.path.match(/\.(css|js)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400'); // 7 gün
  } else if (req.path.match(/\.glb$/)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 gün
  } else if (req.path.match(/\.(html)$/) || req.path === '/') {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60'); // 5 dk
  }
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Preload hints for homepage
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Link', '</css/style.css>; rel=preload; as=style, </js/main.js>; rel=preload; as=script');
  }
  next();
});

// Static dosyalar — ayrı cache ayarıyla
app.use('/images',  express.static(path.join(__dirname, 'public/images'),  { maxAge: '1y', immutable: true }));
app.use('/uploads', express.static(UPLOADS_DIR,                            { maxAge: '7d' }));
app.use('/models',  express.static(path.join(__dirname, 'public/models'),  { maxAge: '30d' }));
app.use('/css',     express.static(path.join(__dirname, 'public/css'),     { maxAge: '7d' }));
app.use('/js',      express.static(path.join(__dirname, 'public/js'),      { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public'), { etag: true, lastModified: true }));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// JWT Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Yetkisiz erişim' });
  try {
    const settings = readJSON(SETTINGS_FILE);
    const decoded = jwt.verify(token, settings.jwt_secret);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz token' });
  }
};

// ─── AUTH ROUTES ────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    const settings = readJSON(SETTINGS_FILE);
    const valid = await bcrypt.compare(password, settings.admin_password_hash);
    if (!valid) return res.status(401).json({ error: 'Şifre hatalı' });
    const token = jwt.sign({ role: 'admin' }, settings.jwt_secret, { expiresIn: '24h' });
    res.json({ token, message: 'Giriş başarılı' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const settings = readJSON(SETTINGS_FILE);
    const valid = await bcrypt.compare(currentPassword, settings.admin_password_hash);
    if (!valid) return res.status(401).json({ error: 'Mevcut şifre hatalı' });
    settings.admin_password_hash = await bcrypt.hash(newPassword, 10);
    writeJSON(SETTINGS_FILE, settings);
    res.json({ message: 'Şifre güncellendi' });
  } catch {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.get('/api/auth/verify', authMiddleware, (req, res) => {
  res.json({ valid: true });
});

// ─── CONTENT ROUTES ─────────────────────────────────────────────────────────

app.get('/api/content', (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    res.json(content);
  } catch {
    res.status(500).json({ error: 'İçerik yüklenemedi' });
  }
});

app.get('/api/content/:section', (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const section = content[req.params.section];
    if (!section) return res.status(404).json({ error: 'Bölüm bulunamadı' });
    res.json(section);
  } catch {
    res.status(500).json({ error: 'İçerik yüklenemedi' });
  }
});

app.put('/api/content/:section', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    content[req.params.section] = req.body;
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'İçerik güncellendi' });
  } catch {
    res.status(500).json({ error: 'İçerik güncellenemedi' });
  }
});

// Deep update for nested fields
app.patch('/api/content/:section', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    if (!content[req.params.section]) content[req.params.section] = {};
    Object.assign(content[req.params.section], req.body);
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'İçerik güncellendi' });
  } catch {
    res.status(500).json({ error: 'İçerik güncellenemedi' });
  }
});

// ─── SERVICES ROUTES ─────────────────────────────────────────────────────────

app.get('/api/services', (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    res.json(content.services || []);
  } catch {
    res.status(500).json({ error: 'Hizmetler yüklenemedi' });
  }
});

app.get('/api/services/:id', (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const service = content.services.find(s => s.id === req.params.id);
    if (!service) return res.status(404).json({ error: 'Hizmet bulunamadı' });
    res.json(service);
  } catch {
    res.status(500).json({ error: 'Hizmet yüklenemedi' });
  }
});

app.post('/api/services', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const newService = { id: uuidv4(), ...req.body };
    content.services.push(newService);
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Hizmet eklendi', service: newService });
  } catch {
    res.status(500).json({ error: 'Hizmet eklenemedi' });
  }
});

app.put('/api/services/:id', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const idx = content.services.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Hizmet bulunamadı' });
    content.services[idx] = { ...content.services[idx], ...req.body };
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Hizmet güncellendi' });
  } catch {
    res.status(500).json({ error: 'Hizmet güncellenemedi' });
  }
});

app.delete('/api/services/:id', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    content.services = content.services.filter(s => s.id !== req.params.id);
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Hizmet silindi' });
  } catch {
    res.status(500).json({ error: 'Hizmet silinemedi' });
  }
});

// ─── GALLERY ROUTES ──────────────────────────────────────────────────────────

app.get('/api/gallery', (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    res.json(content.gallery || []);
  } catch {
    res.status(500).json({ error: 'Galeri yüklenemedi' });
  }
});

app.post('/api/gallery', authMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    const content = readJSON(CONTENT_FILE);
    const newItem = {
      id: uuidv4(),
      url: '/uploads/' + req.file.filename,
      title: req.body.title || '',
      category: req.body.category || 'Genel',
      date: new Date().toISOString()
    };
    content.gallery.push(newItem);
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Fotoğraf eklendi', item: newItem });
  } catch {
    res.status(500).json({ error: 'Fotoğraf eklenemedi' });
  }
});

app.put('/api/gallery/:id', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const idx = content.gallery.findIndex(g => g.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Fotoğraf bulunamadı' });
    content.gallery[idx] = { ...content.gallery[idx], ...req.body };
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Fotoğraf güncellendi' });
  } catch {
    res.status(500).json({ error: 'Fotoğraf güncellenemedi' });
  }
});

app.delete('/api/gallery/:id', authMiddleware, (req, res) => {
  try {
    const content = readJSON(CONTENT_FILE);
    const item = content.gallery.find(g => g.id === req.params.id);
    if (item?.url?.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(item.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    content.gallery = content.gallery.filter(g => g.id !== req.params.id);
    writeJSON(CONTENT_FILE, content);
    res.json({ message: 'Fotoğraf silindi' });
  } catch {
    res.status(500).json({ error: 'Fotoğraf silinemedi' });
  }
});

// ─── UPLOAD ROUTE ────────────────────────────────────────────────────────────

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });
    res.json({ url: '/uploads/' + req.file.filename });
  } catch {
    res.status(500).json({ error: 'Dosya yüklenemedi' });
  }
});

// ─── SETTINGS ROUTES ─────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  try {
    const settings = readJSON(SETTINGS_FILE);
    const safe = { ...settings };
    delete safe.admin_password_hash;
    delete safe.jwt_secret;
    delete safe.smtp;
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'Ayarlar yüklenemedi' });
  }
});

app.get('/api/settings/full', authMiddleware, (req, res) => {
  try {
    const settings = readJSON(SETTINGS_FILE);
    const safe = { ...settings };
    delete safe.admin_password_hash;
    delete safe.jwt_secret;
    res.json(safe);
  } catch {
    res.status(500).json({ error: 'Ayarlar yüklenemedi' });
  }
});

app.put('/api/settings', authMiddleware, (req, res) => {
  try {
    const settings = readJSON(SETTINGS_FILE);
    const updates = req.body;
    delete updates.admin_password_hash;
    delete updates.jwt_secret;
    Object.assign(settings, updates);
    writeJSON(SETTINGS_FILE, settings);
    res.json({ message: 'Ayarlar güncellendi' });
  } catch {
    res.status(500).json({ error: 'Ayarlar güncellenemedi' });
  }
});

app.post('/api/settings/logo', authMiddleware, upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Logo yüklenmedi' });
    const settings = readJSON(SETTINGS_FILE);
    settings.logo = '/uploads/' + req.file.filename;
    writeJSON(SETTINGS_FILE, settings);
    res.json({ url: settings.logo });
  } catch {
    res.status(500).json({ error: 'Logo yüklenemedi' });
  }
});

app.post('/api/settings/favicon', authMiddleware, upload.single('favicon'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Favicon yüklenmedi' });
    const settings = readJSON(SETTINGS_FILE);
    settings.favicon = '/uploads/' + req.file.filename;
    writeJSON(SETTINGS_FILE, settings);
    res.json({ url: settings.favicon });
  } catch {
    res.status(500).json({ error: 'Favicon yüklenemedi' });
  }
});

// ─── CONTACT ROUTE ───────────────────────────────────────────────────────────

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Ad, e-posta ve mesaj zorunludur' });
    }

    const settings = readJSON(SETTINGS_FILE);
    const content = readJSON(CONTENT_FILE);
    const contactInfo = content.contact;

    // Save to a contact log
    const logFile = path.join(DATA_DIR, 'contacts.json');
    const contacts = fs.existsSync(logFile) ? readJSON(logFile) : [];
    contacts.unshift({
      id: uuidv4(),
      name, email, phone, subject, message,
      date: new Date().toISOString(),
      read: false
    });
    writeJSON(logFile, contacts);

    // Send email if SMTP configured
    if (settings.smtp?.user && settings.smtp?.pass) {
      const transporter = nodemailer.createTransporter({
        host: settings.smtp.host,
        port: settings.smtp.port,
        secure: settings.smtp.secure,
        auth: { user: settings.smtp.user, pass: settings.smtp.pass }
      });

      await transporter.sendMail({
        from: `"${settings.smtp.from_name}" <${settings.smtp.from_email}>`,
        to: settings.smtp.user,
        subject: `Yeni İletişim Formu: ${subject || name}`,
        html: `
          <h2>Yeni İletişim Formu Mesajı</h2>
          <p><strong>Ad Soyad:</strong> ${name}</p>
          <p><strong>E-posta:</strong> ${email}</p>
          <p><strong>Telefon:</strong> ${phone || '-'}</p>
          <p><strong>Konu:</strong> ${subject || '-'}</p>
          <p><strong>Mesaj:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `
      });
    }

    res.json({ message: 'Mesajınız alındı, en kısa sürede size dönüş yapacağız.' });
  } catch (err) {
    console.error('Contact error:', err);
    res.status(500).json({ error: 'Mesaj gönderilemedi, lütfen tekrar deneyin.' });
  }
});

// ─── CONTACTS ADMIN ──────────────────────────────────────────────────────────

app.get('/api/contacts', authMiddleware, (req, res) => {
  try {
    const logFile = path.join(DATA_DIR, 'contacts.json');
    const contacts = fs.existsSync(logFile) ? readJSON(logFile) : [];
    res.json(contacts);
  } catch {
    res.status(500).json({ error: 'Mesajlar yüklenemedi' });
  }
});

app.patch('/api/contacts/:id/read', authMiddleware, (req, res) => {
  try {
    const logFile = path.join(DATA_DIR, 'contacts.json');
    const contacts = fs.existsSync(logFile) ? readJSON(logFile) : [];
    const idx = contacts.findIndex(c => c.id === req.params.id);
    if (idx !== -1) contacts[idx].read = true;
    writeJSON(logFile, contacts);
    res.json({ message: 'Okundu' });
  } catch {
    res.status(500).json({ error: 'Güncellenemedi' });
  }
});

app.delete('/api/contacts/:id', authMiddleware, (req, res) => {
  try {
    const logFile = path.join(DATA_DIR, 'contacts.json');
    let contacts = fs.existsSync(logFile) ? readJSON(logFile) : [];
    contacts = contacts.filter(c => c.id !== req.params.id);
    writeJSON(logFile, contacts);
    res.json({ message: 'Mesaj silindi' });
  } catch {
    res.status(500).json({ error: 'Mesaj silinemedi' });
  }
});

// ─── FALLBACK ────────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint bulunamadı' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── INIT ────────────────────────────────────────────────────────────────────

async function init() {
  const settings = readJSON(SETTINGS_FILE);
  // Generate real hash for default password "Everest2024!" on first run
  if (settings.admin_password_hash.includes('1234567890abcdef')) {
    settings.admin_password_hash = await bcrypt.hash('Everest2024!', 10);
    writeJSON(SETTINGS_FILE, settings);
    console.log('✅ Admin şifre oluşturuldu: Everest2024!');
  }
}

init().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Everest Soğutma sitesi: http://localhost:${PORT}`);
    console.log(`🔐 Admin paneli: http://localhost:${PORT}/admin/`);
    console.log(`🔑 Admin şifre: Everest2024!\n`);
  });
});
