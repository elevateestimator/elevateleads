/* High–impact slideshow for /closing/show.html
   - Direction-aware WAAPI transitions
   - Sticky progress, slide counter, aria-live updates
   - Click / arrows / swipe; hash routing + localStorage memory
   - Parallax hero, spotlight, staggered reveals, chip cascades
   - WOW upgrades on Slide 1: word switcher, animated counters, 3D ad stack tilt
   - ROI slide with scenarios and gauge (kept)
   - Auto light/dark theming based on host page background
*/

(function () {
  const onReady = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  onReady(() => {
    const qs = (s, c = document) => c.querySelector(s);
    const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = qs('#closing'); if (!root) return;

    // Auto-theme: detect body background luminance
    try {
      const bg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
      const m = bg.match(/rgba?\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (m) {
        const [r,g,b] = [m[1],m[2],m[3]].map(n=>parseInt(n,10));
        const lum = 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
        if (lum > 0.7) root.classList.add('is-light');
      }
    } catch(_) {}

    const deck = qs('.cl-deck', root);
    const slides = qsa('.cl-slide', deck);
    const total = slides.length;
    const bar = qs('.cl-progress__bar', root);
    const counter = qs('#cl-counter', root);
    const aria = qs('#cl-aria', root);

    const KEY = 'closing.show.slide.v4';
    const NOTEKEY = 'closing.show.notes.v4';
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Initial slide from hash or storage
    const hashSlide = () => {
      const m = (location.hash || '').match(/#\/(\d+)/);
      return m ? Math.min(total, Math.max(1, parseInt(m[1], 10))) : null;
    };
    let idx = hashSlide() || parseInt(localStorage.getItem(KEY) || '1', 10);
    if (!(idx >= 1 && idx <= total)) idx = 1;

    // Notes toggle restore
    if (localStorage.getItem(NOTEKEY) === '1') root.classList.add('is-notes');

    // Apply initial state
    slides.forEach((s, i) => s.classList.toggle('is-active', (i + 1) === idx));
    updateUI();
    reveal(slides[idx - 1]);
    if (idx === 1) initHeroOnce();

    // Core nav
    function show(next, dir = +1){
      if (next === idx || next < 1 || next > total) return;
      const from = slides[idx - 1], to = slides[next - 1];
      const duration = 380, easing = 'cubic-bezier(.2,.8,.2,1)';
      const off = dir > 0 ? -6 : 6;

      to.classList.add('is-active');
      to.style.opacity = '0'; to.style.visibility = 'visible'; to.style.pointerEvents = 'auto';

      if (!prefersReduced && from.animate && to.animate){
        from.animate(
          [{ opacity:1, transform:'translateX(0) scale(1)' },
           { opacity:0, transform:`translateX(${off}%) scale(.98)` }],
          { duration, easing }
        ).onfinish = () => { from.classList.remove('is-active'); from.style.opacity=''; from.style.visibility='hidden'; from.style.pointerEvents='none'; };

        to.animate(
          [{ opacity:0, transform:`translateX(${-off}%) scale(.98)` },
           { opacity:1, transform:'translateX(0) scale(1)' }],
          { duration, easing, fill:'forwards' }
        ).onfinish = () => { to.style.opacity='1'; reveal(to); if (next === 1) initHeroOnce(); };
      } else {
        from.classList.remove('is-active'); from.style.visibility='hidden'; from.style.pointerEvents='none';
        to.style.opacity='1'; reveal(to); if (next === 1) initHeroOnce();
      }

      idx = next; updateUI();
    }

    function updateUI(){
      const pct = (idx - 1) / (total - 1) * 100;
      if (bar) bar.style.width = `${pct}%`;
      if (counter) counter.textContent = `${idx}/${total}`;
      const title = qs(`.cl-slide:nth-child(${idx}) h2`, deck)?.textContent?.trim() || `Slide ${idx}`;
      if (aria) aria.textContent = `Slide ${idx} of ${total}: ${title}`;
      const h = `#/${idx}`; if (location.hash !== h) history.replaceState(null, '', h);
      localStorage.setItem(KEY, String(idx));
    }

    // Stagger + chips animation (+ stack)
    function reveal(slide){
      if (prefersReduced) return;
      // chips
      qsa('[data-animate="chips"] > *', slide).forEach((el,i)=>{
        el.animate([{opacity:0, transform:'translateY(8px) scale(.98)'},{opacity:1, transform:'translateY(0) scale(1)'}],
                   {duration:260, delay:60*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });
      // stagger groups
      qsa('[data-animate="stagger"]', slide).forEach(group=>{
        const items = [
          ...qsa('.cl-bullets > li', group),
          ...qsa('.cl-step', group),
          ...qsa('.cl-plan li', group),
          ...qsa('.cl-check li', group),
          ...qsa('.cl-columns .cl-card', group),
          ...qsa('.counter-row .counter-tile', group)
        ];
        items.forEach((el,i)=>{
          if (!el.animate) return;
          el.animate([{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'translateY(0)'}],
                     {duration:280, delay:70*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
        });
      });
      // stack drift (hero ad cards)
      qsa('[data-animate="stack"] .ad-card', slide).forEach((el,i)=>{
        if (!el.animate) return;
        el.animate([{opacity:0, transform:`${getComputedStyle(el).transform} translateY(12px) scale(.96)`},{opacity:1, transform:`${getComputedStyle(el).transform} translateY(0) scale(1)`}],
                   {duration:420, delay:90*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });
    }

    // Keys / click / swipe
    document.addEventListener('keydown', (e)=>{
      const k = e.key.toLowerCase();
      if (['arrowright','pagedown',' '].includes(k)) { e.preventDefault(); show(idx+1, +1); }
      else if (['arrowleft','pageup'].includes(k)) { e.preventDefault(); show(idx-1, -1); }
      else if (k === 'home'){ e.preventDefault(); show(1, -1); }
      else if (k === 'end'){ e.preventDefault(); show(total, +1); }
      else if (k === 'n'){ e.preventDefault(); root.classList.toggle('is-notes'); localStorage.setItem(NOTEKEY, root.classList.contains('is-notes')?'1':'0'); }
    });
    deck.addEventListener('click', (e)=>{ if (!e.target.closest('a,button,input,select,textarea,label')) show(idx+1, +1); });
    let sx=null,sy=null,ts=0;
    deck.addEventListener('pointerdown',(e)=>{ sx=e.clientX; sy=e.clientY; ts=performance.now(); });
    deck.addEventListener('pointerup',(e)=>{
      if (sx==null) return;
      const dx=e.clientX-sx, dy=e.clientY-sy, dt=performance.now()-ts; sx=sy=null;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy) && dt<800) show(idx+(dx<0?+1:-1), dx<0?+1:-1);
    });
    window.addEventListener('hashchange', ()=>{ const h=hashSlide(); if (h && h!==idx) show(h, h>idx?+1:-1); });

    // Parallax on hero headline (slide 1)
    const heroSlide = slides[0], pEls = qsa('[data-parallax]', heroSlide);
    if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && pEls.length){
      document.addEventListener('mousemove',(e)=>{
        const {innerWidth:w, innerHeight:h}=window, dx=(e.clientX-w/2)/(w/2), dy=(e.clientY-h/2)/(h/2);
        pEls.forEach(el=>{ const f=parseFloat(el.getAttribute('data-parallax')||'0.3'); el.style.transform=`translate(${dx*10*f}px, ${dy*10*f}px)`; });
      });
    }

    /* =========================
       WOW HERO — once per session
       ========================= */
    let heroInitialized = false;
    function initHeroOnce(){
      if (heroInitialized) return;
      heroInitialized = true;

      // 1) Spotlight follows cursor
      const spot = qs('.hero-spotlight', heroSlide);
      if (!prefersReduced && spot){
        document.addEventListener('pointermove', (e)=>{
          const x = (e.clientX / innerWidth) * 100;
          const y = (e.clientY / innerHeight) * 100;
          spot.style.setProperty('--mx', `${x}%`);
          spot.style.setProperty('--my', `${y}%`);
        });
      }

      // 2) Word switcher (Best Leads / Premium Brand / Exclusive Territory / Jaw‑Dropping Content)
      const words = qsa('.hero-switch b', heroSlide);
      if (words.length){
        let w = 0;
        setInterval(()=> {
          words[w].classList.remove('is-on');
          w = (w + 1) % words.length;
          words[w].classList.add('is-on');
        }, 1800);
      }

      // 3) Animated counters
      qsa('.js-count', heroSlide).forEach(el=>{
        const target = parseFloat(el.dataset.to || '0');
        const prefix = el.dataset.prefix || '';
        const duration = 900;
        const start = performance.now();
        function tick(now){
          const p = Math.min(1, (now - start) / duration);
          const val = Math.round(target * (0.2 + 0.8 * p)); // ease in
          el.textContent = `${prefix}${val}`;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });

      // 4) 3D tilt on ad cards
      const stack = qsa('.ad-card', heroSlide);
      if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && stack.length){
        const tilt = (card, e) => {
          const r = card.getBoundingClientRect();
          const cx = r.left + r.width/2, cy = r.top + r.height/2;
          const dx = (e.clientX - cx) / r.width;  // -0.5..0.5
          const dy = (e.clientY - cy) / r.height; // -0.5..0.5
          const rx = dy * -8, ry = dx * 12;
          card.style.transform = card.style.transform.replace(/rotateX\\([^)]*\\) rotateY\\([^)]*\\)/, '')
            .replace(/translate\\([^)]*\\)/,'') + ` translate(-50%,-50%) rotateX(${rx}deg) rotateY(${ry}deg)`;
        };
        document.addEventListener('mousemove', (e)=> stack.forEach(c=>tilt(c,e)));
      }
    }

    /* =========================
       ROI CALCULATOR — v2 (kept)
       ========================= */
    const spendEl=qs('.js-spend',deck), cpcEl=qs('.js-cpc',deck), cvrEl=qs('.js-cvr',deck), closeEl=qs('.js-close',deck), aovEl=qs('.js-aov',deck);
    const leadsOut=qs('.js-leads',deck), salesOut=qs('.js-sales',deck), cplOut=qs('.js-cpl',deck), cpaOut=qs('.js-cpa',deck), revOut=qs('.js-rev',deck), roasOut=qs('.js-roas',deck);
    const brkOut=qs('.js-breakeven',deck), gfill=qs('.js-gfill',deck);

    function fmt$(n){ return Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.max(0,Math.round(n))); }
    function fmtx(n){ const v=Math.round(n*100)/100; return `${v.toFixed(2)}x`; }
    function fmti(n){ return Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(Math.max(0,Math.round(n))); }

    function calc(){
      const spend=+spendEl.value||0, cpc=Math.max(+cpcEl.value||0.01,0.01);
      const cvr=Math.max(Math.min(+cvrEl.value||0,100),0)/100, close=Math.max(Math.min(+closeEl.value||0,100),0)/100, aov=+aovEl.value||0;

      const clicks=spend/cpc, leads=clicks*cvr, sales=leads*close;
      const cpl=leads>0?spend/leads:Infinity, cpa=sales>0?spend/sales:Infinity, revenue=sales*aov, roas=spend>0?revenue/spend:0;

      if (leadsOut) leadsOut.textContent=Number.isFinite(leads)?fmti(leads):'—';
      if (salesOut) salesOut.textContent=Number.isFinite(sales)?fmti(sales):'—';
      revOut.textContent=fmt$(revenue); roasOut.textContent=fmtx(roas);
      cplOut.textContent=Number.isFinite(cpl)?fmt$(cpl):'—'; cpaOut.textContent=Number.isFinite(cpa)?fmt$(cpa):'—';

      const pct=Math.max(0, Math.min(100, (Math.min(roas,3)/3)*100));
      if (gfill) gfill.style.width = `${pct}%`;

      const good=roas>=1;
      brkOut.textContent = good ? 'Above breakeven' : 'Below breakeven';
      brkOut.style.background = good ? 'linear-gradient(135deg, var(--cl-accent), var(--cl-accent-2))' : 'rgba(0,0,0,.45)';
      brkOut.style.color = good ? '#001018' : '';
    }

    if (spendEl) ['input','change'].forEach(evt=>[spendEl,cpcEl,cvrEl,closeEl,aovEl].forEach(el=>el.addEventListener(evt,calc)));
    calc();

    // Scenario chips
    qsa('.cl-scenarios button', deck).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const s = btn.dataset.scenario;
        if (s === 'balanced'){ spendEl.value=3000; cpcEl.value=4.50; cvrEl.value=8; closeEl.value=20; aovEl.value=33000; }
        if (s === 'meta33'){  spendEl.value=3000; cpcEl.value=1.65; cvrEl.value=5; closeEl.value=18; aovEl.value=33000; }
        if (s === 'search'){  spendEl.value=4000; cpcEl.value=12;   cvrEl.value=12; closeEl.value=22; aovEl.value=33000; }
        if (s === 'highclose'){ spendEl.value=3000; cpcEl.value=2.2;  cvrEl.value=4.5; closeEl.value=35; aovEl.value=33000; }
        calc();
      });
    });

    // Public API (optional)
    window.closingDeck = { next:()=>show(idx+1,+1), prev:()=>show(idx-1,-1), goto:(n)=>show(Math.min(total,Math.max(1,n|0)), n>idx?+1:-1) };
  });
})();
