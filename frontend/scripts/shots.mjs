// Capture screenshots + console errors via system Chrome (headless).
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = 'http://localhost:3000'
const OUT = process.argv[2] || '.shots'
mkdirSync(OUT, { recursive: true })

const CHROMES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
]

const TARGETS = [
  { route: '/', name: 'landing-1920', vp: { width: 1920, height: 1080 } },
  { route: '/', name: 'landing', vp: { width: 1440, height: 900 } },
  { route: '/', name: 'landing-mobile', vp: { width: 390, height: 844 } },
  { route: '/dashboard', name: 'dashboard', vp: { width: 1440, height: 900 } },
  { route: '/dashboard', name: 'dashboard-mobile', vp: { width: 390, height: 844 } },
]

let browser
for (const exe of CHROMES) {
  try { browser = await chromium.launch({ executablePath: exe, headless: true }); break } catch {}
}
if (!browser) browser = await chromium.launch({ channel: 'chrome', headless: true })

let anyError = false
for (const t of TARGETS) {
  const page = await browser.newPage({ viewport: t.vp, deviceScaleFactor: 2 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto(BASE + t.route, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(1500)

  // Scroll through the page so GSAP ScrollTrigger reveals + CountUp observers
  // all fire, then return to top — mirrors what a real visitor sees.
  await page.evaluate(async () => {
    const h = document.body.scrollHeight
    for (let y = 0; y <= h; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 180))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 400))
  })
  await page.waitForTimeout(800)

  // Full-page shot
  await page.screenshot({ path: `${OUT}/${t.name}.png`, fullPage: true })
  // Above-the-fold shot
  await page.screenshot({ path: `${OUT}/${t.name}-fold.png`, fullPage: false })

  console.log(`\n=== ${t.name} (${t.vp.width}×${t.vp.height}) ===`)
  console.log('  console errors:', errors.length)
  errors.slice(0, 8).forEach((e) => console.log('    •', e.slice(0, 180)))
  if (errors.length) anyError = true
  await page.close()
}

await browser.close()
console.log('\nRESULT:', anyError ? 'ERRORS ❌' : 'CLEAN ✅')
process.exit(0)
