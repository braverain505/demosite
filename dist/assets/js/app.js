/* ============================================================
   EIS — app.js
   Progressive enhancement for the EIS marketing site.
  Zero dependencies. All interactive forms are handled locally.
   and write to localStorage so a backend can replace them.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const onReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  const toast = (msg) => {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3400);
  };

  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const load = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

  /* ---------------- page entrance -------------- */
  onReady(() => requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('pg-ready'))));

  /* ---------------- theme ---------------- */
  const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`;
  const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6"/></svg>`;

  onReady(() => {
    const toggle = $('#themeToggle');
    const apply = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      if (toggle) toggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    };
    const stored = load('eis-theme');
    apply(stored || 'light');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        store('eis-theme', next);
      });
      toggle.setAttribute('aria-label', 'Toggle colour theme');
    }
  });

  /* ---------------- sticky nav ---------------- */
  onReady(() => {
    const nav = $('.nav');
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  });

  /* ---------------- mobile drawer ---------------- */
  onReady(() => {
    const drawer = $('#jsDrawer');
    const openBtn = $('#jsMenuOpen');
    const closeBtn = $('#jsMenuClose');
    if (!drawer || !openBtn) return;
    const set = (open) => {
      drawer.classList.toggle('is-open', open);
      drawer.inert = !open;
      drawer.setAttribute('aria-hidden', String(!open));
      openBtn.setAttribute('aria-expanded', String(open));
      if (open) { closeBtn && closeBtn.focus(); document.body.style.overflow = 'hidden'; }
      else { document.body.style.overflow = ''; }
    };
    openBtn.addEventListener('click', () => set(true));
    closeBtn && closeBtn.addEventListener('click', () => set(false));
    drawer.addEventListener('click', (e) => {
      if (e.target.closest('a')) set(false);
      if (e.target.id === 'jsMenuClose') set(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { e.preventDefault(); set(false); openBtn.focus(); }
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  onReady(() => {
    const items = $$('[data-reveal]');
    if (!items.length) return;
    if (REDUCED || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    // threshold 0 (not `0.12`): any element taller than the viewport — e.g. the
    // 7.7k-tall term calendar — can never reach 12% visible, so it would stay
    // opacity:0 forever. Reveal the instant any part enters the effective root.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  });

  /* ---------------- subtle hero parallax ---------------- */
  onReady(() => {
    const heros = $$('.hero');
    if (!heros.length || REDUCED) return;
    const medias = heros
      .map((h) => ({ hero: h, img: h.querySelector('.hero-media img, .hero-media svg') }))
      .filter((x) => x.img);
    if (!medias.length) return;
    document.body.classList.add('js-parallax'); // base scale to hide crop edges
    const STYLE = 'translate3d(0, %px, 0) scale(1.1)';
    let ticking = false;
    const update = () => {
      ticking = false;
      for (const { hero, img } of medias) {
        const r = hero.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        const p = Math.min(1, Math.max(0, -r.top / r.height)); // 0 at rest → 1 scrolled past
        const y = p * Math.max(14, r.height * 0.04);           // subtle, capped at 4% of hero height
        img.style.transform = STYLE.replace('%', y.toFixed(1));
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  });

  /* ---------------- animated counters ---------------- */
  onReady(() => {
    const els = $$('.stat .count[data-count]');
    if (!els.length) return;
    const fmt = (n) => {
      if (n >= 100) return n.toLocaleString('en-US');
      return String(n);
    };
    const run = (el) => {
      const target = Number(el.getAttribute('data-count'));
      const dur = REDUCED ? 10 : 1100;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.5 });
    els.forEach((el) => io.observe(el));
  });

  /* ---------------- tabs ---------------- */
  onReady(() => {
    $$('.js-tabs').forEach((host) => {
      const btns = $$('.tab-btn', host);
      const panels = $$('.tab-panel', host);
      const sel = (i) => {
        btns.forEach((b, bi) => b.setAttribute('aria-selected', String(bi === i)));
        panels.forEach((p, pi) => p.classList.toggle('active', pi === i));
      };
      btns.forEach((b, i) => b.addEventListener('click', () => { sel(i); }));
      sel(0);
    });
  });

  /* ---------------- accordions ---------------- */
  onReady(() => {
    $$('.acc').forEach((acc) => {
      const btn = $('.acc-btn', acc);
      const panel = $('.acc-panel', acc);
      if (!btn || !panel) return;
      const inner = $('.acc-inner', panel);
      const set = (open) => {
        btn.setAttribute('aria-expanded', String(open));
        panel.style.maxHeight = open ? inner.scrollHeight + 'px' : '0';
      };
      btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
      set(false);
      window.addEventListener('resize', () => {
        if (acc.getAttribute('aria-expanded') === 'true') panel.style.maxHeight = inner.scrollHeight + 'px';
      });
    });
  });

  /* ---------------- day rail progress ---------------- */
  onReady(() => {
    const rail = $('.day-rail');
    if (!rail || REDUCED || !('IntersectionObserver' in window)) return;
    const bar = $('i', rail);
    if (!bar) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const host = $('.day');
        const sc = () => {
          const r = host.getBoundingClientRect();
          const start = window.innerHeight * 0.82;
          const end = start + r.height - window.innerHeight;
          const p = Math.max(0, Math.min(1, (start - r.top) / end));
          bar.style.transform = `scaleY(${p})`;
        };
        sc();
        window.addEventListener('scroll', sc, { passive: true });
        io.unobserve(en.target);
      });
    }, { threshold: 0 });
    io.observe(rail);
  });

  /* ---------------- lightbox ---------------- */
  onReady(() => {
    const modal = $('#lbModal');
    if (!modal) return;
    const big = $('#lbBig', modal);
    const cap = $('#lbCap', modal);
    const close = () => { modal.classList.remove('open'); modal.removeAttribute('open'); document.body.style.overflow = ''; };
    const targs = $$('[data-lb]');
    const list = targs.map((el) => ({ html: el.getAttribute('data-lb'), cap: el.getAttribute('data-cap') || '' }));
    let idx = 0;
    const show = (i) => {
      idx = (i + list.length) % list.length;
      big.innerHTML = list[idx].html;
      cap.textContent = list[idx].cap;
    };
    targs.forEach((el) => el.addEventListener('click', () => {
      if (!list.length) return;
      const j = targs.indexOf(el);
      modal.classList.add('open');
      modal.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      show(j);
      $('.modal-close', modal)?.focus?.();
    }));
    $('.modal-close', modal).addEventListener('click', close);
    $('.modal-bg', modal).addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
    });
  });

  /* ---------------- pano (360) ---------------- */
  onReady(() => {
    const pano = $('.pano');
    if (!pano) return;
    const stage = $('.pano-stage', pano);
    const frames = $$('.frm', stage);
    if (frames.length < 2) return;
    let down = false, baseX = 0, baseT = 0, t = 0;
    const W = () => pano.clientWidth;
    const setT = (v) => {
      const max = (frames.length - 1) * W();
      t = Math.max(0, Math.min(max, v));
      stage.style.transform = `translateX(${-t}px)`;
    };
    pano.addEventListener('pointerdown', (e) => { down = true; baseX = e.clientX; baseT = t; pano.setPointerCapture(e.pointerId); });
    pano.addEventListener('pointermove', (e) => { if (!down) return; setT(baseT - (e.clientX - baseX) * 1.15); });
    pano.addEventListener('pointerup', () => { down = false; });
    pano.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') setT(t + 60);
      if (e.key === 'ArrowLeft') setT(t - 60);
    });
  });

  /* ---------------- fee estimator ---------------- */
  onReady(() => {
    const slider = $('#feeSlider');
    const out = $('#feeOut');
    if (!slider || !out) return;
    const stages = [
      ['Nursery', 'Nursery & Early years'],
      ['Primary', 'Primary (KS1–2)'],
      ['JSS', 'Junior Secondary (KS3)'],
      ['SSS', 'Senior Secondary (KS4+)'],
    ];
    const render = () => {
      const i = Number(slider.value);
      const [code, label] = stages[i];
      out.setAttribute('data-stage', code);
      const span = out.querySelector('span');
      span.textContent = `${code} · ${label}`;
      out.setAttribute('data-code', code);
    };
    render();
    slider.addEventListener('input', render);
  });

  /* ---------------- generic forms ---------------- */
  onReady(() => {
    $$('form[data-demo-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let ok = true;
        $$('[required]', form).forEach((f) => {
          const field = f.closest('.field');
          if (!f.value.trim()) { field.classList.add('invalid'); ok = false; }
          else field.classList.remove('invalid');
        });
        if (!ok) { toast('Please complete the highlighted fields.'); return; }
        store(form.id || 'eis-form', { at: Date.now(), data: Object.fromEntries(new FormData(form).entries()) });
        const okBox = $('.form-ok', form.closest('.form-card'));
        if (okBox) { form.classList.add('is-hidden'); okBox.classList.add('show'); }
        form.reset?.();
        toast('Submitted — the school office will review your message.');
      });
      $$('.input, .select, .textarea', form).forEach((f) => f.addEventListener('input', () => f.closest('.field')?.classList.remove('invalid')));
    });
  });

  /* ---------------- multi-step application wizard ---------------- */
  onReady(() => {
    const wiz = $('#applyWiz');
    if (!wiz) return;
    const steps = $$('.wiz-screen', wiz);
    const dots = $$('.wiz-step', wiz);
    let cur = 0;
    const show = (i) => {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach((s, si) => s.classList.toggle('active', si === cur));
      dots.forEach((d, di) => {
        d.classList.toggle('on', di === cur);
        d.classList.toggle('done', di < cur);
        if (di === cur) d.setAttribute('aria-current', 'step');
        else d.removeAttribute('aria-current');
      });
      const prev = $('.js-prev', wiz);
      const next = $('.js-next', wiz);
      if (prev) prev.disabled = cur === 0;
      if (next) next.textContent = cur === steps.length - 1 ? 'Submit application' : 'Continue';
      window.scrollTo({ top: wiz.getBoundingClientRect().top + window.scrollY - 120, behavior: REDUCED ? 'auto' : 'smooth' });
    };
    const valid = () => {
      let ok = true;
      $$('.wiz-screen.active [required]', wiz).forEach((f) => {
        if (!f.value.trim()) { f.closest('.field')?.classList.add('invalid'); ok = false; }
      });
      if (!ok) toast('Please complete the highlighted fields.');
      return ok;
    };
    const nextBtn = $('.js-next', wiz);
    if (nextBtn) {
      nextBtn.type = 'submit'; // on the final step this submits the form below
      nextBtn.addEventListener('click', (e) => {
        if (cur < steps.length - 1) { e.preventDefault(); if (valid()) show(cur + 1); }
      });
    }
    $('.js-prev', wiz)?.addEventListener('click', () => show(cur - 1));
    dots.forEach((d, i) => {
      d.setAttribute('tabindex', '0');
      d.addEventListener('click', () => { if (i < cur || (i === cur)) show(cur); else if (valid()) show(i); });
      d.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (valid()) show(i); }
      });
    });
    show(0);
    const final = $('#wizDone');
    $('form[data-wizard]', wiz)?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!valid()) return;
      const ref = 'EIS-' + Date.now().toString(36).toUpperCase().slice(-6);
      store('eis-application', { at: Date.now(), ref });
      if (final) final.classList.add('show');
    });
  });

  /* ---------------- results lookup ---------------- */
  onReady(() => {
    const res = $('#resultsLookup');
    if (!res) return;
    const form = $('#resultForm');
    const out = $('#resultOut');
    const demoRows = {
      'EIS-2026-001': { name: 'Student record 001', class: 'SSS 2', term: 'Term 2 · 2025/26', feats: ['English A', 'Mathematics A', 'Physics B+'], gpa: '3.8' },
      'EIS-2026-002': { name: 'Student record 002', class: 'JSS 3', term: 'Term 2 · 2025/26', feats: ['English A-', 'Mathematics B+', 'Basic Science A'], gpa: '3.6' },
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = $('#resId').value.trim().toUpperCase();
      out.innerHTML = '';
      if (demoRows[id]) {
        const d = demoRows[id];
        out.className = 'form-ok show';
        out.innerHTML = `
          <div class="ok-ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
          <h3>${d.name}</h3>
          <p>Term: ${d.term} · Class: ${d.class} · GPA: <strong class="t-num">${d.gpa}</strong></p>
          <ul class="t-num">${d.feats.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p class="hint" style="font-size:.78rem;color:var(--muted)">For help accessing results, please contact the school office.</p>`;
      } else {
        out.className = 'notice show';
        out.innerHTML = `<p><strong>No record found for “${id}”.</strong></p><p>Check the reference on the report card and try again.</p>`;
      }
      out.hidden = false;
    });
    out.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-fill]');
      if (!chip) return;
      $('#resId').value = chip.getAttribute('data-fill');
      form.requestSubmit();
    });
  });

  /* ---------------- calendar ---------------- */
  onReady(() => {
    const cal = $('#termCalendar');
    if (!cal) return;
    const events = window.EIS_DATA?.events || [];
    // group by month (full calendar view)
    const months = new Map();
    events.forEach((ev) => {
      const [y, m, d] = ev.date.split('-').map(Number);
      const key = `${y}-${m}`;
      if (!months.has(key)) months.set(key, []);
      months.get(key).push({ ...ev, day: d });
    });
    const short = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
    const fmt = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${short(m)} ${y}`; };
    // Each month is a heading, its calendar grid, then that month's events
    // listed directly beneath the grid. `.cal` is width-constrained (max-width
    // in extras.css) so aspect-ratio-1 day cells stay small.
    let html = '';
    [...months.entries()].forEach(([key, list]) => {
      const [y, m] = key.split('-').map(Number);
      const first = new Date(y, m - 1, 1);
      const weekStart = (first.getDay() + 6) % 7; // Monday-first
      const days = new Date(y, m, 0).getDate();
      html += `<h3 class="cal-mth">${short(m)} ${y}</h3><div class="cal"><div class="cal-dow">${['M','T','W','T','F','S','S'].map((x) => `<span>${x}</span>`).join('')}</div>`;
      for (let i = 0; i < weekStart; i++) html += '<span class="cal-e m"></span>';
      for (let d = 1; d <= days; d++) {
        const evs = list.filter((x) => x.day === d);
        html += `<span class="cal-e${evs.length ? ' has-ev' : ''}"${evs.length ? ` title="${evs.map((x) => x.title).join(', ')}"` : ''}>${d}${evs.length ? `<i>${evs.length}</i>` : ''}</span>`;
      }
      html += '</div>';
      html += `<ul class="cal-list">${list.map((ev) => `<li><b class="t-num">${fmt(ev.date)}</b> — ${ev.title} <em class="tiny-label">${ev.tag}</em></li>`).join('')}</ul>`;
    });
    cal.innerHTML = html;
    const exportBtn = $('#calExport');
    exportBtn?.addEventListener('click', () => {
      const ics = 'BEGIN:VCALENDAR\nVERSION:2.0\n' + events.map((ev) => `BEGIN:VEVENT\nSUMMARY:${ev.title}\nDTSTART;VALUE=DATE:${ev.date.replace(/-/g, '')}\nDTEND;VALUE=DATE:` + (ev.dateT || ev.date).replace(/-/g, '') + '\nEND:VEVENT').join('\n') + '\nEND:VCALENDAR';
      const a = document.createElement('a');
      a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
      a.download = 'eis-term-calendar.ics';
      a.click();
      toast('Term calendar downloaded.');
    });
  });

  /* ---------------- resource downloads ---------------- */
  onReady(() => {
    $$('[data-demo-dl]').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        toast(`“${b.getAttribute('data-demo-dl')}” is not available for download yet. Please contact the school office.`);
      });
    });
  });

  /* ---------------- page-transition loading bar ---------------- */
  onReady(() => {
    if (REDUCED) return;
    const NAV = 'eis-nav-load';
    const bar = () => {
      let el = $('.nav-load');
      if (!el) {
        el = document.createElement('div');
        el.className = 'nav-load';
        el.innerHTML = '<i></i>';
        document.body.appendChild(el);
      }
      return el;
    };
    // arriving side: this page was loaded via a nav-load link
    let arrived = false;
    try { arrived = sessionStorage.getItem(NAV) === '1'; } catch (err) { /* private mode */ }
    if (arrived) {
      try { sessionStorage.removeItem(NAV); } catch (err) { /* private mode */ }
      document.body.classList.add('pg-nav');
      const el = bar();
      el.classList.add('is-on');
      const inner = $('i', el);
      inner.style.animation = 'none';
      inner.style.width = '100%';
      el.classList.remove('is-on');
      setTimeout(() => { el.remove(); document.body.classList.remove('pg-nav'); }, 600);
      // body fade-out is driven by the CSS animation
      return;
    }
    // leaving side: intercept same-origin navigation, run the sweep bar
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || e.defaultPrevented) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (a.target && a.target !== '_self') return;
      if (/^(#|mailto:|tel:|javascript:|data:)/i.test(href)) return;
      try {
        const u = new URL(href, location.href);
        if (u.origin !== location.origin) return;
        if (u.pathname === location.pathname) return;
      } catch (err) { return; }
      e.preventDefault();
      try { sessionStorage.setItem(NAV, '1'); } catch (err) { /* private mode */ }
      bar().classList.add('is-on');
      const dest = new URL(href, location.href).href;
      setTimeout(() => { window.location.href = dest; }, 200);
    });
  });

  /* ---------------- smooth-anchored internal links ---------------- */
  onReady(() => {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', a.getAttribute('href'));
      });
    });
  });

  /* ---------------- rotational loader (pre-launch) ---------------- */
  onReady(() => {
    const L = $('#jsLoader');
    if (!L) return;
    let seen = false;
    try { seen = sessionStorage.getItem('eis.loader.seen') === '1'; } catch (e) { /* private mode */ }
    const t0 = performance.now();
    const done = () => {
      const elapsed = performance.now() - t0;
      const delay = Math.max(0, (seen ? 360 : 960) - elapsed);
      setTimeout(() => {
        L.classList.add('is-done');
        try { sessionStorage.setItem('eis.loader.seen', '1'); } catch (e) { /* private mode */ }
        setTimeout(() => L.remove(), 600);
      }, delay);
    };
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done);
    setTimeout(done, 1700); // failsafe — never trap the visitor
  });
})();