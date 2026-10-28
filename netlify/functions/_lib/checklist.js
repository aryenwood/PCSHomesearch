// The free PCS + VA loan checklist a family gets by email when they ask for it on the checklist page.
// Every line comes from pages checked on the site (fort-drum/pcs-checklist.html and fort-drum/buying.html),
// re-checked Oct 28, 2026 against official sources (docs/research-2026-10/). Change a fact there first, then here;
// tools/qa-realty-lead.mjs compares key figures between this file and the page.

const CHECKED = 'Checked Oct 28, 2026 against the DoD Joint Travel Regulations and GSA per diem rates, the VA, Military OneSource, TRICARE, the New York State Tax Department and DMV, and the Fort Drum garrison pages. Rates change: confirm yours with your finance office or lender.';

// Who the family said is moving (the page's "Who's moving?" chooser rides along in the form as "who").
const WHO = {
  ad: 'Active duty, any branch',
  vet: 'Veteran or retiree',
  gr: 'National Guard or Reserve',
  ss: 'Surviving spouse',
};

// Photos already on the site; authors and licenses are in docs/research-2026-09/photo-provenance.json.
// WebP from pcshomes.com: Gmail and Apple Mail show it; Outlook on Windows shows the alt text instead.
const IMG = 'https://pcshomes.com/images';
const PHOTOS = {
  drum: { src: `${IMG}/fort-drum/blackhawk-in-snow-800.webp`, w: 800, h: 571, alt: 'A Black Hawk helicopter on a snowy landing zone at Fort Drum', credit: 'Fort Drum in winter. Photo: Fort Drum and 10th Mountain Division, public domain.' },
  square: { src: `${IMG}/places/public-square-winter-800.webp`, w: 800, h: 600, alt: 'Public Square in downtown Watertown on a winter day', credit: 'Public Square, Watertown. Photo: Lallint, CC0.' },
  maple: { src: `${IMG}/places/thompson-park-fall-maple-800.webp`, w: 800, h: 533, alt: 'A maple in full fall color in Thompson Park, Watertown', credit: 'Fall in Thompson Park, Watertown. Photo: Kurt Thomas Hunt, CC BY 2.0.' },
};

