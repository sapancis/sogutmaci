/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Admin Panel JavaScript
   ═══════════════════════════════════════════════════════════════ */

const TOKEN = () => localStorage.getItem('admin_token');

// ─── Auth Guard ───────────────────────────────────────────────
async function checkAuth() {
  const token = TOKEN();
  if (!token) { window.location.href = '/admin/login.html'; return false; }
  try {
    const res = await fetch('/api/auth/verify', { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) { localStorage.removeItem('admin_token'); window.location.href = '/admin/login.html'; return false; }
    return true;
  } catch { window.location.href = '/admin/login.html'; return false; }
}

// ─── API Helper ───────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { Authorization: 'Bearer ' + TOKEN() } };
  if (body && !(body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Hata oluştu');
  return data;
}

function showAlert(id, msg, type = 'success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ─── Navigation ───────────────────────────────────────────────
let currentSection = 'dashboard';
const sectionTitles = {
  dashboard: 'Dashboard', messages: 'Mesajlar', home: 'Anasayfa', about: 'Hakkımızda',
  services: 'Hizmetler', authorized: 'Yetkili Servis', gallery: 'Galeri',
  'contact-page': 'İletişim Bilgileri', footer: 'Footer', settings: 'Site Ayarları',
  seo: 'SEO Ayarları', password: 'Şifre Değiştir'
};

function navigate(section) {
  document.querySelectorAll('.admin-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));

  const target = document.getElementById('section-' + section);
  if (target) target.classList.add('active');

  const activeLink = document.querySelector(`.sidebar-link[data-section="${section}"]`);
  if (activeLink) activeLink.classList.add('active');

  document.getElementById('topbar-title').textContent = sectionTitles[section] || section;
  currentSection = section;

  // Close mobile sidebar
  document.getElementById('admin-sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');

  // Load section data
  const loaders = {
    dashboard: loadDashboard, messages: loadMessages, home: loadHome,
    about: loadAbout, services: loadServices, authorized: loadAuthorized,
    gallery: loadGallery, 'contact-page': loadContactPage, footer: loadFooter,
    settings: loadSettings, seo: loadSeo
  };
  if (loaders[section]) loaders[section]();
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!await checkAuth()) return;

  // Sidebar links
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.section); });
  });

  // Quick access buttons (dashboard)
  document.querySelectorAll('[data-section]').forEach(btn => {
    if (btn.tagName === 'BUTTON') {
      btn.addEventListener('click', () => navigate(btn.dataset.section));
    }
  });

  // Mobile hamburger
  document.getElementById('topbar-hamburger').addEventListener('click', () => {
    document.getElementById('admin-sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  });
  document.getElementById('sidebar-overlay').addEventListener('click', () => {
    document.getElementById('admin-sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
  });

  // Modal closes
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tab-bar');
      const panelGroup = btn.closest('.card-body') || btn.closest('.admin-section');
      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      panelGroup.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      const target = panelGroup.querySelector('#' + btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  // Bind all save buttons
  bindSaveButtons();

  // Load initial section
  navigate('dashboard');
});

function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ─── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [content, gallery, contacts] = await Promise.all([
      api('/api/content'), api('/api/gallery'), api('/api/contacts')
    ]);
    document.getElementById('dash-services-count').textContent = content.services?.length || 0;
    document.getElementById('dash-gallery-count').textContent = gallery.length;
    document.getElementById('dash-msgs-count').textContent = contacts.length;
    const unread = contacts.filter(c => !c.read).length;
    document.getElementById('dash-unread-count').textContent = unread;
    const badge = document.getElementById('msg-badge');
    if (unread > 0) { badge.textContent = unread; badge.style.display = 'inline'; }
    else badge.style.display = 'none';

    // Recent messages
    const list = document.getElementById('dash-msgs-list');
    const recent = contacts.slice(0, 5);
    if (!recent.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--gray-400);font-size:14px;">Henüz mesaj yok</div>';
      return;
    }
    list.innerHTML = recent.map(m => `
      <div style="padding:16px 20px;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:16px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:600;color:var(--gray-900);">${m.name} ${!m.read ? '<span class="badge badge-blue" style="font-size:10px;">Yeni</span>' : ''}</div>
          <div style="font-size:13px;color:var(--gray-500);margin-top:2px;">${m.email}</div>
          <div style="font-size:13px;color:var(--gray-600);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.message?.substring(0, 80)}...</div>
        </div>
        <div style="font-size:12px;color:var(--gray-400);white-space:nowrap;">${new Date(m.date).toLocaleDateString('tr-TR')}</div>
      </div>
    `).join('');
  } catch(e) { console.error(e); }
}

