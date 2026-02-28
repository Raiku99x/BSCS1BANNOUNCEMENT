// ============================================================
//  unsubscribe-challenge.js
//  Secure unsubscribe challenge — code stored in Supabase,
//  rendered on canvas (no copy-paste), validated in-memory.
//  Load AFTER notifications.js
// ============================================================

(function () {

  // ── State (closure — never on window/DOM) ─────────────────
  let _expectedCode = null;   // held in closure only, never in DOM
  let _codeId       = null;   // DB row id of current code
  let _isLoading    = false;

  // ── Canvas renderer ───────────────────────────────────────
  // Draws the code as an image so it cannot be selected or copied
  function renderCodeOnCanvas(code) {
    const canvas = document.getElementById('unsubCodeCanvas');
    if (!canvas) return;

    const dpr    = window.devicePixelRatio || 1;
    const W      = Math.min(canvas.parentElement.offsetWidth - 32, 420);
    const H      = 52;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Background
    const isDark = document.body.classList.contains('dark');
    ctx.fillStyle = isDark ? '#1e1e26' : '#f9f8f6';
    roundRect(ctx, 0, 0, W, H, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = isDark ? '#2e2e3a' : '#e0ddd8';
    ctx.lineWidth   = 1.5;
    roundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 10);
    ctx.stroke();

    // Subtle grid noise to prevent screenshot-to-text OCR
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let x = 0; x < W; x += 6) {
      for (let y = 0; y < H; y += 6) {
        if (Math.random() > 0.5) {
          ctx.fillStyle = isDark ? '#fff' : '#000';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    ctx.restore();

    // Draw characters with slight per-char rotation & jitter
    // Use a monospace-style font but vary weight/color per char
    const chars    = code.split('');
    const fontSize = Math.min(15, Math.floor((W - 32) / chars.length * 1.5));
    const startX   = (W - chars.length * (fontSize * 0.72)) / 2;
    const centerY  = H / 2 + fontSize * 0.36;

    const accentColors = isDark
      ? ['#c4b5fd', '#60a5fa', '#6ee7b7', '#fcd34d', '#f9a8d4', '#fff']
      : ['#5b52e8', '#1e40af', '#065f46', '#78350f', '#9d174d', '#1a1814'];

    chars.forEach((ch, i) => {
      const x     = startX + i * (fontSize * 0.72);
      const jitterY = (Math.random() - 0.5) * 4;
      const angle   = (Math.random() - 0.5) * 0.18;
      const color   = accentColors[Math.floor(Math.random() * accentColors.length)];
      const weight  = Math.random() > 0.4 ? '700' : '400';

      ctx.save();
      ctx.translate(x + fontSize * 0.36, centerY + jitterY);
      ctx.rotate(angle);
      ctx.font        = `${weight} ${fontSize}px 'Courier New', monospace`;
      ctx.fillStyle   = color;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });

    // Wavy overlay lines to hinder OCR
    ctx.save();
    ctx.globalAlpha = isDark ? 0.06 : 0.04;
    ctx.strokeStyle = isDark ? '#fff' : '#000';
    ctx.lineWidth   = 1;
    for (let l = 0; l < 3; l++) {
      ctx.beginPath();
      const baseY = H * 0.2 + l * H * 0.3;
      ctx.moveTo(0, baseY);
      for (let px = 0; px <= W; px += 8) {
        ctx.lineTo(px, baseY + Math.sin(px * 0.15 + l * 2) * 3);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Fetch a random code from Supabase ─────────────────────
  // The code text comes from DB but is stored ONLY in the closure.
  // It is never written to the DOM, window, or console.
  window.loadUnsubChallenge = async function () {
    if (_isLoading) return;
    _isLoading = true;

    const canvas = document.getElementById('unsubCodeCanvas');
    if (canvas) {
      // Loading state
      const ctx = canvas.getContext('2d');
      const W   = canvas.offsetWidth  || 300;
      const H   = canvas.offsetHeight || 52;
      ctx.clearRect(0, 0, W, H);
    }

    _expectedCode = null;

    try {
      // Fetch all codes and pick one randomly client-side
      // (Supabase anon can read but never exposes in URL/query params)
      const { data, error } = await _sb
        .from('unsubscribe_codes')
        .select('id, code');

      if (error || !data || !data.length) throw new Error('No codes');

      const pick    = data[Math.floor(Math.random() * data.length)];
      _codeId       = pick.id;
      _expectedCode = pick.code;   // stored only in this closure

      renderCodeOnCanvas(pick.code);
      resetInput();
    } catch (err) {
      // Fallback: generate a local hard code (still not in DOM)
      const fallbacks = [
        'lI|!il|Ii||lilI!Ili||ilIlI||l!i|I|!liIl|I!lilI||',
        'I1lI||l!iIl|1I!l|Ili||!lI|iI1|lI!|1iIl|I||liI1!',
        '|Il1i!I||lIil|I!l1|iIl!|I|l1iI!||lI|1i!Il|I!liI|',
      ];
      _expectedCode = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      renderCodeOnCanvas(_expectedCode);
      resetInput();
    }

    _isLoading = false;
  };

  function resetInput() {
    const input    = document.getElementById('unsubInput');
    const hint     = document.getElementById('unsubHint');
    const confirm  = document.getElementById('unsubConfirmBtn');
    const progress = document.getElementById('unsubProgressBar');
    if (input)    { input.value = ''; input.className = 'unsub-input'; }
    if (hint)     { hint.textContent = ''; hint.className = 'unsub-input-hint'; }
    if (confirm)  confirm.disabled = true;
    if (progress) { progress.style.width = '0%'; progress.className = 'unsub-progress-bar'; }
  }

  // ── Input handler ─────────────────────────────────────────
  function handleInput(e) {
    if (!_expectedCode) return;

    const typed    = e.target.value;
    const expected = _expectedCode;
    const progress = document.getElementById('unsubProgressBar');
    const hint     = document.getElementById('unsubHint');
    const confirm  = document.getElementById('unsubConfirmBtn');

    // Progress: how many leading chars match
    let matchLen = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === expected[i]) matchLen++;
      else break;
    }
    const pct = Math.round((matchLen / expected.length) * 100);

    if (progress) {
      progress.style.width = pct + '%';
      progress.className   = 'unsub-progress-bar' +
        (pct === 100 ? ' done' : pct > 0 ? ' partial' : '');
    }

    if (typed === expected) {
      e.target.className = 'unsub-input valid';
      if (hint)    { hint.textContent = '✓ Code matches'; hint.className = 'unsub-input-hint valid'; }
      if (confirm) confirm.disabled = false;
    } else if (typed.length > 0 && expected.startsWith(typed)) {
      e.target.className = 'unsub-input partial';
      if (hint)    { hint.textContent = `${typed.length} / ${expected.length} chars…`; hint.className = 'unsub-input-hint partial'; }
      if (confirm) confirm.disabled = true;
    } else if (typed.length > 0) {
      e.target.className = 'unsub-input error';
      if (hint)    { hint.textContent = 'Mismatch — keep typing or get a new code'; hint.className = 'unsub-input-hint error'; }
      if (confirm) confirm.disabled = true;
    } else {
      e.target.className = 'unsub-input';
      if (hint)    { hint.textContent = ''; hint.className = 'unsub-input-hint'; }
      if (confirm) confirm.disabled = true;
    }
  }

  // ── Block paste / context-menu / drag ─────────────────────
  function blockInput(e) {
    e.preventDefault();
    e.stopPropagation();

    const hint = document.getElementById('unsubHint');
    if (hint) {
      hint.textContent  = '⚠ Copy-paste is disabled. Type it manually.';
      hint.className    = 'unsub-input-hint warn';
      clearTimeout(hint._t);
      hint._t = setTimeout(() => {
        if (hint.className.includes('warn')) {
          hint.textContent = '';
          hint.className   = 'unsub-input-hint';
        }
      }, 2000);
    }
    return false;
  }

  // ── Open modal ────────────────────────────────────────────
  window.openUnsubChallenge = function () {
    lockScroll();
    document.getElementById('unsubOverlay').classList.add('open');

    // Wire up input events (idempotent)
    const input = document.getElementById('unsubInput');
    if (input && !input._challengeWired) {
      input._challengeWired = true;
      input.addEventListener('input',       handleInput);
      input.addEventListener('paste',       blockInput);
      input.addEventListener('copy',        blockInput);
      input.addEventListener('cut',         blockInput);
      input.addEventListener('contextmenu', blockInput);
      input.addEventListener('drop',        blockInput);
      // Prevent keyboard shortcut paste (Ctrl+V / Cmd+V)
      input.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          blockInput(e);
        }
      });
    }

    loadUnsubChallenge();
    setTimeout(() => {
      const input = document.getElementById('unsubInput');
      if (input) input.focus();
    }, 400);
  };

  // ── Close modal ───────────────────────────────────────────
  window.closeUnsubChallenge = function () {
    document.getElementById('unsubOverlay').classList.remove('open');
    _expectedCode = null;
    _codeId       = null;
    unlockScroll();
    resetInput();
  };

  // ── Handle overlay backdrop click ─────────────────────────
  window.handleUnsubOverlay = function (e) {
    if (e.target === document.getElementById('unsubOverlay')) {
      closeUnsubChallenge();
    }
  };

  // ── Confirm unsubscribe (called after code verified) ──────
  window.confirmUnsubscribe = async function () {
    const input = document.getElementById('unsubInput');
    if (!input || !_expectedCode) return;

    // Final check (in-memory only — no DOM, no console)
    if (input.value !== _expectedCode) {
      const hint = document.getElementById('unsubHint');
      if (hint) {
        hint.textContent = '✗ Code does not match. Try again.';
        hint.className   = 'unsub-input-hint error';
      }
      return;
    }

    // Wipe from memory immediately after verification
    _expectedCode = null;
    _codeId       = null;

    closeUnsubChallenge();

    // Now perform the actual unsubscribe
    await unsubscribeFromPush();
    showNotifToast('🔕 Notifications disabled.', 'info');
    updateBellUI();
  };

  // ── Redraw canvas on theme change ─────────────────────────
  // Observe body class changes for dark mode toggle
  if (window.MutationObserver) {
    new MutationObserver(() => {
      const overlay = document.getElementById('unsubOverlay');
      if (overlay && overlay.classList.contains('open') && _expectedCode) {
        renderCodeOnCanvas(_expectedCode);
      }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  // ── Redraw on resize ──────────────────────────────────────
  window.addEventListener('resize', () => {
    const overlay = document.getElementById('unsubOverlay');
    if (overlay && overlay.classList.contains('open') && _expectedCode) {
      renderCodeOnCanvas(_expectedCode);
    }
  });

})();
