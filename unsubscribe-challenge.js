// ============================================================
//  unsubscribe-challenge.js
//  Secure unsubscribe challenge — code stored in Supabase,
//  displayed as plain text, validated in-memory.
//  Load AFTER notifications.js
// ============================================================

(function () {

  // ── State (closure — never on window/DOM) ─────────────────
  let _expectedCode = null;
  let _isLoading    = false;

  // ── Render code as plain styled text ─────────────────────
  function renderCodeAsText(code) {
    const codeEl = document.getElementById('unsubCodeText');
    if (!codeEl) return;
    codeEl.textContent = code;
  }

  // ── Fetch a random code from Supabase ─────────────────────
  window.loadUnsubChallenge = async function () {
    if (_isLoading) return;
    _isLoading = true;

    _expectedCode = null;

    const codeEl = document.getElementById('unsubCodeText');
    if (codeEl) codeEl.textContent = 'Loading…';

    try {
      const { data, error } = await _sb
        .from('unsubscribe_codes')
        .select('id, code');

      if (error || !data || !data.length) throw new Error('No codes');

      const pick    = data[Math.floor(Math.random() * data.length)];
      _expectedCode = pick.code;

      renderCodeAsText(pick.code);
      resetInput();
    } catch (err) {
      const fallbacks = [
        'lI|!il|Ii||lilI',
        'I1lI||l!iIl|1I!l',
        '|Il1i!I||lIil|I!',
        'Ili||!lI|iI1|lI!',
        '1iIl|I||liI1!lIl',
      ];
      _expectedCode = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      renderCodeAsText(_expectedCode);
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
      if (hint)    { hint.textContent = 'Mismatch — keep typing carefully'; hint.className = 'unsub-input-hint error'; }
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

    const input = document.getElementById('unsubInput');
    if (input && !input._challengeWired) {
      input._challengeWired = true;
      input.addEventListener('input',       handleInput);
      input.addEventListener('paste',       blockInput);
      input.addEventListener('copy',        blockInput);
      input.addEventListener('cut',         blockInput);
      input.addEventListener('contextmenu', blockInput);
      input.addEventListener('drop',        blockInput);
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
    unlockScroll();
    resetInput();
  };

  // ── Handle overlay backdrop click ─────────────────────────
  window.handleUnsubOverlay = function (e) {
    if (e.target === document.getElementById('unsubOverlay')) {
      closeUnsubChallenge();
    }
  };

  // ── Confirm unsubscribe ───────────────────────────────────
  window.confirmUnsubscribe = async function () {
    const input = document.getElementById('unsubInput');
    if (!input || !_expectedCode) return;

    if (input.value !== _expectedCode) {
      const hint = document.getElementById('unsubHint');
      if (hint) {
        hint.textContent = '✗ Code does not match. Try again.';
        hint.className   = 'unsub-input-hint error';
      }
      return;
    }

    _expectedCode = null;

    closeUnsubChallenge();

    await unsubscribeFromPush();
    showNotifToast('🔕 Notifications disabled.', 'info');
    updateBellUI();
  };

})();
