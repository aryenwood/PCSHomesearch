// Netlify runs this file after every verified form submission (spam is filtered first).
// It turns a family's lead into "A new WC Realty Lead", a detailed hand-off email for the
// person who calls them. Netlify keeps the durable record; this only sends the email.
//
// Required to send: RESEND_API_KEY or PCSHomes_Resend (Netlify site env var; either name works).
// Optional: REALTY_LEAD_MAIL_TO (default aryen@woodconsultingllc.net),
//           REALTY_LEAD_MAIL_FROM (default the WC appointments sender).
// Logs never contain customer details.
const crypto = require('crypto');

const ROUTED_FORMS = new Set(['pcshomes-contact', 'popup-lead', 'va-home-list']);
const DEFAULT_TO = 'aryen@woodconsultingllc.net';
const DEFAULT_FROM = 'Wood Consulting <appointments@updates.woodconsultingllc.net>';
const TIME_ZONE = 'America/New_York';

// Keep in step with the wording on the forms; tools/qa-realty-lead.mjs checks it against the pages.
const PROMISE =
  'A real person calls, texts or emails you within 24 hours. By sending this you agree we may reach you that way about your request '
  + '(message rates may apply; reply STOP to opt out). Your details go only to our team and to an agent you agree to meet.';

const NEED_LABELS = {
  'real-estate-agent': 'Real estate agent',
  'va-lender': 'VA loan guidance',
  'property-inspector': 'Property inspector',
  'home-services': 'Home services',
  general: 'General PCS question',
  'family-support': 'Family support',
  homes: 'Homes',
  lender: 'VA lender',
};

const FORM_LABELS = {
  'pcshomes-contact': 'Get Help form',
  'popup-lead': 'Homepage popup',
  'va-home-list': 'Homepage VA home list form',
};

const env = (key, fallback = '') => process.env[key] || fallback;

const clean = (value, max = 600) =>
  String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const cleanBlock = (value, max = 2000) =>
  String(value == null ? '' : value).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function formatPhone(raw) {
  const digits = clean(raw, 40).replace(/\D/g, '');
  const ten = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
  if (ten.length !== 10) return { display: clean(raw, 40), tel: '', valid: false };
  return { display: `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`, tel: `+1${ten}`, valid: true };
}

const looksLikeEmail = (value) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

function normalize(formName, data, createdAt) {
  const first = clean(data['first-name'], 80);
  const last = clean(data['last-name'], 80);
  const name = clean(data.name, 160) || [first, last].filter(Boolean).join(' ') || 'Name not given';
  const needKey = clean(data['need-type'] || data.offer, 60);
  const phone = formatPhone(data.phone);
  const email = clean(data.email, 200);
  return {
    formName,
    formLabel: FORM_LABELS[formName] || formName,
    name,
    first: first || name.split(' ')[0],
    email,
    emailValid: looksLikeEmail(email),
    phone,
    needKey,
    need: NEED_LABELS[needKey] || (needKey ? needKey : 'Not specified'),
    area: clean(data.area, 120),
    leadSource: clean(data['lead-source'], 120),
    rank: clean(data.rank, 80),
    dutyStation: clean(data['duty-station'], 120),
    pcsDate: clean(data['pcs-date'], 120),
    budget: clean(data.budget, 80),
    message: cleanBlock(data.message),
    sourcePage: clean(data['source-page'], 200),
    referrer: clean(data.referrer, 200),
    utmSource: clean(data['utm-source'], 120),
    utmMedium: clean(data['utm-medium'], 120),
    utmCampaign: clean(data['utm-campaign'], 120),
    createdAt,
  };
}

function formatWhen(iso) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return 'Time not recorded';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date) + ' ET';
}

// Questions the agent should settle on the first call. A known answer is shown, an unknown one is a prompt.
function firstCallPrompts(lead) {
  const known = (v) => (v ? v : '');
  return [
    ['Arrival or report date', known(lead.pcsDate), 'When do orders say they report, and is there any flexibility?'],
    ['Rent or buy', lead.needKey === 'real-estate-agent' || lead.needKey === 'homes' ? 'Asked for an agent' : '', 'Renting first, buying now, or waiting on the on-post list?'],
    ['Budget or BAH', known(lead.budget), 'What monthly payment or price range is comfortable?'],
    ['VA loan status', lead.needKey === 'va-lender' || lead.needKey === 'lender' ? 'Asked about VA loans' : '', 'Not started, prequalified, or preapproved? Lender picked yet?'],
    ['Bedrooms, pets, schools', '', 'How many bedrooms, any pets, school age kids, a commute limit?'],
    ['Preferred towns', known(lead.area), 'Watertown, Evans Mills, Calcium, Black River, Lowville, or somewhere else?'],
    ['Who is moving', [lead.rank, lead.dutyStation].filter(Boolean).join(' at '), 'Service member, spouse, veteran? Coming from where?'],
  ];
}

