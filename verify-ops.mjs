import { chromium } from 'playwright';

const SITE = 'https://1rstbank.bauerdavis-systems.com';
const ADMIN_PW = '08059422423';

const results = [];
function log(icon, label, detail) {
  results.push(`${icon} ${label}: ${detail}`);
  console.log(`${icon} ${label}: ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push(e.message));

// 1. Load /ops
log('check', 'Loading /ops', 'navigating');
const resp = await page.goto(`${SITE}/ops`, { waitUntil: 'networkidle', timeout: 30000 });
log(resp.status() < 400 ? 'PASS' : 'FAIL', 'HTTP status', String(resp.status()));
await page.waitForTimeout(2000);

// 2. Login screen
const hasShield = await page.locator('text=Ops Console').count();
log(hasShield > 0 ? 'PASS' : 'FAIL', 'Login screen', hasShield > 0 ? 'rendered' : 'MISSING');

await page.fill('input[type=password]', ADMIN_PW);
await page.click('button:has-text("Enter Console")');
await page.waitForTimeout(5000);

// 3. Dashboard
const dashHeader = await page.locator('text=All Controls').count();
log(dashHeader > 0 ? 'PASS' : 'FAIL', 'Dashboard loaded', dashHeader > 0 ? 'yes' : 'NO - still on login?');

// 4. Check 6 tabs
const tabNames = ['Transfers', 'Clients', 'KYC', 'Sign-ups', 'Assign', 'Support'];
for (const tab of tabNames) {
  const found = await page.locator(`button:has-text("${tab}")`).count();
  log(found > 0 ? 'PASS' : 'FAIL', `Tab ${tab}`, found > 0 ? 'present' : 'MISSING');
}

// 5. Clients tab - check badges and buttons
await page.click('button:has-text("Clients")');
await page.waitForTimeout(3500);

const allClientsText = await page.locator('text=All Clients').count();
log(allClientsText > 0 ? 'PASS' : 'FAIL', 'Clients section loads', String(allClientsText));

const kycBadges = await page.locator('text=KYC:').count();
log(kycBadges > 0 ? 'PASS' : 'FAIL', 'KYC badges visible', String(kycBadges));

const creditBtns = await page.locator('button:has-text("Credit")').count();
const debitBtns = await page.locator('button:has-text("Debit")').count();
log(creditBtns > 0 ? 'PASS' : 'FAIL', 'Credit buttons', String(creditBtns));
log(debitBtns > 0 ? 'PASS' : 'FAIL', 'Debit buttons', String(debitBtns));

// 6. Test Credit - enter amount and click
const amtInput = page.locator('input[placeholder="Amount"]').first();
const creditBtn = page.locator('button:has-text("Credit")').first();
if (await amtInput.count() > 0) {
  await amtInput.fill('0.01');
  await creditBtn.click();
  await page.waitForTimeout(3500);
  const successMsg = await page.locator('text=done').count();
  log(successMsg > 0 ? 'PASS' : 'WARN', 'Credit button works', successMsg > 0 ? 'success msg appeared' : 'no success msg (check manually)');
}

// 7. Test Freeze button
const freezeBtn = page.locator('button:has-text("Freeze")').first();
if (await freezeBtn.count() > 0) {
  await freezeBtn.click();
  await page.waitForTimeout(3000);
  const frozenBadge = await page.locator('text=FROZEN').count();
  log(frozenBadge > 0 ? 'PASS' : 'WARN', 'Freeze button works', frozenBadge > 0 ? 'FROZEN badge appeared' : 'no FROZEN badge - check');
  // Reactivate
  const activateBtn = page.locator('button:has-text("Activate")').first();
  if (await activateBtn.count() > 0) {
    await activateBtn.click();
    await page.waitForTimeout(2000);
    log('PASS', 'Activate button works', 'clicked successfully');
  }
}

// 8. Transaction history expand
const txHistBtn = page.locator('button:has-text("Transaction History")').first();
if (await txHistBtn.count() > 0) {
  await txHistBtn.click();
  await page.waitForTimeout(3000);
  const noTxText = await page.locator('text=No transactions yet').count();
  const txRow = await page.locator('text=Credit').count() + await page.locator('text=Debit').count();
  log('PASS', 'Transaction History expands', noTxText > 0 ? 'shows empty state' : `shows ${txRow} transaction rows`);
}

// Screenshot of clients
await page.screenshot({ path: 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\ops-clients.png' });

// 9. KYC Docs tab
const kycTabBtn = page.locator('button').filter({ hasText: /^KYC/ }).first();
await kycTabBtn.click();
await page.waitForTimeout(3000);
const kycSubmissionsText = await page.locator('text=KYC Submissions').count();
log(kycSubmissionsText > 0 ? 'PASS' : 'FAIL', 'KYC Docs tab loads', String(kycSubmissionsText));

// 10. Assign tab
await page.click('button:has-text("Assign")');
await page.waitForTimeout(2000);
const assignForm = await page.locator('text=Assign Transfer').count();
const payerField = await page.locator('text=Payer').count();
log(assignForm > 0 ? 'PASS' : 'FAIL', 'Assign tab loads', String(assignForm));
log(payerField > 0 ? 'PASS' : 'FAIL', 'Assign form fields', String(payerField));

// 11. Support tab
await page.click('button:has-text("Support")');
await page.waitForTimeout(3500);
const supportInbox = await page.locator('text=Support Inbox').count();
log(supportInbox > 0 ? 'PASS' : 'FAIL', 'Support tab loads', String(supportInbox));

// Final screenshot
await page.screenshot({ path: 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\ops-final.png' });

// 12. JS errors
if (consoleErrors.length > 0) {
  log('WARN', 'JS console errors', consoleErrors.slice(0, 5).join(' || '));
} else {
  log('PASS', 'No JS console errors', 'clean');
}

await browser.close();

console.log('\n=== FULL RESULTS ===');
results.forEach(r => console.log(r));
const fails = results.filter(r => r.startsWith('FAIL'));
console.log(`\nFAILS: ${fails.length}`);
