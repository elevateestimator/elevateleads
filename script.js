// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('#menu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Smooth scroll for on-page anchors
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (menu && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  }
});

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Stat counters (used for ROI result tiles)
function animateCount(el, target, duration = 1200) {
  const isCurrency = /[$]/.test(el.textContent) || el.parentElement?.classList.contains('currency');
  const start = 0;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    const value = Math.floor(start + (target - start) * eased);
    el.textContent = isCurrency ? `$${value.toLocaleString()}` : value.toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.querySelectorAll('.num[data-count]').forEach((el) => {
  const target = parseInt(el.getAttribute('data-count'), 10);
  const ro = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        animateCount(el, target);
        ro.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  ro.observe(el);
});

// Current year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== ROI Calculator =====
const calcBtn = document.getElementById('calcBtn');
const statLeads = document.getElementById('statLeads');
const statJobs = document.getElementById('statJobs');
const statRevenue = document.getElementById('statRevenue');
const statGolive = document.getElementById('statGolive');

function triggerCount(el, to) {
  el.setAttribute('data-count', String(to));
  animateCount(el, to);
}

function calcProjection() {
  const v = (id, d=0) => {
    const el = document.getElementById(id);
    if (!el) return d;
    const val = parseFloat(el.value || el.placeholder || d);
    return isNaN(val) ? d : val;
  };
  const avgTicket = v('avgTicket', 5000);
  const leads = Math.max(1, Math.round(v('leadsPerMonth', 20)));
  const closeRate = Math.min(100, Math.max(1, v('closeRate', 30)));

  const jobsWon = Math.round(leads * (closeRate / 100));
  const revenue = Math.round(avgTicket * jobsWon);

  triggerCount(statLeads, leads);
  triggerCount(statJobs, jobsWon);
  triggerCount(statRevenue, revenue);

  // Keep the go-live tile animated; set to 7 by default
  triggerCount(statGolive, 7);
}

if (calcBtn) calcBtn.addEventListener('click', calcProjection);

// ===== Idle Crew Loss =====
const idleBtn = document.getElementById('idleBtn');
const idleBurn = document.getElementById('idleBurn');
function calcIdle() {
  const crewSize = Math.max(1, parseInt(document.getElementById('crewSize')?.value || '4', 10));
  const hourlyCost = Math.max(1, parseFloat(document.getElementById('hourlyCost')?.value || '35'));
  const idleHours = Math.max(0, parseFloat(document.getElementById('idleHours')?.value || '6'));
  const loss = Math.round(crewSize * hourlyCost * idleHours);
  if (idleBurn) idleBurn.textContent = `$${loss.toLocaleString()}`;
}
if (idleBtn) idleBtn.addEventListener('click', calcIdle);
