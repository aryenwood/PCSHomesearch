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
    'need-type': 'real-estate-agent', area: 'Evans Mills', 'rent-or-buy': 'Rent', 'best-time': 'Evening', 'va-loan': 'Yes', preapproved: 'Yes', 'preapproved-amount': '$285,000', bedrooms: '3', pets: 'Dog', 'school-age-kids': 'Yes', 'preferred-town': 'Evans Mills', 'need-by': 'August 2027', 'duty-station': 'Fort Bragg', 'pcs-date': 'July 2027',
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
  check(r.html.includes(fn.PROMISES[form]) && r.text.includes(fn.PROMISES[form]), `${form}: shows exactly what the family was told`);
  check(!/[—–]/.test(r.subject + r.html + r.text), `${form}: no dashes of the banned kind`);
  check(form === 'pcshomes-contact' ? !r.text.includes('ASK ON THE FIRST CALL') && !r.html.includes('Ask on the first call') : r.text.includes('ASK ON THE FIRST CALL'), `${form}: first-call questions only when something is unanswered`);
  check(!r.text.includes('Moving as') && !r.html.includes('Moving as'), `${form}: no moving-as field`);
  check(form !== 'pcshomes-contact' || (r.text.includes('Best time: Evening') && r.text.includes('Rent or buy: Rent') && !r.text.includes('[ ] Report date?') && !r.text.includes('[ ] Renting or buying?') && !r.text.includes('[ ] Using a VA loan?')), `${form}: new optional answers appear when given`);
}

// Loan answers are shown exactly as given, and nothing is inferred from the need they picked.
const loan = fn.renderLead('pcshomes-contact', sample['pcshomes-contact'], '2026-10-27T18:30:00Z');
check(loan.text.includes('VA loan: Yes') && loan.text.includes('Preapproved: Yes, for $285,000'), 'VA loan and preapproval are shown exactly as answered');
check(loan.text.includes('Bedrooms: 3') && loan.text.includes('Pets: Dog') && loan.text.includes('School age kids: Yes') && loan.text.includes('Need a place by: August 2027'), 'bedrooms, pets, kids and need-by date are shown');
const inferred = fn.renderLead('pcshomes-contact', { 'first-name': 'Lee', email: 'lee@example.com', phone: '3155550111', 'need-type': 'va-lender' });
check(!inferred.text.includes('VA loan:') && inferred.text.includes('[ ] Using a VA loan?'), 'asking about VA loan help does not mark them as using a VA loan');
check(inferred.text.includes('[ ] Preapproved? For how much?'), 'an unanswered preapproval becomes a question');
const noAmount = fn.renderLead('pcshomes-contact', { 'first-name': 'Lee', email: 'lee@example.com', phone: '3155550111', preapproved: 'Yes' });
check(noAmount.text.includes('Preapproved: Yes, amount not given') && noAmount.text.includes('[ ] Preapproved for how much?'), 'preapproved without an amount is flagged and asked');
// Homes they like.
const homes = fn.renderLead('pcshomes-contact', { ...sample['pcshomes-contact'], 'home-1-link': 'https://www.zillow.com/homedetails/123-Main-St-Evans-Mills-NY/1_zpid/', 'home-1-note': 'fenced yard', 'home-2-link': '45 County Route 59, Evans Mills', 'home-3-link': 'javascript:alert(1)', 'home-4-link': 'www.redfin.com/NY/Watertown/home/1' }, '2026-10-27T18:30:00Z');
check(homes.html.includes('Zillow: open the listing') && homes.text.includes('Zillow: https://www.zillow.com/homedetails'), 'a Zillow link is labeled and clickable');
check(homes.html.includes('Open on a map') && homes.text.includes('45 County Route 59'), 'an address becomes a map link');
check(!homes.html.includes('href="javascript:'), 'a javascript: link is never clickable');
check(homes.html.includes('Redfin: open the listing') && homes.text.includes('4. Redfin: https://www.redfin.com/'), 'a www link without https is fixed and labeled');
check(homes.text.includes('(fenced yard)'), 'the note about a home is kept');
check(!fn.renderLead('va-home-list', sample['va-home-list']).text.includes('HOMES THEY LIKE'), 'no homes section when none were given');
const hostile = fn.renderLead('popup-lead', { name: '<script>alert(1)</script>', email: 'x@example.com', phone: '12', message: '<img src=x onerror=1>' });
check(!hostile.html.includes('<script>alert') && !hostile.html.includes('<img src=x'), 'hostile input is escaped in the HTML');
check(hostile.html.includes('check this number'), 'a short phone number is flagged');

