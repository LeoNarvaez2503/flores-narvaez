/* ============================================
   CAVALOCAL — Scroll Storytelling Engine v3
   286 frames, butter-smooth LERP, strong overlays
   ============================================ */

(function () {
  'use strict';

  const TOTAL_FRAMES = 286;
  const FRAME_PATH = './assets/frames/frame-';
  const FRAME_EXT = '.webp';
  const LERP_FACTOR = 0.10; // More responsive interpolation for faster feedback

  const canvas = document.getElementById('video-canvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloader-fill');
  const preloaderPercent = document.getElementById('preloader-percent');
  const progressBar = document.getElementById('progress-bar');
  const scrollIndicator = document.getElementById('scroll-indicator');

  const images = [];
  let currentFrame = 0;
  let targetFrame = 0;
  let displayFrame = 0;
  let loadedCount = 0;

  // --- Canvas ---
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (images[Math.round(displayFrame)]) renderFrame(Math.round(displayFrame));
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function renderFrame(index) {
    const img = images[index];
    if (!img || !img.complete) return;
    const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const cr = w / h, ir = img.naturalWidth / img.naturalHeight;
    let dw, dh, dx, dy;
    if (ir > cr) { dh = h; dw = dh * ir; dx = (w - dw) / 2; dy = 0; }
    else { dw = w; dh = dw / ir; dx = 0; dy = (h - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  // --- LERP loop ---
  function animationLoop() {
    displayFrame += (targetFrame - displayFrame) * LERP_FACTOR;
    if (Math.abs(targetFrame - displayFrame) < 0.05) displayFrame = targetFrame;
    const fi = Math.max(0, Math.min(Math.round(displayFrame), TOTAL_FRAMES - 1));
    if (fi !== currentFrame && images[fi]) { currentFrame = fi; renderFrame(fi); }
    requestAnimationFrame(animationLoop);
  }

  // --- Preload ---
  function getPath(i) { return FRAME_PATH + String(i).padStart(4, '0') + FRAME_EXT; }

  function preloadImages() {
    return new Promise((resolve) => {
      function loadImg(i) {
        return new Promise((res) => {
          const img = new Image();
          img.onload = img.onerror = () => {
            loadedCount++;
            const p = loadedCount / TOTAL_FRAMES;
            preloaderFill.style.transform = 'scaleX(' + p + ')';
            preloaderPercent.textContent = Math.round(p * 100) + '%';
            res(img.complete && img.naturalWidth ? img : null);
          };
          img.src = getPath(i);
        });
      }
      async function run() {
        // Priority first 30
        for (let i = 0; i < Math.min(30, TOTAL_FRAMES); i++) images[i] = await loadImg(i);
        if (images[0]) renderFrame(0);
        // Rest in batches of 25
        for (let i = 30; i < TOTAL_FRAMES; i += 25) {
          const batch = [];
          for (let j = i; j < Math.min(i + 25, TOTAL_FRAMES); j++)
            batch.push(loadImg(j).then(img => { images[j] = img; }));
          await Promise.all(batch);
        }
        resolve();
      }
      run();
    });
  }

  // --- GSAP ScrollTrigger ---
  function initAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Seleccionar videos de fondo
    const bgVideos = {
      'experience': document.getElementById('bg-video-experience'),
      'join': document.getElementById('bg-video-join')
    };

    let activeVideo = null;

    function activateBgVideo(video) {
      if (activeVideo === video) return;

      if (activeVideo && activeVideo !== video) {
        deactivateBgVideo(activeVideo);
      }

      activeVideo = video;
      video.play().catch(e => console.log('Autoplay de video bloqueado:', e));
      gsap.to(video, { opacity: 1, duration: 0.8, ease: 'power2.inOut' });
      gsap.to(canvas, { opacity: 0, duration: 0.8, ease: 'power2.inOut' });
    }

    function deactivateBgVideo(video) {
      if (activeVideo === video) {
        activeVideo = null;
      }
      gsap.to(video, {
        opacity: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onComplete: () => {
          video.pause();
        }
      });
      if (!activeVideo) {
        gsap.to(canvas, { opacity: 1, duration: 0.8, ease: 'power2.inOut' });
      }
    }

    // Progress bar
    gsap.to(progressBar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '#scroll-container', start: 'top top', end: 'bottom bottom', scrub: 0.3 }
    });

    // Scroll indicator
    ScrollTrigger.create({
      trigger: '#scroll-container', start: '80px top',
      onEnter: () => scrollIndicator.classList.add('hidden'),
      onLeaveBack: () => scrollIndicator.classList.remove('hidden')
    });

    // Snapping points for each section to provide magnetic snaps
    const snapPoints = [];
    const snapSectionIds = ['hero', 'origin', 'craft', 'impact', 'delivery', 'collection', 'experience', 'join'];

    function updateSnapPoints() {
      snapPoints.length = 0;
      const maxScroll = ScrollTrigger.maxScroll(window);
      if (maxScroll <= 0) return;
      snapSectionIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          snapPoints.push(el.offsetTop / maxScroll);
        }
      });
    }

    // Update snap points dynamically when ScrollTrigger refreshes (e.g. on window resize)
    ScrollTrigger.addEventListener("refresh", updateSnapPoints);
    updateSnapPoints();

    function snapToSections(value) {
      if (snapPoints.length === 0) return value;
      let closest = snapPoints[0];
      let minDiff = Math.abs(value - closest);
      for (let i = 1; i < snapPoints.length; i++) {
        const diff = Math.abs(value - snapPoints[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = snapPoints[i];
        }
      }
      return closest;
    }

    // Frame scrubbing with magnetic snap points
    ScrollTrigger.create({
      trigger: '#scroll-container', start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { targetFrame = self.progress * (TOTAL_FRAMES - 1); },
      snap: {
        snapTo: snapToSections,
        duration: { min: 0.3, max: 0.8 },
        delay: 0.15,
        ease: 'power2.out'
      }
    });

    // Hero fade out
    gsap.set('#hero-content', { opacity: 1, y: 0 });
    gsap.to('#hero-content', {
      opacity: 0, y: -100, scale: 0.93,
      scrollTrigger: { trigger: '#hero', start: 'top top', end: '70% top', scrub: 1 }
    });

    // Story sections — no full-screen overlays, dark panel is CSS-only on .story-content
    const sectionIds = ['origin','craft','impact','delivery','collection','experience','join'];

    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      const content = document.getElementById(id + '-content');
      if (!section || !content) return;

      // Activar video de fondo al entrar a la sección explicativa
      const bgVideo = bgVideos[id];
      if (bgVideo) {
        ScrollTrigger.create({
          trigger: section,
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => { activateBgVideo(bgVideo); },
          onEnterBack: () => { activateBgVideo(bgVideo); },
          onLeave: () => { deactivateBgVideo(bgVideo); },
          onLeaveBack: () => { deactivateBgVideo(bgVideo); }
        });
      }

      // Content fade in/out
      gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top 85%', end: 'bottom 15%', scrub: 1.5 }
      })
      .fromTo(content, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 0.25 })
      .to({}, { duration: 0.4 })
      .to(content, { opacity: 0, y: -50, duration: 0.2 });

      // Stagger children
      const stTl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top 75%', end: 'top 30%', scrub: 1 }
      });
      Array.from(content.children).forEach((el, i) => {
        const d = i * 0.04;
        if (el.classList.contains('stats-row')) {
          stTl.fromTo(el, { opacity:0, scale:0.7, y:30 }, { opacity:1, scale:1, y:0, duration:0.2, ease:'back.out(1.3)' }, d);
        } else if (el.classList.contains('section-heading')) {
          stTl.fromTo(el, { opacity:0, y:50 }, { opacity:1, y:0, duration:0.25 }, d);
        } else if (el.classList.contains('feature-list')) {
          el.querySelectorAll('.feature-item').forEach((item, j) => {
            stTl.fromTo(item, { opacity:0, y:25 }, { opacity:1, y:0, duration:0.12 }, d + j * 0.03);
          });
        } else if (el.classList.contains('section-quote')) {
          stTl.fromTo(el, { opacity:0, x:-20 }, { opacity:1, x:0, duration:0.15 }, d);
        } else {
          stTl.fromTo(el, { opacity:0, y:20 }, { opacity:1, y:0, duration:0.12 }, d);
        }
      });
    });

    // Counters
    document.querySelectorAll('.section-stat[data-count]').forEach(el => {
      const n = parseFloat(el.dataset.count);
      ScrollTrigger.create({
        trigger: el.closest('.story-section'), start: 'top 65%', once: true,
        onEnter: () => {
          gsap.to({ v: 0 }, {
            v: n, duration: 2.5, ease: 'power2.out',
            onUpdate() { el.textContent = '+' + Math.round(this.targets()[0].v); },
            onComplete() { el.textContent = '+' + Math.round(n); }
          });
        }
      });
    });
  }

  // --- Init ---
  async function init() {
    await preloadImages();
    animationLoop();
    await new Promise(r => setTimeout(r, 300));
    preloader.classList.add('loaded');
    setTimeout(() => {
      initAnimations();
      setTimeout(() => { preloader.style.display = 'none'; }, 1000);
    }, 100);
  }

  function tryInit() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') init();
    else setTimeout(tryInit, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(tryInit, 50));
  else setTimeout(tryInit, 50);
})();