// Where each step sends the family: the same addresses the checklist page links (checked Oct 28, 2026),
// plus the VA's own pages for fees, limits and survivors. Keyed by step title; tools/qa-realty-lead.mjs
// fails if a key stops matching a step.
const VA = 'https://www.va.gov/housing-assistance/home-loans';
const L = {
  planMyMove: ['Plan My Move', 'https://planmymove.militaryonesource.mil/'],
  movingOffice: ['Fort Drum moving office', 'https://installations.militaryonesource.mil/military-installation/fort-drum/moving/household-goods'],
  mch: ['Mountain Community Homes', 'https://www.fortdrummch.com'],
  childCare: ['MilitaryChildCare.com', 'https://www.militarychildcare.com/'],
  scra: ['Your SCRA rights', 'https://www.justice.gov/servicemembers/resources'],
  bah: ['DoD BAH calculator', 'https://www.travel.dod.mil/Allowances/Basic-Allowance-for-Housing/BAH-Rate-Lookup/'],
  tricareMove: ['TRICARE moving steps', 'https://www.tricare.mil/LifeEvents/Moving'],
  milConnect: ['milConnect (DEERS)', 'https://milconnect.dmdc.osd.mil/milconnect/'],
  visitors: ['Fort Drum visitor information', 'https://home.army.mil/drum/about/visitor-information'],
  spouseWorks: ['SpouseWorks', 'https://spouseworks.militaryonesource.mil/portal/'],
  vaClinics: ['VA clinics near Fort Drum', 'https://www.va.gov/syracuse-health-care/locations/'],
  nysVets: ["NYS Veterans' Services", 'https://veterans.ny.gov/'],
  vetCenter: ['Watertown Vet Center', 'https://www.va.gov/watertown-vet-center/'],
  records: ['Request your DD214', 'https://www.archives.gov/veterans/military-service-records'],
  taxExempt: ['NY veterans exemption', 'https://www.tax.ny.gov/pit/property/exemption/vetexempt.htm'],
  dmv: ['Veteran status on your license', 'https://dmv.ny.gov/more-info/veteran-status-designation-on-a-photo-document'],
  libertyPass: ['Lifetime Liberty Pass', 'https://veterans.ny.gov/lifetime-liberty-pass'],
  nyLabor: ['NY Labor veteran services', 'https://dol.ny.gov/services-veterans'],
  tuition: ['Veterans Tuition Award', 'https://hesc.ny.gov/vta'],
  tap: ['SFL-TAP at Fort Drum', 'https://home.army.mil/drum/my-fort/all-services/SFL-TAP'],
  vaEligibility: ['VA loan eligibility', `${VA}/eligibility/`],
  coe: ['Request your COE', `${VA}/how-to-request-coe/`],
  trs: ['TRICARE Reserve Select', 'https://tricare.mil/Plans/HealthPlans/TRS'],
  dec: ['DEC free licenses', 'https://dec.ny.gov/regulatory/permits-licenses/sporting-and-use/sporting/free-reduced-fee'],
  userra: ['USERRA', 'https://www.dol.gov/agencies/vets/programs/userra'],
  survivorLoan: ['VA loan for surviving spouses', 'https://www.va.gov/family-and-caregiver-benefits/housing-assistance/surviving-spouse-home-loan/'],
  sos: ['Survivor Outreach Services', 'https://home.army.mil/drum/about/Garrison/directorate-human-resources/MPD/personnel-operations-branch-casualty-assistance-center/survivor-outreach-services'],
  lender: ['Talk to a VA lender', 'https://pcshomes.com/get-help'],
  fees: ['VA fees and closing costs', `${VA}/funding-fee-and-closing-costs/`],
  limits: ['VA loan limits', `${VA}/loan-limits/`],
  buying: ['Buying near Fort Drum', 'https://pcshomes.com/fort-drum/buying'],
  jtr: ['Joint Travel Regulations', 'https://www.travel.dod.mil/Policy-Regulations/Joint-Travel-Regulations/'],
};
const LINKS = {
  'The week orders drop': [L.planMyMove, L.movingOffice, L.mch, L.childCare],
  'Renting now?': [L.scra],
  'Your housing allowance': [L.bah],
  'Health care on the move': [L.tricareMove, L.milConnect],
  'Arrival week': [L.visitors],
  'Schools and spouse jobs': [L.spouseWorks],
  'VA health care': [L.vaClinics],
  'Free help with claims and benefits': [L.nysVets],
  Counseling: [L.vetCenter],
  'Your DD214': [L.records],
  'Veterans property tax exemption': [L.taxExempt],
  'New York extras': [L.dmv, L.libertyPass],
  'Jobs and school': [L.nyLabor, L.tuition],
  'Retiring from Fort Drum': [L.tap],
  'VA loan eligibility': [L.vaEligibility],
  'Documents for your COE': [L.coe],
  'TRICARE Reserve Select (2026)': [L.trs],
  'Free New York licenses': [L.dec],
  'Your civilian job': [L.userra],
  'VA home loan': [L.survivorLoan],
  'Help at Fort Drum': [L.sos],
  'Property taxes': [L.taxExempt],
  'Benefits help': [L.libertyPass],
  '1. Get your Certificate of Eligibility (COE)': [L.coe],
  '2. Get pre-approved': [L.lender],
  '3. Know the funding fee': [L.fees],
  '4. Loan limits': [L.limits],
  '5. Costs': [L.fees],
  '6. Older and rural homes': [L.buying],
  'Moving allowance (DLA): $1,870 to $6,385, one time': [L.jtr],
  'Child care while you wait: up to $500': [L.childCare],
  'Damage you find after the movers leave: tell the carrier in writing within 7 days': [L.movingOffice],
  'Moving some of it yourself (a PPM): turn in paperwork within 45 days': [L.movingOffice],
  'Property tax exemption: file by March 1 in most towns': [L.taxExempt],
};

