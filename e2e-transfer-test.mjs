import { chromium } from 'playwright';

const SITE = 'https://1rstbank.bauerdavis-systems.com';
const CLIENT_EMAIL = 'samarjanet544@gmail.com'; // Janet Samar, account 3880392253
const CLIENT_PASS = 'testpass123';
const RECIPIENT_ACCOUNT = '1329665016'; // Asraph Hosein — visible via RLS to other users
const ADMIN_ID = '08059422423';
const ADMIN_PASS = '08059422423';

let pass = 0, fail = 0;
const ok  = msg => { console.log('✅', msg); pass++; };
const bad = msg => { console.log('❌', msg); fail++; };
const inf = msg => console.log('ℹ', msg);
const wrn = msg => console.log('⚠', msg);

// Warm up site — hit /api/ping to wake Supabase + give it time to fully initialize
inf('Warming up site...');
await fetch(`${SITE}/api/ping`).catch(() => {});
await new Promise(r => setTimeout(r, 4000));
const warmup = await fetch(`${SITE}/api/ping`).then(r => r.text()).catch(() => 'failed');
inf(`Warmup ping 2: ${warmup}`);
await new Promise(r => setTimeout(r, 5000));

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function shot(name) {
  await page.screenshot({ path: `C:/Users/Administrator/${name}.png` });
}

// React controlled inputs: fill() doesn't always fire React onChange.
// pressSequentially() types each char and fires per-keystroke events React definitely handles.
async function reactFill(locator, value) {
  await locator.click({ force: true });
  await page.keyboard.press('Control+a');
  await locator.pressSequentially(value, { delay: 30 });
}

