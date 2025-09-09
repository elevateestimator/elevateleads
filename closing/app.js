/* Closing Deck — behavior
   - Keyboard arrows, click, and swipe navigation
   - Sticky progress + slide counter
   - "N" toggles per-slide notes
   - localStorage + hash routing (#/1 … #/12)
   - Prefers-reduced-motion respected
   - Floating CTA; confetti on final slide
   - Accessibility: aria-live on slide change, visible focus, semantic landmarks
*/

(function () {
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const closing = qs('#closing');
  if (!closing) return;

  // Optional header/footer handling
  const hasSiteHeader = !!qs('#site-header');
  if (!hasSiteHeader) {
    const mini = document.createElement('div');
    mini.className = 'c-mini-header';
    mini.innerHTML = `
      <div class="c-mini-brand">Elevate Leads — Closing</div>
      <a class="c-mini-cta" href="https://calendly.com/jacob-elevateestimator/30min" target="_blank" rel="noopener">Book</a>
    `;
    closing.prepend(mini);
  }

  const deck = qs('.c-deck', closing);
  const slides = qsa('.c-slide', deck);
  const total = slides.length;
  const bar = qs('.c-progress__bar', closing);
  const counter = qs('#cl-counter', closing);
  const aria = qs('#cl-aria', closing);
  const fab = qs('.c-fab-cta', closing);

  /* Theme detection: if parent/body background is light, flip to light variables */
  (function themeDetect(){
    try{
      const bodyBg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
      const toRGB = (str) => {
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)/);
        if (!m) return [255,255,255,1];
        return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10), parseFloat(m[4] || '1')];
      };
      const [r,g,b,a] = toRGB(bodyBg);
      const lum = (0.2126*(r/255) + 0.7152*(g/255) + 0.0722*(b/255));
      const closingEl = document.getElementById('closing');
      if (!closingEl) return;
      if (lum > 0.7) { closingEl.classList.add('is-light'); } else { closingEl.classList.remove('is-light'); }
    }catch(e){ /* noop */ }
  })();

  // Hash & storage helpers
  const KEY = 'closingSlide';
  const NOTEKEY = 'closingNotes';
  let idx = 1;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Initialize index from hash or storage
  function parseHash() {
    const m = (location.hash || '').match(/#\/(\d+)/);
    return m ? Math.min(total, Math.max(1, parseInt(m[1], 10))) : null;
  }
  idx = parseHash() || parseInt(localStorage.getItem(KEY) || '1', 10);
  if (!(idx >= 1 && idx <= total)) idx = 1;

  // Notes toggle state
  const notesOn = localStorage.getItem(NOTEKEY) === '1';
  if (notesOn) closing.classList.add('is-notes');


  // Apply initial state
  /* [closing] use .is-active */
  slides.forEach((s, i) => {
    const on = (i + 1) === idx;
    s.classList.toggle('is-active', on);
    s.hidden = !on;
    s.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
  updateUI();


  // Navigation
  function goTo(next, dir = 1) {
    if (next === idx || next < 1 || next > total) return;
    const prev = idx;
    const from = slides[prev - 1];
    const to = slides[next - 1];

    // Animate out/in with WAAPI unless reduced motion
    if (!prefersReduced && from && to && from.animate && to.animate) {
      const duration = 240;
      const easing = 'cubic-bezier(.2,.8,.2,1)';
      const xOut = dir > 0 ? '-4%' : '4%';
      const xIn = dir > 0 ? '4%' : '-4%';

      from.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${xOut})` }], { duration, easing });
      to.hidden = false; to.classList.add('is-active'); to.setAttribute('aria-hidden','false');
      to.animate([{ opacity: 0, transform: `translateX(${xIn})` }, { opacity: 1, transform: 'translateX(0)' }], { duration, easing })
        .onfinish = () => { from.hidden = true; from.classList.remove('is-active'); from.setAttribute('aria-hidden','true'); };
    } else {
      from.hidden = true; from.classList.remove('is-active'); from.setAttribute('aria-hidden','true');
      to.hidden = false;  to.classList.add('is-active');  to.setAttribute('aria-hidden','false');
    }

    idx = next;
    updateUI();
    // Confetti on final slide
    if (idx === total) maybeConfetti();
  }

  function updateUI() {
    const pct = (idx - 1) / (total - 1) * 100;
    bar.style.width = `${pct}%`;
    counter.textContent = `${idx}/${total}`;

    const titleEl = qs('.c-slide:nth-child(' + idx + ') h2', deck);
    const title = titleEl ? titleEl.textContent.trim() : `Slide ${idx}`;
    aria.textContent = `Slide ${idx} of ${total}: ${title}`;

    // Hash + storage
    const newHash = `#/${idx}`;
    if (location.hash !== newHash) history.replaceState(null, '', newHash);
    localStorage.setItem(KEY, String(idx));
  }

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const k = e.key.toLowerCase();
    if (['arrowright', 'pagedown', ' '].includes(k)) { e.preventDefault(); goTo(idx + 1, +1); }
    else if (['arrowleft', 'pageup'].includes(k)) { e.preventDefault(); goTo(idx - 1, -1); }
    else if (k === 'home') { e.preventDefault(); goTo(1, -1); }
    else if (k === 'end') { e.preventDefault(); goTo(total, +1); }
    else if (k === 'n') { e.preventDefault(); closing.classList.toggle('is-notes'); localStorage.setItem(NOTEKEY, closing.classList.contains('is-notes') ? '1' : '0'); }
  });

  // Click-to-advance (ignore interactive elements)
  deck.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, label, textarea, select')) return;
    goTo(idx + 1, +1);
  });

  // Swipe nav
  let touchX = null, touchY = null, tStart = 0;
  deck.addEventListener('pointerdown', (e) => { touchX = e.clientX; touchY = e.clientY; tStart = performance.now(); });
  deck.addEventListener('pointerup', (e) => {
    if (touchX == null) return;
    const dx = e.clientX - touchX, dy = e.clientY - touchY;
    const dt = performance.now() - tStart;
    touchX = touchY = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && dt < 800) {
      goTo(idx + (dx < 0 ? +1 : -1), dx < 0 ? +1 : -1);
    }
  });

  // Hash routing
  window.addEventListener('hashchange', () => {
    const h = parseHash();
    if (h && h !== idx) goTo(h, h > idx ? +1 : -1);
  });

  // ROI Calculator logic (Slide 7)
  const spendEl = qs('.js-roi-spend', deck);
  const cpcEl = qs('.js-roi-cpc', deck);
  const cvrEl = qs('.js-roi-cvr', deck);
  const closeEl = qs('.js-roi-close', deck);
  const aovEl = qs('.js-roi-aov', deck);
  const outCPL = qs('.js-out-cpl', deck);
  const outCPA = qs('.js-out-cpa', deck);
  const outREV = qs('.js-out-rev', deck);
  const outROAS = qs('.js-out-roas', deck);
  const outBRK = qs('.js-out-breakeven', deck);

  function fmtCurrency(n) {
    return Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(isFinite(n) ? n : 0);
  }
  function fmtNum(n) {
    return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(isFinite(n) ? n : 0);
  }
  function calcROI() {
    const spend = +spendEl.value || 0;
    const cpc = Math.max(+cpcEl.value || 0, 0.01);
    const cvr = Math.max(Math.min(+cvrEl.value || 0, 100), 0) / 100;     // click→lead
    const close = Math.max(Math.min(+closeEl.value || 0, 100), 0) / 100; // lead→sale
    const aov = +aovEl.value || 0;

    const clicks = spend / cpc;
    const leads = clicks * cvr;
    const sales = leads * close;

    const cpl = leads > 0 ? spend / leads : Infinity;
    const cpa = sales > 0 ? spend / sales : Infinity;
    const revenue = sales * aov;
    const roas = spend > 0 ? revenue / spend : 0;

    outCPL.textContent = isFinite(cpl) ? fmtCurrency(cpl) : '—';
    outCPA.textContent = isFinite(cpa) ? fmtCurrency(cpa) : '—';
    outREV.textContent = fmtCurrency(revenue);
    outROAS.textContent = `${fmtNum(roas)}x`;

    outBRK.textContent = roas >= 1 ? 'Above breakeven' : 'Below breakeven';
    outBRK.style.background = roas >= 1 ? 'linear-gradient(135deg, var(--cl-accent), var(--cl-accent-2))' : 'rgba(0,0,0,.5)';
    outBRK.style.color = roas >= 1 ? '#001018' : '';
  }
  if (spendEl) ['input','change'].forEach(evt=>{
    [spendEl,cpcEl,cvrEl,closeEl,aovEl].forEach(el => el.addEventListener(evt, calcROI));
  });
  calcROI();

  // Confetti on final slide
  function maybeConfetti() {
    if (prefersReduced) return;
    const N = 120;
    const colors = [
      getComputedStyle(closing).getPropertyValue('--cl-accent').trim() || '#1EA7FD',
      getComputedStyle(closing).getPropertyValue('--cl-accent-2').trim() || '#5DD8FF',
      '#ffffff'
    ];
    const wrap = document.createElement('div');
    wrap.style.position = 'fixed';
    wrap.style.inset = '0';
    wrap.style.pointerEvents = 'none';
    wrap.style.overflow = 'hidden';
    wrap.setAttribute('aria-hidden', 'true');
    closing.appendChild(wrap);

    for (let i=0; i<N; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random()*8;
      p.style.position = 'absolute';
      p.style.width = `${size}px`;
      p.style.height = `${size*0.6}px`;
      p.style.background = colors[i % colors.length];
      p.style.left = `${Math.random()*100}%`;
      p.style.top = `-10%`;
      p.style.opacity = '0.9';
      p.style.transform = `rotate(${Math.random()*360}deg)`;
      p.style.borderRadius = '2px';
      wrap.appendChild(p);

      if (!prefersReduced && p.animate) {
        const endY = 110 + Math.random()*20;
        const driftX = (Math.random() - 0.5) * 20;
        const spin = Math.random()*720;
        p.animate([
          { transform: `translate(0,0) rotate(0deg)`, offset: 0 },
          { transform: `translate(${driftX}vw, ${endY}vh) rotate(${spin}deg)`, offset: 1 }
        ], { duration: 2200 + Math.random()*1200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
      }
    }
    setTimeout(()=> wrap.remove(), 3200);
  }

  // Magnetic-ish CTA for pointer devices
  if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && fab) {
    const strength = 20;
    document.addEventListener('mousemove', (e) => {
      const rect = fab.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top + rect.height/2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      fab.style.transform = `translate(${dx*strength}px, ${dy*strength}px)`;
    });
  }

  // Ensure focus ring works nicely: focus main on slide change
  function focusMain() { closing.focus({ preventScroll: true }); }
  // Expose simple API for scripting (optional)
  window.__closing = { next: () => goTo(idx+1, +1), prev: () => goTo(idx-1, -1), goto: (n) => goTo(n, n>idx?+1:-1) };

})();
