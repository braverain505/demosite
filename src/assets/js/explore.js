/* ============================================================
   EIS — Explore EIS
   Zero-dependency persona experience for the homepage.
   Data-driven: all persona content lives in the PERSONAS object.
   State: sessionStorage (current browser session only).
   Site-wide: sets html[data-persona] so other homepage cards can
   gently personalise (see the .pz-tag chips in explore.css).
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sKey = 'eis.persona';
  const sWrite = (v) => { try { sessionStorage.setItem(sKey, v); } catch (e) { /* private mode */ } };
  const sRead  = ()   => { try { return sessionStorage.getItem(sKey); } catch (e) { return null; } };

  /* ---------------- persona data ---------------- */
  const ORDER = ['parent', 'student', 'prospective', 'teacher'];

  const PERSONAS = {
    parent: {
      label: 'Parent', nav: "I'm a Parent",
      welcome: 'Welcome, Parent.',
      headline: 'Your child’s journey starts here.',
      intro: 'Everything on campus is arranged around one idea — that every child can learn and succeed. Here is what matters to your family, in the order that matters.',
      image: { src: '/assets/img/people/persona-parent.svg', alt: 'Parent and child at school' },
      primary: { label: 'Explore Academics', href: '/learning' },
      secondary: { label: 'Newsletter Hub', href: '/news#newsletter' },
      priorities: [
        ['Academic Programmes', '/learning', 'A British & Nigerian curriculum across Key Stages 1–4, taught by subject specialists.'],
        ['Student Development', '/school', 'Pastoral care, prefects and a moral & citizenship core that runs all day.'],
        ['School Life', '/life', 'The day for assembly — lessons, meals, clubs and study.'],
        ['Facilities', '/facilities', 'Three science labs, a library, dining halls and playing fields.'],
        ['School Newsletters', '/news#newsletter', 'The latest newsletter and notices for families.'],
        ['Contact School', '/contact', 'The office is a call or WhatsApp away.']
      ],
      band: {
        title: 'What matters to parents',
        items: [
          ['Academic depth without pressure', 'Small classes, real subjects and exam practice with a plan.'],
          ['Safety and care, all day', 'A gated campus, supervised breaks and a boarding house run like a home.'],
          ['Clear, honest communication', 'Results, reports and term dates in one place — the office answers fast.'],
          ['A community that feels like family', 'Boarding, dining and sport on one campus — families stay and friendships last.']
        ]
      }
    },
    student: {
      label: 'Student', nav: "I'm a Student",
      welcome: 'Welcome, Student.',
      headline: 'Discover your potential.',
      intro: 'A school day built for ambition and curiosity: lessons that stretch you, teams that need you and clubs that make the place feel like yours.',
      image: { src: '/assets/img/people/persona-student.svg', alt: 'Student carrying a folder at school' },
      primary: { label: 'Discover Student Life', href: '/life' },
      secondary: { label: 'Explore Activities', href: '/life#clubs' },
      priorities: [
        ['Academics', '/learning', 'Small classes, subject specialists and exam practice with a plan.'],
        ['Clubs & Activities', '/life#clubs', 'Debate, journalism, chess, science and more — most afternoons.'],
        ['Sports', '/facilities', 'Football, athletics and inter-house rivalry.'],
        ['Arts & Creativity', '/life', 'Music, drama and art through the year.'],
        ['Leadership', '/school#leadership', 'Prefects, house captains and head boys and girls.'],
        ['Student Life', '/life', 'The day in and out of the classroom.'],
        ['Events', '/news', 'Open days, science fairs and celebrations.'],
        ['Learning Resources', '/life', 'Labs, a library and subject specialists.']
      ],
      band: {
        title: 'A taste of the place',
        chips: [
          'Three real science laboratories', 'Clubs most afternoons',
          'Inter-house sport', 'Prefects who help you settle in',
          'Evening study and hot meals', 'Library and quiet lanes',
          'School science fair', 'Football, debate and chess'
        ]
      }
    },
    prospective: {
      label: 'Prospective Parent', nav: 'I’m a Prospective Parent',
      welcome: 'Welcome to EIS.',
      headline: 'Imagine your child here.',
      intro: 'See the school the way a family sees it for the first time: what we believe, what we offer, and the four simple steps from your first call to your child’s first day.',
      image: { src: '/assets/img/people/persona-prospective.svg', alt: 'Family visiting the school' },
      primary: { label: 'Start Your Application', href: '/admissions#apply' },
      secondary: { label: 'Book a School Visit', href: '/admissions#visit' },
      priorities: [
        ['Why EIS', '/school', 'The promise that every child can learn and succeed.'],
        ['Academic Programmes', '/learning', 'British & Nigerian curricula across Key Stages 1–4.'],
        ['Facilities', '/facilities', 'Three labs, a library, dining halls and playing fields.'],
        ['Faculty', '/school#leadership', 'A teaching team led by an experienced head.'],
        ['School Life', '/life', 'The rhythm of a full school day.'],
        ['Admissions Requirements', '/admissions', 'Entry stages and what we ask of families.'],
        ['Admissions Process', '/admissions', 'Four clear steps, from first call to first day.'],
        ['Campus Tour', '/admissions#visit', 'Walk the campus with us on an open day.'],
        ['Enquiry', '/admissions#enquiry', 'Ask the office anything — even by WhatsApp.'],
        ['Application', '/admissions#apply', 'Five minutes, end to end.']
      ],
      journey: [
        ['01', 'Discover EIS', 'See the school and what it stands for.'],
        ['02', 'Visit Us', 'Walk the campus, meet the team.'],
        ['03', 'Apply', 'A short form and a warm conversation.'],
        ['04', 'Join Our Community', 'Welcome letter, first day, homework.']
      ]
    },
    teacher: {
      label: 'Teacher', nav: "I'm a Teacher",
      welcome: 'Welcome, Educator.',
      headline: 'Grow. Inspire. Make a difference.',
      intro: 'Teaching at EIS is real work and real care: small classes, bright students and a school that puts professional growth on the timetable.',
      image: { src: '/assets/img/people/persona-teacher.svg', alt: 'Teacher working with students' },
      primary: { label: 'Explore Careers', href: '/careers' },
      secondary: { label: 'Meet Our Faculty', href: '/school#leadership' },
      priorities: [
        ['Teaching at EIS', '/careers', 'The roles we recruit for and the teacher who thrives here.'],
        ['Our Educational Philosophy', '/school', 'The “everybody can learn and succeed” value, in practice.'],
        ['Professional Development', '/school#leadership', 'Development budgeted, term by term.'],
        ['Staff Culture', '/careers', 'A staffroom that stays, grows and welcomes.'],
        ['Career Opportunities', '/careers#roles', 'The openings the office confirms.'],
        ['Faculty', '/school#leadership', 'The leadership team in front of every lesson.'],
        ['Contact & Enquiries', '/careers#apply', 'Send a CV or ask the office a question.']
      ],
      band: {
        title: 'Why teachers stay',
        items: [
          ['Classes small enough to actually teach', 'Real teaching, not crowd management.'],
          ['Planning time protected', 'Development and marking time, budgeted term by term.'],
          ['A school that listens', 'Students who try hard and a community that is grateful.'],
          ['A campus that works for you', 'Boarding, dining and sport on one site, with child protection at the centre.']
        ]
      }
    }
  };

  /* ---------------- render helpers ---------------- */
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const btnEl = (o, cls) => `<a class="btn ${cls}" href="${esc(o.href)}">${esc(o.label)} <span class="arr" aria-hidden="true">→</span></a>`;

  const ico = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

  function renderRows(id) {
    const p = PERSONAS[id];
    let band = '';
    if (id === 'prospective') {
      band = `
      <div class="ev-band">
        <h4>Your admissions journey</h4>
        <div class="journey">
          ${p.journey.map(([n, t, d]) => `
          <div class="j-step"><div class="n">${n}</div><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}
        </div>
      </div>`;
    } else if (id === 'student') {
      band = `
      <div class="ev-band">
        <h4>${esc(p.band.title)}</h4>
        <div class="chip-cloud">${p.band.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>
      </div>`;
    } else if (id === 'parent' || id === 'teacher') {
      band = `
      <div class="ev-band">
        <h4>${esc(p.band.title)}</h4>
        <div class="band-grid">
          ${p.band.items.map((it) => `
          <div class="band-item">
            <span class="b-ic" aria-hidden="true">${ico}</span>
            <div><b>${esc(it[0])}</b><span>${esc(it[1])}</span></div>
          </div>`).join('')}
        </div>
      </div>`;
    }
    return `
      <div class="ev-hero">
        <div>
          <p class="ev-kicker">${esc(p.welcome)}</p>
          <h2 tabindex="-1">${esc(p.headline)}</h2>
          <p class="ev-intro">${esc(p.intro)}</p>
          <div class="ev-cta">
            ${btnEl(p.primary, 'btn--primary')}
            ${btnEl(p.secondary, 'btn--secondary')}
          </div>
        </div>
        <figure class="ev-figure">
          <img src="${esc(p.image.src)}" alt="${esc(p.image.alt || p.image.note)}" width="420" height="520" loading="lazy">
          <figcaption>${esc(p.image.note)}</figcaption>
        </figure>
      </div>
      <div class="ev-prio">
        <h4>Where to begin</h4>
        <ul>
          ${p.priorities.map(([t, h, d]) => `
          <li><span class="n" aria-hidden="true"></span><a href="${esc(h)}">${esc(t)}</a><p>${esc(d)}</p></li>`).join('')}
        </ul>
      </div>
      ${band}
      <p class="ev-foot">A personalised guide to the parts of EIS that matter most to you.</p>`;
  }

  /* ---------------- behaviour ---------------- */
  const root = $('[data-explore]');
  let current = null; // currently active persona id ('' = none)

  const setDoc = (id) => {
    if (id) document.documentElement.setAttribute('data-persona', id);
    else document.documentElement.removeAttribute('data-persona');
  };

  const announce = (msg) => { const st = $('#pzStatus'); if (st) st.textContent = msg; };

  function draw(id) {
    const ev = $('#evView'); if (!ev) return;
    const rows = $('#evRows');
    const chip = $('#evChip');
    if (chip) chip.innerHTML = `<span class="dot" aria-hidden="true"></span> Viewing as ${esc(PERSONAS[id].label)}`;
    $$('.ev-switch [data-persona]', ev).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.persona === id)));
    rows.innerHTML = renderRows(id);
  }

  let seq = 0; // guards the crossfade timer against stale renders
  function selectPerson(id, opts) {
    opts = opts || {};
    if (!PERSONAS[id]) return;
    const was = current;
    current = id;
    const my = ++seq;
    sWrite(id);
    setDoc(id);
    if (root) root.setAttribute('data-state', 'active');
    $$('.pz-card').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.persona === id)));

    // focus the headline only after its content is actually in the DOM — a
    // crossfade swap defers draw() by 280ms, and focusing the pre-swap h2
    // would leave keyboard focus dropping to <body> when it's replaced.
    const focusHeadline = () => {
      if (opts.focus === false) return;
      const h = $('#evRows h2');
      if (h) h.focus({ preventScroll: false });
    };
    if (opts.transition && !REDUCED && was) {
      const ev = $('#evView');
      ev.classList.add('is-leave');
      setTimeout(() => { if (my !== seq) return; draw(id); ev.classList.remove('is-leave'); focusHeadline(); }, 280);
    } else {
      draw(id);
      focusHeadline();
    }
    announce(`Personalised experience for ${PERSONAS[id].label} loaded.`);
  }

  function reset(opts) {
    opts = opts || {};
    current = null;
    seq++; // invalidate any pending crossfade render
    try { sessionStorage.removeItem(sKey); } catch (e) { /* private mode */ }
    setDoc(null);
    if (root) root.setAttribute('data-state', 'select');
    $$('.pz-card').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    const rows = $('#evRows');
    if (rows) rows.innerHTML = '';
    const chip = $('#evChip');
    if (chip) chip.textContent = '';
    if (opts.focus !== false) {
      const card = $('.pz-card[data-persona="parent"]');
      if (card) card.focus();
    }
    announce('Showing all perspectives.');
  }

  /* ---------------- wire up ---------------- */
  function init() {
    // if the section doesn't exist, still apply session persona site-wide
    if (!root) { setDoc(sRead()); return; }
    const saved = sRead();
    if (saved && PERSONAS[saved]) {
      setDoc(saved); current = saved;
      root.setAttribute('data-state', 'active');
      draw(saved);
    } else {
      root.setAttribute('data-state', 'select');
    }

    root.addEventListener('click', (e) => {
      const card = e.target.closest('.pz-card[data-persona]');
      if (card) { selectPerson(card.dataset.persona); return; }
      const sw = e.target.closest('.ev-switch [data-persona]');
      if (sw) { selectPerson(sw.dataset.persona, { transition: true }); return; }
      const rs = e.target.closest('.ev-reset');
      if (rs) { reset({ focus: true }); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();