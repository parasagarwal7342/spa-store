// End-to-end check of the shop, admin and social automation.
// Needs: server on BASE (default http://localhost:3100) started with the test env, and tests/mock-services.mjs running.
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.BASE || 'http://localhost:3100';
const SHOTS = process.env.SHOTS || '.';
const CALLS = process.env.CALLS || 'calls.json';
const results = [];
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message.slice(0, 60)}`));
page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errors.push(m.text()); });

async function step(name, fn) {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); await page.screenshot({ path: `${SHOTS}/fail-${name.replace(/\W+/g, '_')}.png`, fullPage: true }).catch(() => {}); }
}
const calls = () => { try { return JSON.parse(readFileSync(CALLS, 'utf8')); } catch { return []; } };
const signMeta = (body) => 'sha256=' + createHmac('sha256', 'appsecret').update(body).digest('hex');

let orderUrl;
await step('home shows products and deals', async () => {
  await page.goto(BASE);
  await page.getByRole('heading', { name: 'Popular right now' }).waitFor();
  await page.getByRole('heading', { name: 'Biggest savings today' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/1-home.png` });
});
await step('search from header', async () => {
  await page.getByLabel('Search products').first().fill('sling');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/shop\?q=sling/);
  const txt = await page.getByText(/\d+ products?/).first().textContent();
  if (!/^[1-9]/.test(txt)) throw new Error(txt);
});
await step('brand + category filter', async () => {
  await page.goto(`${BASE}/shop?brand=shraddha`);
  await page.getByRole('heading', { level: 1, name: 'Shraddha' }).waitFor();
  await page.screenshot({ path: `${SHOTS}/2-shop.png` });
});
await step('product page, add 2 to cart', async () => {
  await page.goto(`${BASE}/shop?q=N20902.06`);
  await page.locator('article a[href^="/p/"]').first().click();
  await page.waitForURL(/\/p\//);
  await page.getByRole('heading', { level: 1 }).waitFor();
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  if (!ld.some((t) => t.includes('"@type":"Product"'))) throw new Error('no product JSON-LD');
  await page.getByLabel('Increase quantity').click();
  await page.getByRole('button', { name: /Add to cart/ }).click();
  await page.getByLabel('Cart with 2 items').waitFor();
  await page.screenshot({ path: `${SHOTS}/3-product.png` });
});
await step('guest COD checkout (Delhi = free delivery)', async () => {
  await page.goto(`${BASE}/cart`);
  await page.getByLabel('Full name').fill('Priya Sharma');
  await page.getByLabel('Mobile number').fill('98111 22233');
  await page.getByLabel(/Email/).fill('Priya@Example.com');
  await page.getByLabel(/Address/).fill('Flat 12, Green Park Extension');
  await page.getByLabel('PIN code').fill('110016');
  await page.getByLabel('City').fill('New Delhi');
  await page.getByLabel('State').selectOption('Delhi');
  await page.getByText('Free', { exact: true }).waitFor();
  await page.getByLabel('Cash on Delivery').check().catch(() => {});
  await page.screenshot({ path: `${SHOTS}/4-checkout.png`, fullPage: true });
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.waitForURL(/\/order\/SPA-/);
  await page.getByRole('heading', { name: /Thank you, Priya/ }).waitFor();
  orderUrl = page.url();
  await page.screenshot({ path: `${SHOTS}/5-confirmation.png` });
});
const orderNo = orderUrl?.match(/SPA-[0-9A-F-]+/)?.[0];
await step('cart emptied after order', async () => { await page.getByLabel('Cart with 0 items').waitFor(); });
await step('order link without key is hidden', async () => {
  const r = await page.goto(`${BASE}/order/${orderNo}`);
  if (r.status() !== 404) throw new Error(`status ${r.status()}`);
});
await step('track order by number + phone', async () => {
  await page.goto(`${BASE}/track?order=${orderNo}&contact=9811122233`);
  await page.getByText(orderNo).first().waitFor();
  await page.getByText('Confirmed').first().waitFor();
});
await step('track with wrong phone shows nothing', async () => {
  await page.goto(`${BASE}/track?order=${orderNo}&contact=9000000000`);
  await page.getByText('No order matches').waitFor();
});
await step('bulk quote lead', async () => {
  await page.goto(`${BASE}/bulk-orders`);
  await page.getByLabel('Your name').fill('Rahul Verma');
  await page.getByLabel('Mobile number').fill('9899988877');
  await page.getByLabel('Company / shop name').fill('Verma Travels');
  await page.getByLabel('Approx. quantity').fill('120');
  await page.getByRole('button', { name: 'Get my quote' }).click();
  await page.getByText(/We’ve got your request/).waitFor();
});
await step('customer cannot open admin', async () => {
  await page.goto(`${BASE}/login`);
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Full name').fill('Test Customer');
  await page.getByLabel('Email').fill('cust@example.com');
  await page.getByLabel('Password').fill('custpass123');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.waitForURL(/\/account/);
  await page.goto(`${BASE}/admin`);
  await page.waitForURL((u) => !u.pathname.startsWith('/admin'));
  await page.context().clearCookies();
});
await step('owner signs in to admin overview', async () => {
  await page.goto(`${BASE}/login?next=/admin`);
  await page.getByLabel('Email').fill('owner@test.in');
  await page.getByLabel('Password').fill('ownerpass123');
  await page.getByRole('button', { name: 'Sign in' }).last().click();
  await page.waitForURL(/\/admin$/);
  await page.getByText('Revenue, last 30 days').waitFor();
  await page.screenshot({ path: `${SHOTS}/6-admin.png`, fullPage: true });
});
await step('ship order with tracking', async () => {
  await page.goto(`${BASE}/admin/orders`);
  await page.getByText(orderNo).click();
  await page.getByLabel('Status').selectOption('shipped');
  await page.getByLabel('Courier').fill('Delhivery');
  await page.getByLabel('Tracking number').fill('DL123456');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByText('Order updated.').waitFor();
  await page.goto(`${BASE}/track?order=${orderNo}&contact=priya@example.com`);
  await page.getByText('DL123456').waitFor();
});
await step('edit stock inline', async () => {
  await page.goto(`${BASE}/admin/products?q=N20902.06`);
  const input = page.getByLabel(/^Stock for/).first();
  await input.fill('3');
  await input.press('Enter');
  await page.waitForTimeout(1200);
  await page.goto(`${BASE}/admin/products?stock=low`);
  await page.getByText('N20902.06').first().waitFor();
});
await step('lead appears in admin', async () => {
  await page.goto(`${BASE}/admin/leads`);
  await page.getByText('Verma Travels').waitFor();
});
await step('create offer -> AI post published to Facebook + Instagram', async () => {
  await page.goto(`${BASE}/admin/offers`);
  await page.getByLabel('Code customers type').fill('diwali15');
  await page.getByLabel('Offer name (for posts)').fill('Diwali Sale');
  await page.getByLabel('% off').fill('15');
  await page.getByRole('button', { name: 'Save offer' }).click();
  await page.getByText(/social media post has been written/).waitFor();
  for (let i = 0; i < 20 && !calls().some((c) => c.path.endsWith('/media_publish')); i++) await page.waitForTimeout(500);
  const c = calls();
  const fb = c.find((x) => x.path.endsWith('/page123/photos') && x.body.includes('DIWALI15'));
  if (!fb) throw new Error('no Facebook post');
  if (!decodeURIComponent(fb.body).includes('DIWALI15')) throw new Error('caption missing code');
  if (!c.some((x) => x.path.endsWith('/ig123/media_publish'))) throw new Error('no Instagram publish');
  await page.goto(`${BASE}/admin/marketing`);
  await page.getByText('Recently posted').waitFor();
  await page.screenshot({ path: `${SHOTS}/7-marketing.png`, fullPage: true });
});
await step('coupon works at checkout', async () => {
  await page.goto(`${BASE}/shop?q=suitcase`);
  await page.locator('article button[aria-label^="Add"]').first().click();
  await page.goto(`${BASE}/cart`);
  await page.getByLabel('PIN code').fill('400001');
  await page.getByLabel('Coupon code').fill('DIWALI15');
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.getByText('Coupon DIWALI15').waitFor();
});
await step('social image renders as JPEG', async () => {
  const r = await page.request.get(`${BASE}/api/social-image?type=offer&code=DIWALI15&headline=Diwali%20Sale&product=3`);
  if (r.headers()['content-type'] !== 'image/jpeg' || (await r.body()).length < 5000) throw new Error('bad image');
  const img = await page.request.get(`${BASE}/api/social-image?type=offer&code=DIWALI15&headline=Diwali%20Sale&product=3`);
  require('node:fs').writeFileSync(`${SHOTS}/8-offer-image.jpg`, await img.body());
});
await step('Meta webhook verification', async () => {
  const ok = await page.request.get(`${BASE}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=verify123&hub.challenge=abc`);
  const bad = await page.request.get(`${BASE}/api/meta/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc`);
  if ((await ok.text()) !== 'abc' || bad.status() !== 403) throw new Error('verification wrong');
});
await step('comment question -> human-style auto reply', async () => {
  const body = JSON.stringify({ object: 'instagram', entry: [{ id: 'ig123', changes: [{ field: 'comments', value: { id: 'igc_1', text: 'Is the black sling bag available? price?', from: { id: 'u1', username: 'riya' }, media: { id: 'ig_media_x' } } }] }] });
  const r = await page.request.post(`${BASE}/api/meta/webhook`, { data: body, headers: { 'content-type': 'application/json', 'x-hub-signature-256': signMeta(body) } });
  if (!r.ok()) throw new Error(`status ${r.status()}`);
  for (let i = 0; i < 20 && !calls().some((c) => c.path.endsWith('/igc_1/replies')); i++) await page.waitForTimeout(500);
  const rep = calls().find((c) => c.path.endsWith('/igc_1/replies'));
  if (!rep || !decodeURIComponent(rep.body.replace(/\+/g, ' ')).includes('Hi Riya')) throw new Error('no reply sent');
});
await step('complaint -> no auto reply, goes to team', async () => {
  const body = JSON.stringify({ object: 'page', entry: [{ id: 'page123', changes: [{ field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'fbc_2', post_id: 'page_post_1', message: 'Worst service, I want a refund!', from: { id: 'u2', name: 'Amit' } } }] }] });
  await page.request.post(`${BASE}/api/meta/webhook`, { data: body, headers: { 'content-type': 'application/json', 'x-hub-signature-256': signMeta(body) } });
  await page.waitForTimeout(2500);
  if (calls().some((c) => c.path.includes('fbc_2'))) throw new Error('auto-replied to a complaint');
  await page.goto(`${BASE}/admin/marketing`);
  await page.getByText('Worst service, I want a refund!').waitFor();
  await page.getByRole('textbox', { name: 'Reply' }).first().fill('So sorry Amit – please WhatsApp us your order number and we’ll sort this today.');
  await page.getByRole('button', { name: 'Post reply' }).first().click();
  for (let i = 0; i < 20 && !calls().some((c) => c.path.endsWith('/fbc_2/comments')); i++) await page.waitForTimeout(300);
  if (!calls().some((c) => c.path.endsWith('/fbc_2/comments'))) throw new Error('manual reply not sent');
});
await step('webhook rejects bad signature', async () => {
  const r = await page.request.post(`${BASE}/api/meta/webhook`, { data: '{"object":"page"}', headers: { 'content-type': 'application/json', 'x-hub-signature-256': 'sha256=00' } });
  if (r.status() !== 401) throw new Error(`status ${r.status()}`);
});
await step('cron requires secret, then schedules product posts', async () => {
  const no = await page.request.get(`${BASE}/api/cron/marketing`);
  if (no.status() !== 401) throw new Error('cron open');
  const yes = await page.request.get(`${BASE}/api/cron/marketing`, { headers: { authorization: 'Bearer cronsecret' } });
  const j = await yes.json();
  if (j.planned < 1) throw new Error(JSON.stringify(j));
});
await step('mobile layout has no sideways scroll', async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mp = await m.newPage();
  for (const path of ['/', '/shop', '/cart', '/bulk-orders']) {
    await mp.goto(BASE + path);
    const over = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) throw new Error(`${path} overflows by ${over}px`);
  }
  await mp.goto(`${BASE}/`); await mp.screenshot({ path: `${SHOTS}/9-mobile-home.png` });
});

for (const r of results) console.log(...r);
console.log('JS errors:', errors.length ? errors : 'none');
await browser.close();
process.exit(results.some((r) => r[0] === 'FAIL') ? 1 : 0);
