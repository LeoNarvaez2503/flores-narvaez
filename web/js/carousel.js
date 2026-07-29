// Math pura (testeable) + controlador DOM del carrusel de banners.
export function nextIndex(current, len) { return (current + 1) % len; }
export function prevIndex(current, len) { return (current - 1 + len) % len; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function mountCarousel(rootEl, slides, opts = {}) {
  const interval = opts.interval || 5000;
  const reduce = typeof window !== 'undefined'
    && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0;
  let timer = null;

  rootEl.classList.add('carousel');
  rootEl.innerHTML =
    '<div class="carousel-track">' +
      slides.map((s, idx) =>
        '<div class="carousel-slide' + (idx === 0 ? ' active' : '') + '">' +
          '<img src="' + esc(s.img) + '" alt="' + esc(s.alt || s.title || '') + '"' +
            (idx === 0 ? '' : ' loading="lazy"') + ' />' +
          '<div class="carousel-overlay"></div>' +
          '<div class="carousel-content">' +
            (s.kicker ? '<div class="kicker">' + esc(s.kicker) + '</div>' : '') +
            '<h2>' + esc(s.title) + '</h2>' +
            (s.subtitle ? '<p>' + esc(s.subtitle) + '</p>' : '') +
            (s.ctaLabel ? '<button class="btn-gold" ' + (s.ctaAttr || '') + '>' + esc(s.ctaLabel) + '</button>' : '') +
          '</div>' +
        '</div>'
      ).join('') +
    '</div>' +
    '<button class="carousel-arrow prev" aria-label="Anterior">‹</button>' +
    '<button class="carousel-arrow next" aria-label="Siguiente">›</button>' +
    '<div class="carousel-dots">' +
      slides.map((_, idx) => '<button class="dot' + (idx === 0 ? ' active' : '') +
        '" data-go="' + idx + '" aria-label="Ir al banner ' + (idx + 1) + '"></button>').join('') +
    '</div>';

  const slideEls = Array.from(rootEl.querySelectorAll('.carousel-slide'));
  const dotEls = Array.from(rootEl.querySelectorAll('.dot'));

  function show(n) {
    i = n;
    slideEls.forEach((el, idx) => el.classList.toggle('active', idx === i));
    dotEls.forEach((el, idx) => el.classList.toggle('active', idx === i));
  }
  function start() { if (!reduce && slides.length > 1) timer = setInterval(() => show(nextIndex(i, slides.length)), interval); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  rootEl.querySelector('.next').addEventListener('click', () => { show(nextIndex(i, slides.length)); });
  rootEl.querySelector('.prev').addEventListener('click', () => { show(prevIndex(i, slides.length)); });
  dotEls.forEach((d) => d.addEventListener('click', () => show(Number(d.dataset.go))));
  rootEl.addEventListener('mouseenter', stop);
  rootEl.addEventListener('mouseleave', start);

  start();
  return { destroy() { stop(); rootEl.innerHTML = ''; } };
}
