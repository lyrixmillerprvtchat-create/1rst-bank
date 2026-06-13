import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

mkdirSync('screenshots', { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setViewportSize({ width: 390, height: 844 }) // iPhone 14 size — matches the mobile banking design

// 1. Check homepage (should redirect to login)
console.log('Navigating to homepage...')
const res = await page.goto('https://1rstbank.bauerdavis-systems.com', { waitUntil: 'networkidle', timeout: 30000 })
console.log(`Homepage status: ${res.status()} | final URL: ${page.url()}`)
await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true })

// 2. Login page
console.log('Navigating to login...')
await page.goto('https://1rstbank.bauerdavis-systems.com/login', { waitUntil: 'networkidle', timeout: 30000 })
console.log(`Login URL: ${page.url()}`)
await page.screenshot({ path: 'screenshots/02-login.png', fullPage: true })

// 3. Log in as admin
console.log('Logging in as admin...')
await page.fill('input[type="text"], input[placeholder*="account"], input[placeholder*="email"], input[name="identifier"]', '08059422423')
await page.fill('input[type="password"]', '08059422423')
await page.screenshot({ path: 'screenshots/03-login-filled.png', fullPage: true })
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 20000 })
console.log(`After login URL: ${page.url()}`)
await page.screenshot({ path: 'screenshots/04-dashboard.png', fullPage: true })

// 4. Scroll dashboard
await page.evaluate(() => window.scrollTo(0, 500))
await page.waitForTimeout(500)
await page.screenshot({ path: 'screenshots/05-dashboard-scroll.png', fullPage: false })

// 5. Admin console
console.log('Navigating to admin console...')
await page.goto('https://1rstbank.bauerdavis-systems.com/admin-console', { waitUntil: 'networkidle', timeout: 20000 })
await page.screenshot({ path: 'screenshots/06-admin-console.png', fullPage: true })

// 6. Ops console
console.log('Navigating to ops...')
await page.goto('https://1rstbank.bauerdavis-systems.com/ops', { waitUntil: 'networkidle', timeout: 20000 })
await page.screenshot({ path: 'screenshots/07-ops.png', fullPage: true })

// 7. New support page
console.log('Navigating to support...')
await page.goto('https://1rstbank.bauerdavis-systems.com/support', { waitUntil: 'networkidle', timeout: 20000 })
await page.screenshot({ path: 'screenshots/08-support.png', fullPage: true })

await browser.close()
console.log('Done. Screenshots saved to ./screenshots/')
