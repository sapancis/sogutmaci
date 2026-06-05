/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — Main JavaScript
   ═══════════════════════════════════════════════════════════════ */

// ─── State ───────────────────────────────────────────────────────
let siteContent = null;
let siteSettings = null;

// ─── Init ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSiteData();
  initLoader();
  initHeader();
  initMobileNav();
  initRevealAnimations();
  initPageTransitions();
  initWhatsappFab();
  applyDynamicContent();
});

// ─── Load Data ────────────────────────────────────────────────────
async function loadSiteData() {
  try {
    const [contentRes, settingsRes] = await Promise.all([
      fetch('/api/content'),
      fetch('/api/settings')
    ]);
    siteContent = await contentRes.json();
    siteSettings = await settingsRes.json();
  } catch (e) {
    console.warn('Could not load site data:', e);
  }
}

// ─── Loader ───────────────────────────────────────────────────────
// frost.js tarafından tamamen yönetiliyor — burada sadece logo güncelle
function initLoader() {
  if (siteSettings?.logo) {
    document.querySelectorAll('[data-logo]').forEach(img => img.src = siteSettings.logo);
  }
}

// ─── Header ───────────────────────────────────────────────────────
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;

  // Apply logo
  if (siteSettings?.logo) {
    header.querySelectorAll('.header-logo img').forEach(img => img.src = siteSettings.logo);
  }
  if (siteSettings?.site_name) {
    header.querySelectorAll('.logo-text').forEach(el => el.textContent = siteSettings.site_name);
  }

  // Scroll behavior
  const isHero = document.querySelector('.hero');
  if (!isHero) header.classList.add('solid');

  const onScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active nav
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  header.querySelectorAll('.nav-link').forEach(link => {
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

// ─── Mobile Nav ───────────────────────────────────────────────────
function initMobileNav() {
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.mobile-nav-overlay');
  const mobileNav = document.querySelector('.mobile-nav');
  if (!hamburger) return;

  const toggle = (open) => {
    hamburger.classList.toggle('open', open);
    overlay?.classList.toggle('open', open);
    mobileNav?.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggle(!hamburger.classList.contains('open')));
  overlay?.addEventListener('click', () => toggle(false));
  mobileNav?.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });

  // Active state
  const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
  mobileNav?.querySelectorAll('.mobile-nav-link').forEach(link => {
    const href = new URL(link.href).pathname.replace(/\/$/, '') || '/';
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });
}

// ─── Page Transitions ─────────────────────────────────────────────
// Sade geçiş — frost overlay kaldırıldı
function initPageTransitions() {}

// ─── Scroll Reveal ────────────────────────────────────────────────
function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}

// ─── WhatsApp FAB ─────────────────────────────────────────────────
function buildWhatsappLink() {
  const c = siteContent?.contact;
  if (!c?.whatsapp) return null;
  // Placeholder (X içeren) numaraları atla
  if (/[xX]/.test(c.whatsapp)) return null;
  const phone = c.whatsapp.replace(/\D/g, '');
  if (phone.length < 10) return null;
  const msg = c.whatsapp_message || 'Merhaba, bilgi almak istiyorum.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function initWhatsappFab() {
  const link = buildWhatsappLink();
  // Floating button
  const fab = document.querySelector('.whatsapp-fab');
  if (fab && link) {
    fab.href = link;
    fab.target = '_blank';
    fab.rel = 'noopener';
    fab.style.display = 'flex';
  }
  // Tüm whatsapp linkleri (footer, iletişim vs.)
  document.querySelectorAll('[data-whatsapp-link]').forEach(a => {
    if (link) { a.href = link; a.target = '_blank'; a.rel = 'noopener'; }
  });
}

// ─── Yardımcı: güvenli metin/HTML/görsel set ──────────────────────
function setText(sel, val, root = document) {
  if (val == null) return;
  root.querySelectorAll(sel).forEach(el => { el.textContent = val; });
}
function setHTML(sel, val, root = document) {
  if (val == null) return;
  root.querySelectorAll(sel).forEach(el => { el.innerHTML = val; });
}
function setImage(sel, url, root = document) {
  if (!url) return;
  root.querySelectorAll(sel).forEach(img => {
    img.src = url;
    img.style.display = 'block';
    // varsa placeholder'ı gizle
    const ph = img.parentElement?.querySelector('[data-img-placeholder]');
    if (ph) ph.style.display = 'none';
  });
}

