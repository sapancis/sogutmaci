/* ═══════════════════════════════════════════════════════════════
   EVEREST SOĞUTMA — GLB Model Loader (v3)
   Çerçeveye sığdır + aşağı kaydır + pervane dönsün
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.getElementById('ac-canvas');
  if (!canvas) return;

  // ─── Renderer ─────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  // ─── Sahne & Kamera ───────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);

  function resize() {
    const el = canvas.parentElement;
    const w = el.clientWidth || 500;
    const h = el.clientHeight || 520;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // ─── Yükleniyor göstergesi ────────────────────────────────────
  const loadingDiv = document.createElement('div');
  loadingDiv.style.cssText = `
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:12px;pointer-events:none;
  `;
  loadingDiv.innerHTML = `
    <div style="width:44px;height:44px;border:3px solid #E2E8F0;border-top-color:#2E86C1;
      border-radius:50%;animation:spin .8s linear infinite;"></div>
    <p id="load-pct" style="font-size:13px;color:#64748B;font-family:Inter,sans-serif;">Yükleniyor...</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  canvas.parentElement.style.position = 'relative';
  canvas.parentElement.appendChild(loadingDiv);

  // ─── Aydınlatma ───────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xCCDDEE, 0.75));

  const key = new THREE.DirectionalLight(0xFFF8F0, 2.6);
  key.position.set(-3, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.001;
  key.shadow.radius = 4;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xD0E8FF, 1.0);
  fill.position.set(5, 3, 4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xAAC8E8, 0.7);
  rim.position.set(0, 6, -6);
  scene.add(rim);

  const bounce = new THREE.DirectionalLight(0xDDEEFF, 0.2);
  bounce.position.set(0, -4, 3);
  scene.add(bounce);

  // ─── GLTFLoader ───────────────────────────────────────────────
  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
    loader.setDRACOLoader(draco);
  }

  let modelGroup = null;

  const BASE_RX = -0.06;
  const BASE_RY = 0.28;
  let tX = BASE_RX, tY = BASE_RY, cX = BASE_RX, cY = BASE_RY;

  // Sayfa tamamen render olduktan sonra GLB yükle (render thread bloklanmasın)
  setTimeout(() => loader.load(
    '/models/ac.glb',

    // ─── Yüklendi ─────────────────────────────────────────────
    (gltf) => {
      loadingDiv.remove();
      modelGroup = gltf.scene;

      // Gölge + materyal
      modelGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) child.material.envMapIntensity = 1.1;
        }
      });


      // ── Ölçek ve Merkez ──────────────────────────────────────
      const box3 = new THREE.Box3().setFromObject(modelGroup);
      const size = box3.getSize(new THREE.Vector3());
      const center = box3.getCenter(new THREE.Vector3());

      // Kameraya göre tam çerçeveye sığacak ölçek hesapla
      const fovRad = camera.fov * (Math.PI / 180);
      const aspect = camera.aspect || 1;
      // Hem yükseklik hem genişlik için gereken ölçekleri karşılaştır
      const maxDim = Math.max(size.x, size.y, size.z);

      // Hedef: modelin en büyük boyutu görünür alana sığsın
      // Kamera mesafesini 4 birim olarak sabit tutuyoruz, buna göre ölçekle
      const camDist = 4.0;
      const visibleH = 2 * Math.tan(fovRad / 2) * camDist;
      const visibleW = visibleH * aspect;
      const targetFill = 0.88; // %88 doldursun
      const scaleY = (visibleH * targetFill) / size.y;
      const scaleX = (visibleW * targetFill) / size.x;
      const scale = Math.min(scaleX, scaleY);

      modelGroup.scale.setScalar(scale);

      // Yatay ortala, aşağı kaydır
      const scaledCenter = center.clone().multiplyScalar(scale);
      const scaledH = size.y * scale;

      modelGroup.position.x = -scaledCenter.x;
      modelGroup.position.z = -scaledCenter.z;
      // Aşağıya kaydır: modelin merkezi görünüm merkezinin altında olsun
      modelGroup.position.y = -scaledCenter.y - scaledH * 0.18;

      modelGroup.rotation.x = BASE_RX;
      modelGroup.rotation.y = BASE_RY;

      scene.add(modelGroup);

      // Kamera mesafesi sabit
      camera.position.set(0, 0.1, camDist);
      camera.lookAt(0, 0, 0);

      // GLB'deki animasyonları başlat
      if (gltf.animations?.length > 0) {
        mixer = new THREE.AnimationMixer(modelGroup);
        gltf.animations.forEach(clip => mixer.clipAction(clip).play());
      }
    },

    // ─── İlerleme ─────────────────────────────────────────────
    (progress) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        const el = document.getElementById('load-pct');
        if (el) el.textContent = `Yükleniyor... %${pct}`;
      }
    },

    // ─── Hata ─────────────────────────────────────────────────
    (err) => {
      console.error('GLB hatası:', err);
      loadingDiv.innerHTML = `<p style="color:#EF4444;font-family:Inter,sans-serif;font-size:14px;">Model yüklenemedi</p>`;
    }
  ), 800); // 800ms sonra yükle

  let mixer = null;

  // ─── Zemin gölge ────────────────────────────────────────────── ──────────────────────────────────────────────
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x6090B0, transparent: true, opacity: 0.07, roughness: 1 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -2.0;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // ─── Fare etkileşimi ──────────────────────────────────────────
  const hero = canvas.closest('.hero-visual') || canvas.parentElement;

  document.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom) {
      tY = BASE_RY + ((e.clientX - r.left) / r.width - 0.5) * 0.55;
      tX = BASE_RX - ((e.clientY - r.top) / r.height - 0.5) * 0.22;
    } else { tX = BASE_RX; tY = BASE_RY; }
  });

  hero.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    const r = hero.getBoundingClientRect();
    tY = BASE_RY + ((t.clientX - r.left) / r.width - 0.5) * 0.40;
    tX = BASE_RX - ((t.clientY - r.top) / r.height - 0.5) * 0.15;
  }, { passive: true });

  // ─── Animasyon ────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let ft = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    ft += dt;

    if (modelGroup) {
      // Fare takip
      cX += (tX - cX) * 0.055;
      cY += (tY - cY) * 0.055;
      modelGroup.rotation.x = cX;
      modelGroup.rotation.y = cY;

      // Hafif süzülme
      const baseY = modelGroup.userData.baseY || modelGroup.position.y;
      modelGroup.userData.baseY = baseY;
      modelGroup.position.y = baseY + Math.sin(ft * 0.65) * 0.03;
    }

    if (mixer) mixer.update(dt);
    renderer.render(scene, camera);
  }

  animate();
})();
