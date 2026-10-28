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

const PATHS = {
  ad: {
    title: 'Your move, step by step (active duty, any branch)',
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

function renderChecklistEmail(firstName, who) {
  const e = escapeHtml;
  const name = (firstName || '').trim();
  const key = WHO[who] ? who : '';
  const subject = 'Your Fort Drum PCS + VA loan checklist';
  const intro = `${name ? `Hi ${name}, here` : 'Here'} is the checklist you asked for on PCSHomes${key ? `, set up for: ${WHO[key]}` : ''}. Keep it in your inbox and tick it off as you go.`;
  const page = 'https://pcshomes.com/fort-drum/pcs-checklist';
  const others = key && key !== 'ad' ? '' : 'Veteran, Guard, Reserve or surviving spouse? Your own steps are on the interactive checklist.';
  const sections = sectionsFor(key);

  const text = [
    subject.toUpperCase(),
    '',
    intro,
    '',
    ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.items.map(([a, b]) => `[ ] ${a}${b ? `${/[.?!]$/.test(a) ? '' : '.'} ${b}` : ''}`), '']),
    CHECKED,
    '',
    `The interactive version saves your progress on your phone: ${page}`,
    ...(others ? [others] : []),
    'Questions? Text or call (315) 221-4857. A real person answers.',
    '',
    'PCSHomes. Built for service members, by service members. You asked for this checklist on pcshomes.com.',
  ].join('\n');

  const navy = '#14263F', ink = '#1A1F2B', rule = '#D9D2C2', paper = '#FBF7EF', gold = '#D9B45B', goldText = '#8A6520';
  const sans = 'Arial,Helvetica,sans-serif', serif = "Georgia,'Times New Roman',serif";
  const section = (s) => `
    <p style="margin:28px 0 8px;font:700 21px/1.3 ${serif};color:#1D3557;">${e(s.title)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.items.map(([a, b]) => `
      <tr><td style="width:30px;padding:10px 0;vertical-align:top;border-top:1px solid ${rule};font:400 20px/1.3 ${sans};color:${ink};">&#9744;</td>
      <td style="padding:10px 0;vertical-align:top;border-top:1px solid ${rule};font:700 17px/1.45 ${sans};color:${ink};">${e(a)}${b ? `<br><span style="font-weight:400;">${e(b)}</span>` : ''}</td></tr>`).join('')}
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
    <p style="margin:18px 0 0;font:400 17px/1.55 ${sans};color:${ink};">Questions? Text or call <a href="tel:+13152214857" style="color:${goldText};font-weight:700;">(315) 221-4857</a>. A real person answers.</p>
    <p style="margin:24px 0 0;font:400 14px/1.5 ${sans};color:#4A5568;">PCSHomes. Built for service members, by service members. You asked for this checklist on pcshomes.com.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}

module.exports = { renderChecklistEmail, SECTIONS, CHECKED, WHO };