// ─── Dynamic Content ──────────────────────────────────────────────
function applyDynamicContent() {
  if (!siteContent) return;
  const C = siteContent;

  // ═══ HER SAYFADA: Logo ═══
  if (siteSettings?.logo) {
    document.querySelectorAll('[data-logo]').forEach(img => img.src = siteSettings.logo);
    document.querySelectorAll('.footer-logo img').forEach(img => img.src = siteSettings.logo);
  }
  if (siteSettings?.site_name) {
    setText('[data-site-name]', siteSettings.site_name);
  }

  // ═══ FOOTER ═══
  if (C.footer) {
    setText('.footer-tagline', C.footer.tagline);
    setText('.footer-copyright', C.footer.copyright);
  }
  if (C.contact) {
    setText('[data-footer-phone]', C.contact.phone);
    setText('[data-footer-email]', C.contact.email);
    setText('[data-footer-address]', C.contact.address);
  }

  // ═══ SOSYAL MEDYA ═══
  if (C.contact?.social) {
    const s = C.contact.social;
    const setSocial = (id, url) => {
      const el = document.getElementById(id);
      if (el && url) { el.href = url; el.target = '_blank'; el.rel = 'noopener'; el.style.display = 'flex'; }
    };
    setSocial('footer-facebook', s.facebook);
    setSocial('footer-instagram', s.instagram);
  }

  // ═══ ANASAYFA: HERO ═══
  if (C.home?.hero) {
    const h = C.home.hero;
    if (h.title) setHTML('[data-hero-title]', h.title);
    if (h.subtitle) setText('[data-hero-subtitle]', h.subtitle);
    if (h.cta_primary) setText('[data-hero-cta-primary]', h.cta_primary);
    if (h.cta_secondary) setText('[data-hero-cta-secondary]', h.cta_secondary);
  }

  // ═══ ANASAYFA: İSTATİSTİKLER ═══
  if (C.home?.stats?.length) {
    const statItems = document.querySelectorAll('.hero-stats .stat-item');
    C.home.stats.forEach((stat, i) => {
      if (statItems[i]) {
        const v = statItems[i].querySelector('.stat-value');
        const l = statItems[i].querySelector('.stat-label');
        if (v) v.textContent = stat.value;
        if (l) l.textContent = stat.label;
      }
    });
  }

  // ═══ ANASAYFA: HAKKIMIZDA TEASER ═══
  if (C.home?.about_teaser) {
    const a = C.home.about_teaser;
    setText('[data-about-label]', a.label);
    setHTML('[data-about-heading]', a.heading);
    setText('[data-about-text]', a.text);
    setText('[data-about-text2]', a.text2);
    setImage('[data-about-image]', a.image);
  }

  // ═══ HAKKIMIZDA SAYFASI ═══
  if (C.about) {
    const a = C.about;
    setText('[data-page-about-title]', a.title);
    setText('[data-page-about-subtitle]', a.subtitle);
    setHTML('[data-page-about-heading]', a.heading);
    setText('[data-page-about-story]', a.story);
    setText('[data-page-about-story2]', a.story2);
    setImage('[data-page-about-image]', a.image);
  }

  // ═══ YETKİLİ SERVİS SAYFASI ═══
  if (C.authorized_service) {
    const a = C.authorized_service;
    setText('[data-auth-title]', a.title);
    setText('[data-auth-subtitle]', a.subtitle);
    setText('[data-auth-intro]', a.intro);

    // Markaları dinamik render et
    const brandsGrid = document.getElementById('brands-grid');
    if (brandsGrid && a.brands?.length) {
      brandsGrid.innerHTML = a.brands.map((b, i) => `
        <div class="brand-card" data-reveal data-reveal-delay="${(i % 6) + 1}">
          <div class="brand-logo">
            ${b.logo
              ? `<img src="${b.logo}" alt="${b.name}" loading="lazy">`
              : `<div style="font-size:28px;font-weight:900;color:var(--blue-700);letter-spacing:-.02em;">${(b.name || '').toUpperCase()}</div>`}
          </div>
          <h3 class="brand-name">${b.name || ''}</h3>
          <p class="brand-desc">${b.desc || ''}</p>
        </div>
      `).join('');
      // Yeni eklenen kartlara reveal animasyonu uygula
      brandsGrid.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
    }
  }

  // ═══ İLETİŞİM bilgileri (footer + her yerde) ═══
  if (C.contact) {
    setText('[data-contact-phone]', C.contact.phone);
    setText('[data-contact-email]', C.contact.email);
    setText('[data-contact-address]', C.contact.address);
    setText('[data-contact-mobile]', C.contact.mobile);
  }
}

// ─── Utility: fetch JSON ──────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).error || 'Hata oluştu');
  return res.json();
}

// ─── Counter Animation ────────────────────────────────────────────
function animateCounter(el, target, duration = 1500) {
  const isPlus = target.endsWith('+');
  const num = parseInt(target.replace(/\D/g, ''));
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * num);
    el.textContent = current + (isPlus ? '+' : target.includes('/') ? target.substring(target.indexOf('/')) : '');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

// Trigger counters when visible
document.addEventListener('DOMContentLoaded', () => {
  const stats = document.querySelectorAll('.stat-value');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, entry.target.dataset.value || entry.target.textContent);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach(el => {
    el.dataset.value = el.textContent;
    observer.observe(el);
  });
});

// ─── Gallery Lightbox ─────────────────────────────────────────────
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const img = lightbox.querySelector('.lightbox-img');
  let items = [];
  let currentIndex = 0;

  document.querySelectorAll('.gallery-item').forEach((item, i) => {
    item.addEventListener('click', () => {
      items = Array.from(document.querySelectorAll('.gallery-item img'));
      currentIndex = i;
      openLightbox(items[i].src);
    });
  });

  function openLightbox(src) {
    img.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  lightbox.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  lightbox.querySelector('.lightbox-prev')?.addEventListener('click', () => navigate(-1));
  lightbox.querySelector('.lightbox-next')?.addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + items.length) % items.length;
    img.src = items[currentIndex].src;
  }
}

document.addEventListener('DOMContentLoaded', initLightbox);