// ─── MESSAGES ─────────────────────────────────────────────────
async function loadMessages() {
  const list = document.getElementById('messages-list');
  list.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:40px;">Yükleniyor...</div>';
  try {
    const contacts = await api('/api/contacts');
    if (!contacts.length) {
      list.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:40px;font-size:14px;">Henüz mesaj bulunmuyor</div>';
      return;
    }
    list.innerHTML = contacts.map(m => `
      <div class="msg-card ${!m.read ? 'unread' : ''}" id="msg-${m.id}">
        <div class="msg-card-header">
          <div>
            <div class="msg-name">${m.name} ${!m.read ? '<span class="badge badge-blue">Yeni</span>' : ''}</div>
            <div class="msg-email">${m.email}${m.phone ? ' · ' + m.phone : ''}</div>
          </div>
          <div class="msg-date">${new Date(m.date).toLocaleString('tr-TR')}</div>
        </div>
        ${m.subject ? `<div class="msg-subject">${m.subject}</div>` : ''}
        <div class="msg-text">${m.message?.replace(/\n/g, '<br>')}</div>
        <div class="msg-actions">
          ${!m.read ? `<button class="btn btn-sm btn-secondary" onclick="markRead('${m.id}')">Okundu İşaretle</button>` : ''}
          <a href="mailto:${m.email}?subject=Re: ${m.subject || ''}" class="btn btn-sm btn-primary">E-posta Gönder</a>
          <button class="btn btn-sm btn-danger" onclick="deleteMsg('${m.id}')">Sil</button>
        </div>
      </div>
    `).join('');
  } catch(e) { list.innerHTML = `<div style="color:var(--red);padding:20px;">${e.message}</div>`; }
}

async function markRead(id) {
  try { await api(`/api/contacts/${id}/read`, 'PATCH'); loadMessages(); loadDashboard(); } catch(e) {}
}

let deleteTarget = null;
let deleteType = null;

async function deleteMsg(id) {
  deleteTarget = id; deleteType = 'msg';
  document.getElementById('confirm-msg').textContent = 'Bu mesajı silmek istediğinizden emin misiniz?';
  openModal('confirm-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh-msgs-btn')?.addEventListener('click', loadMessages);
  document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!deleteTarget) return;
    try {
      if (deleteType === 'msg') { await api(`/api/contacts/${deleteTarget}`, 'DELETE'); loadMessages(); loadDashboard(); }
      else if (deleteType === 'service') { await api(`/api/services/${deleteTarget}`, 'DELETE'); loadServices(); }
      else if (deleteType === 'gallery') { await api(`/api/gallery/${deleteTarget}`, 'DELETE'); loadGallery(); }
      closeModal('confirm-modal');
    } catch(e) { alert('Hata: ' + e.message); }
  });
});

