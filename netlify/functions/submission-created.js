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

// Questions the agent should settle on the first call. A known answer is shown, an unknown one is a prompt.
function firstCallPrompts(lead) {
  return [
    ['Arrival or report date', lead.pcsDate, 'When do orders say they report, and is there any flexibility?'],
    ['Rent or buy', lead.rentBuy || (lead.needKey === 'real-estate-agent' || lead.needKey === 'homes' ? 'Asked for an agent' : ''), 'Renting first, buying now, or waiting on the on-post list?'],
    ['Budget or BAH', lead.budget, 'What monthly payment or price range is comfortable?'],
    ['VA loan status', lead.needKey === 'va-lender' || lead.needKey === 'lender' ? 'Asked about VA loans' : '', 'Not started, prequalified, or preapproved? Lender picked yet?'],
    ['Bedrooms, pets, schools', '', 'How many bedrooms, any pets, school age kids, a commute limit?'],
    ['Preferred towns', lead.area, 'Watertown, Evans Mills, Calcium, Black River, Lowville, or somewhere else?'],
    ['Who is moving', [lead.movingAs, lead.dutyStation && `from ${lead.dutyStation}`].filter(Boolean).join(' '), 'Service member, spouse, veteran? Coming from where?'],
  ];
}

function renderLead(formName, data, createdAt) {
  const lead = normalize(formName, data, createdAt);
  const when = formatWhen(lead.createdAt);
  const area = lead.area || 'Area not given';
  const subject = `A NEW WC REALTY LEAD | ${lead.need} | ${lead.name} | ${area}`;
  const prompts = firstCallPrompts(lead);
  const promise = PROMISES[formName] || PROMISE_SHORT;

  const phoneLine = lead.phone.display ? lead.phone.display + (lead.phone.valid ? '' : ' (check this number)') : 'Not given';
  const emailLine = lead.email ? lead.email + (lead.emailValid ? '' : ' (check this address)') : 'Not given';
  const origin = [
    lead.sourcePage && ['Page', lead.sourcePage],
    lead.referrer && ['Came from', lead.referrer],
    lead.utmSource && ['UTM source', lead.utmSource],
    lead.utmMedium && ['UTM medium', lead.utmMedium],
    lead.utmCampaign && ['UTM campaign', lead.utmCampaign],
    lead.leadSource && ['Lead source', lead.leadSource],
  ].filter(Boolean);
  const picks = [['Moving as', lead.movingAs], ['Rent or buy', lead.rentBuy], ['Best time', lead.bestTime], ['Budget', lead.budget], ['Report date', lead.pcsDate], ['Coming from', lead.dutyStation]]
    .filter(([, v]) => v);

  const text = [
    'A NEW WC REALTY LEAD',
    `${lead.name} | ${lead.need} | ${when}`,
    '',
    'REACH THEM: call, then text, then email',
    `Phone: ${phoneLine}`,
    `Email: ${emailLine}`,
    ...(lead.bestTime ? [`Best time: ${lead.bestTime}`] : []),
    '',
    'WHAT THEY ASKED FOR',
    `Need: ${lead.need}`,
    `Form: ${lead.formLabel}`,
    ...(lead.area ? [`Area: ${lead.area}`] : []),
    '',
    'WHAT THEY TOLD US',
    ...(picks.length ? picks.map(([k, v]) => `${k}: ${v}`) : ['Nothing beyond contact details.']),
    '',
    'THEIR NOTE, IN THEIR WORDS',
    lead.message || 'No note was added.',
    '',
    'FIRST CALL: CONFIRM THESE',
    ...prompts.map(([label, known, ask], i) => `${i + 1}. ${label}: ${known || 'Ask'}. ${ask}`),
    '',
    'WHAT WE TOLD THEM',
    promise,
    '',
    'WHERE IT CAME FROM',
    ...(origin.length ? origin.map(([k, v]) => `${k}: ${v}`) : ['No page or campaign details were captured.']),
    '',
    'Everything above is reported by the family. Nothing has been verified.',
  ].join('\n');

  // Design language follows the PCSHomes site: navy plate, serif headline with a gold italic phrase,
  // cream page, gold primary action, numbered rows for a real sequence. Solid colors only, so mail apps
  // that recolor for dark mode keep the text readable. Georgia and Arial are the email-safe stand-ins
  // for Libre Baskerville and DM Sans.
  const e = escapeHtml;
  const gold = '#D9B45B', goldInk = '#8A6520', navy = '#14263F', deep = '#0E1C30', paper = '#FBF7EF',
    rule = '#E4DAC4', ink = '#2B3547', muted = '#647080', steel = '#46688A', plateSub = '#C6CEDB';
  const serif = "Georgia,'Times New Roman',serif";
  const sans = 'Arial,Helvetica,sans-serif';

  const button = (href, label, primary) =>
    `<a href="${e(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:16px 24px;border-radius:10px;font:700 17px/1 ${sans};text-decoration:none;`
    + (primary ? `background:${gold};color:${deep};border:1px solid ${gold};` : `background:${navy};color:#F6F1E6;border:1px solid #8E9BB0;`)
    + `">${e(label)}</a>`;
  const buttons = [
    lead.phone.tel && button(`tel:${lead.phone.tel}`, `Call ${lead.phone.display}`, true),
    lead.phone.tel && button(`sms:${lead.phone.tel}`, 'Text', false),
    lead.emailValid && button(`mailto:${lead.email}?subject=${encodeURIComponent('Your Fort Drum move')}`, 'Email', false),
  ].filter(Boolean).join('');

  const chip = (label, value) =>
    `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 14px;border:1px solid ${rule};border-radius:10px;background:#ffffff;font:500 15px/1.3 ${sans};color:${ink};">`
    + `<span style="font:700 12px/1.3 ${sans};letter-spacing:.08em;text-transform:uppercase;color:${muted};">${e(label)}</span><br>${e(value)}</span>`;

  const h2 = (title) => `<p style="margin:0 0 12px;font:700 22px/1.3 ${serif};color:#1D3557;">${e(title)}</p>`;
  const block = (inner) => `<tr><td style="padding:26px 28px 4px;">${inner}</td></tr>`;
  const kv = (label, value, warn) =>
    `<tr><td style="padding:10px 14px 10px 0;width:34%;vertical-align:top;border-top:1px solid ${rule};font:700 12px/1.4 ${sans};letter-spacing:.08em;text-transform:uppercase;color:${muted};">${e(label)}</td>`
    + `<td style="padding:10px 0;vertical-align:top;border-top:1px solid ${rule};font:500 16px/1.5 ${sans};color:${warn ? '#A33A2B' : ink};">${value}</td></tr>`;
  const kvTable = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;

  const askBadge = `<span style="display:inline-block;padding:3px 10px;border-radius:6px;background:${gold};color:${deep};font:700 13px/1.3 ${sans};">Ask</span>`;
  const stepRows = prompts.map(([label, known, ask], i) =>
    `<tr><td style="width:40px;padding:14px 0;vertical-align:top;border-top:${i ? '1' : '2'}px solid ${i ? rule : '#1D3557'};font:italic 400 24px/1.2 ${serif};color:${steel};">${i + 1}</td>`
    + `<td style="padding:14px 0;vertical-align:top;border-top:${i ? '1' : '2'}px solid ${i ? rule : '#1D3557'};">`
    + `<p style="margin:0;font:700 16px/1.4 ${sans};color:${ink};">${e(label)} &nbsp;${known ? `<span style="font-weight:500;">${e(known)}</span>` : askBadge}</p>`
    + `<p style="margin:3px 0 0;font:400 15px/1.5 ${sans};color:${muted};">${e(ask)}</p></td></tr>`).join('');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:${paper};" bgcolor="${paper}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${paper}" style="background:${paper};"><tr><td align="center" style="padding:20px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:640px;background:#ffffff;border:1px solid ${rule};border-radius:16px;overflow:hidden;">
  <tr><td bgcolor="${navy}" style="background:${navy};padding:30px 28px 24px;">
    <p style="margin:0 0 10px;font:700 13px/1.4 ${sans};letter-spacing:.12em;text-transform:uppercase;color:${gold};">A new WC Realty lead &nbsp;|&nbsp; ${e(when)}</p>
    <p style="margin:0;font:700 32px/1.2 ${serif};color:#F6F1E6;">${e(lead.name)}</p>
    <p style="margin:8px 0 22px;font:italic 400 20px/1.4 ${serif};color:${gold};">${e(lead.need)}${lead.area ? ` in ${e(lead.area)}` : ''}</p>
    ${buttons}
    <p style="margin:6px 0 0;font:500 15px/1.5 ${sans};color:${plateSub};">Call first, then text, then email.${lead.bestTime ? ` Best time to reach them: <b style="color:#F6F1E6;">${e(lead.bestTime)}</b>.` : ''}</p>
  </td></tr>
  ${block(h2('Reach them') + kvTable(kv('Phone', e(phoneLine), !lead.phone.valid) + kv('Email', e(emailLine), !lead.emailValid)))}
  ${picks.length ? block(h2('What they told us') + `<div>${picks.map(([k, v]) => chip(k, v)).join('')}</div>`) : ''}
  ${block(h2('Their note, in their words') + `<p style="margin:0;padding:14px 16px;border-radius:10px;background:${paper};border:1px solid ${rule};font:500 16px/1.6 ${sans};color:${ink};white-space:pre-wrap;">${lead.message ? e(lead.message) : `<span style="color:${muted};">No note was added.</span>`}</p>`)}
  ${block(h2('First call: confirm these') + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stepRows}</table>`)}
  <tr><td style="padding:26px 28px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="${navy}" style="background:${navy};border-radius:12px;padding:20px 22px;">
    <p style="margin:0 0 6px;font:700 19px/1.3 ${serif};color:#F6F1E6;">What we told them</p>
    <p style="margin:0;font:400 15px/1.6 ${sans};color:${plateSub};">${e(promise)}</p>
    <p style="margin:10px 0 0;font:700 15px/1.5 ${sans};color:${gold};">Say nothing different on the call. Introduce an agent only after the family agrees.</p>
  </td></tr></table></td></tr>
  ${block(h2('Where it came from') + (origin.length ? kvTable(origin.map(([k, v]) => kv(k, e(v))).join('')) : `<p style="margin:0;font:400 15px/1.5 ${sans};color:${muted};">No page or campaign details were captured.</p>`))}
  <tr><td style="padding:22px 28px 28px;"><p style="margin:0;font:400 13px/1.5 ${sans};color:${muted};">Everything above is reported by the family. Nothing has been verified. Netlify keeps the original submission.</p></td></tr>
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