const PATHS = {
  ad: {
    title: 'Your move, step by step (active duty, any branch)',
    photo: 'drum',
    items: [
      ['The week orders drop', 'Make your plan on Military OneSource Plan My Move (free, every branch). Book your household goods move in DPS and call the Fort Drum transportation office, (315) 772-6384; the move help line is 833-MIL-MOVE. Apply for on-post housing with Mountain Community Homes, (315) 955-6644. Request child care at MilitaryChildCare.com. In EFMP? Update your enrollment before you go: Fort Drum EFMP, (315) 772-5476.'],
      ['Renting now?', 'Under the SCRA you can end the lease with written notice and a copy of your orders.'],
      ['Your housing allowance', 'Look up your BAH for ZIP 13602 on the official DoD BAH calculator. On-post rent is your whole BAH.'],
      ['10 to 15 days before you leave', 'Ask finance about advance pay and your moving allowance (DLA): up to 80% of it can come as an advance. Photograph your things and serial numbers before pack day.'],
      ['Health care on the move', 'Keep your TRICARE plan until you arrive and get refills and referrals before you go. Update your address in DEERS (milConnect); you then have 90 days to change plans. Fort Drum is TRICARE East, 1-800-444-5445.'],
      ['Arrival week', 'Army: report to the 10th Mountain Reception Company, Bldg. 4412, Camp Swift Road, open 24/7, (315) 774-0165. Other branches: follow the reporting instructions on your orders. File your travel voucher within 5 working days. Visiting family needs a REAL ID; the Visitor Control Center is Bldg. 11008, (315) 772-8585, 5:30 a.m. to 10 p.m.'],
      ['Schools and spouse jobs', 'On-post homes are in the Carthage or Indian River school districts; off-post towns have their own. Call the Fort Drum School Liaison, (315) 772-3214. Spouse jobs: SpouseWorks (formerly SECO) on Military OneSource and Fort Drum Employment Readiness, (315) 772-1090.'],
    ],
  },
  vet: {
    title: 'Settling in as a veteran or retiree',
    photo: 'square',
    items: [
      ['VA health care', 'Enroll or move your care: 877-222-8387. Watertown VA Clinic, 1222 Arsenal St., (315) 425-8240. Fort Drum VA Clinic (specialty care), (315) 425-4400 ext. 58158. Syracuse VA Medical Center, (315) 425-4400.'],
      ['Free help with claims and benefits', 'Jefferson County Veterans Service Agency, (315) 785-3086. Lewis County, (315) 377-2065 (Wednesday and Friday). St. Lawrence County, (315) 386-4754. NYS Veterans\' Services in Watertown, (315) 785-2468.'],
      ['Counseling', 'Watertown Vet Center, (315) 782-5479, free and confidential. In a crisis: 988, then press 1.'],
      ['Your DD214', 'Request it free from the National Archives (eVetRecs). Your COE for a VA loan uses it.'],
      ['Veterans property tax exemption', 'File form RP-458-a with your town assessor by the taxable status date, March 1 in most towns. Each county, town and school district decides whether to offer it. File again after you buy a new home.'],
      ['New York extras', '"Veteran" on your driver\'s license: form MV-44 and your DD214 at a DMV office, no extra fee. Lifetime Liberty Pass for state parks. A 40% or higher rating gets a $5 hunting and fishing license.'],
      ['Jobs and school', 'NYS Department of Labor veteran staff on post, (315) 772-7099. NY Veterans Tuition Award (HESC). SUNY Jefferson Veteran Services, (315) 786-2288.'],
      ['Retiring from Fort Drum', 'Retirement Services Office, 1-800-556-9790. Transition program (SFL-TAP), (315) 772-3434.'],
    ],
  },
  gr: {
    title: 'For National Guard and Reserve',
    photo: 'drum',
    items: [
      ['VA loan eligibility', 'Six creditable years, or 90 days of non-training active duty. For the Guard, Title 10 counts, or 90 days with 30 in a row under Title 32 shown on a DD214.'],
      ['Documents for your COE', 'Activated: your DD214. Serving, never activated: a signed statement of service with your creditable years. Discharged Guard: NGB Form 22 and NGB Form 23. Discharged Reserve: your latest retirement points statement.'],
      ['TRICARE Reserve Select (2026)', '$57.88 a month for you, $286.66 for you and your family, for Selected Reserve members not on active orders over 30 days.'],
      ['Free New York licenses', 'New York resident Guard and Reserve members get free fishing, hunting and trapping licenses from DEC.'],
      ['Your civilian job', 'USERRA protects it when you serve. U.S. Department of Labor, 1-866-237-0275.'],
      ['Counseling', 'If you served in a combat zone or an emergency activation: Watertown Vet Center, (315) 782-5479, free.'],
    ],
  },
  ss: {
    title: 'For surviving spouses',
    photo: 'square',
    items: [
      ['VA home loan', 'There is no service-time test if you receive or are eligible for DIC. COE: VA Form 26-1817 if you receive DIC; otherwise VA Form 21P-534EZ, your marriage license and the death certificate. No funding fee if you receive DIC.'],
      ['Help at Fort Drum', 'Survivor Outreach Services, Clark Hall, (315) 772-6357.'],
      ['Property taxes', 'An unremarried surviving spouse can keep the veterans exemption where the town offers it. File RP-458-a with the assessor by March 1 in most towns.'],
      ['Benefits help', 'Your county veterans agency helps for free: Jefferson, (315) 785-3086. The Lifetime Liberty Pass covers Gold Star spouses.'],
    ],
  },
};

