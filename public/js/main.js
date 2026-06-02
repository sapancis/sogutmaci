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
// frost.js tarafından yönetiliyor
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
function initWhatsappFab() {
  const fab = document.querySelector('.whatsapp-fab');
  if (!fab || !siteContent?.contact?.whatsapp) return;
  const phone = siteContent.contact.whatsapp.replace(/\D/g, '');
  fab.href = `https://wa.me/${phone}`;
  fab.style.display = 'flex';
}

// ─── Dynamic Content ──────────────────────────────────────────────
function applyDynamicContent() {
  if (!siteContent) return;

  // Footer
  const footer = document.querySelector('footer');
  if (footer && siteContent.footer) {
    const tagline = footer.querySelector('.footer-tagline');
    if (tagline) tagline.textContent = siteContent.footer.tagline || '';
    const copyright = footer.querySelector('.footer-copyright');
    if (copyright) copyright.textContent = siteContent.footer.copyright || '';
  }

  // Logo across page
  if (siteSettings?.logo) {
    document.querySelectorAll('[data-logo]').forEach(img => img.src = siteSettings.logo);
    document.querySelectorAll('.footer-logo img').forEach(img => img.src = siteSettings.logo);
  }

  // Contact info in footer
  if (siteContent.contact) {
    const c = siteContent.contact;
    const setFooterContact = (selector, val) => {
      document.querySelectorAll(selector).forEach(el => { if (val) el.textContent = val; });
    };
    setFooterContact('[data-footer-phone]', c.phone);
    setFooterContact('[data-footer-email]', c.email);
    setFooterContact('[data-footer-address]', c.address);
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
