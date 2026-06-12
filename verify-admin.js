const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  // Go to login
  console.log('Navigating to login...');
  await page.goto('https://1rstbank.bauerdavis-systems.com/login');
  await page.screenshot({ path: 'screenshot-login.png', fullPage: true });
  console.log('Login page loaded');

  // Fill credentials
  const identifier = page.locator('input').first();
  await identifier.fill('08059422423');

  const allInputs = await page.locator('input').all();
  console.log('Input count:', allInputs.length);

  if (allInputs.length >= 2) {
    await allInputs[1].fill('08059422423');
  }

  await page.screenshot({ path: 'screenshot-filled.png', fullPage: true });

  // Submit and wait for navigation away from /login
  await Promise.all([
    page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 }),
    page.locator('button[type="submit"]').click()
  ]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'screenshot-after-login.png', fullPage: true });
  console.log('After login URL:', page.url());

  // Navigate to admin console
  await page.goto('https://1rstbank.bauerdavis-systems.com/admin-console');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshot-admin.png', fullPage: true });
  console.log('Admin URL:', page.url());

  await browser.close();
  console.log('Done. Screenshots saved.');
})();
