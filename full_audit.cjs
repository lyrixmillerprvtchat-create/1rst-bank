const { chromium } = require('playwright')

const BASE = 'https://1rstbank.bauerdavis-systems.com'
const results = []

function log(label, ok, detail) {
  detail = detail || ''
  const sym = ok ? 'PASS' : 'FAIL'
  results.push({ label, ok, detail })
  console.log(sym + ' | ' + label + (detail ? ' — ' + detail : ''))
}

async function httpGet(browser, url) {
  const ctx = await browser.newContext()
  const res = await ctx.request.get(url)
  const body = await res.text()
  await ctx.dispose()
  return { status: res.status(), body }
}

;(async () => {
  const browser = await chromium.launch({ headless: true })

  // API + static asset checks
  let r
  r = await httpGet(browser, BASE + '/api/ping')
  log('/api/ping', r.status === 200 && r.body.includes('ok'), r.status + ' ' + r.body.substring(0,60))

  r = await httpGet(browser, BASE + '/api/health')
  log('/api/health', r.status === 200, r.status + ' ' + r.body.substring(0,80))

  r = await httpGet(browser, BASE + '/manifest.json')
  log('/manifest.json PWA', r.status === 200 && r.body.includes('1rst Bank'), r.status + '')

  r = await httpGet(browser, BASE + '/sw.js')
  log('/sw.js service worker', r.status === 200, r.status + '')

  r = await httpGet(browser, BASE + '/icon-192.png')
  log('/icon-192.png', r.status === 200, r.status + '')

  r = await httpGet(browser, BASE + '/icon-512.png')
  log('/icon-512.png', r.status === 200, r.status + '')

  // Login
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', e => pageErrors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()) })

  await page.goto(BASE + '/login')
  await page.waitForLoadState('networkidle')
  log('/login page loads', !page.url().includes('500'), page.url())

  await page.locator('input:not([type="password"])').first().fill('08059422423')
  await page.locator('input[type="password"]').first().fill('08059422423')
  await page.locator('button[type="submit"]').click()

  let loggedIn = false
  try {
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    loggedIn = true
    log('Login redirect to dashboard', true)
  } catch (e) {
    log('Login redirect to dashboard', false, 'stuck on ' + page.url())
  }

  if (!loggedIn) { await browser.close(); return }

  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_dashboard.png', fullPage: true })
  const dashText = await page.locator('body').textContent()
  log('Dashboard balance card', dashText.includes('Total Balance'))
  log('Dashboard KYC banner', dashText.includes('KYC'))
  log('Dashboard services grid', dashText.includes('Bills') && dashText.includes('Airtime'))
  log('Dashboard recent transactions', dashText.includes('Recent Transactions'))
  const e1 = [...pageErrors]; pageErrors.length = 0
  log('Dashboard zero JS errors', e1.length === 0, e1.join('; ').substring(0,120))

  // Transfer modal
  await page.locator('button').filter({ hasText: 'Transfer' }).first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/a_transfer.png', fullPage: true })
  const txText = await page.locator('body').textContent()
  log('Transfer modal opens', txText.includes('1rst Bank') || txText.includes('Bank Name') || txText.includes('Account'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // Withdraw modal
  await page.locator('button').filter({ hasText: 'Withdraw' }).first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/a_withdraw.png', fullPage: true })
  const wdText = await page.locator('body').textContent()
  log('Withdraw modal opens', wdText.includes('Country') || wdText.includes('Withdraw'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // Add money modal
  await page.locator('button').filter({ hasText: 'Add' }).first().click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: '/tmp/a_addmoney.png', fullPage: true })
  const amText = await page.locator('body').textContent()
  log('Add Money modal opens', amText.includes('Account') || amText.includes('Copy') || amText.includes('Add Money'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // Profile
  pageErrors.length = 0
  await page.goto(BASE + '/profile')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_profile.png', fullPage: true })
  const profText = await page.locator('body').textContent()
  log('/profile loads', profText.includes('Account Number'))
  log('Profile KYC Verification link', profText.includes('KYC Verification'))
  log('Profile tier badge', profText.includes('Tier'))
  const e2 = [...pageErrors]; pageErrors.length = 0
  log('Profile zero JS errors', e2.length === 0, e2.join('; ').substring(0,120))

  // KYC page
  pageErrors.length = 0
  await page.goto(BASE + '/kyc')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_kyc.png', fullPage: true })
  const kycText = await page.locator('body').textContent()
  log('/kyc loads', kycText.includes('KYC') || kycText.includes('Identity') || kycText.includes('Verification'))
  log('KYC upload fields present', kycText.includes('Upload') || kycText.includes('Document'))
  const e3 = [...pageErrors]; pageErrors.length = 0
  log('KYC zero JS errors', e3.length === 0, e3.join('; ').substring(0,120))

  // Statement
  pageErrors.length = 0
  await page.goto(BASE + '/statement')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_statement.png', fullPage: true })
  const stText = await page.locator('body').textContent()
  log('/statement loads', stText.includes('Statement') || stText.includes('Transaction'))
  const e4 = [...pageErrors]; pageErrors.length = 0
  log('Statement zero JS errors', e4.length === 0, e4.join('; ').substring(0,120))

  // Upgrade
  pageErrors.length = 0
  await page.goto(BASE + '/upgrade')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_upgrade.png', fullPage: true })
  const ugText = await page.locator('body').textContent()
  log('/upgrade loads', ugText.includes('Tier') || ugText.includes('Upgrade'))
  const e5 = [...pageErrors]; pageErrors.length = 0
  log('Upgrade zero JS errors', e5.length === 0, e5.join('; ').substring(0,120))

  // Linked banks
  pageErrors.length = 0
  await page.goto(BASE + '/linked-banks')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_linkedbanks.png', fullPage: true })
  const lbText = await page.locator('body').textContent()
  log('/linked-banks loads', lbText.includes('Bank') || lbText.includes('Link'))
  const e6 = [...pageErrors]; pageErrors.length = 0
  log('Linked banks zero JS errors', e6.length === 0, e6.join('; ').substring(0,120))

  // Support
  pageErrors.length = 0
  await page.goto(BASE + '/support')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_support.png', fullPage: true })
  const supText = await page.locator('body').textContent()
  log('/support loads', supText.includes('Support') || supText.includes('Chat') || supText.includes('Message'))
  const e7 = [...pageErrors]; pageErrors.length = 0
  log('Support zero JS errors', e7.length === 0, e7.join('; ').substring(0,120))

  // Ops console
  pageErrors.length = 0
  await page.goto(BASE + '/ops')
  await page.waitForLoadState('networkidle')
  let opsText = await page.locator('body').textContent()
  if (opsText.includes('password') || opsText.includes('Password') || opsText.includes('Access')) {
    await page.locator('input[type="password"]').first().fill('08059422423')
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2500)
    await page.waitForLoadState('networkidle')
    opsText = await page.locator('body').textContent()
  }
  await page.screenshot({ path: '/tmp/a_ops.png', fullPage: true })
  log('/ops console loads', opsText.includes('Transfers') || opsText.includes('Clients') || opsText.includes('KYC'))
  log('Ops KYC Docs tab present', opsText.includes('KYC'))
  const e8 = [...pageErrors]; pageErrors.length = 0
  log('Ops zero JS errors', e8.length === 0, e8.join('; ').substring(0,120))

  // Admin console
  pageErrors.length = 0
  await page.goto(BASE + '/admin-console')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: '/tmp/a_admin.png', fullPage: true })
  const adText = await page.locator('body').textContent()
  log('/admin-console loads', adText.includes('Clients') || adText.includes('Transfers') || adText.includes('Admin'))
  const e9 = [...pageErrors]; pageErrors.length = 0
  log('Admin console zero JS errors', e9.length === 0, e9.join('; ').substring(0,120))

  // Register page
  const regPage = await browser.newPage()
  await regPage.goto(BASE + '/register')
  await regPage.waitForLoadState('networkidle')
  const regText = await regPage.locator('body').textContent()
  log('/register loads', regText.includes('Register') || regText.includes('Create') || regText.includes('Name'))
  await regPage.close()

  // Static pages
  for (const slug of ['/privacy', '/terms', '/offline']) {
    r = await httpGet(browser, BASE + slug)
    log(slug + ' loads', r.status === 200, r.status + '')
  }

  // Summary
  const passed = results.filter(x => x.ok).length
  const failed = results.filter(x => !x.ok).length
  console.log('\n==============================')
  console.log('TOTAL: ' + passed + ' passed, ' + failed + ' failed out of ' + results.length)
  if (failed > 0) {
    console.log('\nFAILED ITEMS:')
    results.filter(x => !x.ok).forEach(x => console.log('  FAIL | ' + x.label + ' — ' + x.detail))
  }

  await browser.close()
})()
