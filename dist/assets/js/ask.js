/* ============================================================
  EIS — ask.js · “Ask EIS” assistant
   A front-end rule-based Q&A over the EIS knowledge base
  (window.EIS_DATA). Provides quick answers to common questions.
   ============================================================ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const D = window.EIS_DATA || {};
  const P = D.phone || {};

  const FAB = $('#askFab');
  const PANEL = $('#askPanel');

  if (!FAB || !PANEL) return;

  const msgs = $('.ask-msgs', PANEL);
  const form = $('.ask-form', PANEL);
  const input = $('#askInput', PANEL);
  const sugs = $('.ask-sugs', PANEL);
  const foot = $('.ask-foot', PANEL);
  const closeBtn = $('.ask-close', PANEL);

  /* ---------- knowledge -------------------------------- */
  const secrets = {
    program: `<strong>Programmes.</strong> EIS runs the British &amp; Nigerian curricula across four key stages — Nursery &amp; Early Years, Primary (Key Stage 1–2), Junior Secondary (Key Stage 3) and Senior Secondary (Key Stage 4+). See <a href="/learning">Learning &amp; Programmes</a>.`,
    key: `<strong>Key Stages 1–4.</strong> EIS follows the British &amp; Nigerian curricula from Key Stage 1 through Key Stage 4 — now in its 10th year (founded in 2016).`,
    ages: `<strong>Ages.</strong> Admission begins in Nursery &amp; Early Years and runs through to Senior Secondary (Key Stage 4+).`,
    hours: `School hours and term dates are set by the academic office each term. <strong>Term dates for 2026–27</strong> are shared with families directly from the school office.`,
    fees: `<strong>Fees.</strong> Termly fees and the boarding option are confirmed directly by the Admissions Office — they vary by Key Stage. Complete the <a href="/admissions#enquiry">admissions enquiry</a> or message us on WhatsApp and we’ll share the current schedule.`,
    admission: `<strong>Admissions</strong> are open across all Key Stages. The journey: enquiry → application → assessment &amp; interview → offer. Start with the short <a href="/admissions">application form</a> on the admissions page.`,
    requirement: `<strong>Requirements.</strong> A completed application form, birth certificate, recent school report (for transfers) and a short assessment booked with the Admissions team.`,
    boarding: `<strong>Boarding</strong> is available — a “home away from home” with cared-for residential life, dining halls and evening study. Ask the Admissions Office for the boarding schedule.`,
    transport: `<strong>Transport.</strong> School transport is arranged by the school office; routes are shared with enrolling families. Contact us via <a href="/contact">Contact</a> for the latest routes.`,
    facility: `<strong>Facilities</strong> include three science laboratories, dining and exam halls, libraries, sports grounds and computer rooms. Take the <a href="/facilities">campus tour</a>.`,
    contact: `<strong>Contact.</strong> Shavon Mile 6, Jalingo, Taraba State, Nigeria. Phone &amp; WhatsApp <strong>${P.primary || '+234 803 087 5393'}</strong>, email <strong>${D.email || 'principal@eisjalingo.com'}</strong>.`,
    staff: `<strong>Our people.</strong> Leadership and faculty profiles live on the <a href="/school">About</a> page. Contact the school office for staff enquiries.`,
    calendar: `<strong>Calendar.</strong> Term dates, open days and exam weeks are shared with families by the school office — ask the office for the current calendar.`,
    results: `<strong>Results lookup.</strong> Term results are shared with families by the school office — contact the office with the reference from the report card.`,
    uniform: `<strong>Uniform</strong> is required from Primary upwards; prefects wear a distinct uniform. Full details are shared after admission.`,
    house: `<strong>Houses &amp; clubs.</strong> Every pupil belongs to a house and can join clubs including leadership, journalism, science and sports. More on <a href="/facilities">Campus &amp; Facilities</a>.`,
    alumni: `<strong>Alumni.</strong> Our first alumni have moved from Primary through to Senior Secondary — now across Nigeria. Reunion events run through the year.`,
    newsletters: `<strong>Newsletters.</strong> The latest school newsletter is at the top of the <a href="/news#newsletter">News</a> page — uploads are added each term.`,
    hint: `Want the next step? The Admissions team also runs a WhatsApp walk-through — message <strong>${P.whatsapp || P.primary || 'the office'}</strong> directly.`,
  };

  const intents = [
    { keys: ['fee', 'cost', 'price', 'fees', 'payment', 'scholarship'], out: secrets.fees + secrets.hint },
    { keys: ['admission', 'admit', 'application', 'how do i join', 'enrol', 'apply', 'enrollment', 'sign up'], out: secrets.admission },
    { keys: ['requirement', 'need to apply', 'documents', 'required', 'needed to join'], out: secrets.requirement },
    { keys: ['boarding', 'hostel', 'residence', 'boarder', 'live in', 'accommodation'], out: secrets.boarding },
    { keys: ['transport', 'bus', 'vehicle', 'pick'], out: secrets.transport },
    { keys: ['hour', 'time', 'when does', 'opens', 'closes', 'daily'], out: secrets.hours },
    { keys: ['lab', 'laboratory', 'sport', 'facility', 'field', 'library', 'dining', 'computer'], out: secrets.facility },
    { keys: ['program', 'curriculum', 'subject', 'key stage', 'ks1', 'ks2', 'ks3', 'ks4', 'nursery', 'primary', 'junior', 'senior', 'science'], out: secrets.program },
    { keys: ['uniform', 'dress', 'wear'], out: secrets.uniform },
    { keys: ['house', 'club', 'music', 'drama', 'after school', 'activity', 'sports'], out: secrets.house },
    { keys: ['staff', 'teacher', 'head', 'principal', 'leadership', 'who runs'], out: secrets.staff },
    { keys: ['result', 'report card', 'grade', 'gpa', 'lookup'], out: secrets.results },
    { keys: ['calendar', 'term date', 'holiday', 'closing', 'event', 'open day'], out: secrets.calendar },
    { keys: ['newsletter', 'news letters', 'news-letter'], out: secrets.newsletters },
    { keys: ['newsletter', 'news letters', 'news-letter'], out: secrets.newsletters },
    { keys: ['contact', 'phone', 'email', 'address', 'reach', 'call', 'talk'], out: secrets.contact },
    { keys: ['alumni', 'old student', 'graduate'], out: secrets.alumni },
  ];

  /* ---------- chat plumbing ------------------------------ */
  const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const bubble = (who, html, meta) => {
    const b = document.createElement('div');
    b.className = 'ask-msg ' + who;
    b.innerHTML = `<span class="u">${meta || (who === 'user' ? 'You' : 'Ask EIS')}</span>${html}`;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    return b;
  };

  const typing = () => {
    const b = document.createElement('div');
    b.className = 'ask-msg bot typing';
    b.innerHTML = `<span class="u">Ask EIS</span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
    return () => b.remove();
  };

  const localAnswer = (q) => {
    const t = q.toLowerCase();
    const hit = intents.find((r) => r.keys.some((k) => t.includes(k)));
    if (hit) return hit.out;
    return `<span style="color:var(--saffron-2)">I don’t have that information to hand.</span> The Admissions Office can help: <strong>${P.primary || ''}</strong> or <strong>${P.whatsapp || P.primary || ''}</strong> on WhatsApp.`;
  };

  const plainTextHtml = (text) => text.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char])).replace(/\n/g, '<br>');

  const groqAnswer = async (q) => {
    const response = await fetch('/chat.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    if (!response.ok) throw new Error('Chat request failed');
    const data = await response.json();
    if (!data.answer) throw new Error('Chat response was empty');
    return plainTextHtml(data.answer);
  };

  const say = async (q, delay = 620) => {
    const done = typing();
    try {
      const html = await Promise.race([
        groqAnswer(q),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Chat request timed out')), 12000)),
      ]);
      setTimeout(() => { done(); bubble('bot', html); }, delay);
    } catch {
      setTimeout(() => { done(); bubble('bot', localAnswer(q)); }, delay);
    }
  };

  const push = (q) => {
    bubble('user', q.replace(/[<>]/g, ''));
    say(q);
  };

  const greet = () => {
    msgs.innerHTML = '';
    bubble('bot', `Hello! I’m <strong>Ask EIS</strong>. I can help with programmes, fees, boarding, transport, facilities and the calendar.<br><br>Ask a question or choose one below.`);
    setSugs(['What are the fees?', 'How do I apply?', 'Is boarding available?', 'What are the term dates?', 'How do I reach the school?']);
    if (foot) foot.innerHTML = `<span class="pulse-dot"></span> Ask EIS · school information assistant`;
  };

  const setSugs = (items) => {
    sugs.innerHTML = '';
    items.forEach((t) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.addEventListener('click', () => { input.value = t; push(t); b.remove(); });
      sugs.appendChild(b);
    });
  };

  /* ---------- wiring ------------------------------ */
  let greeted = false;
  const openP = (want) => {
    PANEL.classList.toggle('open', want);
    FAB.setAttribute('aria-expanded', String(want));
    if (want) {
      if (!greeted) { greet(); greeted = true; }
      setTimeout(() => input.focus(), 120);
    }
  };

  FAB.addEventListener('click', () => {
    const will = !PANEL.classList.contains('open');
    if (!will) { closeBtn && closeBtn.focus(); }
    openP(will);
  });
  closeBtn && closeBtn.addEventListener('click', () => openP(false));
  FAB.setAttribute('aria-expanded', 'false');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    input.value = '';
    push(v);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && PANEL.classList.contains('open')) openP(false);
  });
})();