// ─── HOME ─────────────────────────────────────────────────────
async function loadHome() {
  try {
    const content = await api('/api/content/home');
    document.getElementById('hero-title').value = content.hero?.title || '';
    document.getElementById('hero-subtitle').value = content.hero?.subtitle || '';
    document.getElementById('hero-cta-primary').value = content.hero?.cta_primary || '';
    document.getElementById('hero-cta-secondary').value = content.hero?.cta_secondary || '';
    document.getElementById('about-teaser-title').value = content.about_teaser?.title || '';
    document.getElementById('about-teaser-text').value = content.about_teaser?.text || '';

    // Stats editor
    const statsEl = document.getElementById('stats-editor');
    const stats = content.stats || [{value:'',label:''},{value:'',label:''},{value:'',label:''},{value:'',label:''}];
    statsEl.innerHTML = stats.map((s, i) => `
      <div class="form-row" style="margin-bottom:12px;">
        <div class="form-group"><label class="form-label">Değer ${i+1}</label><input type="text" class="form-input" data-stat-val="${i}" value="${s.value}" placeholder="15+"></div>
        <div class="form-group"><label class="form-label">Etiket ${i+1}</label><input type="text" class="form-input" data-stat-label="${i}" value="${s.label}" placeholder="Yıllık Deneyim"></div>
      </div>
    `).join('');
  } catch(e) {}
}

async function saveHome() {
  const stats = [];
  document.querySelectorAll('[data-stat-val]').forEach((el, i) => {
    stats[i] = { value: el.value, label: document.querySelector(`[data-stat-label="${i}"]`)?.value || '' };
  });
  const body = {
    hero: {
      title: document.getElementById('hero-title').value,
      subtitle: document.getElementById('hero-subtitle').value,
      cta_primary: document.getElementById('hero-cta-primary').value,
      cta_secondary: document.getElementById('hero-cta-secondary').value
    },
    about_teaser: {
      title: document.getElementById('about-teaser-title').value,
      text: document.getElementById('about-teaser-text').value
    },
    stats
  };
  try { await api('/api/content/home', 'PUT', body); showAlert('home-alert', 'Anasayfa güncellendi'); } catch(e) { showAlert('home-alert', e.message, 'error'); }
}

// ─── ABOUT ────────────────────────────────────────────────────
async function loadAbout() {
  try {
    const content = await api('/api/content/about');
    document.getElementById('about-title-input').value = content.title || '';
    document.getElementById('about-subtitle-input').value = content.subtitle || '';
    document.getElementById('about-story-input').value = content.story || '';
    document.getElementById('about-vision-input').value = content.vision || '';
    document.getElementById('about-mission-input').value = content.mission || '';
    document.getElementById('about-certs-input').value = (content.certificates || []).join('\n');
  } catch(e) {}
}

async function saveAbout() {
  const body = {
    title: document.getElementById('about-title-input').value,
    subtitle: document.getElementById('about-subtitle-input').value,
    story: document.getElementById('about-story-input').value,
    vision: document.getElementById('about-vision-input').value,
    mission: document.getElementById('about-mission-input').value,
    certificates: document.getElementById('about-certs-input').value.split('\n').filter(Boolean)
  };
  try { await api('/api/content/about', 'PUT', body); showAlert('about-alert', 'Hakkımızda güncellendi'); } catch(e) { showAlert('about-alert', e.message, 'error'); }
}

// ─── SERVICES ─────────────────────────────────────────────────
async function loadServices() {
  const tbody = document.getElementById('services-table-body');
  try {
    const services = await api('/api/services');
    if (!services.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:32px;">Henüz hizmet yok</td></tr>'; return; }
    tbody.innerHTML = services.map(s => `
      <tr>
        <td><strong>${s.title}</strong><br><span style="font-size:12px;color:var(--gray-400);">/${s.id}</span></td>
        <td style="max-width:240px;"><span style="font-size:13px;color:var(--gray-500);">${s.short_desc || ''}</span></td>
        <td><span class="badge badge-blue">${(s.features || []).length} özellik</span></td>
        <td><div class="td-actions">
          <button class="btn btn-sm btn-secondary" onclick="editService('${s.id}')">Düzenle</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDeleteService('${s.id}')">Sil</button>
        </div></td>
      </tr>
    `).join('');
  } catch(e) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--red);padding:20px;">${e.message}</td></tr>`; }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-service-btn')?.addEventListener('click', () => {
    document.getElementById('service-modal-title').textContent = 'Hizmet Ekle';
    document.getElementById('service-modal-id').value = '';
    ['svc-title','svc-id','svc-short-desc','svc-content','svc-features'].forEach(id => document.getElementById(id).value = '');
    openModal('service-modal');
  });

  document.getElementById('save-service-btn')?.addEventListener('click', saveService);
});

