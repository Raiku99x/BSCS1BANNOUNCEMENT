// ============================================================
//  featured-patch.js — Ping-Pong Auto-Scroll Carousel
//  1→2→3→4→3→2→1→2→3→4 ... repeat
//  Pauses when touched/hovered, resumes after 4s
// ============================================================

(function () {
  let autoTimer   = null;
  let resumeTimer = null;
  let currentIdx  = 0;
  let direction   = 1;   // 1 = forward, -1 = backward
  let isPaused    = false;
  const SPEED     = 1800; // ms between each card step

  function getCards() {
    return Array.from(document.querySelectorAll('#featuredList .featured-card'));
  }

  function getStrip() {
    return document.getElementById('featuredList');
  }

  function goTo(idx) {
    const strip = getStrip();
    const cards = getCards();
    if (!strip || !cards.length) return;

    currentIdx = idx;
    const gap   = parseFloat(getComputedStyle(strip).gap) || 10;
    const cardW = cards[0].offsetWidth + gap;
    strip.scrollTo({ left: currentIdx * cardW, behavior: 'smooth' });
    updateDots(currentIdx, cards.length);
  }

  function tick() {
    if (isPaused) return;
    const cards = getCards();
    const total = cards.length;
    if (total <= 1) return;

    let next = currentIdx + direction;

    // Hit the end → reverse direction
    if (next >= total) {
      direction = -1;
      next = total - 2; // step back from last
    }
    // Hit the start → reverse direction
    else if (next < 0) {
      direction = 1;
      next = 1; // step forward from first
    }

    goTo(next);
  }

  function updateDots(idx, total) {
    document.querySelectorAll('.fc-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  function buildDots(total) {
    let dotsEl = document.getElementById('fcDotsEl');
    if (!dotsEl) {
      dotsEl = document.createElement('div');
      dotsEl.id = 'fcDotsEl';
      const fl = getStrip();
      if (fl && fl.parentNode) fl.parentNode.insertBefore(dotsEl, fl.nextSibling);
    }
    if (total <= 1) { dotsEl.innerHTML = ''; return; }
    dotsEl.innerHTML = '<div class="fc-dots">' +
      Array.from({ length: total }, function(_, i) {
        return '<span class="fc-dot' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></span>';
      }).join('') +
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

  function startCarousel() {
    stopCarousel();
    const cards = getCards();
    if (cards.length <= 1) return;
    currentIdx = 0;
    direction  = 1;
    autoTimer  = setInterval(tick, SPEED);
  }

  function stopCarousel() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  function attachEvents() {
    const strip = getStrip();
    if (!strip || strip._fcAttached) return;
    strip._fcAttached = true;

    // Touch: pause while user swipes
    strip.addEventListener('touchstart', pause, { passive: true });
    strip.addEventListener('touchend',   pause, { passive: true });

    // Mouse hover: pause
    strip.addEventListener('mouseenter', pause);

    // Manual scroll: sync dots + pause
    strip.addEventListener('scroll', function() {
      const cards = getCards();
      if (!cards.length) return;
      const gap   = parseFloat(getComputedStyle(strip).gap) || 10;
      const cardW = cards[0].offsetWidth + gap;
      currentIdx  = Math.round(strip.scrollLeft / cardW);
      updateDots(currentIdx, cards.length);
      pause();
    }, { passive: true });
  }

  function styleCards() {
    getCards().forEach(function(card) {
      if (card._fcStyled) return;
      card._fcStyled = true;

      var html      = card.innerHTML;
      var isOverdue = card.classList.contains('urgent') || html.indexOf('overdue') !== -1;
      var isToday   = !isOverdue && (card.classList.contains('soon') || html.indexOf('Today') !== -1);

      card.classList.add('fc-carousel-card');
      if (isOverdue)    card.classList.add('fc-overdue');
      else if (isToday) card.classList.add('fc-today');
      else              card.classList.add('fc-soon');

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
    const strip = getStrip();
    if (strip) strip._fcAttached = false;
    styleCards();
    attachEvents();
    currentIdx = 0;
    direction  = 1;
    buildDots(cards.length);
    clearTimeout(window._fcStartDelay);
    window._fcStartDelay = setTimeout(startCarousel, 300);
  }

  function observe() {
    const target = getStrip();
    if (!target) { setTimeout(observe, 300); return; }

    var obs = new MutationObserver(function() {
      clearTimeout(window._fcObsDelay);
      window._fcObsDelay = setTimeout(refresh, 80);
    });
    obs.observe(target, { childList: true });

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
