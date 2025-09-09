/* Slideshow engine for /closing/show.html
   - Click / arrows / swipe navigation bound on #closing
   - WAAPI transitions with class fallback
   - Hash routing + localStorage
   - Parallax + spotlight hero; counters start at their target (no zeros)
   - ROI scenarios + gauge
*/

(function () {
  const onReady = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn());
  onReady(() => {
    const qs  = (s, c = document) => c.querySelector(s);
    const qsa = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = qs('#closing'); if (!root) return;

    // Auto-theme: detect body background luminance (safe regex)
    try {
      const bg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const [r,g,b] = [m[1],m[2],m[3]].map(n=>parseInt(n,10));
        const lum = 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
        if (lum > 0.7) root.classList.add('is-light');
      }
    } catch(_) {}

    const deck   = qs('.cl-deck', root);
    const slides = qsa('.cl-slide', deck);
    const total  = slides.length;
    const bar    = qs('.cl-progress__bar', root);
    const counter= qs('#cl-counter', root);
    const aria   = qs('#cl-aria', root);

    const KEY='closing.show.slide.v5', NOTEKEY='closing.show.notes.v5';
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Index from hash or storage
    const parseHash = () => {
      const m = (location.hash || '').match(/#\/(\d+)/);
      return m ? Math.min(total, Math.max(1, parseInt(m[1], 10))) : null;
    };
    let idx = parseHash() || parseInt(localStorage.getItem(KEY) || '1', 10);
    if (!(idx >= 1 && idx <= total)) idx = 1;

    // Notes toggle restore
    if (localStorage.getItem(NOTEKEY) === '1') root.classList.add('is-notes');

    // Apply initial state
    slides.forEach((s, i) => s.classList.toggle('is-active', (i + 1) === idx));
    updateUI();
    reveal(slides[idx - 1]);
    if (idx === 1) initHeroOnce();

    // NAVIGATION
    function show(next, dir = +1){
      if (next === idx || next < 1 || next > total) return;
      const from = slides[idx - 1], to = slides[next - 1];

      // Prepare "to"
      to.classList.add('is-active');
      to.style.opacity = '0'; to.style.visibility = 'visible'; to.style.pointerEvents = 'auto';

      const duration = 360, easing = 'cubic-bezier(.2,.8,.2,1)';
      const off = dir > 0 ? -6 : 6;

      if (!prefersReduced && from.animate && to.animate) {
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
        // Class fallback
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

    // Stagger / chips / stack
    function reveal(slide){
      if (prefersReduced) return;
      // chips
      qsa('[data-animate="chips"] > *', slide).forEach((el,i)=>{
        el.animate([{opacity:0, transform:'translateY(8px) scale(.98)'},{opacity:1, transform:'translateY(0) scale(1)'}],
                   {duration:240, delay:60*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });
      // groups
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
                     {duration:260, delay:70*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
        });
      });
      // stack drift
      qsa('[data-animate="stack"] .ad-card', slide).forEach((el,i)=>{
        if (!el.animate) return;
        const base = el.dataset.base || getComputedStyle(el).transform || 'none';
        if (!el.dataset.base) el.dataset.base = base;
        el.animate([{opacity:0, transform:`${base} translateY(12px) scale(.96)`},{opacity:1, transform:`${base} translateY(0) scale(1)`}],
                   {duration:420, delay:90*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });
    }

    // Global key / click / swipe — bind on #closing to avoid dead zones
    document.addEventListener('keydown', (e)=>{
      const k = e.key.toLowerCase();
      if (['arrowright','pagedown',' '].includes(k)) { e.preventDefault(); show(idx+1, +1); }
      else if (['arrowleft','pageup'].includes(k)) { e.preventDefault(); show(idx-1, -1); }
      else if (k === 'home'){ e.preventDefault(); show(1, -1); }
      else if (k === 'end'){ e.preventDefault(); show(total, +1); }
      else if (k === 'n'){ e.preventDefault(); root.classList.toggle('is-notes'); localStorage.setItem(NOTEKEY, root.classList.contains('is-notes')?'1':'0'); }
    });

    // Click-to-advance anywhere on the presentation (except interactive controls)
    root.addEventListener('click', (e)=>{
      if (e.target.closest('a,button,input,select,textarea,label')) return;
      show(idx+1, +1);
    });

    // Swipe nav
    let sx=null, sy=null, ts=0;
    root.addEventListener('pointerdown',(e)=>{ sx=e.clientX; sy=e.clientY; ts=performance.now(); });
    root.addEventListener('pointerup',(e)=>{
      if (sx==null) return;
      const dx=e.clientX-sx, dy=e.clientY-sy, dt=performance.now()-ts; sx=sy=null;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy) && dt<800) show(idx+(dx<0?+1:-1), dx<0?+1:-1);
    });

    // Hash routing
    window.addEventListener('hashchange', ()=>{ const h=parseHash(); if (h && h!==idx) show(h, h>idx?+1:-1); });

    // HERO: parallax / spotlight / counters / tilt
    const hero = slides[0];
    function initHeroOnce(){
      // Spotlight follows pointer
      const spot = qs('.hero-spotlight', hero);
      if (!prefersReduced && spot){
        document.addEventListener('pointermove',(e)=>{
          const x = (e.clientX / innerWidth) * 100;
          const y = (e.clientY / innerHeight) * 100;
          spot.style.setProperty('--mx', `${x}%`);
          spot.style.setProperty('--my', `${y}%`);
        });
      }
      // Word switcher
      const words = qsa('.hero-switch b', hero);
      if (words.length){
        let w = 0; setInterval(()=>{ words[w].classList.remove('is-on'); w=(w+1)%words.length; words[w].classList.add('is-on'); }, 1800);
      }
      // Counters: start at target immediately (no zeros), then subtle tick-up
      qsa('.js-count', hero).forEach(el=>{
        const target = parseFloat(el.dataset.to || '0');
        const prefix = el.dataset.prefix || '';
        // render immediately
        el.textContent = `${prefix}${Math.round(target)}`;
        // micro tick-up (+3%) for “alive” feel
        if (!prefersReduced && target > 0){
          const end = Math.round(target*1.03);
          const startVal = target;
          const start = performance.now(), dur = 700;
          const step = (t)=>{
            const p = Math.min(1, (t - start)/dur);
            const v = Math.round(startVal + (end - startVal) * p);
            el.textContent = `${prefix}${v}`;
            if (p<1) requestAnimationFrame(step); else el.textContent = `${prefix}${Math.round(target)}`;
          };
          requestAnimationFrame(step);
        }
      });
      // Parallax headline
      const pEls = qsa('[data-parallax]', hero);
      if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && pEls.length){
        document.addEventListener('mousemove',(e)=>{
          const {innerWidth:w, innerHeight:h}=window, dx=(e.clientX-w/2)/(w/2), dy=(e.clientY-h/2)/(h/2);
          pEls.forEach(el=>{ const f=parseFloat(el.getAttribute('data-parallax')||'0.3'); el.style.transform=`translate(${dx*10*f}px, ${dy*10*f}px)`; });
        });
      }
      // 3D tilt on ad cards (base transform preserved)
      const stack = qsa('.ad-card', hero);
      if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && stack.length){
        stack.forEach(c => c.dataset.base = getComputedStyle(c).transform || 'none');
        document.addEventListener('mousemove',(e)=>{
          stack.forEach(card=>{
            const r = card.getBoundingClientRect();
            const cx = r.left + r.width/2, cy = r.top + r.height/2;
            const dx = (e.clientX - cx)/r.width, dy = (e.clientY - cy)/r.height;
            const rx = dy * -8, ry = dx * 12;
            card.style.transform = `${card.dataset.base} rotateX(${rx}deg) rotateY(${ry}deg)`;
          });
        });
      }
    }

    // ROI calculator
    const spendEl=qs('.js-spend',deck), cpcEl=qs('.js-cpc',deck), cvrEl=qs('.js-cvr',deck), closeEl=qs('.js-close',deck), aovEl=qs('.js-aov',deck);
    const leadsOut=qs('.js-leads',deck), salesOut=qs('.js-sales',deck), cplOut=qs('.js-cpl',deck), cpaOut=qs('.js-cpa',deck), revOut=qs('.js-rev',deck), roasOut=qs('.js-roas',deck), brkOut=qs('.js-breakeven',deck), gfill=qs('.js-gfill',deck);
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
      const pct=Math.max(0, Math.min(100, (Math.min(roas,3)/3)*100)); if (gfill) gfill.style.width = `${pct}%`;
      const good=roas>=1; brkOut.textContent=good?'Above breakeven':'Below breakeven'; brkOut.style.background=good?'linear-gradient(135deg, var(--cl-accent), var(--cl-accent-2))':'rgba(0,0,0,.45)'; brkOut.style.color=good?'#001018':'';
    }
    if (spendEl) ['input','change'].forEach(evt=>[spendEl,cpcEl,cvrEl,closeEl,aovEl].forEach(el=>el.addEventListener(evt,calc)));
    calc();

  });
})();