async function editService(id) {
  try {
    const s = await api('/api/services/' + id);
    document.getElementById('service-modal-title').textContent = 'Hizmet Düzenle';
    document.getElementById('service-modal-id').value = s.id;
    document.getElementById('svc-title').value = s.title || '';
    document.getElementById('svc-id').value = s.id || '';
    document.getElementById('svc-short-desc').value = s.short_desc || '';
    document.getElementById('svc-content').value = s.content || '';
    document.getElementById('svc-features').value = (s.features || []).join('\n');
    openModal('service-modal');
  } catch(e) { alert('Yüklenemedi: ' + e.message); }
}

async function saveService() {
  const editId = document.getElementById('service-modal-id').value;
  const body = {
    id: document.getElementById('svc-id').value.trim(),
    title: document.getElementById('svc-title').value.trim(),
    short_desc: document.getElementById('svc-short-desc').value.trim(),
    content: document.getElementById('svc-content').value.trim(),
    features: document.getElementById('svc-features').value.split('\n').filter(Boolean)
  };
  if (!body.title || !body.id) { alert('Hizmet adı ve URL kimliği zorunludur'); return; }
  try {
    if (editId) await api('/api/services/' + editId, 'PUT', body);
    else await api('/api/services', 'POST', body);
    closeModal('service-modal');
    loadServices();
  } catch(e) { alert('Hata: ' + e.message); }
}

function confirmDeleteService(id) {
  deleteTarget = id; deleteType = 'service';
  document.getElementById('confirm-msg').textContent = 'Bu hizmeti silmek istediğinizden emin misiniz?';
  openModal('confirm-modal');
}

// ─── AUTHORIZED SERVICE ───────────────────────────────────────
async function loadAuthorized() {
  try {
    const content = await api('/api/content/authorized_service');
    document.getElementById('auth-title-input').value = content.title || '';
    document.getElementById('auth-subtitle-input').value = content.subtitle || '';
    document.getElementById('auth-intro-input').value = content.intro || '';
    document.getElementById('auth-advantages-input').value = (content.advantages || []).join('\n');
    renderBrandsEditor(content.brands || []);
  } catch(e) {}
}

