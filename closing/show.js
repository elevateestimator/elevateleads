/* High–impact slideshow for /closing/show.html
   - True overlay slides w/ WAAPI transitions (direction aware)
   - Sticky progress, slide counter, aria-live updates
   - Click / arrows / swipe; hash routing + localStorage memory
   - Parallax hero, staggered bullet reveals, chip cascades
   - Magnetic CTA, confetti on slide 12
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
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
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
    const fab = qs('.cl-fab', root);

    const KEY = 'closing.show.slide.v2';
    const NOTEKEY = 'closing.show.notes.v2';
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    // Initial slide from hash or storage
    const hashSlide = () => {
      const m = (location.hash || '').match(/#\/(\d+)/);
      return m ? Math.min(total, Math.max(1, parseInt(m[1], 10))) : null;
    };
    let idx = hashSlide() || parseInt(localStorage.getItem(KEY) || '1', 10);
    if (!(idx >= 1 && idx <= total)) idx = 1;

    // Restore notes toggle
    if (localStorage.getItem(NOTEKEY) === '1') root.classList.add('is-notes');

    // Apply initial state
    slides.forEach((s, i) => s.classList.toggle('is-active', (i + 1) === idx));
    updateUI();
    reveal(slides[idx - 1]);

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
        ).onfinish = () => { to.style.opacity='1'; reveal(to); };
      } else {
        from.classList.remove('is-active'); from.style.visibility='hidden'; from.style.pointerEvents='none';
        to.style.opacity='1'; reveal(to);
      }

      idx = next; updateUI();
      if (idx === total) confetti();
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

    // Stagger + chips animation
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
          ...qsa('.cl-columns .cl-card', group)
        ];
        items.forEach((el,i)=>{
          if (!el.animate) return;
          el.animate([{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'translateY(0)'}],
                     {duration:280, delay:70*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
        });
      });
      // pops
      qsa('[data-animate="pop"]', slide).forEach(el=>{
        el.animate([{opacity:0, transform:'scale(.98)'},{opacity:1, transform:'scale(1)'}],
                   {duration:280, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
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

    // Parallax on slide 1
    const hero = slides[0], pEls = qsa('[data-parallax]', hero);
    if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && pEls.length){
      document.addEventListener('mousemove',(e)=>{
        const {innerWidth:w, innerHeight:h}=window, dx=(e.clientX-w/2)/(w/2), dy=(e.clientY-h/2)/(h/2);
        pEls.forEach(el=>{ const f=parseFloat(el.getAttribute('data-parallax')||'0.3'); el.style.transform=`translate(${dx*10*f}px, ${dy*10*f}px)`; });
      });
    }

    // Magnetic CTA
    if (!prefersReduced && window.matchMedia?.('(pointer:fine)').matches && fab){
      const strength=18;
      document.addEventListener('mousemove',(e)=>{
        const r=fab.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
        const dx=(e.clientX-cx)/r.width, dy=(e.clientY-cy)/r.height;
        fab.style.transform=`translate(${dx*strength}px, ${dy*strength}px)`;
      });
    }

    // ROI calculator
    const spendEl=qs('.js-spend',deck), cpcEl=qs('.js-cpc',deck), cvrEl=qs('.js-cvr',deck), closeEl=qs('.js-close',deck), aovEl=qs('.js-aov',deck);
    const cplOut=qs('.js-cpl',deck), cpaOut=qs('.js-cpa',deck), revOut=qs('.js-rev',deck), roasOut=qs('.js-roas',deck), brkOut=qs('.js-breakeven',deck);
    function fmt$(n){ return Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.max(0,Math.round(n))); }
    function fmtx(n){ return `${(Math.round(n*100)/100).toFixed(2)}x`; }
    function calc(){
      const spend=+spendEl.value||0, cpc=Math.max(+cpcEl.value||0.01,0.01);
      const cvr=Math.max(Math.min(+cvrEl.value||0,100),0)/100, close=Math.max(Math.min(+closeEl.value||0,100),0)/100, aov=+aovEl.value||0;
      const clicks=spend/cpc, leads=clicks*cvr, sales=leads*close;
      const cpl=leads>0?spend/leads:Infinity, cpa=sales>0?spend/sales:Infinity, revenue=sales*aov, roas=spend>0?revenue/spend:0;
      cplOut.textContent=Number.isFinite(cpl)?fmt$(cpl):'—'; cpaOut.textContent=Number.isFinite(cpa)?fmt$(cpa):'—';
      revOut.textContent=fmt$(revenue); roasOut.textContent=fmtx(roas);
      brkOut.textContent=roas>=1?'Above breakeven':'Below breakeven';
      brkOut.style.background=roas>=1?'linear-gradient(135deg, var(--cl-accent), var(--cl-accent-2))':'rgba(0,0,0,.4)';
      brkOut.style.color=roas>=1?'#001018':'';
    }
    if (spendEl) ['input','change'].forEach(evt=>[spendEl,cpcEl,cvrEl,closeEl,aovEl].forEach(el=>el.addEventListener(evt,calc)));
    calc();

    // Confetti
    function confetti(){
      if (prefersReduced) return;
      const N=140, cs=[
        getComputedStyle(root).getPropertyValue('--cl-accent').trim()||'#38BCF6',
        getComputedStyle(root).getPropertyValue('--cl-accent-2').trim()||'#5CDDFF',
        '#ffffff'
      ];
      const wrap=document.createElement('div'); wrap.style.position='fixed'; wrap.style.inset='0'; wrap.style.pointerEvents='none'; wrap.style.overflow='hidden'; wrap.setAttribute('aria-hidden','true'); document.body.appendChild(wrap);
      for(let i=0;i<N;i++){ const p=document.createElement('div'), s=6+Math.random()*9;
        p.style.position='absolute'; p.style.width=`${s}px`; p.style.height=`${s*0.6}px`; p.style.left=`${Math.random()*100}%`; p.style.top=`-10%`; p.style.background=cs[i%cs.length]; p.style.opacity='0.9'; p.style.borderRadius='2px';
        wrap.appendChild(p);
        if (p.animate){ const endY=110+Math.random()*20, drift=(Math.random()-0.5)*20, spin=Math.random()*720;
          p.animate([{transform:'translate(0,0) rotate(0deg)'},{transform:`translate(${drift}vw, ${endY}vh) rotate(${spin}deg)`}],{duration:2200+Math.random()*1200,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
        }
      }
      setTimeout(()=>wrap.remove(),3200);
    }

    // Public API (optional)
    window.closingDeck = { next:()=>show(idx+1,+1), prev:()=>show(idx-1,-1), goto:(n)=>show(Math.min(total,Math.max(1,n|0)), n>idx?+1:-1) };
  });
})();
