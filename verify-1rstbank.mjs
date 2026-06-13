import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'https://1rstbank.bauerdavis-systems.com'
const SCREENSHOTS = 'C:/Users/Administrator/verify-screenshots'
fs.mkdirSync(SCREENSHOTS, { recursive: true })

const results = []
let browser, page

function log(icon, label, detail = '') {
  const line = `${icon} ${label}${detail ? ' → ' + detail : ''}`
  console.log(line)
  results.push(line)
}

async function ss(name) {
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: false })
}

async function run() {
  browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  page = await ctx.newPage()

  // ── 1. LOGIN as test client ───────────────────────────────────────────────
  log('📋', 'Navigating to login page')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await ss('01-login')

  // Fill login form — use admin account (08059422423 / 08059422423) which also has a client dashboard
  const idField = page.locator('input').first()
  await idField.fill('08059422423')
  const passField = page.locator('input[type="password"]')
  await passField.fill('08059422423')
  await page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first().click()
  await page.waitForURL(`${BASE}/dashboard`, { timeout: 10000 }).catch(() => {})
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(4000) // wait for auth.getUser() to resolve and bubble to render
  await ss('02-dashboard')
  const dashUrl = page.url()
  log(dashUrl.includes('/dashboard') ? '✅' : '❌', 'Login & redirect to dashboard', dashUrl)

  // ── 2. WITHDRAW BUTTON on dashboard ──────────────────────────────────────
  const withdrawBtn = page.locator('button:has-text("Withdraw")')
  const withdrawVisible = await withdrawBtn.isVisible().catch(() => false)
  log(withdrawVisible ? '✅' : '❌', 'Withdraw button visible on dashboard balance card')
  await ss('03-dashboard-buttons')

  // ── 3. SUPPORT BUBBLE position ────────────────────────────────────────────
  // Wait up to 5s for the bubble (it renders after supabase.auth.getUser() resolves)
  await page.locator('button svg[data-lucide="message-circle"]').waitFor({ timeout: 5000 }).catch(() => {})

  const bubblePresent = await page.locator('button svg[data-lucide="message-circle"]').isVisible().catch(() => false)
  log(bubblePresent ? '✅' : '❌', 'Support bubble button present on dashboard')

  // Measure positions with correct selector (look for bottom-20 specifically, not nav)
  const bubbleBox = await page.evaluate(() => {
    // The SupportBubble container has class "fixed bottom-20 right-5 z-50"
    // We need to find it and NOT confuse it with the nav
    const allFixed = [...document.querySelectorAll('*')].filter(el => {
      const s = getComputedStyle(el)
      return s.position === 'fixed' && el.tagName !== 'NAV'
    })
    const bubbleContainer = allFixed.find(el =>
      el.querySelector('button svg') && parseFloat(getComputedStyle(el).bottom) > 50
    )
    if (!bubbleContainer) return null
    const rect = bubbleContainer.getBoundingClientRect()
    return {
      cssBottom: Math.round(parseFloat(getComputedStyle(bubbleContainer).bottom)),
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom)
    }
  })

  const navBox = await page.evaluate(() => {
    const nav = document.querySelector('nav')
    if (!nav) return null
    return { top: Math.round(nav.getBoundingClientRect().top), height: Math.round(nav.getBoundingClientRect().height) }
  })

  log('🔍', 'Support bubble container', JSON.stringify(bubbleBox))
  log('🔍', 'BottomNav', JSON.stringify(navBox))

  if (bubbleBox && navBox) {
    const noOverlap = bubbleBox.bottom <= navBox.top
    log(noOverlap ? '✅' : '❌', `Bubble bottom (${bubbleBox.bottom}px) is at or above nav top (${navBox.top}px)`)
  } else if (!bubbleBox) {
    log('❌', 'Support bubble container not found in DOM')
  }
  await ss('04-bubble-nav-check')

  // ── 4. WITHDRAWAL FLOW ────────────────────────────────────────────────────
  log('📋', 'Starting withdrawal flow — clicking Withdraw')
  await withdrawBtn.click()
  await page.waitForTimeout(600)
  await ss('05-withdraw-method-select')

  const countryOption = page.locator('button:has-text("Select Country")')
  const wireOption = page.locator('button:has-text("Wire Transfer")')
  const methodVisible = await countryOption.isVisible().catch(() => false)
  log(methodVisible ? '✅' : '❌', 'Method selection screen shown (Country / Wire)')

  // Click Country
  log('📋', 'Selecting Country option')
  await countryOption.click()
  await page.waitForTimeout(400)
  await ss('06-withdraw-country-select')

  const countryDropdown = page.locator('select').first()
  const dropdownVisible = await countryDropdown.isVisible().catch(() => false)
  log(dropdownVisible ? '✅' : '❌', 'Country dropdown visible')

  // Select United States
  await countryDropdown.selectOption('United States')
  await page.waitForTimeout(400)
  await ss('07-withdraw-us-fields')

  const bankField = page.locator('input[placeholder*="Chase"], input[placeholder*="Bank"]').first()
  const routingField = page.locator('input[placeholder*="021000021"], input[placeholder*="Routing"]').first()
  const usFieldsVisible = await bankField.isVisible().catch(() => false)
  log(usFieldsVisible ? '✅' : '❌', 'US banking fields visible after selecting United States')

  // Fill US fields
  await bankField.fill('Chase Bank')
  const routingVis = await routingField.isVisible().catch(() => false)
  if (routingVis) await routingField.fill('021000021')
  const acctField = page.locator('input[placeholder*="1234567890"]').first()
  if (await acctField.isVisible().catch(() => false)) await acctField.fill('9876543210')
  const acctTypeSelect = page.locator('select').nth(1)
  if (await acctTypeSelect.isVisible().catch(() => false)) await acctTypeSelect.selectOption('Checking')

  // Fill amount
  const amountField = page.locator('input[placeholder="0.00"]')
  if (await amountField.isVisible().catch(() => false)) await amountField.fill('5000')
  await ss('08-withdraw-fields-filled')

  // Continue to review
  const continueBtn = page.locator('button:has-text("Continue to Review")')
  const continueBtnEnabled = await continueBtn.isEnabled().catch(() => false)
  log(continueBtnEnabled ? '✅' : '❌', 'Continue to Review button enabled after filling all fields')
  if (continueBtnEnabled) await continueBtn.click()
  await page.waitForTimeout(500)
  await ss('09-withdraw-confirm')

  const confirmHeader = await page.locator('text=Confirm Withdrawal').isVisible().catch(() => false)
  log(confirmHeader ? '✅' : '❌', 'Confirm Withdrawal screen shown with details')

  // Click Confirm Request
  const confirmBtn = page.locator('button:has-text("Confirm Request")')
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click()
    await page.waitForTimeout(1500) // wait for the fake 1.2s processing delay
    await ss('10-withdraw-fee-bill')

    const feeHeader = await page.locator('text=Action Required').isVisible().catch(() => false)
    // Use page.evaluate to check for $1,500 since Playwright text= can struggle with commas
    const feeText = await page.evaluate(() => document.body.innerText.includes('1,500'))
    log(feeText && feeHeader ? '✅' : '❌', `$1,500 activation fee bill shown after confirm`, `feeText=${feeText} feeHeader=${feeHeader}`)

    const billRef = await page.evaluate(() => document.body.innerText.includes('1RB-'))
    log(billRef ? '✅' : '❌', 'Bill reference number (1RB-...) present on fee invoice')

    const adminNotAffected = await page.locator('text=not deducted from your account balance').isVisible().catch(() => false)
    log(adminNotAffected ? '✅' : '❌', 'Bill states fee is NOT deducted from account balance')

    // Close the modal
    await page.locator('button:has-text("Contact Support")').click().catch(() => {})
    await page.waitForTimeout(400)
  }

  // ── 5. WIRE TRANSFER FLOW ─────────────────────────────────────────────────
  log('📋', 'Testing Wire Transfer path')
  await page.locator('button:has-text("Withdraw")').click()
  await page.waitForTimeout(500)
  await page.locator('button:has-text("Wire Transfer")').click()
  await page.waitForTimeout(400)
  await ss('11-wire-fields')

  const beneficiaryField = page.locator('input[placeholder*="Full name"]')
  const wireVisible = await beneficiaryField.isVisible().catch(() => false)
  log(wireVisible ? '✅' : '❌', 'Wire Transfer fields visible (beneficiary, bank, SWIFT, etc.)')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  // ── 6. SUPPORT BUBBLE hidden on admin pages ───────────────────────────────
  log('📋', 'Checking support bubble hidden on admin pages')

  // Check ops page (already logged in as admin from step 1)
  await page.goto(`${BASE}/ops`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await ss('12-ops-page')

  const bubbleOnOps = await page.evaluate(() => {
    const fixedDivs = [...document.querySelectorAll('[class*="fixed"]')]
    return fixedDivs.some(d => d.className.includes('bottom-20') && d.querySelector('svg'))
  })
  log(!bubbleOnOps ? '✅' : '❌', 'Support bubble NOT visible on /ops admin page')

  await page.goto(`${BASE}/admin-console`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  await ss('13-admin-console')
  const bubbleOnAdmin = await page.evaluate(() => {
    const fixedDivs = [...document.querySelectorAll('[class*="fixed"]')]
    return fixedDivs.some(d => d.className.includes('bottom-20') && d.querySelector('svg'))
  })
  log(!bubbleOnAdmin ? '✅' : '❌', 'Support bubble NOT visible on /admin-console page')

  // ── 7. CHECK /api/admin/adjust ROUTE EXISTS ───────────────────────────────
  log('📋', 'Verifying /api/admin/adjust endpoint exists')
  const adjustRes = await page.evaluate(async (base) => {
    const r = await fetch(`${base}/api/admin/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    return { status: r.status }
  }, BASE)
  // Should return 401 (Unauthorized) not 404
  log(adjustRes.status === 401 ? '✅' : adjustRes.status !== 404 ? '⚠️' : '❌',
    `/api/admin/adjust route exists and returns ${adjustRes.status} (401=correct, 404=missing)`)

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n── SCREENSHOTS saved to:', SCREENSHOTS)
  console.log('── RESULTS:\n' + results.join('\n'))
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1) }).finally(() => browser?.close())
