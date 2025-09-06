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



// === Apply Form Handler ===
(() => {
  const form = document.getElementById('apply-form');
  if (!form) return;
  const statusEl = document.getElementById('apply-status');
  const submitBtn = document.getElementById('apply-submit');

  function setStatus(msg, ok=true){
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.classList.remove('error','success');
    statusEl.classList.add(ok ? 'success' : 'error');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // basic client-side validation
    const data = {
      committed: form.committed?.value || '',
      avg_job_size: form.avg_job_size?.value || '',
      jobs_per_month: form.jobs_per_month?.value || '',
      company: form.company?.value || '',
      email: form.email?.value || '',
      phone: form.phone?.value || '',
      website: form.website?.value || '' // honeypot
    };

    if (!data.committed || !data.company || !data.email || !data.phone){
      setStatus('Please complete the required fields.', false);
      return;
    }
    if (data.website) { // bot caught
      setStatus('Thanks!');
      return;
    }

    submitBtn.disabled = true;
    setStatus('Submitting...');

    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.ok === false){
        throw new Error(out.error || 'Request failed');
      }
      setStatus('Thanks — you’re in the review queue. Book your call via Calendly.', true);
      form.reset();
    } catch (err){
      setStatus('Something went wrong. Please call or text us and we’ll get you booked.', false);
      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
