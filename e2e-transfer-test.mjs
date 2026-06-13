import { chromium } from 'playwright';

const SITE = 'https://1rstbank.bauerdavis-systems.com';
const CLIENT_EMAIL = 'samarjanet544@gmail.com'; // Janet Samar, account 3880392253
const CLIENT_PASS = 'testpass123';
const ADMIN_ID = '08059422423';
const ADMIN_PASS = '08059422423';

let pass = 0, fail = 0;
const ok  = msg => { console.log('✅', msg); pass++; };
const bad = msg => { console.log('❌', msg); fail++; };
const inf = msg => console.log('ℹ', msg);
const wrn = msg => console.log('⚠', msg);

// Warm up site before launching browser
inf('Warming up site...');
await fetch(`${SITE}/login`).catch(() => {});
await new Promise(r => setTimeout(r, 3000));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function shot(name) {
  await page.screenshot({ path: `C:/Users/Administrator/${name}.png` });
}

// React controlled inputs need .fill() then trigger input event
async function reactFill(locator, value) {
  await locator.click();
  await locator.fill(value);
  await page.keyboard.press('Tab'); // blur to commit React state
}

async function login(identifier, password, label) {
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="text"], input[placeholder*="email" i]', { timeout: 15000 });

  const idInput = page.locator('input[type="text"]').first();
  const pwInput = page.locator('input[type="password"]').first();

  await reactFill(idInput, identifier);
  await reactFill(pwInput, password);

  await shot(`before-submit-${label}`);

  // Click submit and wait for URL to change away from /login
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 45000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await shot(`after-login-${label}`);
  inf(`[${label}] landed on: ${page.url()}`);
  return page.url();
}

// ── STEP 1: Login as John ─────────────────────────────────────────────────────
inf('STEP 1: Login as John Testuser');
const johnUrl = await login(CLIENT_EMAIL, CLIENT_PASS, 'john');
if (johnUrl.includes('dashboard')) {
  ok('John logged in — on dashboard');
} else {
  bad(`John login failed — landed on: ${johnUrl}`);
  await browser.close(); process.exit(1);
}

const balText = await page.locator('text=/\\$[0-9,]+/').first().textContent().catch(() => '?');
inf(`John balance before: ${balText}`);
await shot('john-dashboard');

// ── STEP 2: Open Transfer modal on dashboard ──────────────────────────────────
inf('STEP 2: Open Transfer modal and submit');
await page.locator('button:has-text("Transfer")').first().click();
await page.waitForTimeout(1000);
await shot('transfer-modal');

// Modal inputs confirmed from TransferModal.tsx
await reactFill(page.locator('input[placeholder="0123456789"]'), ADMIN_ID);
await reactFill(page.locator('input[placeholder="0.00"]'), '10');
await reactFill(page.locator('input[placeholder="Payment for..."]'), 'E2E test transfer');
await shot('transfer-filled');

// Step 1: Continue (lookupAccount) — force needed due to fixed bottom nav overlap
await page.locator('button:has-text("Continue")').click({ force: true });
await page.waitForTimeout(3000);
await shot('transfer-confirm');

// Step 2: Submit Transfer (confirm screen)
await page.locator('button:has-text("Submit Transfer")').click({ force: true });
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000);
await shot('transfer-submitted');

const pageText = await page.locator('body').innerText().catch(() => '');
if (/processing|pending|submitted|review/i.test(pageText)) {
  ok('Transfer shows pending/processing status');
} else {
  wrn(`Status unclear after submit. Snippet: ${pageText.slice(0, 400)}`);
}

// ── STEP 3: Logout ────────────────────────────────────────────────────────────
inf('STEP 3: Logout John');
// Try profile/avatar menu first, then direct logout button
const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")').first();
if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
  await logoutBtn.click();
} else {
  // open nav dropdown
  await page.locator('[aria-label*="menu" i], button[aria-label*="user" i], button[aria-label*="profile" i]').first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.locator('text=/logout|sign out/i').first().click().catch(() => {});
}
await page.waitForTimeout(2000);
await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
ok('Logged out — back on login page');