const SHARED = [
  {
    title: 'Your VA loan, step by step',
    photo: 'maple',
    items: [
      ['1. Get your Certificate of Eligibility (COE)', 'Your lender can request it online, or you can at va.gov. Veterans use a DD214; active duty use a statement of service signed by your command.'],
      ['2. Get pre-approved', 'The VA sets no minimum credit score (lenders set their own). The VA\'s guideline is monthly debts at 41% of income or less. BAH and BAS count as income. VA also checks what\'s left each month: in the Northeast, a family of four with a loan of $80,000 or more needs $1,025.'],
      ['3. Know the funding fee', 'First VA loan with less than 5% down: 2.15% (3.3% if you\'ve used one before). 5% down: 1.5%. 10% down: 1.25%. No fee if you get VA disability pay (or qualify for it but take retirement or active-duty pay instead), are rated before closing, receive DIC, or are active duty with a Purple Heart.'],
      ['4. Loan limits', 'With your full entitlement, the VA sets no limit. If part of it is still tied up in an earlier VA loan, the 2026 county limit here is $832,750.'],
      ['5. Costs', 'No down payment and no mortgage insurance with full entitlement, if the price isn\'t above the appraised value. The lender\'s own charge is capped at 1%. The seller can pay up to 4% in concessions. New York mortgage recording tax is $0.75 per $100 in Jefferson and St. Lawrence counties, $1.00 in Lewis. Closings use attorneys.'],
      ['6. Older and rural homes', 'A well must be tested by a third party, not you; results are good for 90 days. Peeling paint on a home built before 1978 has to be fixed. Heat must be permanent and keep the house at 50 degrees. A septic check happens only if the appraiser sees a problem. Get your own home inspection: the appraisal isn\'t one.'],
      ['7. Moving in', 'You certify you\'ll live there within 60 days. If you\'re deployed or on active duty, your spouse living there counts.'],
    ],
  },
  {
    title: 'Moving pay you may be owed (active duty)',
    adOnly: true,
    photo: 'square',
    items: [
      ['Moving allowance (DLA): $1,870 to $6,385, one time', 'Depends on rank and dependents. Ask finance; up to 80% can come as an advance.'],
      ['Mileage (MALT): $0.235 a mile', 'For each car you\'re authorized to drive. This rate took effect July 1, 2026.'],
      ['Per diem: $181 a travel day for the service member', '$113 lodging plus $68 meals, the rate from October 1, 2026. Family members 12 and older get 75%; children under 12 get 50%.'],
      ['Temporary lodging (TLE): up to $290 a day', 'Up to 21 days on a move within the U.S. Keep every receipt.'],
      ['Moving a pet: up to $550', 'For one cat or dog on a move within the U.S. Keep the receipts.'],
      ['Child care while you wait: up to $500', 'If no on-post child care opens within 30 days of reporting, a pilot program through September 30, 2027 pays toward a provider\'s travel. Start at MilitaryChildCare.com.'],
    ],
  },
  {
    title: 'Deadlines that cost money',
    items: [
      ['Travel voucher: within 5 working days of arriving', 'Filing it is how you get paid for the trip.', 'ad'],
      ['Damage you find after the movers leave: tell the carrier in writing within 7 days', 'Then report any loss or damage within 180 days of delivery, and file the claim within 12 months (9 months if your shipment was picked up before May 15, 2026).', 'ad'],
      ['Moving some of it yourself (a PPM): turn in paperwork within 45 days', 'You\'ll need certified weight tickets, empty and loaded, and a cost estimate from the transportation office first.', 'ad'],
      ['Property tax exemption: file by March 1 in most towns', 'Form RP-458-a with your town assessor, and again after you buy a new home.'],
    ],
  },
  {
    title: 'Movers will not pack these',
    adOnly: true,
    items: [
      ['Hazardous items', 'Cleaners with bleach or ammonia, paint, gasoline, propane tanks, ammunition, fireworks.'],
      ['Plants, perishable food and open containers', ''],
      ['Keep with you in an essentials bag', 'Medications, important documents and jewelry.'],
    ],
  },
];

