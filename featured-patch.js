// ============================================================
//  featured-patch.js — Animated Carousel Featured Panel
//  BSCS1B TaskHub — Drop-in enhancement
// ============================================================

const _fc = {
  iv:        null,   // auto-scroll setInterval handle
  pauseTm:   null,   // 4-second resume timer
  paused:    false,
  speed:     3500,   // ms per slide advance
  ticking:   false,  // prevent scroll conflict
};

// ─── PAUSE + SCHEDULE AUTO-RESUME ────────────────────────────
function _fcPause() {
  _fc.paused = true;
  clearTimeout(_fc.pauseTm);
  _fc.pauseTm = setTimeout(() => { _fc.paused = false; }, 4000);
}

// ─── TICK: advance to next card ──────────────────────────────
function _fcTick() {
  if (_fc.paused) return;
  const strip = document.getElementById('featuredList');
  if (!strip) return;
  const cards = strip.querySelectorAll('.featured-card');
  if (cards.length <= 1) return;

  const cardW    = cards[0].offsetWidth + 10; // 10px = gap
  const maxScroll = strip.scrollWidth - strip.clientWidth;
  let next = strip.scrollLeft + cardW;
  if (next > maxScroll + 5) next = 0; // loop back to start

  _fc.ticking = true;
  strip.scrollTo({ left: next, behavior: 'smooth' });
  setTimeout(() => { _fc.ticking = false; }, 650);

  _fcSetDot(Math.round(next / cardW), cards.length);
}

// ─── DOT SYNC ────────────────────────────────────────────────
function _fcSetDot(idx, total) {
  document.querySelectorAll('#fcDotsEl .fc-dot')
    .forEach((d, i) => d.classList.toggle('active', i === idx % total));
}

// ─── START / STOP ─────────────────────────────────────────────
function _fcStart() {
  clearInterval(_fc.iv);
  const cards = document.querySelectorAll('#featuredList .featured-card');
  if (cards.length <= 1) return;
  _fc.iv = setInterval(_fcTick, _fc.speed);
}

function _fcStop() {
  clearInterval(_fc.iv);
  _fc.iv = null;
}

// ─── ATTACH EVENTS TO STRIP ──────────────────────────────────
function _fcAttach() {
  // Use a fresh reference to avoid stale nodes after innerHTML swap
  const strip = document.getElementById('featuredList');
  if (!strip) return;

  // Touch: pause while user interacts, resume 4s after last touch
  strip.addEventListener('touchstart', _fcPause, { passive: true });
  strip.addEventListener('touchend',   _fcPause, { passive: true });

  // Mouse: pause on hover, but let 4s timer handle resume
  strip.addEventListener('mouseenter', _fcPause);

  // Manual scroll: pause too
  strip.addEventListener('scroll', () => {
    if (!_fc.ticking) _fcPause();
    // Sync dot to scroll position
    const cards = strip.querySelectorAll('.featured-card');
    if (cards.length) {
      const cardW = cards[0].offsetWidth + 10;
      _fcSetDot(Math.round(strip.scrollLeft / cardW), cards.length);
    }
  }, { passive: true });

  // Dot click → jump to slide
  document.querySelectorAll('#fcDotsEl .fc-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const cards = strip.querySelectorAll('.featured-card');
      if (!cards.length) return;
      const cardW = cards[0].offsetWidth + 10;
      strip.scrollTo({ left: i * cardW, behavior: 'smooth' });
      _fcSetDot(i, cards.length);
      _fcPause();
    });
  });

  _fcStart();
}