function renderBrandsEditor(brands) {
  const el = document.getElementById('brands-editor');
  el.innerHTML = brands.map((b, i) => `
    <div class="form-row" style="margin-bottom:10px;align-items:end;">
      <div class="form-group"><label class="form-label">Marka Adı</label><input type="text" class="form-input brand-name" value="${b.name || ''}"></div>
      <div class="form-group"><label class="form-label">Açıklama</label><input type="text" class="form-input brand-desc" value="${b.desc || ''}"></div>
      <div><button class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">Sil</button></div>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-brand-btn')?.addEventListener('click', () => {
    const el = document.getElementById('brands-editor');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginBottom = '10px';
    row.innerHTML = `
      <div class="form-group"><label class="form-label">Marka Adı</label><input type="text" class="form-input brand-name" placeholder="Örn: Daikin"></div>
      <div class="form-group"><label class="form-label">Açıklama</label><input type="text" class="form-input brand-desc" placeholder="Kısa açıklama"></div>
      <div><button class="btn btn-danger btn-sm" onclick="this.closest('.form-row').remove()">Sil</button></div>
    `;
    el.appendChild(row);
  });
});

async function saveAuthorized() {
  const names = document.querySelectorAll('.brand-name');
  const descs = document.querySelectorAll('.brand-desc');
  const brands = Array.from(names).map((n, i) => ({ name: n.value, desc: descs[i]?.value || '' })).filter(b => b.name);
  const body = {
    title: document.getElementById('auth-title-input').value,
    subtitle: document.getElementById('auth-subtitle-input').value,
    intro: document.getElementById('auth-intro-input').value,
    advantages: document.getElementById('auth-advantages-input').value.split('\n').filter(Boolean),
    brands
  };
  try { await api('/api/content/authorized_service', 'PUT', body); showAlert('auth-alert', 'Yetkili servis güncellendi'); } catch(e) { showAlert('auth-alert', e.message, 'error'); }
}

// ─── GALLERY ──────────────────────────────────────────────────
let galleryFiles = [];

async function loadGallery() {
  const grid = document.getElementById('admin-gallery-grid');
  try {
    const photos = await api('/api/gallery');
    if (!photos.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:40px;font-size:14px;">Henüz fotoğraf yok</div>';
      return;
    }
    grid.innerHTML = photos.map(p => `
      <div class="admin-gallery-item">
        <img src="${p.url}" alt="${p.title || ''}" loading="lazy">
        <div class="admin-gallery-item-info">
          <div class="admin-gallery-item-title">${p.title || 'İsimsiz'}</div>
          <div class="admin-gallery-item-cat">${p.category || ''}</div>
          <div class="admin-gallery-item-actions">
            <button class="btn btn-sm btn-danger" onclick="confirmDeleteGallery('${p.id}')">Sil</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch(e) {}
}

function confirmDeleteGallery(id) {
  deleteTarget = id; deleteType = 'gallery';
  document.getElementById('confirm-msg').textContent = 'Bu fotoğrafı silmek istediğinizden emin misiniz?';
  openModal('confirm-modal');
}

document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('gallery-upload-zone');
  const fileInput = document.getElementById('gallery-file-input');
  const uploadBtn = document.getElementById('upload-gallery-btn');
  const preview = document.getElementById('gallery-preview');

  zone?.addEventListener('click', () => fileInput.click());
  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone?.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });

  fileInput?.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));

  function handleFiles(files) {
    galleryFiles = files.filter(f => f.type.startsWith('image/'));
    preview.innerHTML = galleryFiles.map((f, i) => {
      const url = URL.createObjectURL(f);
      return `<div style="position:relative;"><img src="${url}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);"><button onclick="removeFile(${i})" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button></div>`;
    }).join('');
    uploadBtn.disabled = galleryFiles.length === 0;
  }

  uploadBtn?.addEventListener('click', async () => {
    if (!galleryFiles.length) return;
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Yükleniyor...';
    const title = document.getElementById('gallery-title-input').value;
    const category = document.getElementById('gallery-cat-input').value;
    try {
      for (const file of galleryFiles) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('title', title);
        fd.append('category', category);
        await fetch('/api/gallery', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN() }, body: fd });
      }
      showAlert('gallery-alert', `${galleryFiles.length} fotoğraf yüklendi`);
      galleryFiles = [];
      preview.innerHTML = '';
      document.getElementById('gallery-title-input').value = '';
      fileInput.value = '';
      loadGallery();
    } catch(e) { showAlert('gallery-alert', e.message, 'error'); }
    finally { uploadBtn.disabled = false; uploadBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Yükle'; }
  });

  document.getElementById('refresh-gallery-btn')?.addEventListener('click', loadGallery);
});

window.removeFile = function(i) {
  galleryFiles.splice(i, 1);
  // re-render preview
  const preview = document.getElementById('gallery-preview');
  preview.innerHTML = galleryFiles.map((f, idx) => {
    const url = URL.createObjectURL(f);
    return `<div style="position:relative;"><img src="${url}" style="width:80px;height:60px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);"><button onclick="removeFile(${idx})" style="position:absolute;top:-6px;right:-6px;background:var(--red);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;">✕</button></div>`;
  }).join('');
  document.getElementById('upload-gallery-btn').disabled = galleryFiles.length === 0;
};