function renderLead(formName, data, createdAt) {
  const lead = normalize(formName, data, createdAt);
  const when = formatWhen(lead.createdAt);
  const area = lead.area || 'Area not given';
  const subject = `A NEW WC REALTY LEAD | ${lead.need} | ${lead.name} | ${area}`;
  const prompts = firstCallPrompts(lead);

  const phoneLine = lead.phone.display ? lead.phone.display + (lead.phone.valid ? '' : ' (check this number)') : 'Not given';
  const emailLine = lead.email ? lead.email + (lead.emailValid ? '' : ' (check this address)') : 'Not given';
  const origin = [
    lead.sourcePage && `Page: ${lead.sourcePage}`,
    lead.referrer && `Came from: ${lead.referrer}`,
    lead.utmSource && `UTM source: ${lead.utmSource}`,
    lead.utmMedium && `UTM medium: ${lead.utmMedium}`,
    lead.utmCampaign && `UTM campaign: ${lead.utmCampaign}`,
    lead.leadSource && `Lead source: ${lead.leadSource}`,
  ].filter(Boolean);

  const text = [
    'A NEW WC REALTY LEAD',
    `${lead.name} | ${lead.need} | ${when}`,
    '',
    'REACH THEM (call, text and email, in that order)',
    `Phone: ${phoneLine}`,
    `Email: ${emailLine}`,
    '',
    'WHAT THEY ASKED FOR',
    `Need: ${lead.need}`,
    `Form: ${lead.formLabel}`,
    ...(lead.area ? [`Area: ${lead.area}`] : []),
    '',
    'WHAT THEY TOLD US',
    `Rank: ${lead.rank || 'Not given'}`,
    `Current duty station: ${lead.dutyStation || 'Not given'}`,
    `PCS / report date: ${lead.pcsDate || 'Not given'}`,
    `Budget range: ${lead.budget || 'Not given'}`,
    '',
    'THEIR NOTE, IN THEIR WORDS',
    lead.message || 'No note was added.',
    '',
    'FIRST CALL: CONFIRM THESE',
    ...prompts.map(([label, known, ask]) => `- ${label}: ${known || 'Ask'}. ${ask}`),
    '',
    'WHAT WE TOLD THEM',
    PROMISE,
    '',
    'WHERE IT CAME FROM',
    ...(origin.length ? origin : ['No page or campaign details were captured.']),
    '',
    'Everything above is reported by the family. Nothing has been verified.',
  ].join('\n');

  const e = escapeHtml;
  const gold = '#D9B45B';
  const ink = '#0E1C30';
  const cream = '#FBF7EF';
  const rule = '#E4DAC4';
  const muted = '#647080';

  const btn = (href, label, primary) =>
    `<a href="${e(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:13px 20px;border-radius:9px;font:700 16px/1 Arial,Helvetica,sans-serif;text-decoration:none;`
    + (primary ? `background:${gold};color:${ink};` : `background:#ffffff;color:${ink};border:1px solid ${rule};`)
    + `">${e(label)}</a>`;

  const buttons = [
    lead.phone.tel && btn(`tel:${lead.phone.tel}`, `Call ${lead.phone.display}`, true),
    lead.phone.tel && btn(`sms:${lead.phone.tel}`, 'Text', false),
    lead.emailValid && btn(`mailto:${lead.email}?subject=${encodeURIComponent('Your Fort Drum move')}`, 'Email', false),
    lead.area && btn(`https://www.google.com/maps/search/${encodeURIComponent(lead.area + ' NY')}`, 'Open the area', false),
  ].filter(Boolean).join('');

  const row = (label, value, flag) =>
    `<tr><td style="padding:9px 14px 9px 0;width:38%;vertical-align:top;font:700 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${muted};">${e(label)}</td>`
    + `<td style="padding:9px 0;vertical-align:top;font:500 16px/1.5 Arial,Helvetica,sans-serif;color:${flag ? '#A33A2B' : ink};">${value}</td></tr>`;

  const section = (title, body) =>
    `<tr><td style="padding:22px 28px 6px;"><p style="margin:0 0 6px;font:700 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8A6520;">${e(title)}</p>${body}</td></tr>`;

  const table = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${rule};">${rows}</table>`;
  const given = (v) => (v ? e(v) : `<span style="color:${muted};">Not given</span>`);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${cream};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${cream};"><tr><td align="center" style="padding:20px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid ${rule};border-radius:14px;overflow:hidden;">
  <tr><td style="background:${ink};padding:24px 28px;">
    <p style="margin:0 0 6px;font:700 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${gold};">A new WC Realty lead</p>
    <p style="margin:0;font:700 26px/1.2 Georgia,'Times New Roman',serif;color:#ffffff;">${e(lead.name)}</p>
    <p style="margin:6px 0 0;font:500 15px/1.5 Arial,Helvetica,sans-serif;color:#C6CEDB;">${e(lead.need)} &nbsp;|&nbsp; ${e(when)}</p>
  </td></tr>
  <tr><td style="padding:22px 28px 6px;">
    <p style="margin:0 0 12px;font:700 16px/1.5 Arial,Helvetica,sans-serif;color:${ink};">Reach them by phone, text and email. Call first, then text, then email.</p>
    ${buttons}
  </td></tr>
  ${section('Reach them', table(row('Phone', e(phoneLine), !lead.phone.valid) + row('Email', e(emailLine), !lead.emailValid)))}
  ${section('What they asked for', table(row('Need', e(lead.need)) + row('Form', e(lead.formLabel)) + (lead.area ? row('Area', e(lead.area)) : '')))}
  ${section('What they told us', table(row('Rank', given(lead.rank)) + row('Duty station', given(lead.dutyStation)) + row('PCS / report date', given(lead.pcsDate)) + row('Budget range', given(lead.budget))))}
  ${section('Their note, in their words', `<p style="margin:0;padding:12px 14px;border-left:3px solid ${gold};background:${cream};font:500 16px/1.6 Arial,Helvetica,sans-serif;color:${ink};white-space:pre-wrap;">${lead.message ? e(lead.message) : `<span style="color:${muted};">No note was added.</span>`}</p>`)}
  ${section('First call: confirm these', table(prompts.map(([label, known, ask]) => row(label, `${known ? `<b>${e(known)}</b><br>` : '<b style="color:#8A6520;">Ask</b><br>'}<span style="color:${muted};font-size:14px;">${e(ask)}</span>`)).join('')))}
  ${section('What we told them', `<p style="margin:0;font:500 15px/1.6 Arial,Helvetica,sans-serif;color:${ink};">${e(PROMISE)}</p><p style="margin:8px 0 0;font:500 14px/1.5 Arial,Helvetica,sans-serif;color:${muted};">Say nothing different on the call. Introduce an agent only after the family agrees.</p>`)}
  ${section('Where it came from', origin.length ? table(origin.map((line) => { const i = line.indexOf(': '); return row(line.slice(0, i), e(line.slice(i + 2))); }).join('')) : `<p style="margin:0;font:500 15px/1.5 Arial,Helvetica,sans-serif;color:${muted};">No page or campaign details were captured.</p>`)}
  <tr><td style="padding:18px 28px 26px;"><p style="margin:0;font:500 13px/1.5 Arial,Helvetica,sans-serif;color:${muted};">Everything above is reported by the family. Nothing has been verified. Netlify keeps the original submission.</p></td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { lead, subject, html, text };
}