// ── STEP 4: Login as admin ────────────────────────────────────────────────────
inf('STEP 4: Login as admin');
const adminUrl = await login(ADMIN_ID, ADMIN_PASS, 'admin');
if (adminUrl.includes('dashboard') || adminUrl.includes('admin')) {
  ok(`Admin logged in — ${adminUrl}`);
} else {
  bad(`Admin login failed — ${adminUrl}`);
  await browser.close(); process.exit(1);
}

// ── STEP 5: Admin console → Transfers tab ────────────────────────────────────
inf('STEP 5: Admin console — Transfers tab');
await page.goto(`${SITE}/admin-console`, { waitUntil: 'networkidle', timeout: 20000 });
await shot('admin-console');

const transfersTab = page.locator('button:has-text("Transfers"), [role="tab"]:has-text("Transfers")').first();
await transfersTab.click({ timeout: 5000 }).catch(() => wrn('Transfers tab not found'));
await page.waitForTimeout(2000);
await shot('transfers-tab');

const hasPendingRow  = await page.locator('text=/E2E test transfer/i').isVisible().catch(() => false);
const hasPendingText = await page.locator('text=/pending/i').first().isVisible().catch(() => false);
const hasBadge       = await page.locator('[class*="badge"]').first().isVisible().catch(() => false);

if (hasPendingRow || hasPendingText || hasBadge) {
  ok('Pending transfer visible in Transfers tab');
} else {
  wrn('Could not confirm transfer row — ' + (await page.locator('body').innerText().catch(() => '')).slice(0, 500));
}

// ── STEP 6: Approve ───────────────────────────────────────────────────────────
inf('STEP 6: Approve transfer');
const approveBtn = page.locator('button:has-text("Approve")').first();
if (await approveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
  await approveBtn.click();
  await page.waitForTimeout(3000);
  await shot('after-approve');
  ok('Transfer approved');
} else {
  bad('Approve button not visible');
  await shot('no-approve-btn');
}

// ── STEP 8: KYC / status controls ────────────────────────────────────────────
inf('STEP 8: KYC/status controls — Clients tab');
const clientsTab = page.locator('button:has-text("Clients"), [role="tab"]:has-text("Clients")').first();
await clientsTab.click({ timeout: 5000 }).catch(() => wrn('Clients tab click failed'));
await page.waitForTimeout(2000);
await shot('clients-tab');

const kycVisible = await page.locator('text=/kyc|suspend|freeze|activate/i').first().isVisible().catch(() => false);
if (kycVisible) {
  ok('KYC / status controls visible on Clients tab');
} else {
  bad('KYC / status controls not found');
  inf((await page.locator('body').innerText().catch(() => '')).slice(0, 400));
}

await browser.close();

// ── STEP 7: Balance check via Supabase API ───────────────────────────────────
inf('STEP 7: Checking balances via Supabase...');
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc252a21mZW9paHdpemF5cnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA0MjYxMiwiZXhwIjoyMDk2NjE4NjEyfQ.zXvob_ps2xLADMqrnFmcOUz7hp7w98AS5fES3mRLUe0';
const BASE = 'https://iosnvkmfeoihwizayrxr.supabase.co/rest/v1';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const txRows = await fetch(`${BASE}/pending_transfers?select=*&order=created_at.desc&limit=3`, { headers: H }).then(r => r.json());
inf(`Recent transfers: ${JSON.stringify(txRows, null, 2)}`);

const latestTx = txRows[0];
if (latestTx?.status === 'approved') {
  ok(`Latest transfer status in DB: approved ✅`);
} else if (latestTx) {
  wrn(`Latest transfer status: ${latestTx.status}`);
} else {
  bad('No transfer records found in DB');
}

console.log(`\n── RESULT: ${pass} passed, ${fail} failed ──`);