// ─── CONTACT PAGE ─────────────────────────────────────────────
async function loadContactPage() {
  try {
    const content = await api('/api/content/contact');
    document.getElementById('cp-phone').value = content.phone || '';
    document.getElementById('cp-mobile').value = content.mobile || '';
    document.getElementById('cp-email').value = content.email || '';
    document.getElementById('cp-whatsapp').value = content.whatsapp || '';
    document.getElementById('cp-address').value = content.address || '';
    document.getElementById('cp-weekdays').value = content.hours?.weekdays || '';
    document.getElementById('cp-saturday').value = content.hours?.saturday || '';
    document.getElementById('cp-sunday').value = content.hours?.sunday || '';
    document.getElementById('cp-facebook').value = content.social?.facebook || '';
    document.getElementById('cp-instagram').value = content.social?.instagram || '';
    document.getElementById('cp-map-embed').value = content.map_embed || '';
  } catch(e) {}
}

async function saveContactPage() {
  const body = {
    phone: document.getElementById('cp-phone').value,
    mobile: document.getElementById('cp-mobile').value,
    email: document.getElementById('cp-email').value,
    whatsapp: document.getElementById('cp-whatsapp').value,
    address: document.getElementById('cp-address').value,
    hours: {
      weekdays: document.getElementById('cp-weekdays').value,
      saturday: document.getElementById('cp-saturday').value,
      sunday: document.getElementById('cp-sunday').value
    },
    social: {
      facebook: document.getElementById('cp-facebook').value,
      instagram: document.getElementById('cp-instagram').value
    },
    map_embed: document.getElementById('cp-map-embed').value
  };
  try { await api('/api/content/contact', 'PUT', body); showAlert('contact-page-alert', 'İletişim bilgileri güncellendi'); } catch(e) { showAlert('contact-page-alert', e.message, 'error'); }
}

// ─── FOOTER ───────────────────────────────────────────────────
async function loadFooter() {
  try {
    const content = await api('/api/content/footer');
    document.getElementById('footer-tagline-input').value = content.tagline || '';
    document.getElementById('footer-copyright-input').value = content.copyright || '';
  } catch(e) {}
}

async function saveFooter() {
  const body = {
    tagline: document.getElementById('footer-tagline-input').value,
    copyright: document.getElementById('footer-copyright-input').value
  };
  try { await api('/api/content/footer', 'PUT', body); showAlert('footer-alert', 'Footer güncellendi'); } catch(e) { showAlert('footer-alert', e.message, 'error'); }
}

// ─── SETTINGS ─────────────────────────────────────────────────
async function loadSettings() {
  try {
    const settings = await api('/api/settings/full');
    document.getElementById('setting-site-name').value = settings.site_name || '';
    document.getElementById('setting-tagline').value = settings.site_tagline || '';
    if (settings.logo) {
      const img = document.getElementById('current-logo-img');
      img.src = settings.logo + '?t=' + Date.now();
      document.getElementById('sidebar-logo').src = settings.logo;
    }
    if (settings.smtp) {
      document.getElementById('smtp-host').value = settings.smtp.host || '';
      document.getElementById('smtp-port').value = settings.smtp.port || 587;
      document.getElementById('smtp-user').value = settings.smtp.user || '';
      document.getElementById('smtp-from-name').value = settings.smtp.from_name || '';
      document.getElementById('smtp-from-email').value = settings.smtp.from_email || '';
    }
  } catch(e) {}
}

async function saveGeneralSettings() {
  const body = {
    site_name: document.getElementById('setting-site-name').value,
    site_tagline: document.getElementById('setting-tagline').value
  };
  try { await api('/api/settings', 'PUT', body); showAlert('settings-alert', 'Ayarlar güncellendi'); } catch(e) { showAlert('settings-alert', e.message, 'error'); }
}

async function saveSmtpSettings() {
  const body = {
    smtp: {
      host: document.getElementById('smtp-host').value,
      port: parseInt(document.getElementById('smtp-port').value) || 587,
      secure: false,
      user: document.getElementById('smtp-user').value,
      pass: document.getElementById('smtp-pass').value || undefined,
      from_name: document.getElementById('smtp-from-name').value,
      from_email: document.getElementById('smtp-from-email').value
    }
  };
  if (!body.smtp.pass) delete body.smtp.pass;
  try { await api('/api/settings', 'PUT', body); showAlert('smtp-alert', 'SMTP ayarları güncellendi'); } catch(e) { showAlert('smtp-alert', e.message, 'error'); }
}