async function sendEmail(rendered, submissionId, fetcher = fetch) {
  const apiKey = env('RESEND_API_KEY') || env('PCSHomes_Resend');
  if (!apiKey) {
    console.warn('submission-created skipped: no Resend key is configured');
    return { skipped: 'no RESEND_API_KEY' };
  }
  const key = crypto.createHash('sha256').update(String(submissionId || rendered.subject)).digest('hex').slice(0, 40);
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `pcshomes-realty-lead/${key}`,
    },
    body: JSON.stringify({
      from: env('REALTY_LEAD_MAIL_FROM', DEFAULT_FROM),
      to: [env('REALTY_LEAD_MAIL_TO', DEFAULT_TO)],
      ...(rendered.lead.emailValid ? { reply_to: rendered.lead.email } : {}),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }),
  });
  if (!response.ok) throw new Error(`Resend delivery failed with status ${response.status}`);
  return { ok: true };
}

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || '{}').payload || {};
    const data = payload.data || {};
    const formName = clean(payload.form_name || data['form-name'], 80);
    if (!ROUTED_FORMS.has(formName)) return { statusCode: 200, body: 'not routed' };
    const rendered = renderLead(formName, data, payload.created_at);
    await sendEmail(rendered, payload.id);
    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.error('submission-created failed:', error && error.message ? error.message : 'unknown');
    // 200 keeps Netlify from retrying a send we cannot fix; the submission is still stored in Netlify.
    return { statusCode: 200, body: 'logged' };
  }
};

exports.renderLead = renderLead;
exports.sendEmail = sendEmail;
exports.PROMISE = PROMISE;
exports.ROUTED_FORMS = ROUTED_FORMS;
