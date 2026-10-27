// QA for the "A new WC Realty Lead" route: node tools/qa-realty-lead.mjs
// Checks the email builder, the routing filter, the send call, and that every routed form
// asks for both an email and a phone and shows the contact promise the email repeats.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const fn = require(path.join(root, 'netlify/functions/submission-created.js'));

let failed = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed += 1;
};

const sample = {
  'pcshomes-contact': {
    'form-name': 'pcshomes-contact', 'first-name': 'Dana', 'last-name': 'Reyes', email: 'dana@example.com', phone: '315-555-0142',
    'need-type': 'real-estate-agent', area: 'Evans Mills', rank: 'SSG', 'duty-station': 'Fort Bragg', 'pcs-date': 'July 2027',
    budget: '$250,000 - $300,000', message: 'Two dogs.\nNeed a fenced yard.', 'source-page': '/get-help.html', referrer: 'https://facebook.com/', 'utm-source': 'fb',
  },
  'popup-lead': { 'form-name': 'popup-lead', name: 'Sam Ortiz', email: 'sam@example.com', phone: '(315) 555-0100', offer: 'homes', 'source-page': '/' },
  'va-home-list': { 'form-name': 'va-home-list', name: 'Lee Park', email: 'lee@example.com', phone: '13155550111', 'source-page': '/' },
};

for (const [form, data] of Object.entries(sample)) {
  const r = fn.renderLead(form, data, '2026-10-27T18:30:00Z');
  check(r.subject.startsWith('A NEW WC REALTY LEAD | '), `${form}: subject starts with the route name`);
  check(r.html.includes('tel:+1315555') && r.html.includes('sms:+1315555'), `${form}: call and text buttons present`);
  check(r.html.includes('mailto:') && r.text.includes('@example.com'), `${form}: email button and text part present`);
  check(r.html.includes(fn.PROMISE.replace(/&/g, '&amp;')), `${form}: shows what the family was told`);
  check(!/[—–]/.test(r.subject + r.html + r.text), `${form}: no dashes of the banned kind`);
  check(r.text.includes('FIRST CALL: CONFIRM THESE'), `${form}: first-call checklist present`);
}

const hostile = fn.renderLead('popup-lead', { name: '<script>alert(1)</script>', email: 'x@example.com', phone: '12', message: '<img src=x onerror=1>' });
check(!hostile.html.includes('<script>alert') && !hostile.html.includes('<img src=x'), 'hostile input is escaped in the HTML');
check(hostile.html.includes('check this number'), 'a short phone number is flagged');

const none = fn.renderLead('va-home-list', { name: 'No Phone', email: 'bad-address' });
check(none.html.includes('check this address') && !none.html.includes('tel:'), 'bad email flagged, no call button without a phone');

// Routing and sending.
const calls = [];
const stubFetch = async (url, init) => { calls.push({ url, init }); return { ok: true }; };
process.env.RESEND_API_KEY = 'test-key';
const rendered = fn.renderLead('pcshomes-contact', sample['pcshomes-contact'], '2026-10-27T18:30:00Z');
await fn.sendEmail(rendered, 'sub-1', stubFetch);
const body = JSON.parse(calls[0].init.body);
check(calls[0].url === 'https://api.resend.com/emails', 'sends through Resend');
check(body.to[0] === 'aryen@woodconsultingllc.net', 'goes to Aryen by default');
check(body.reply_to === 'dana@example.com', 'reply goes to the family');
check(calls[0].init.headers['Idempotency-Key'].startsWith('pcshomes-realty-lead/'), 'has an idempotency key');

const ignored = await fn.handler({ body: JSON.stringify({ payload: { form_name: 'vendor-application', data: {} } }) });
check(ignored.body === 'not routed', 'other forms are left alone');

delete process.env.RESEND_API_KEY;
const skipped = await fn.sendEmail(rendered, 'sub-2', stubFetch);
check(skipped.skipped && calls.length === 1, 'without the key it skips and does not call Resend');

const bad = await fn.handler({ body: 'not json' });
check(bad.statusCode === 200, 'a bad payload does not throw');

// The forms themselves.
const index = readFileSync(path.join(root, 'index.html'), 'utf8');
const help = readFileSync(path.join(root, 'get-help.html'), 'utf8');
const formBlock = (html, name) => {
  const start = html.indexOf(`name="${name}"`);
  if (start < 0) return '';
  return html.slice(start, html.indexOf('</form>', start));
};
const requiredInput = (block, field, type) =>
  new RegExp(`<input[^>]*type="${type}"[^>]*name="${field}"[^>]*required|<input[^>]*name="${field}"[^>]*type="${type}"[^>]*required|<input[^>]*name="${field}"[^>]*required[^>]*type="${type}"`).test(block);
for (const [name, html] of [['pcshomes-contact', help], ['popup-lead', index], ['va-home-list', index]]) {
  const block = formBlock(html, name);
  check(block.length > 0, `${name}: form found`);
  check(requiredInput(block, 'email', 'email'), `${name}: email is required`);
  check(requiredInput(block, 'phone', 'tel'), `${name}: phone is required`);
  check(/name="source-page"/.test(block) && /name="utm-campaign"/.test(block), `${name}: carries page and UTM fields`);
}
check(index.includes(fn.PROMISE), 'index.html shows the full contact promise');
check(help.includes(fn.PROMISE.slice(fn.PROMISE.indexOf('By sending this'))), 'get-help.html shows the consent and sharing wording');

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
