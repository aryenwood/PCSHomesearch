// The free PCS + VA loan checklist a family gets by email when they ask for it on the checklist page.
// Every line comes from pages already checked on the site (fort-drum/pcs-checklist.html and fort-drum/buying.html,
// checked Sep 24, 2026). Change a fact there first, then here; tools/qa-realty-lead.mjs compares key figures.

const CHECKED = 'Checked Sep 24, 2026 against the DoD Joint Travel Regulations, the VA, DFAS, Military OneSource, TRICARE and the Fort Drum housing and reception pages. Rates change: confirm yours with your finance office.';

const SECTIONS = [
  {
    title: 'Your move, stage by stage',
    items: [
      ['120+ days out: orders and research', 'As soon as you have orders, it helps to research Watertown neighborhoods and apply for on-post housing at fortdrummch.com; your place depends on rank, number of dependents and eligibility date. You can start VA loan pre-approval, too.'],
      ['90 days out: housing decisions', 'As you decide buy or rent, it helps to schedule a house-hunting trip or a remote viewing early. Spring and summer slots fill fast.'],
      ['60 days out: prepare for the cold', 'You can order winter gear, plan your household goods shipment, and look at 4WD vehicles. Snow season runs October to April.'],
      ['30 days out: final steps', 'You enroll with TRICARE East (1-800-444-5445) when you arrive. Primary care on post is Guthrie Army Health Clinic; Samaritan Medical Center in Watertown is the local hospital. It also helps to notify the kids\' schools, confirm your closing or lease start, and schedule utilities.'],
      ['Arrival week: in-processing', 'Soldiers report to the 10th Mountain Reception Company, Bldg. 4412, Camp Swift Road, open 24/7, (315) 774-0165. You can enroll the kids in school, and the travel voucher is due within 5 working days.'],
    ],
  },
  {
    title: 'Housing and your VA loan',
    items: [
      ['On-post housing application', 'Mountain Community Homes, Welcome Home Center, (315) 955-6644, fortdrummch.com.'],
      ['Your VA Certificate of Eligibility (COE)', 'The document that shows a lender you qualify. Your lender can request it for you, or you can apply at va.gov.'],
      ['Your BAH for Fort Drum (ZIP 13602)', 'In 2026 an E-5 with dependents gets $1,665 a month. You can check your own rate on the official DoD BAH calculator.'],
      ['VA loan pre-approval', 'It helps to do this before you shop, so you know what you can spend.'],
      ['VA loan basics', 'If your lender approves the loan, the VA does not require a down payment, and there is no private mortgage insurance. The one-time VA funding fee is 2.15% on a first VA loan with less than 5% down; you pay no fee if you receive VA disability compensation.'],
      ['The school district before the house', 'Fort Drum spans four districts. It helps to call the Fort Drum School Liaison at (315) 772-3214 and start enrollment before you arrive.'],
      ['New York veteran property tax exemptions', 'New York has three; you can claim one.'],
      ['Plan for winter', '4WD, the home\'s heating type (natural gas or propane changes your heating bill), and a winter gear budget.'],
    ],
  },
  {
    title: 'Moving pay you may be owed (2026)',
    items: [
      ['Moving allowance (DLA): $1,870 to $6,385, one time', 'Depends on rank and dependents. It is not automatic, so it helps to ask your finance office or request it in the DFAS SmartVoucher app.'],
      ['Mileage (MALT): $0.235 a mile', 'For each car you are authorized to drive. This rate took effect July 1, 2026.'],
      ['Per diem: $178 a travel day for the soldier', '$110 lodging plus $68 meals. Family members 12 and older get 75%; children under 12 get 50%.'],
      ['Temporary lodging (TLE): up to $290 a day', 'Up to 21 days on a move within the U.S. You\'ll want to keep every receipt.'],
      ['Moving a pet: up to $550', 'For one cat or dog on a move within the U.S. Keep the receipts.'],
    ],
  },
  {
    title: 'Deadlines that cost money',
    items: [
      ['Travel voucher: file within 5 working days of arriving', 'Filing it is how you get paid for the trip.'],
      ['Loss or damage: report within 180 days of delivery', 'The claim is due within 12 months of delivery (9 months if your shipment was picked up before May 15, 2026). It helps to note visible damage on the inventory before you sign.'],
      ['If you can, photograph belongings and serial numbers before pack day', 'Those photos are your evidence for a claim.'],
      ['If you\'re moving some of it yourself (a PPM)', 'You\'ll need certified weight tickets, empty and loaded, and a cost estimate from your Transportation Office first.'],
    ],
  },
  {
    title: 'Movers will not pack these',
    items: [
      ['Hazardous items', 'Cleaners with bleach or ammonia, paint, gasoline, propane tanks, ammunition, fireworks.'],
      ['Plants, perishable food and open containers', ''],
      ['Keep with you in an essentials bag', 'Medications, important documents and jewelry.'],
    ],
  },
];

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderChecklistEmail(firstName) {
  const e = escapeHtml;
  const name = (firstName || '').trim();
  const subject = 'Your Fort Drum PCS + VA loan checklist';
  const intro = `${name ? `Hi ${name}, here` : 'Here'} is the checklist you asked for on PCSHomes. Keep it in your inbox and tick it off as you go.`;
  const page = 'https://pcshomes.com/fort-drum/pcs-checklist';

  const text = [
    subject.toUpperCase(),
    '',
    intro,
    '',
    ...SECTIONS.flatMap((s) => [s.title.toUpperCase(), ...s.items.map(([a, b]) => `[ ] ${a}${b ? `. ${b}` : ''}`), '']),
    CHECKED,
    '',
    `The interactive version saves your progress on your phone: ${page}`,
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
    ${SECTIONS.map(section).join('')}
    <p style="margin:24px 0 0;font:400 15px/1.55 ${sans};color:#4A5568;">${e(CHECKED)}</p>
    <p style="margin:22px 0 0;"><a href="${page}" style="display:inline-block;padding:16px 22px;border-radius:10px;background:${gold};color:#0E1C30;font:700 17px/1 ${sans};text-decoration:none;">Open the interactive checklist</a></p>
    <p style="margin:18px 0 0;font:400 17px/1.55 ${sans};color:${ink};">Questions? Text or call <a href="tel:+13152214857" style="color:${goldText};font-weight:700;">(315) 221-4857</a>. A real person answers.</p>
    <p style="margin:24px 0 0;font:400 14px/1.5 ${sans};color:#4A5568;">PCSHomes. Built for service members, by service members. You asked for this checklist on pcshomes.com.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, html, text };
}

module.exports = { renderChecklistEmail, SECTIONS, CHECKED };
