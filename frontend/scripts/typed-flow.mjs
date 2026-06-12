// Drive the dashboard: empty state → type an activity → verify transparent breakdown.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const CHROMES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
]
let browser
for (const exe of CHROMES) { try { browser = await chromium.launch({ executablePath: exe, headless: true }); break } catch {} }
if (!browser) browser = await chromium.launch({ channel: 'chrome', headless: true })

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${OUT}/dash-empty.png`, fullPage: true })
const emptyText = await page.evaluate(() => document.body.innerText)
console.log('empty state has Welcome:', /Welcome to EcoPulse/i.test(emptyText))

// Open Describe, type, calculate
await page.getByRole('button', { name: /Describe/i }).click()
await page.waitForTimeout(400)
await page.fill('#activity-text', 'I travelled from Mumbai to Delhi in a car petrol')
await page.getByRole('button', { name: 'Calculate', exact: true }).click()
await page.waitForFunction(() => /How this was calculated/i.test(document.body.innerText), { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(800)

const afterText = await page.evaluate(() => document.body.innerText)
await page.screenshot({ path: `${OUT}/dash-typed.png`, fullPage: true })

console.log('shows "How this was calculated":', /How this was calculated/i.test(afterText))
console.log('shows DEFRA source:', /DEFRA 2024/i.test(afterText))
console.log('shows × factor math:', /×/.test(afterText))
console.log('beef present:', /Beef/i.test(afterText))
console.log('console errors:', errors.length)
errors.slice(0, 6).forEach((e) => console.log('  •', e.slice(0, 160)))

await browser.close()
