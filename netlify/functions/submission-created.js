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

// Keep in step with the wording on the forms; tools/qa-realty-lead.mjs checks each against its page.
const PROMISE_FULL =
  'By sending, you agree we may call, text and email you about this request. Message rates may apply. Reply STOP to opt out of texts. '
  + 'Your details go only to our team and to an agent you agree to meet.';
const PROMISE_SHORT =
  'We call, text and email within 24 hours. By sending, you agree we may reach you that way. Message rates may apply. Reply STOP to opt out. '
  + 'Your details go only to our team and to an agent you agree to meet.';
const PROMISES = { 'pcshomes-contact': PROMISE_FULL, 'popup-lead': PROMISE_SHORT, 'va-home-list': PROMISE_SHORT };

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
    need: NEED_LABELS[needKey] || needKey || (formName === 'va-home-list' ? 'VA home list' : 'Not specified'),
    area: clean(data.area, 120),
    leadSource: clean(data['lead-source'], 120),
    movingAs: clean(data['moving-as'], 60),
    rentBuy: clean(data['rent-or-buy'], 60),
    bestTime: clean(data['best-time'], 60),
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

function renderLead(formName, data, createdAt) {
  const lead = normalize(formName, data, createdAt);
  const when = formatWhen(lead.createdAt);
  const area = lead.area || 'Area not given';
  const subject = `A NEW WC REALTY LEAD | ${lead.need} | ${lead.name} | ${area}`;
  const promise = PROMISES[formName] || PROMISE_SHORT;

  const phoneLine = lead.phone.display ? lead.phone.display + (lead.phone.valid ? '' : ' (check this number)') : 'Not given';
  const emailLine = lead.email ? lead.email + (lead.emailValid ? '' : ' (check this address)') : 'Not given';

  // What the family gave us, in the order an agent reads it. Blank answers are left out, not shown as "not given".
  const facts = [
    ['Phone', phoneLine],
    ['Email', emailLine],
    ['Best time', lead.bestTime],
    ['Needs', lead.need],
    ['Area', lead.area],
    ['Moving as', lead.movingAs],
    ['Coming from', lead.dutyStation],
    ['Report date', lead.pcsDate],
    ['Rent or buy', lead.rentBuy],
    ['Budget', lead.budget],
  ].filter(([, v]) => v);

  // Only what is still unknown becomes a question for the first call.
  const asks = [];
  if (!lead.pcsDate) asks.push('When do orders say they report?');
  if (!lead.rentBuy) asks.push('Renting, buying, or waiting on the on-post list?');
  if (!lead.budget) asks.push('What monthly payment or price range is comfortable?');
  asks.push('VA loan: not started, prequalified or preapproved? Lender picked?');
  asks.push('Bedrooms, pets, school age kids, commute limit?');
  if (!lead.area) asks.push('Which towns: Watertown, Evans Mills, Calcium, Black River, Lowville?');
  if (!lead.movingAs) asks.push('Service member, spouse or veteran? Coming from where?');

  const origin = [
    lead.sourcePage && `page ${lead.sourcePage}`,
    lead.referrer && `from ${lead.referrer}`,
    (lead.utmSource || lead.utmMedium || lead.utmCampaign) && `ad tags ${[lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ')}`,
    lead.leadSource && `source ${lead.leadSource}`,
  ].filter(Boolean).join(', ');

  const text = [
    'A NEW WC REALTY LEAD',
    `${lead.name} | ${lead.need} | ${when}`,
    '',
    'Call first, then text, then email.',
    '',
    ...facts.map(([k, v]) => `${k}: ${v}`),
    '',
    'THEIR NOTE',
    lead.message || 'No note was added.',
    '',
    'ASK ON THE FIRST CALL',
    ...asks.map((q) => `[ ] ${q}`),
    '',
    'WHAT WE TOLD THEM',
    promise,
    'Say nothing different on the call. Introduce an agent only after the family agrees.',
    '',
    origin ? `Where it came from: ${origin}` : 'No page or campaign details were captured.',
    'Everything above is reported by the family. Nothing has been verified.',
  ].join('\n');

  // Plain and large on purpose: 17px dark text on white, one column, navy header with the call button.
  // Solid colors only so mail apps that recolor for dark mode stay readable.
  const e = escapeHtml;
  const gold = '#D9B45B', navy = '#14263F', deep = '#0E1C30', ink = '#1A1F2B', rule = '#D9D2C2', paper = '#FBF7EF';
  const sans = 'Arial,Helvetica,sans-serif';
  const button = (href, label, primary) =>
    `<a href="${e(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:16px 22px;border-radius:10px;font:700 18px/1 ${sans};text-decoration:none;`
    + (primary ? `background:${gold};color:${deep};border:1px solid ${gold};` : `background:${navy};color:#ffffff;border:1px solid #9FB0C8;`)
    + `">${e(label)}</a>`;
  const buttons = [
    lead.phone.tel && button(`tel:${lead.phone.tel}`, `Call ${lead.phone.display}`, true),
    lead.phone.tel && button(`sms:${lead.phone.tel}`, 'Text', false),
    lead.emailValid && button(`mailto:${lead.email}?subject=${encodeURIComponent('Your Fort Drum move')}`, 'Email', false),
  ].filter(Boolean).join('');
  const heading = (t) => `<p style="margin:26px 0 8px;font:700 20px/1.3 ${sans};color:${ink};">${e(t)}</p>`;
  const badValue = (k) => (k === 'Phone' && !lead.phone.valid) || (k === 'Email' && !lead.emailValid);
  const rows = facts.map(([k, v]) =>
    `<tr><td style="padding:9px 14px 9px 0;width:32%;vertical-align:top;border-top:1px solid ${rule};font:700 17px/1.45 ${sans};color:${ink};">${e(k)}</td>`
    + `<td style="padding:9px 0;vertical-align:top;border-top:1px solid ${rule};font:400 18px/1.45 ${sans};color:${badValue(k) ? '#B3261E' : ink};">${e(v)}</td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${paper};" bgcolor="${paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${paper}" style="background:${paper};"><tr><td align="center" style="padding:16px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;background:#ffffff;border:1px solid ${rule};border-radius:14px;overflow:hidden;">
  <tr><td bgcolor="${navy}" style="background:${navy};padding:24px 22px 16px;">
    <p style="margin:0 0 8px;font:700 14px/1.4 ${sans};letter-spacing:.1em;text-transform:uppercase;color:${gold};">A new WC Realty lead</p>
    <p style="margin:0;font:700 30px/1.2 Georgia,'Times New Roman',serif;color:#ffffff;">${e(lead.name)}</p>
    <p style="margin:6px 0 18px;font:400 18px/1.4 ${sans};color:#E6EBF3;">${e(lead.need)}${lead.area ? ` in ${e(lead.area)}` : ''}<br>${e(when)}</p>
    ${buttons}
    <p style="margin:2px 0 0;font:400 16px/1.5 ${sans};color:#E6EBF3;">Call first, then text, then email.</p>
  </td></tr>
  <tr><td style="padding:6px 22px 24px;">
    ${heading('About them')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    ${heading('Their note')}
    <p style="margin:0;padding:12px 14px;background:${paper};border:1px solid ${rule};border-radius:8px;font:400 18px/1.55 ${sans};color:${ink};white-space:pre-wrap;">${lead.message ? e(lead.message) : 'No note was added.'}</p>
    ${heading('Ask on the first call')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${asks.map((q) => `<tr><td style="width:30px;padding:6px 0;vertical-align:top;font:400 20px/1.35 ${sans};color:${ink};">&#9744;</td><td style="padding:6px 0;font:400 18px/1.45 ${sans};color:${ink};">${e(q)}</td></tr>`).join('')}</table>
    ${heading('What we told them')}
    <p style="margin:0;font:400 16px/1.55 ${sans};color:${ink};">${e(promise)}</p>
    <p style="margin:8px 0 0;font:700 16px/1.5 ${sans};color:${ink};">Say nothing different on the call. Introduce an agent only after the family agrees.</p>
    <p style="margin:24px 0 0;font:400 14px/1.5 ${sans};color:#4A5568;">${origin ? `Where it came from: ${e(origin)}. ` : ''}Everything above is reported by the family and has not been verified.</p>
  </td></tr>
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
exports.PROMISES = PROMISES;
exports.PROMISE_FULL = PROMISE_FULL;
exports.PROMISE_SHORT = PROMISE_SHORT;
exports.ROUTED_FORMS = ROUTED_FORMS;