// ─── OVERRIDE renderFeatured ──────────────────────────────────
window.renderFeatured = function () {
  pruneExpiredNotes();

  // ── Notes section (logic identical to original) ────────────
  const notesEl = document.getElementById('notesList');
  if (notes.length) {
    let html = `<div class="feat-section-divider">
      <div class="feat-section-divider-line"></div>
      <span class="feat-section-divider-label">📌 Notes (${notes.length})</span>
      <div class="feat-section-divider-line"></div>
    </div>`;
    html += [...notes].reverse().map(n => {
      const canDel = currentRole === 'admin' && currentAdminName === n.author;
      const delBtn = canDel
        ? `<button class="note-del-btn" onclick="deleteNote('${n.id}')" title="Delete note">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
               <polyline points="3 6 5 6 21 6"/>
               <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
               <path d="M10 11v6"/><path d="M14 11v6"/>
               <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
             </svg></button>`
        : '';
      return `<div class="note-card">
        <div class="note-card-top"><div class="note-card-text">${esc(n.text)}</div>${delBtn}</div>
        <div class="note-card-meta">
          <span class="note-author ${getAdminChipClass(n.author)}">${getAdminIcon(n.author, 9)}${esc(getAdminTitle(n.author))}</span>
        </div>
      </div>`;
    }).join('');
    notesEl.innerHTML = html;
  } else {
    notesEl.innerHTML = '';
  }

  // ── Featured cards carousel ────────────────────────────────
  const el = document.getElementById('featuredList');

  // Ensure dots container exists directly after featuredList
  let dotsEl = document.getElementById('fcDotsEl');
  if (!dotsEl) {
    dotsEl = document.createElement('div');
    dotsEl.id = 'fcDotsEl';
    el.parentNode.insertBefore(dotsEl, el.nextSibling);
  }

  // Sort: overdue first, then today, then soon; all by date asc
  const allFeat = tasks
    .filter(t => {
      if (t.done) return false;
      const s = _getStatus(t);
      return s.over || s.today || s.soon;
    })
    .sort((a, b) => {
      const da = a.date ? new Date(a.date + 'T' + (a.time || '23:59')) : new Date('9999');
      const db = b.date ? new Date(b.date + 'T' + (b.time || '23:59')) : new Date('9999');
      return da - db;
    });

  // Update featured badge
  const featBadge = document.getElementById('featCount');
  if (featBadge) {
    const totalActive = tasks.filter(t => !t.done && !_getStatus(t).over).length;
    const totalFeat   = allFeat.length + notes.length;
    if (totalFeat > 0) {
      featBadge.textContent = allFeat.length > 0 && totalActive > 0
        ? `${allFeat.length} of ${totalActive}`
        : notes.length > 0 ? notes.length : allFeat.length;
      featBadge.style.display = '';
    } else {
      featBadge.style.display = 'none';
    }
  }

  // Empty state
  if (!allFeat.length && !notes.length) {
    el.innerHTML = `<div class="no-featured">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg><p>All caught up!</p></div>`;
    dotsEl.innerHTML = '';
    _fcStop();
    return;
  }

  if (!allFeat.length) {
    el.innerHTML = '';
    dotsEl.innerHTML = '';
    _fcStop();
    return;
  }

  // Build individual carousel card
  const buildFC = (t, delay) => {
    const s     = _getStatus(t);
    const due   = fmtDue(t.date, t.time);
    const cls   = s.over  ? 'fc-overdue' : s.today ? 'fc-today' : 'fc-soon';
    const icon  = s.over  ? '⚠️'         : s.today ? '🔥'        : '⏳';
    const label = s.over  ? 'Overdue'    : s.today ? 'Today'     : 'Soon';

    return `<div class="featured-card ${cls}" onclick="expandCard('${t.id}')" style="animation-delay:${delay}ms">
      <div class="fc-status-pill">${icon} ${label}</div>
      <div class="fc-card-name">${esc(t.name)}</div>
      <span class="badge cat-${t.category}">${CAT_LABELS[t.category]}</span>
      ${due ? `<div class="fc-card-meta">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${esc(due)}</span>
      </div>` : ''}
    </div>`;
  };

  const slice = allFeat.slice(0, 8);
  el.innerHTML = slice.map((t, i) => buildFC(t, i * 60)).join('');

  // Dots
  if (slice.length > 1) {
    dotsEl.innerHTML = `<div class="fc-dots">
      ${slice.map((_, i) => `<span class="fc-dot${i === 0 ? ' active' : ''}"></span>`).join('')}
    </div>`;
  } else {
    dotsEl.innerHTML = '';
  }

  // Small delay so cards are in the DOM before attaching scroll events
  setTimeout(_fcAttach, 80);
};
