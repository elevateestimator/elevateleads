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
    // Close mobile menu after click
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

// Stat counters
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
document.getElementById('year').textContent = new Date().getFullYear();