// Logo upload
document.addEventListener('DOMContentLoaded', () => {
  const logoZone = document.getElementById('logo-upload-zone');
  const logoInput = document.getElementById('logo-file-input');
  const uploadLogoBtn = document.getElementById('upload-logo-btn');

  logoZone?.addEventListener('click', () => logoInput.click());
  logoInput?.addEventListener('change', () => { uploadLogoBtn.disabled = !logoInput.files.length; });

  uploadLogoBtn?.addEventListener('click', async () => {
    if (!logoInput.files.length) return;
    const fd = new FormData();
    fd.append('logo', logoInput.files[0]);
    uploadLogoBtn.disabled = true;
    uploadLogoBtn.textContent = 'Yükleniyor...';
    try {
      const res = await fetch('/api/settings/logo', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN() }, body: fd });
      const data = await res.json();
      document.getElementById('current-logo-img').src = data.url + '?t=' + Date.now();
      document.getElementById('sidebar-logo').src = data.url + '?t=' + Date.now();
      showAlert('logo-alert', 'Logo güncellendi');
    } catch(e) { showAlert('logo-alert', 'Logo yüklenemedi', 'error'); }
    finally { uploadLogoBtn.disabled = false; uploadLogoBtn.textContent = 'Logo Yükle'; }
  });
});

// ─── SEO ──────────────────────────────────────────────────────
async function loadSeo() {
  try {
    const settings = await api('/api/settings/full');
    const seo = settings.seo || {};
    document.getElementById('seo-title').value = seo.meta_title || '';
    document.getElementById('seo-desc').value = seo.meta_description || '';
    document.getElementById('seo-keywords').value = seo.meta_keywords || '';
  } catch(e) {}
}

async function saveSeo() {
  const body = {
    seo: {
      meta_title: document.getElementById('seo-title').value,
      meta_description: document.getElementById('seo-desc').value,
      meta_keywords: document.getElementById('seo-keywords').value
    }
  };
  try { await api('/api/settings', 'PUT', body); showAlert('seo-alert', 'SEO ayarları güncellendi'); } catch(e) { showAlert('seo-alert', e.message, 'error'); }
}

// ─── PASSWORD ─────────────────────────────────────────────────
async function changePassword() {
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  document.getElementById('pw-alert-success').classList.remove('show');
  document.getElementById('pw-alert-error').classList.remove('show');

  if (!current || !newPw) { showAlert('pw-alert-error', 'Tüm alanları doldurun', 'error'); return; }
  if (newPw !== confirm) { showAlert('pw-alert-error', 'Yeni şifreler eşleşmiyor', 'error'); return; }
  if (newPw.length < 6) { showAlert('pw-alert-error', 'Şifre en az 6 karakter olmalı', 'error'); return; }

  try {
    await api('/api/auth/change-password', 'POST', { currentPassword: current, newPassword: newPw });
    showAlert('pw-alert-success', 'Şifre başarıyla güncellendi');
    document.getElementById('pw-current').value = '';
    document.getElementById('pw-new').value = '';
    document.getElementById('pw-confirm').value = '';
  } catch(e) { showAlert('pw-alert-error', e.message, 'error'); }
}

// ─── Bind Save Buttons ────────────────────────────────────────
function bindSaveButtons() {
  const bindings = {
    'save-home-btn': saveHome,
    'save-about-btn': saveAbout,
    'save-auth-btn': saveAuthorized,
    'save-contact-page-btn': saveContactPage,
    'save-footer-btn': saveFooter,
    'save-settings-btn': saveGeneralSettings,
    'save-smtp-btn': saveSmtpSettings,
    'save-seo-btn': saveSeo,
    'save-pw-btn': changePassword
  };
  Object.entries(bindings).forEach(([id, fn]) => {
    document.getElementById(id)?.addEventListener('click', fn);
  });
}