check(fn.renderLead('va-home-list', sample['va-home-list']).subject.includes('| VA home list |'), 'the VA home list form is labeled in the subject');
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
process.env.PCSHomes_Resend = 'alt-name-key';
await fn.sendEmail(rendered, 'sub-alt', stubFetch);
check(calls.length === 2 && calls[1].init.headers.Authorization === 'Bearer alt-name-key', 'the PCSHomes_Resend variable name also works');
delete process.env.PCSHomes_Resend;
const skipped = await fn.sendEmail(rendered, 'sub-2', stubFetch);
check(skipped.skipped && calls.length === 2, 'without the key it skips and does not call Resend');

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
for (const [name, html] of [['pcshomes-contact', help], ['va-home-list', index]]) {
  const block = formBlock(html, name);
  check(block.length > 0, `${name}: form found`);
  check(requiredInput(block, 'email', 'email'), `${name}: email is required`);
  check(requiredInput(block, 'phone', 'tel'), `${name}: phone is required`);
  check(/name="source-page"/.test(block) && /name="utm-campaign"/.test(block), `${name}: carries page and UTM fields`);
}
const plain = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
check(plain(index).includes(fn.PROMISE_SHORT.replace(/ Questions now.*/, '')), 'index.html shows the short contact promise the email repeats');
check(plain(help).includes(fn.PROMISE_FULL), 'get-help.html shows the full contact promise the email repeats');

// Guide-page bands: phone and email both required, and Netlify knows every field they send.
for (const page of ['fort-drum/pcs-checklist.html', 'fort-drum/buying.html', 'fort-drum/housing.html', 'fort-drum/winter.html', 'fort-drum/schools.html', 'pcshomes-fortdrum.html']) {
  const html = readFileSync(path.join(root, page), 'utf8');
  check(/type="tel" name="phone"[^>]*required/.test(html) && /type="email" name="email"[^>]*required/.test(html) && !/name="contact"/.test(html), `${page}: band asks for phone and email`);
  const sent = [...html.matchAll(/data\.append\('([a-z-]+)'/g)].map((m) => m[1]).filter((n) => n !== 'form-name');
  const reg = formBlock(index, 'popup-lead');
  check(sent.length > 0 && sent.every((n) => reg.includes(`name="${n}"`)), `${page}: every field it sends is registered on index.html`);
  check(plain(html).includes(fn.PROMISE_SHORT), `${page}: shows the short promise the email repeats`);
}
check(fn.renderLead('popup-lead', { name: 'A', email: 'a@example.com', phone: '3155550100', offer: 'housing' }).subject.includes('Talk to a person (Housing guide)'), 'a guide-page lead says which page it came from');

// Checklist tripwire: the family's email, the page form, and that every key figure matches the pages it came from.
const { renderChecklistEmail } = require(path.join(root, 'netlify/functions/_lib/checklist.js'));
const mail = renderChecklistEmail('Dana');
check(mail.subject === 'Your Fort Drum PCS + VA loan checklist' && mail.text.startsWith('YOUR FORT DRUM PCS'), 'checklist email has its subject and text version');
check(mail.html.includes('Hi Dana') && !/[\u2014\u2013]/.test(mail.html + mail.text), 'checklist email greets by name, no banned dashes');
const checklistPage = readFileSync(path.join(root, 'fort-drum/pcs-checklist.html'), 'utf8');
const buyingPage = readFileSync(path.join(root, 'fort-drum/buying.html'), 'utf8');
const sources = plain(checklistPage + buyingPage + index);
for (const fig of ['$1,870', '$6,385', '$0.235', '$178', '$110', '$68', '$290', '$550', '5 working days', '180 days', '12 months', 'May 15, 2026', '(315) 955-6644', '(315) 774-0165', '(315) 772-3214', '1-800-444-5445', '2.15%', '$1,665', 'Bldg. 4412']) {
  check(mail.text.includes(fig) && sources.includes(fig), `checklist figure ${fig} appears in the email and on the site`);
}
const twBlock = formBlock(checklistPage, 'pcs-checklist');
check(/type="email"[^>]*required/.test(twBlock) && /type="tel"[^>]*required/.test(twBlock) && /name="first-name"[^>]*required/.test(twBlock), 'checklist form requires first name, email and phone');
check(/name="va-loan"/.test(twBlock) && /name="source-page"/.test(twBlock), 'checklist form carries the VA answer and the page');
check(plain(checklistPage).includes(fn.PROMISES['pcs-checklist']), 'checklist page shows the promise the lead email repeats');
const twLead = fn.renderLead('pcs-checklist', { 'first-name': 'Dana', email: 'dana@example.com', phone: '3155550142', 'va-loan': 'Yes' });
check(twLead.subject.includes('| PCS + VA loan checklist |') && twLead.text.includes('VA loan: Yes'), 'team lead email names the checklist and the VA answer');
const famCalls = [];
process.env.RESEND_API_KEY = 'test-key';
await fn.sendChecklist(twLead.lead, 'sub-tw', async (url, init) => { famCalls.push(JSON.parse(init.body)); return { ok: true }; });
check(famCalls.length === 1 && famCalls[0].to[0] === 'dana@example.com' && famCalls[0].reply_to === 'aryen@woodconsultingllc.net' && famCalls[0].subject === mail.subject, 'family gets the checklist; replies come to our team');
const noMail = await fn.sendChecklist(fn.renderLead('pcs-checklist', { 'first-name': 'X', email: 'bad', phone: '3155550142' }).lead, 'sub-x', async () => { throw new Error('should not send'); });
check(noMail.skipped, 'no checklist is sent to an invalid address');
delete process.env.RESEND_API_KEY;

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
