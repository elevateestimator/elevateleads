/* Slideshow engine for /closing/show.html
   - Click / arrows / swipe navigation on #closing
   - WAAPI transitions with safe fallback (+ watchdog)
   - Hash routing + localStorage
   - Hero counters start at target (no zeros) + parallax/spotlight
   - ROI calculator + gauge
   - Slide 4: Ad Engine toggles update budget split
   - Slide 5: Intake demo (postal, roof type, age/damage, insurance, timeline) with scoring
*/

(function () {
  const onReady = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn)
    : fn());

  onReady(() => {
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = $('#closing'); if (!root) return;

    // Light/dark auto based on host background (defensive)
    try {
      const bg = getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const [r,g,b] = [m[1],m[2],m[3]].map(n=>parseInt(n,10));
        const lum = 0.2126*(r/255)+0.7152*(g/255)+0.0722*(b/255);
        if (lum > 0.7) root.classList.add('is-light');
      }
    } catch(_) {}

    const deck   = $('.cl-deck', root);
    const slides = $$('.cl-slide', deck);
    const total  = slides.length;
    const bar    = $('.cl-progress__bar', root);
    const counter= $('#cl-counter', root);
    const aria   = $('#cl-aria', root);

    // Bump the storage key to force a clean start
    const KEY='closing.show.slide.v12', NOTEKEY='closing.show.notes.v9';
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    let animating = false;

    // Index from hash or storage
    const fromHash = () => { const m=(location.hash||'').match(/#\/(\d+)/); return m?Math.min(total,Math.max(1,parseInt(m[1],10))):null; };
    let idx = fromHash() || parseInt(localStorage.getItem(KEY) || '1', 10);
    if (!(idx >= 1 && idx <= total)) idx = 1;

    // Ensure only one active slide
    slides.forEach((s,i)=> s.classList.toggle('is-active', i+1===idx));
    updateUI();
    reveal(slides[idx-1]);
    if (idx === 1) initHero();

    // Navigation core
    function go(toIdx, dir = +1){
      if (animating || toIdx === idx || toIdx < 1 || toIdx > total) return;
      const from = slides[idx-1], to = slides[toIdx-1];
      animating = true;

      // Prepare "to"
      to.classList.add('is-active');
      to.style.opacity = '0'; to.style.visibility='visible'; to.style.pointerEvents='auto';

      const duration = 360, easing = 'cubic-bezier(.2,.8,.2,1)';
      const off = dir > 0 ? -6 : 6;

      let done = false;
      const finish = () => {
        if (done) return; done = true;
        from.classList.remove('is-active'); from.style.visibility='hidden'; from.style.pointerEvents='none'; from.style.opacity='';
        to.style.opacity='1';
        reveal(to);
        if (toIdx === 1) initHero();
        idx = toIdx; updateUI();
        animating = false;
      };

      if (!prefersReduced && from.animate && to.animate) {
        from.animate(
          [{ opacity:1, transform:'translateX(0) scale(1)' },
           { opacity:0, transform:`translateX(${off}%) scale(.98)` }],
          { duration, easing }
        );
        const a = to.animate(
          [{ opacity:0, transform:`translateX(${-off}%) scale(.98)` },
           { opacity:1, transform:'translateX(0) scale(1)' }],
          { duration, easing, fill:'forwards' }
        );
        a.onfinish = finish;
        a.addEventListener?.('finish', finish);
        a.finished?.then(finish).catch(()=>{});
        setTimeout(finish, duration + 240); // watchdog
      } else {
        finish();
      }
    }

    function updateUI(){
      const pct = (idx - 1) / (total - 1) * 100;
      if (bar) bar.style.width = `${pct}%`;
      if (counter) counter.textContent = `${idx}/${total}`;
      const title = $(`.cl-slide:nth-child(${idx}) h2`, deck)?.textContent?.trim() || `Slide ${idx}`;
      if (aria) aria.textContent = `Slide ${idx} of ${total}: ${title}`;
      const h = `#/${idx}`; if (location.hash !== h) history.replaceState(null, '', h);
      localStorage.setItem(KEY, String(idx));
    }

    // Reveal animations
    function reveal(slide){
      if (prefersReduced) return;
      // chips
      $$('[data-animate="chips"] > *', slide).forEach((el,i)=>{
        el.animate?.([{opacity:0, transform:'translateY(8px) scale(.98)'},{opacity:1, transform:'translateY(0) scale(1)'}],
                   {duration:240, delay:60*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });
      // stagger groups
      $$('[data-animate="stagger"]', slide).forEach(group=>{
        const items = [
          ...$$('.cl-bullets > li', group),
          ...$$('.cl-step', group),
          ...$$('.cl-plan li', group),
          ...$$('.cl-check li', group),
          ...$$('.cl-columns .cl-card', group),
          ...$$('.counter-row .counter-tile', group),
          ...$$('.features .feature', group),
          ...$$('.cl-callout .callout-card', group),
          ...$$('.cl-callout .mini-timeline', group),
          ...$$('.cl-callout .map-card', group),
          ...$$('.role-grid .role-card', group)
        ];
        items.forEach((el,i)=>{
          el.animate?.([{opacity:0, transform:'translateY(12px)'},{opacity:1, transform:'translateY(0)'}],
                     {duration:260, delay:70*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
        });
      });

      // ad-card stack
      $$('[data-animate="stack"] .ad-card', slide).forEach((el,i)=>{
        const base = getComputedStyle(el).transform || 'none';
        el.animate?.([{opacity:0, transform:`${base} translateY(12px) scale(.96)`},{opacity:1, transform:`${base} translateY(0) scale(1)`}],
                   {duration:420, delay:90*i, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'});
      });

      // Slide-specific inits
      if (slide.classList.contains('cl-slide--engine')) initEngine(slide);
      if (slide.classList.contains('cl-slide--intake')) initIntake(slide);
      if (slide.classList.contains('cl-slide--proof')) initProof(slide);
      
      if (slide.classList.contains('cl-slide--objections')) initObjections(slide);
if (slide.classList.contains('cl-slide--team')) initTeam(slide);
    }

    // Keys
    document.addEventListener('keydown', (e)=>{
      const tag = (e.target && (e.target.tagName || '')).toLowerCase();
      const interactive = /input|textarea|select|button/.test(tag) || e.target?.isContentEditable;
      if (interactive) return;

      const k = e.key.toLowerCase();
      if (['arrowright','pagedown',' '].includes(k)) { e.preventDefault(); go(idx+1, +1); }
      else if (['arrowleft','pageup'].includes(k)) { e.preventDefault(); go(idx-1, -1); }
      else if (k === 'home'){ e.preventDefault(); go(1, -1); }
      else if (k === 'end'){ e.preventDefault(); go(total, +1); }
      else if (k === 'n'){ e.preventDefault(); root.classList.toggle('is-notes'); localStorage.setItem(NOTEKEY, root.classList.contains('is-notes')?'1':'0'); }
    }, { capture: true });

    // Click-to-advance anywhere (except interactive)
    root.addEventListener('click', (e)=>{
      if (e.target.closest('a,button,input,select,textarea,label,[role="button"]')) return;
      go(idx+1, +1);
    });

    // Fixed Prev/Next controls
    root.addEventListener('click',(e)=>{
      const btn = e.target.closest('[data-nav]'); if (!btn) return;
      e.preventDefault();
      const dir = btn.dataset.nav === 'next' ? +1 : -1;
      go(idx + dir, dir);
    });

    // Swipe nav (pointer + touch)
    let sx=null, sy=null, t0=0;
    root.addEventListener('pointerdown',(e)=>{ sx=e.clientX; sy=e.clientY; t0=performance.now(); });
    root.addEventListener('pointerup',(e)=>{
      if (sx==null) return;
      const dx=e.clientX-sx, dy=e.clientY-sy, dt=performance.now()-t0; sx=sy=null;
      if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy) && dt<800) go(idx+(dx<0?+1:-1), dx<0?+1:-1);
    }, { passive:true });

    // Hash routing
    window.addEventListener('hashchange', ()=>{ const h=fromHash(); if (h && h!==idx) go(h, h>idx?+1:-1); });

    // HERO: parallax / spotlight / counters / word switcher
    function initHero(){
      const hero = slides[0];
      // Spotlight follows pointer
      const spot = $('.hero-spotlight', hero);
      if (spot && window.matchMedia?.('(pointer:fine)').matches && !prefersReduced){
        document.addEventListener('pointermove',(e)=>{
          const x = (e.clientX / innerWidth) * 100;
          const y = (e.clientY / innerHeight) * 100;
          spot.style.setProperty('--mx', `${x}%`);
          spot.style.setProperty('--my', `${y}%`);
        }, { passive:true });
      }
      // Word switcher
      const words = $$('.hero-switch b', hero);
      if (words.length){
        let w = 0; setInterval(()=>{ words[w].classList.remove('is-on'); w=(w+1)%words.length; words[w].classList.add('is-on'); }, 1800);
      }
      // Parallax headline
      const pEls = $$('[data-parallax]', hero);
      if (pEls.length && window.matchMedia?.('(pointer:fine)').matches && !prefersReduced){
        document.addEventListener('mousemove',(e)=>{
          const {innerWidth:w, innerHeight:h}=window, dx=(e.clientX-w/2)/(w/2), dy=(e.clientY-h/2)/(h/2);
          pEls.forEach(el=>{ const f=parseFloat(el.getAttribute('data-parallax')||'0.3'); el.style.transform=`translate(${dx*10*f}px, ${dy*10*f}px)`; });
        }, { passive:true });
      }
      // Counters: show target immediately, then micro tick-up
      $$('.js-count', hero).forEach(el=>{
        const target = parseFloat(el.dataset.to || '0');
        const prefix = el.dataset.prefix || '';
        el.textContent = `${prefix}${Math.round(target)}`; // immediate (no zeros)
        if (target > 0 && !prefersReduced){
          const end = Math.round(target*1.03), startVal = target;
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
    }

    /* =========================
       ROI CALCULATOR (Slide 7)
       ========================= */
    const spendEl=$('.js-spend',deck), cpcEl=$('.js-cpc',deck), cvrEl=$('.js-cvr',deck), closeEl=$('.js-close',deck), aovEl=$('.js-aov',deck);
    const leadsOut=$('.js-leads',deck), salesOut=$('.js-sales',deck), cplOut=$('.js-cpl',deck), cpaOut=$('.js-cpa',deck), revOut=$('.js-rev',deck), roasOut=$('.js-roas',deck), brkOut=$('.js-breakeven',deck), gfill=$('.js-gfill',deck);
    function fmt$(n){ return Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Math.max(0,Math.round(n))); }
    function fmtx(n){ const v=Math.round(n*100)/100; return `${v.toFixed(2)}x`; }
    function fmti(n){ return Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(Math.max(0,Math.round(n))); }
    function calc(){
      const spend=+spendEl?.value||0, cpc=Math.max(+cpcEl?.value||0.01,0.01);
      const cvr=Math.max(Math.min(+cvrEl?.value||0,100),0)/100, close=Math.max(Math.min(+closeEl?.value||0,100),0)/100, aov=+aovEl?.value||0;
      const clicks=spend/cpc, leads=clicks*cvr, sales=leads*close;
      const cpl=leads>0?spend/leads:Infinity, cpa=sales>0?spend/sales:Infinity, revenue=sales*aov, roas=spend>0?revenue/spend:0;
      if (leadsOut) leadsOut.textContent=Number.isFinite(leads)?fmti(leads):'—';
      if (salesOut) salesOut.textContent=Number.isFinite(sales)?fmti(sales):'—';
      if (revOut) revOut.textContent=fmt$(revenue);
      if (roasOut) roasOut.textContent=fmtx(roas);
      if (cplOut) cplOut.textContent=Number.isFinite(cpl)?fmt$(cpl):'—';
      if (cpaOut) cpaOut.textContent=Number.isFinite(cpa)?fmt$(cpa):'—';
      const pct=Math.max(0, Math.min(100, (Math.min(roas,3)/3)*100)); if (gfill) gfill.style.width = `${pct}%`;
      const good=roas>=1; if (brkOut){ brkOut.textContent=good?'Above breakeven':'Below breakeven'; brkOut.style.background=good?'linear-gradient(135deg, var(--cl-accent), var(--cl-accent-2))':'rgba(0,0,0,.45)'; brkOut.style.color=good?'#001018':''; }
    }
    if (spendEl) ['input','change'].forEach(evt=>[spendEl,cpcEl,cvrEl,closeEl,aovEl].forEach(el=>el.addEventListener(evt,calc)));
    calc();

    /* =========================
       SLIDE 4: AD ENGINE TOGGLES
       ========================= */
    function initEngine(slide){
      if (slide.dataset.init) return; slide.dataset.init = '1';
      const splitEl = $('.js-split', slide);
      const tgWrap  = $('.engine-toggles', slide);
      const s1List  = $('.s1 ul', slide);
      const s2List  = $('.s2 ul', slide);
      const s3List  = $('.s3 ul', slide);

      const themes = {
        balanced: {
          split: 'Search 40% • FB/IG 35% • Retarget 20% • LSA 5%',
          s1: ['Drone flyovers & before/after','Neighborhood geo‑targeting','Storm damage / financing hooks'],
          s2: ['High‑intent keywords only','Deep negatives & extensions','LSA + branded defense'],
          s3: ['Recent installs & crew intros','Map/review proof & deadlines','Everywhere they scroll']
        },
        storm: {
          split: 'Search 45% • FB/IG 30% • Retarget 20% • LSA 5%',
          s1: ['Before/after hail & wind damage','Zip‑code storm clusters','Emergency tarp / quick response'],
          s2: ['“roof replacement” + “storm damage” sets','Exclude DIY/“jobs”/training','LSA urgency ad copy'],
          s3: ['Damaged shingles proof reels','Insurance help explainer','Deadline: filing window']
        },
        metal: {
          split: 'FB/IG 40% • Search 35% • Retarget 20% • LSA 5%',
          s1: ['Cinematic metal installs','Benefits: longevity, energy, look','Financing spotlight'],
          s2: ['“metal roof” + brand terms','Exclude repair kits & panels','Branded defense on your name'],
          s3: ['Home tours with metal roofs','Noise & lightning FAQs','Book design consult']
        },
        finance: {
          split: 'Search 38% • FB/IG 32% • Retarget 25% • LSA 5%',
          s1: ['$0 down / low APR hooks','Before/after + payment overlay','Neighborhood geo‑targeting'],
          s2: ['“roof financing” variants','Exclude low‑intent queries','Extensions: sitelinks & callouts'],
          s3: ['Calculator demo videos','Approval timeline explainer','Retarget until they apply']
        },
        insurance: {
          split: 'Search 40% • Retarget 25% • FB/IG 30% • LSA 5%',
          s1: ['“We handle the claim” creative','Estimator walk‑throughs','Local storm credibility'],
          s2: ['Insurance/adjuster terms (exact)','Negatives to cut DIY & info','Competitor conquest'],
          s3: ['Claim checklist carousel','Reviews about claim help','CTA: inspection + guidance']
        }
      };

      function setTheme(key='balanced'){
        const t = themes[key] || themes.balanced;
        if (splitEl) splitEl.textContent = t.split;
        if (s1List) s1List.innerHTML = t.s1.map(li=>`<li>${li}</li>`).join('');
        if (s2List) s2List.innerHTML = t.s2.map(li=>`<li>${li}</li>`).join('');
        if (s3List) s3List.innerHTML = t.s3.map(li=>`<li>${li}</li>`).join('');
      }
      setTheme('balanced');

      if (tgWrap){
        tgWrap.addEventListener('click', (e)=>{
          const btn = e.target.closest('.tg'); if (!btn) return;
          tgWrap.querySelectorAll('.tg').forEach(b=>b.classList.remove('is-on'));
          btn.classList.add('is-on');
          setTheme(btn.dataset.theme);
        });
      }
           // --- Supabase public video hydration (root-level files) ---
      (function hydrateSupabaseVideos(){
        const base = window.SB_MEDIA_BASE;   // e.g., https://<ref>.supabase.co/storage/v1/object/public/media
        if (!base) return;
        slide.querySelectorAll('.engine-reel source[data-sb]').forEach(srcEl => {
          const path = srcEl.getAttribute('data-sb').replace(/^\/+/, '');
          srcEl.setAttribute('src', `${base}/${path}`);
        });
        // Reload so the browser selects the new first <source>
        slide.querySelectorAll('.engine-reel video').forEach(v => v.load());
      })();

      // --- Creatives reel: polite autoplay + stop slide-advance on tap ---
      const vids = slide.querySelectorAll('.engine-reel video');

      vids.forEach(v => {
        // Prevent the deck's click-to-advance from firing on video taps
        ['pointerdown','click'].forEach(evt => v.addEventListener(evt, e => e.stopPropagation()));

        // Ensure mobile autoplay works
        v.muted = true; 
        v.playsInline = true; 
        v.loop = true;
        v.play?.().catch(()=>{ /* autoplay may be blocked; ignore */ });
      });

      // Pause when the slide is not active; resume when active
      const syncVids = () => {
        if (slide.classList.contains('is-active')){
          vids.forEach(v => v.play?.().catch(()=>{}));
        } else {
          vids.forEach(v => v.pause?.());
        }
      };
      syncVids();
      window.addEventListener('hashchange', syncVids);

      // --- Fullscreen button: sound on + scrubbable controls while fullscreen ---
      let activeFSVideo = null;

      // Add a fullscreen button to each video frame (once)
      vids.forEach((v) => {
        const frame = v.closest('.video-frame');
        if (!frame || frame.querySelector('.vf-fs')) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vf-fs';
        btn.setAttribute('aria-label', 'Fullscreen with sound');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M4 10V4h6M14 4h6v6M20 14v6h-6M10 20H4v-6"
                  fill="none" stroke="currentColor" stroke-width="1.7"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>`;
        frame.appendChild(btn);

        // Don't advance the slide when clicking the button
        ['pointerdown','click'].forEach(evt => btn.addEventListener(evt, e => e.stopPropagation()));

        const enterFullscreen = async () => {
          // Turn sound on and show controls so you can scrub
          try {
            v.muted = false;
            v.controls = true;
            v.setAttribute('controlsList', 'nodownload'); // optional: hide download
            await v.play?.();
          } catch(_) {}

          activeFSVideo = v;

          // iOS Safari native fullscreen (best first if available)
          if (typeof v.webkitEnterFullscreen === 'function') {
            try { v.webkitEnterFullscreen(); return; } catch(_) {}
          }
          // Standards-based fullscreen on the frame (shows browser UI)
          const el = frame;
          if (el.requestFullscreen)            el.requestFullscreen();
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
          // If none available, at least leave controls visible in-place
        };

        btn.addEventListener('click', enterFullscreen);

        // When iOS native fullscreen ends, restore deck mode
        v.addEventListener('webkitendfullscreen', () => {
          v.controls = false;
          v.muted = true;
          activeFSVideo = null;
        });
      });

      // When exiting standards fullscreen, restore deck mode
      const onFSChange = () => {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        if (!fsEl && activeFSVideo) {
          activeFSVideo.controls = false;
          activeFSVideo.muted = true;
          activeFSVideo = null;
        }
      };
      document.addEventListener('fullscreenchange', onFSChange);
      document.addEventListener('webkitfullscreenchange', onFSChange);
    }

    /* =========================
       SLIDE 5: INTAKE DEMO
       ========================= */
    function initIntake(slide){
      if (slide.dataset.init) return; slide.dataset.init = '1';

      // Gauge setup
      const fg = $('.score-ring .fg', slide);
      const num = $('.score-num', slide);
      const gradePill = $('.score-tags .grade', slide);
      const CIRC = 2 * Math.PI * 62; // r=62 matches SVG
      if (fg){
        fg.style.strokeDasharray = `${CIRC}`;
        fg.style.strokeDashoffset = `${CIRC * (1-0.92)}`; // initial ~92
      }

      function setScore(score){
        const s = Math.max(0, Math.min(100, score));
        if (fg) fg.style.strokeDashoffset = `${CIRC * (1 - s/100)}`;
        if (num) num.textContent = String(Math.round(s));
        const label = s>=85 ? 'A — Inspection‑ready' : s>=70 ? 'B — Strong' : s>=55 ? 'C — Nurture' : 'D — Disqualify';
        if (gradePill) gradePill.textContent = label;
      }

      const toggles = $$('.intake-toggle input', slide);
      function recalc(){
        let base = 42;
        toggles.forEach(el => { if (el.checked) base += (+el.dataset.weight||0); });
        setScore(Math.min(base, 99));
      }
      toggles.forEach(el => el.addEventListener('change', recalc));
      recalc();

      // Notifications pulse sequence
      const steps = $$('.notify-step', slide);
      function pulse(){
        steps.forEach(s=> s.classList.remove('is-on'));
        steps.forEach((s,i)=> setTimeout(()=> { if (!slide.classList.contains('is-active')) return; s.classList.add('is-on'); }, i*300));
      }

      // Lead chip animation across lane
      const lane = $('.flow-lane .lane', slide);
      function dropChip(){
        if (!lane || !slide.classList.contains('is-active')) return;
        const chip = document.createElement('div');
        chip.className = 'lead-chip';
        chip.textContent = '✓';
        lane.appendChild(chip);
        requestAnimationFrame(()=> chip.classList.add('go'));
        chip.addEventListener('transitionend', ()=> chip.remove(), { once:true });
      }

      // Periodic demo loop while active
      const loop = setInterval(()=> {
        if (!slide.classList.contains('is-active')) return;
        dropChip(); pulse();
      }, 2600);

      // Clean on hashchange
      window.addEventListener('hashchange', ()=> {
        if (!slide.classList.contains('is-active')) clearInterval(loop);
      });
    }

    /* =========================
       SLIDE 6: TRACKING & PROOF (moved outside IIFE earlier; kept here)
       ========================= */
    // Provided below as global function: initProof

    /* =========================
       SLIDE 8: TEAM (light init)
       ========================= */
    function initTeam(slide){
      if (slide.dataset.init) return; slide.dataset.init = '1';
      // Optional rotating line in "The Result" punch for a bit of life
      const punch = slide.querySelector('.team-outcome .punch strong');
      const lines = ['These are the people.', 'Let’s book the inspection.', 'They look like the #1 choice.'];
      if (punch && !prefersReduced){
        let i=0;
        setInterval(()=>{
          i=(i+1)%lines.length;
          if (punch.animate){
            const out = punch.animate([{opacity:1},{opacity:0}],{duration:140, easing:'ease-out'});
            out.onfinish = ()=>{ punch.textContent = lines[i]; punch.animate([{opacity:0},{opacity:1}],{duration:160, easing:'ease-in'}); };
          } else {
            punch.textContent = lines[i];
          }
        }, 1600);
      }
    }
  });
})();

/* =========================
   SLIDE 6: TRACKING & PROOF (standalone init)
   ========================= */
function initProof(slide){
  if (slide.dataset.init) return; slide.dataset.init = '1';
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // KPI counters — light tick so numbers feel alive (no zero flicker)
  const kpis = {
    leads:  { el: slide.querySelector('.js-mleads'),    val: 38, max: 62 },
    appts:  { el: slide.querySelector('.js-mappts'),    val: 24, max: 41 },
    installs:{ el: slide.querySelector('.js-minstalls'), val: 7,  max: 12 },
    rev:    { el: slide.querySelector('.js-mrev'),      val: 231000, max: 330000 }
  };
  const fmtI = n => Intl.NumberFormat(undefined,{maximumFractionDigits:0}).format(n);
  const fmt$ = n => Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

  function bump(){
    // small random nudges within caps
    kpis.leads.val = Math.min(kpis.leads.max,  kpis.leads.val + (Math.random()<.4?1:0));
    kpis.appts.val = Math.min(kpis.appts.max,  kpis.appts.val + (Math.random()<.35?1:0));
    // installs less frequent
    if (Math.random()<.18) kpis.installs.val = Math.min(kpis.installs.max, kpis.installs.val + 1);
    kpis.rev.val   = Math.min(kpis.rev.max,    kpis.installs.val * 33000);
    if (kpis.leads.el)   kpis.leads.el.textContent   = fmtI(kpis.leads.val);
    if (kpis.appts.el)   kpis.appts.el.textContent   = fmtI(kpis.appts.val);
    if (kpis.installs.el)kpis.installs.el.textContent= fmtI(kpis.installs.val);
    if (kpis.rev.el)     kpis.rev.el.textContent     = fmt$(kpis.rev.val);
  }

  // Praise stream — presence signals you can feel (not testimonials)
  const feed = slide.querySelector('.praise-feed');
  const signals = [
    { icon:'⭐', text:'New 5★ Google review posted', meta:'GBP' },
    { icon:'📸', text:'New photo added to Business Profile', meta:'+visibility' },
    { icon:'📍', text:'Ranked in Local Pack for “roofer near me”', meta:'Maps' },
    { icon:'💬', text:'Q&A answered on your profile', meta:'Trust' },
    { icon:'🔎', text:'Branded searches up week over week', meta:'Search' },
    { icon:'🧭', text:'Directions requests from Maps increased', meta:'Maps' }
  ];
  function pushSignal(){
    if (!feed) return;
    const s = signals[Math.floor(Math.random()*signals.length)];
    const li = document.createElement('li');
    li.className = 'praise-item';
    li.innerHTML = `<span class="star" aria-hidden="true">${s.icon}</span><span>${s.text}</span><small class="meta">${s.meta}</small>`;
    feed.prepend(li);
    // trim
    const max = 6; while (feed.children.length > max) feed.lastElementChild?.remove();
  }

  // Lead stream — chips glide across the track (instant routing vibe)
  const track = slide.querySelector('.lead-track');
  const postal = ['32708','53211','80210','29407','48009','97206','44124','38117','34953','30341'];
  const roof   = ['Metal','Architectural','Tile','Flat'];
  const asap   = ['ASAP','This Week','Soon','2–3 Days'];
  function pushLead(){
    if (!track) return;
    const chip = document.createElement('div');
    chip.className = 'lead-chip2';
    const z = postal[Math.floor(Math.random()*postal.length)];
    const r = roof[Math.floor(Math.random()*roof.length)];
    const t = asap[Math.floor(Math.random()*asap.length)];
    chip.textContent = `New Inspection • ${z} • ${r} • ${t}`;
    track.appendChild(chip);
    requestAnimationFrame(()=> chip.classList.add('go'));
    chip.addEventListener('transitionend', ()=> chip.remove(), { once:true });
  }

  // Kick it off while slide is active
  if (!prefersReduced){
    const loop1 = setInterval(()=> { if (slide.classList.contains('is-active')) bump(); }, 1800);
    const loop2 = setInterval(()=> { if (slide.classList.contains('is-active')) pushSignal(); }, 1600);
    const loop3 = setInterval(()=> { if (slide.classList.contains('is-active')) pushLead(); }, 2100);
    window.addEventListener('hashchange', ()=> {
      if (!slide.classList.contains('is-active')) { clearInterval(loop1); clearInterval(loop2); clearInterval(loop3); }
    });
  } else {
    // Still show a couple items with reduced motion
    pushSignal(); pushSignal();
  }
  // --- Results.png lightbox ---
  const shotImg = slide.querySelector('.js-proofShot');
  if (shotImg) {
    const root = document.getElementById('closing');
    let light = root.querySelector('.proof-lightbox');
    if (!light) {
      light = document.createElement('div');
      light.className = 'proof-lightbox';
      light.innerHTML = `<img src="${shotImg.src}" alt="${shotImg.alt}">`;
      root.appendChild(light);
    }

    const open = () => {
      const img = light.querySelector('img');
      img.src = shotImg.src;
      img.alt = shotImg.alt;
      light.classList.add('is-on');
    };
    const close = () => light.classList.remove('is-on');

    // Open from the card button
    shotImg.closest('.proof-shot__btn')?.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent slide-advance click
      open();
    });

    // Close overlay on click / Esc — and prevent slide advance
    light.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
}


/* =========================
   SLIDE 9: OBJECTIONS — INTERACTIVE
   ========================= */
function initObjections(slide){
  if (slide.dataset.init) return; slide.dataset.init = '1';
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  // Data: objection → claim → our answer → receipts
  const items = [
    {
      key:'have-agency',
      label:'We already have someone',
      claim:'We don’t just “run ads.” We make you look like the #1 roofer and follow prospects everywhere.',
      myth:['Our current guy handles Google/FB','We’re set for now'],
      answer:[
        'Omnipresence system: Search + LSA + Maps + FB/IG + Display working together (no YouTube).',
        'Pro content shoot → cinematic, local proof — not templated creatives.',
        'Exclusive territory: we won’t also run your competitor.'
      ],
      proof:['CPL as low as $33 on Meta (metal roofing).','7‑day launch.','Qualified leads guaranteed.']
    },
    {
      key:'tried-ads',
      label:'Tried ads — didn’t work',
      claim:'It fails when it’s just ads. It works when intent, proof and follow‑up are stitched together.',
      myth:['Clicks, no installs','Agency vanished after launch'],
      answer:[
        'Capture intent (Search/LSA) + win the compare (Maps/Reviews) + retarget until they book.',
        'Pre‑screening + lead scoring kill junk.',
        'Routing + speed‑to‑lead under 5 minutes.']
      ,
      proof:['Real‑time proof signals (reviews, directions, branded search).','Monthly ROI strategy call.','No shared leads — ever.']
    },
    {
      key:'price',
      label:'Too expensive',
      claim:'One average install often covers the entire month. After that, it’s house money.',
      myth:['We need the “cheapest” option'],
      answer:[
        'Avg job value ≈ $33k; you’re buying installs, not impressions.',
        'We bring the team you won’t build in‑house (shooters, editors, ad managers).',
        'Scale up/down by crew capacity.'],
      proof:['Transparent ROI math on Slide 7.','Exclusive territory — limited to 3 per region.','Qualified leads guaranteed.']
    },
    {
      key:'quality',
      label:'Lead quality',
      claim:'We screen for territory fit, roof type, age/damage, insurance, and timeline — before it hits you.',
      myth:['We’ll get tire‑kickers','Shared lists'],
      answer:[
        'Pre‑screen form + weights = A/B/C/D scores.',
        'SpamShield™ blocks duplicates and junk.',
        'Instant routing to the right person.'],
      proof:['Speed‑to‑lead < 5 minutes.','You own the pipeline — no shared leads.','Local proof baked into creatives.']
    },
    {
      key:'capacity',
      label:'No time / capacity',
      claim:'You focus on installs. We handle creative, ads, tracking, and optimization.',
      myth:['We’re swamped','No one to “run this” internally'],
      answer:[
        'Three things from you: pick territory, confirm budget, answer leads fast.',
        'We handle the content shoot, build, launch, and monthly strategy.',
        'Throttle by crew capacity — pause geos or shift spend.'],
      proof:['7‑day go‑live.','Appointments land on your calendar.','Monthly strategy call.']
    },
    {
      key:'proof',
      label:'Need proof',
      claim:'You’ll feel lift fast — and you’ll see it: leads, appointments, installs, revenue.',
      myth:['We’ve been burned by reports'],
      answer:[
        'We show what to scale — not box‑checking dashboards.',
        'Presence signals: new reviews, photos, Local Pack ranks.',
        'Scenario‑based ROI calculator (live on Slide 7).'],
      proof:['Qualified leads (30d), appointments, installs tick up.','Presence signals feed on Slide 6.','Strategy call each month.']
    },
    {
      key:'organic',
      label:'We rank already',
      claim:'Great — we capture demand you don’t see and defend your brand everywhere they compare.',
      myth:['SEO is enough','Word‑of‑mouth only'],
      answer:[
        'Own “roofer near me” with Search/LSA and branded defense.',
        'Reviews & Maps flywheel makes you the obvious pick.',
        'Retargeting closes the loop while they think.'],
      proof:['Branded searches up.','Directions & calls increase.','Reviews velocity climbs.']
    },
    {
      key:'risk',
      label:'What if it doesn’t work?',
      claim:'We de‑risk with exclusivity and a qualified‑leads guarantee.',
      myth:['We can’t afford a miss'],
      answer:[
        'Only 3 roofers per region — when it’s locked, it’s gone.',
        'Qualified leads guaranteed — or we keep working free.',
        'We shift strategy by theme (storm, metal, financing, insurance).'],
      proof:['Exclusivity = no internal competition.','Theme toggles (Slide 4) to chase what’s working.','7‑day launch, then optimize.']
    }
  ];

  const chips = slide.querySelector('.obj-chips');
  const stage = slide.querySelector('.obj-stage');
  const bar   = slide.querySelector('.obj-progress__bar');
  const count = slide.querySelector('.obj-progress__count');
  const prev  = slide.querySelector('.obj-prev');
  const next  = slide.querySelector('.obj-next');

  let i = 0;

  function build(o){
    const li = (arr) => arr.map(t=>`<li>${t}</li>`).join('');
    const pills = (arr) => arr.map(t=>`<span class="pill">${t}</span>`).join('');
    return `
      <div class="obj-card" data-animate="pop">
        <div class="obj-claim"><span class="obj-tag">The Case</span><h3>${o.claim}</h3></div>
        <div class="obj-col bad">
          <h4>The Objection</h4>
          <ul>${li(o.myth)}</ul>
        </div>
        <div class="obj-col good">
          <h4>Why We Win</h4>
          <ul>${li(o.answer)}</ul>
        </div>
        <div class="obj-col proof">
          <h4>Receipts</h4>
          <div>${pills(o.proof)}</div>
        </div>
      </div>`;
  }

  function setActive(n){
    i = (n + items.length) % items.length;
    // Chips
    chips.querySelectorAll('.obj-chip').forEach((b,idx)=>{
      const on = idx === i;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
    // Progress
    if (count) count.textContent = `${i+1}/${items.length}`;
    if (bar) bar.style.width = `${(i+1)/items.length*100}%`;
    // Stage
    if (stage){
      stage.innerHTML = build(items[i]);
      // tiny entrance
      if (!prefersReduced){
        const card = stage.querySelector('.obj-card');
        if (card?.animate){
          card.animate(
            [{opacity:0, transform:'translateY(10px) scale(.98)'},{opacity:1, transform:'translateY(0) scale(1)'}],
            {duration:260, easing:'cubic-bezier(.2,.8,.2,1)', fill:'forwards'}
          );
        }
      }
    }
  }

  // Build chips
  items.forEach((o, idx)=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'obj-chip' + (idx===0?' is-on':'');
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected', idx===0 ? 'true' : 'false');
    btn.textContent = o.label;
    btn.addEventListener('click', ()=> setActive(idx));
    chips?.appendChild(btn);
  });

  // Controls
  next?.addEventListener('click', ()=> setActive(i+1));
  prev?.addEventListener('click', ()=> setActive(i-1));

  // Init
  setActive(0);
}

