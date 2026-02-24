// ============================================================
//  featured-patch.js — Auto-scroll Carousel (MutationObserver)
//  BSCS1B TaskHub — Drop-in, no app.js changes needed
// ============================================================

(function () {
  let autoTimer   = null;
  let resumeTimer = null;
  let currentIdx  = 0;
  let isPaused    = false;
  const SPEED     = 3500;

  function getCards() {
    return Array.from(document.querySelectorAll('#featuredList .featured-card'));
  }

  function goTo(idx) {
    const cards = getCards();
    if (!cards.length) return;
    currentIdx = ((idx % cards.length) + cards.length) % cards.length;
    const strip = document.getElementById('featuredList');
    if (!strip) return;
    const gap  = parseFloat(getComputedStyle(strip).gap) || 10;
    const cardW = cards[0].offsetWidth + gap;
    strip.scrollTo({ left: currentIdx * cardW, behavior: 'smooth' });
    updateDots(currentIdx, cards.length);
  }

  function updateDots(idx, total) {
    document.querySelectorAll('.fc-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
  }

  function buildDots(total) {
    let dotsEl = document.getElementById('fcDotsEl');
    if (!dotsEl) {
      dotsEl = document.createElement('div');
      dotsEl.id = 'fcDotsEl';
      const fl = document.getElementById('featuredList');
      if (fl && fl.parentNode) fl.parentNode.insertBefore(dotsEl, fl.nextSibling);
    }
    if (total <= 1) { dotsEl.innerHTML = ''; return; }
    dotsEl.innerHTML = '<div class="fc-dots">' +
      Array.from({ length: total }, (_, i) =>
        '<span class="fc-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></span>'
      ).join('') +
    '</div>';
    dotsEl.querySelectorAll('.fc-dot').forEach(function(dot) {
      dot.addEventListener('click', function() {
        goTo(+dot.dataset.idx);
        pause();
      });
    });
  }

  function pause() {
    isPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(function() { isPaused = false; }, 4000);
  }

  function tick() {
    if (isPaused) return;
    const cards = getCards();
    if (cards.length <= 1) return;
    goTo(currentIdx + 1);
  }

  function startCarousel() {
    stopCarousel();
    const cards = getCards();
    if (cards.length <= 1) return;
    currentIdx = 0;
    autoTimer = setInterval(tick, SPEED);
  }

  function stopCarousel() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  function attachEvents() {
    const strip = document.getElementById('featuredList');
    if (!strip || strip._fcAttached) return;
    strip._fcAttached = true;

    strip.addEventListener('touchstart', pause, { passive: true });
    strip.addEventListener('touchend',   pause, { passive: true });
    strip.addEventListener('mouseenter', pause);

    strip.addEventListener('scroll', function() {
      const cards = getCards();
      if (!cards.length) return;
      const gap   = parseFloat(getComputedStyle(strip).gap) || 10;
      const cardW = cards[0].offsetWidth + gap;
      var idx = Math.round(strip.scrollLeft / cardW);
      currentIdx = idx;
      updateDots(idx, cards.length);
      pause();
    }, { passive: true });
  }

  function styleCards() {
    getCards().forEach(function(card) {
      if (card._fcStyled) return;
      card._fcStyled = true;

      var html = card.innerHTML;
      var isOverdue = card.classList.contains('urgent') || html.indexOf('overdue') !== -1;
      var isToday   = !isOverdue && (card.classList.contains('soon') || html.indexOf('Today') !== -1);

      card.classList.add('fc-carousel-card');
      if (isOverdue)     card.classList.add('fc-overdue');
      else if (isToday)  card.classList.add('fc-today');
      else               card.classList.add('fc-soon');

      if (!card.querySelector('.fc-status-pill')) {
        var pill = document.createElement('div');
        pill.className = 'fc-status-pill';
        pill.textContent = isOverdue ? '⚠️ Overdue' : isToday ? '🔥 Today' : '⏳ Soon';
        card.prepend(pill);
      }
    });
  }

  function refresh() {
    const cards = getCards();
    stopCarousel();
    const dotsEl = document.getElementById('fcDotsEl');
    if (!cards.length) { if (dotsEl) dotsEl.innerHTML = ''; return; }
    const strip = document.getElementById('featuredList');
    if (strip) strip._fcAttached = false;
    styleCards();
    attachEvents();
    currentIdx = 0;
    buildDots(cards.length);
    clearTimeout(window._fcStartDelay);
    window._fcStartDelay = setTimeout(startCarousel, 200);
  }

  function observe() {
    const target = document.getElementById('featuredList');
    if (!target) { setTimeout(observe, 300); return; }

    var obs = new MutationObserver(function() {
      clearTimeout(window._fcObsDelay);
      window._fcObsDelay = setTimeout(refresh, 80);
    });
    obs.observe(target, { childList: true });

    // Kick off if cards already exist
    if (getCards().length) {
      setTimeout(refresh, 300);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }
})();
