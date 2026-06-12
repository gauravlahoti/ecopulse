// Upload a real food photo → verify the annotated scan overlay + transparent breakdown.
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const IMG = process.argv[2]
const CHROMES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
]
let browser
for (const exe of CHROMES) { try { browser = await chromium.launch({ executablePath: exe, headless: true }); break } catch {} }
if (!browser) browser = await chromium.launch({ channel: 'chrome', headless: true })

const page = await browser.newPage({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 2 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(1200)

// Upload the photo into the hidden file input
await page.setInputFiles('input[type=file]', IMG)

// Wait for the scan dialog + results (allow time for the Gemini call)
await page.waitForSelector('[role=dialog]', { timeout: 15000 })
const ok = await page.waitForFunction(
  () => /RESULTS|COULDN/i.test(document.querySelector('[role=dialog]')?.textContent || ''),
  { timeout: 60000 },
).catch(() => null)

await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/photo-annotated.png` })

const dialogText = await page.evaluate(() => document.querySelector('[role=dialog]')?.textContent || '')
const boxes = await page.evaluate(() => {
  const d = document.querySelector('[role=dialog]')
  return d ? d.querySelectorAll('div[style*="border-color"], div[style*="borderColor"]').length : 0
})
console.log('reached results/error:', !!ok)
console.log('shows How this was calculated:', /How this was calculated/i.test(dialogText))
console.log('shows DEFRA:', /DEFRA/i.test(dialogText))
console.log('dialog text (trim):', dialogText.replace(/\s+/g, ' ').slice(0, 260))
console.log('console errors:', errors.length)
errors.slice(0, 6).forEach((e) => console.log('  •', e.slice(0, 160)))

await browser.close()
