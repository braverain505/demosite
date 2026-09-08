/* ============================================================
  EIS — app-data.js · shared site data
  Shared content and contact details for the school website.
   ============================================================ */
window.EIS_DATA = {
  DEMO: true,

  /* Contact details — from the official EIS site (live + archive) */
  contact: {
    address: 'Shavon Mile 6, Jalingo, Taraba State, Nigeria',
    addressShort: 'Shavon Mile 6 · Jalingo · Taraba',
    email: 'principal@eisjalingo.com',
  },
  phone: {
    primary: '+234 803 087 5393',
    alt: '+234 803 087 5393',
    alt2: '+234 803 087 5393',
    whatsapp: '+234 803 087 5393',
  },

  /* Foundational statements — from the official EIS site */
  mission:
    'Everybody can learn and succeed. Our shared purpose is that every child who walks through our gates learns to succeed, academically, morally and socially.',
  vision:
    'To create a Key Stages 1 to 4 school that balances the British and Nigerian curricula: a school every parent in Taraba is proud to send their child to, and where every child reaches God given potential.',

  /* ---------- news ---------- */
  news: [
    { id: '10years', tag: 'Celebration', title: 'A decade of Excellence: EIS turns 10', date: '2026-09-19', lead: 'Founded on 19 September 2016, we mark our 10th anniversary with a reunion week for alumni, families and friends.', img: 'anniversary' },
    { id: 'open-day', tag: 'Open day', title: 'Admissions open day: meet the classrooms, labs and halls', date: '2026-09-26', lead: 'A Saturday morning on campus: one to one tours, live lessons and a chat on scholarships with the admissions team.', img: 'open-day' },
    { id: 'science-fair', tag: 'STEM', title: 'Pupils light up the annual science fair, again', date: '2026-06-12', lead: 'Kindling curiosity across Key Stages: over 30 exhibits across biology, chemistry and physics impressed staff and families.', img: 'science-fair' },
    { id: 'parent-forum', tag: 'Community', title: 'Parents’ Forum elects the 2026/27 liaison team', date: '2026-06-02', lead: 'The Forum again elected representatives to champion welfare, safeguarding and healthy communication between school and home this session.', img: 'forum' },
    { id: 'sports-day', tag: 'Sports', title: 'Sports day prize giving crowns a lively interhouse week', date: '2026-05-24', lead: 'Houses battled across sprint, relay and field events before a full stand of cheering parents.', img: 'sports' },
    { id: 'prize-day', tag: 'Prize day', title: 'Prize giving celebrates the 2025/26 class of scholars', date: '2026-07-18', lead: 'Best in curriculum, best in character: the annual prizegiving brought the school year to a bright close.', img: 'prize' },
  ],

  /* ---------- events ---------- */
  events: [
    { date: '2026-09-14', title: 'Term 1 begins', tag: 'Calendar' },
    { date: '2026-09-19', title: 'EIS 10th anniversary celebration', tag: 'Celebration' },
    { date: '2026-09-26', title: 'Admissions open day', tag: 'Admissions' },
    { date: '2026-10-09', title: 'Parents’ forum AGM', tag: 'Community' },
    { date: '2026-10-23', title: 'Interhouse debate finals', tag: 'Student life' },
    { date: '2026-11-16', title: 'Term 1 examinations', tag: 'Exams' },
    { date: '2026-11-30', title: 'Prize giving day', tag: 'Celebration' },
    { date: '2026-12-18', title: 'Term 1 ends · holiday begins', tag: 'Calendar' },
    { date: '2027-01-11', title: 'Term 2 begins', tag: 'Calendar' },
    { date: '2027-02-26', title: 'Science fair', tag: 'STEM' },
    { date: '2027-03-22', title: 'Term 2 examinations', tag: 'Exams' },
    { date: '2027-04-02', title: 'Term 2 ends · holiday', tag: 'Calendar' },
  ],

  /* ---------- programmes [verified curriculum framing] ---------- */
  programmes: [
    { id: 'nursery', stage: 'Nursery & Early Years', ages: 'Ages 2 to 5', blurb: 'A warm, language rich start where play and structure meet. Early literacy, numeracy and social skills are seeded in small, caring groups.', tags: ['Early literacy', 'Play based learning', 'Positive trips'] },
    { id: 'primary', stage: 'Primary · Key Stage 1 to 2', ages: 'Ages 5 to 11', blurb: 'The British & Nigerian basics are mastered here: reading, writing, mathematics and science, with a strong moral and citizenship core.', tags: ['KS1 to KS2', 'Science labs from Primary', 'Clubs begin'] },
    { id: 'jss', stage: 'Junior Secondary · Key Stage 3', ages: 'Ages 11 to 14', blurb: 'A broad bridge to the senior years: real subject departments, three science laboratories, leadership opportunities and team sports.', tags: ['KS3', 'Lab practice', 'School Parliament'] },
    { id: 'sss', stage: 'Senior Secondary · Key Stage 4+', ages: 'Ages 14 to 18', blurb: 'The final ascent to the exams that matter: WAEC/NECO and beyond, with subject specialists, exam hall experience and firm pathways into university.', tags: ['KS4+', 'Exam training', 'University pathway'] },
  ],

  /* ---------- people ---------- */
  people: [
    { role: 'Lead: experienced principal educator', note: '20+ years across Nigerian international schools; leads the EIS teaching staff in the classroom and on the grounds.' },
    { role: 'Head of Admissions', note: 'Coordinates enquiry to offer; the admissions walkthrough and WhatsApp line sit in this office.' },
    { role: 'Head of Science', note: 'Oversees the three laboratories and the annual science fair programme.' },
    { role: 'Head of Pastoral & Boarding', note: 'Responsible for the home away from home boarding experience and safeguarding.' },
  ],

  /* ---------- resources ---------- */
  resources: [
    { name: 'Admissions guide 2026/27', type: 'PDF', size: '1.2 MB', desc: 'The application journey, requirements and key contacts in one place.' },
    { name: 'School prospectus', type: 'PDF', size: '4.8 MB', desc: 'Our mission, the four key stages and life on campus.' },
    { name: 'Term dates 2026/27', type: 'ICS', size: '0.1 MB', desc: 'Import the school calendar straight into your phone or desktop.' },
    { name: 'Uniform guide', type: 'PDF', size: '0.6 MB', desc: 'What pupils wear across Primary, Junior and Senior schools.' },
  ],

  /* ---------- results lookup keys ---------- */
  demoResultKeys: ['EIS-2026-001', 'EIS-2026-002'],
};