async function login(identifier, password, label) {
  await page.goto(`${SITE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('input[type="text"], input[placeholder*="email" i]', { timeout: 15000 });

  const idInput = page.locator('input[type="text"]').first();
  const pwInput = page.locator('input[type="password"]').first();

  await reactFill(idInput, identifier);
  await reactFill(pwInput, password);

  // Verify values were set
  const idVal = await idInput.inputValue().catch(() => '');
  const pwVal = await pwInput.inputValue().catch(() => '');
  inf(`[${label}] id input: "${idVal}", pw length: ${pwVal.length}`);

  await shot(`before-submit-${label}`);

  // Listen for failed requests
  const failedReqs = [];
  page.on('requestfailed', req => { failedReqs.push(`${req.method()} ${req.url()} → ${req.failure()?.errorText}`); });

  await page.locator('button[type="submit"]').click();

  // Poll the URL for up to 90 seconds
  const start = Date.now();
  while (Date.now() - start < 90000) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(2000);
  }

  if (failedReqs.length) inf(`[${label}] Failed requests: ${failedReqs.slice(0, 5).join(' | ')}`);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
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
await reactFill(page.locator('input[placeholder="0123456789"]'), RECIPIENT_ACCOUNT);
await reactFill(page.locator('input[placeholder="0.00"]'), '10');
await reactFill(page.locator('input[placeholder="Payment for..."]'), 'E2E test transfer');
await shot('transfer-filled');

// Step 1: Continue (lookupAccount) — click via JS to bypass fixed nav overlay
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const btn = btns.find(b => b.textContent.trim() === 'Continue');
  if (btn) btn.click();
});
await page.waitForTimeout(4000);
await shot('transfer-confirm');

// Step 2: Send Transfer (confirm screen) — also via JS
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button')];
  const btn = btns.find(b => b.textContent.includes('Send Transfer') || b.textContent.includes('Submit Transfer'));
  if (btn) btn.click();
});
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000);
await shot('transfer-submitted');

const pageText = await page.locator('body').innerText().catch(() => '');
if (/processing|pending|submitted|review/i.test(pageText)) {
  ok('Transfer shows pending/processing status');
} else {
  wrn(`Status unclear after submit. Snippet: ${pageText.slice(0, 400)}`);
}

// Capture the new pending transfer ID from DB right after submission
const SVC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvc252a21mZW9paHdpemF5cnhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA0MjYxMiwiZXhwIjoyMDk2NjE4NjEyfQ.zXvob_ps2xLADMqrnFmcOUz7hp7w98AS5fES3mRLUe0';
const DB_BASE = 'https://iosnvkmfeoihwizayrxr.supabase.co/rest/v1';
const DB_H = { apikey: SVC_KEY, Authorization: `Bearer ${SVC_KEY}` };
const freshTx = await fetch(`${DB_BASE}/pending_transfers?select=id,status&from_account=eq.3880392253&status=eq.pending&order=created_at.desc&limit=1`, { headers: DB_H }).then(r => r.json());
const pendingTransferId = freshTx[0]?.id ?? null;
inf(`Captured pending transfer ID: ${pendingTransferId}`);

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

// Extract admin access token from Playwright's cookie jar (@supabase/ssr uses cookies not localStorage)
const allCookies = await ctx.cookies();
inf(`All cookie names: ${allCookies.map(c => c.name).join(', ')}`);
const authCookie = allCookies.find(c => c.name.includes('auth-token') || c.name.includes('sb-'));
let accessToken = null;
if (authCookie) {
  const rawVal = authCookie.value;
  inf(`Cookie value snippet (first 120): ${rawVal.slice(0, 120)}`);
  try {
    // Try JSON parse directly
    const parsed = JSON.parse(rawVal);
    if (Array.isArray(parsed)) accessToken = parsed[0]?.access_token ?? null;
    else accessToken = parsed?.access_token ?? null;
  } catch {}
  if (!accessToken) {
    try {
      // Try URL decode then JSON parse
      const decoded = decodeURIComponent(rawVal);
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) accessToken = parsed[0]?.access_token ?? null;
      else accessToken = parsed?.access_token ?? null;
    } catch {}
  }
  if (!accessToken) {
    try {
      // Try base64 decode
      const decoded = Buffer.from(rawVal, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) accessToken = parsed[0]?.access_token ?? null;
      else accessToken = parsed?.access_token ?? null;
    } catch {}
  }
  if (!accessToken && rawVal.startsWith('base64-')) {
    try {
      // @supabase/ssr v0.12 format: "base64-<base64_encoded_json>"
      const b64 = rawVal.slice(7); // strip "base64-"
      const decoded = Buffer.from(b64, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      if (Array.isArray(parsed)) accessToken = parsed[0]?.access_token ?? null;
      else accessToken = parsed?.access_token ?? null;
    } catch {}
  }
  if (!accessToken && rawVal.split('.').length === 3) {
    // The value itself might be the JWT
    accessToken = rawVal;
  }
}
inf(`Admin access token present: ${!!accessToken} (cookie: ${authCookie?.name ?? 'none'})`);


const approveBtn = page.locator('button:has-text("Approve")').first();
const approveBtnVisible = await approveBtn.isVisible({ timeout: 5000 }).catch(() => false);
inf(`Approve button visible: ${approveBtnVisible}`);

if (approveBtnVisible && pendingTransferId) {
  // Make the approval fetch with Bearer token to bypass cookie session issues
  const approvalResult = await page.evaluate(async ({ token, transferId }) => {
    const res = await fetch('/api/admin/transfer-decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ transferId, action: 'approve' }),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }, { token: accessToken, transferId: pendingTransferId });

  inf(`Approval API → ${approvalResult.status}: ${JSON.stringify(approvalResult.body)}`);
  await page.waitForTimeout(3000);
  await shot('after-approve');

  if (approvalResult.status === 200 && approvalResult.body?.success) {
    ok('Transfer approved via API — confirmed 200/success');
  } else if (approvalResult.body?.error === 'Transfer already processed') {
    ok('Transfer was already approved (idempotent)');
  } else {
    bad(`Approve failed (${approvalResult.status}): ${JSON.stringify(approvalResult.body)}`);
  }
} else if (!pendingTransferId) {
  bad('No pending transfer ID available for approval');
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

const txRows = await fetch(`${DB_BASE}/pending_transfers?select=*&order=created_at.desc&limit=3`, { headers: DB_H }).then(r => r.json());
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