// Sections in the order this family sees them: their own path first, then the shared ones.
// A family that said veteran, Guard, Reserve or surviving spouse gets no active-duty-only sections or items.
function sectionsFor(who) {
  const ad = !PATHS[who] || who === 'ad';
  const own = PATHS[who] || PATHS.ad;
  return [own, ...SHARED.filter((s) => ad || !s.adOnly)]
    .map((s) => ({ ...s, items: s.items.filter((it) => ad || it[2] !== 'ad') }))
    .filter((s) => s.items.length);
}

// Every section, for tools/qa-realty-lead.mjs to compare figures against the page.
const SECTIONS = [PATHS.ad, PATHS.vet, PATHS.gr, PATHS.ss, ...SHARED];

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Phone numbers in a step become tap-to-call links: (315) 772-6384, 1-800-444-5445, 877-222-8387,
// an extension (dialed after a pause), 833-MIL-MOVE and the 988 crisis line.
const PHONE = /\((\d{3})\) (\d{3})-(\d{4})(?: ext\. (\d+))?|\b(?:1-)?(\d{3})-(\d{3})-(\d{4})\b|\b833-MIL-MOVE\b|\b988(?=, then press 1)/g;
const telFor = (m, a, b, c, ext, d, f, g) => {
  if (a) return `tel:+1${a}${b}${c}${ext ? `,,${ext}` : ''}`;
  if (d) return `tel:+1${d}${f}${g}`;
  return m === '988' ? 'tel:988' : 'tel:+18336456683';
};

function renderChecklistEmail(firstName, who) {
  const e = escapeHtml;
  const name = (firstName || '').trim();
  const key = WHO[who] ? who : '';
  const subject = 'Your Fort Drum PCS + VA loan checklist';
  const intro = `${name ? `Hi ${name}, here` : 'Here'} is the checklist you asked for on PCSHomes${key ? `, set up for: ${WHO[key]}` : ''}. Keep it in your inbox and tick it off as you go.`;
  const page = 'https://pcshomes.com/fort-drum/pcs-checklist';
  const others = key && key !== 'ad' ? '' : 'Veteran, Guard, Reserve or surviving spouse? Your own steps are on the interactive checklist.';
  const sections = sectionsFor(key);
  const helpPage = 'https://pcshomes.com/get-help';
  const connect = 'When you start looking at homes, tell us what you need and a person from our team will reach out.';

  const text = [
    subject.toUpperCase(),
    '',
    intro,
    '',
    ...sections.flatMap((s) => [
      s.title.toUpperCase(),
      ...s.items.flatMap(([a, b]) => [
        `[ ] ${a}${b ? `${/[.?!]$/.test(a) ? '' : '.'} ${b}` : ''}`,
        ...(LINKS[a] || []).map(([label, url]) => `    ${label}: ${url}`),
      ]),
      '',
    ]),
    CHECKED,
    '',
    `The interactive version saves your progress on your phone: ${page}`,
    ...(others ? [others] : []),
    `${connect} ${helpPage}`,
    'Questions? Text or call (315) 221-4857. A real person answers.',
    '',
    'PCSHomes. Built for service members, by service members. You asked for this checklist on pcshomes.com.',
  ].join('\n');

  const navy = '#14263F', ink = '#1A1F2B', rule = '#D9D2C2', paper = '#FBF7EF', gold = '#D9B45B', goldText = '#8A6520';
  const sans = 'Arial,Helvetica,sans-serif', serif = "Georgia,'Times New Roman',serif";
  // Links match the page's step links: gold text, bold, an arrow, and a tall enough tap target.
  const call = (html) => html.replace(PHONE, (...m) => `<a href="${telFor(...m)}" style="color:${goldText};font-weight:700;white-space:nowrap;">${m[0]}</a>`);
  const go = ([label, url]) => `<a href="${e(url)}" style="display:inline-block;padding:10px 18px 4px 0;color:${goldText};font:700 17px/1.3 ${sans};text-decoration:none;">${e(label)}&nbsp;&rarr;</a>`;
  const photo = (p) => (p ? `
    <p style="margin:30px 0 0;"><img src="${p.src}" width="556" height="${Math.round(556 * p.h / p.w)}" alt="${e(p.alt)}" style="display:block;width:100%;max-width:556px;height:auto;border:0;border-radius:10px;background:${paper};"></p>
    <p style="margin:6px 0 0;font:400 14px/1.4 ${sans};color:#4A5568;">${e(p.credit)}</p>` : '');
  const section = (s) => `${photo(PHOTOS[s.photo])}
    <p style="margin:${s.photo ? 20 : 28}px 0 8px;font:700 21px/1.3 ${serif};color:#1D3557;">${e(s.title)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.items.map(([a, b]) => `
      <tr><td style="width:30px;padding:10px 0;vertical-align:top;border-top:1px solid ${rule};font:400 20px/1.3 ${sans};color:${ink};">&#9744;</td>
      <td style="padding:10px 0;vertical-align:top;border-top:1px solid ${rule};font:700 17px/1.45 ${sans};color:${ink};">${e(a)}${b ? `<br><span style="font-weight:400;">${call(e(b))}</span>` : ''}${LINKS[a] ? `<br>${LINKS[a].map(go).join('')}` : ''}</td></tr>`).join('')}
    </table>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${paper};" bgcolor="${paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${paper}" style="background:${paper};"><tr><td align="center" style="padding:16px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;background:#ffffff;border:1px solid ${rule};border-radius:14px;overflow:hidden;">
  <tr><td bgcolor="${navy}" style="background:${navy};padding:26px 22px 22px;">
    <p style="margin:0 0 8px;font:700 22px/1 ${serif};color:#F6F1E6;">PCS<span style="color:${gold};">Homes</span></p>
    <p style="margin:0;font:700 28px/1.2 ${serif};color:#F6F1E6;">Your Fort Drum PCS <span style="font-style:italic;font-weight:400;color:${gold};">+ VA loan checklist</span></p>
  </td></tr>
  <tr><td style="padding:20px 22px 26px;">
    <p style="margin:0;font:400 18px/1.55 ${sans};color:${ink};">${e(intro)}</p>
    ${sections.map(section).join('')}
    <p style="margin:24px 0 0;font:400 15px/1.55 ${sans};color:#4A5568;">${e(CHECKED)}</p>
    <p style="margin:22px 0 0;"><a href="${page}" style="display:inline-block;padding:16px 22px;border-radius:10px;background:${gold};color:#0E1C30;font:700 17px/1 ${sans};text-decoration:none;">Open the interactive checklist</a></p>
    ${others ? `<p style="margin:14px 0 0;font:400 16px/1.55 ${sans};color:${ink};">${e(others)}</p>` : ''}
    <p style="margin:18px 0 0;font:400 17px/1.55 ${sans};color:${ink};">${e(connect)}</p>
    <p style="margin:10px 0 0;"><a href="${helpPage}" style="display:inline-block;padding:15px 21px;border-radius:10px;background:#ffffff;color:${navy};border:1px solid ${navy};font:700 17px/1 ${sans};text-decoration:none;">Talk to a local agent or lender</a></p>
    <p style="margin:18px 0 0;font:400 17px/1.55 ${sans};color:${ink};">Questions? Text or call <a href="tel:+13152214857" style="color:${goldText};font-weight:700;">(315) 221-4857</a>. A real person answers.</p>
    <p style="margin:24px 0 0;font:400 14px/1.5 ${sans};color:#4A5568;">PCSHomes. Built for service members, by service members. You asked for this checklist on pcshomes.com.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}

module.exports = { renderChecklistEmail, SECTIONS, CHECKED, WHO, LINKS, PHOTOS };
