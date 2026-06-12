// Headless browser smoke test — catches CLIENT-side runtime errors that an
// HTTP 200 check misses (e.g. R3F hydration crashes). Uses the system Chrome.
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:3000'
const ROUTES = ['/', '/dashboard']

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ]
  return candidates
}

const run = async () => {
  let browser
  for (const exe of findChrome()) {
    try {
      browser = await chromium.launch({ executablePath: exe, headless: true })
      break
    } catch {
      // try next
    }
  }
  if (!browser) {
    browser = await chromium.launch({ channel: 'chrome', headless: true })
  }

  let failed = false

  for (const route of ROUTES) {
    const page = await browser.newPage()
    const errors = []
    const failed404 = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
    page.on('requestfailed', (r) => failed404.push(r.url()))
    page.on('response', (r) => { if (r.status() === 404) failed404.push(r.url()) })

    await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 })
    // Give R3F / client effects time to mount and potentially crash
    await page.waitForTimeout(4000)

    // A REAL Next.js error overlay renders a dialog with error text inside the
    // portal. The portal itself always exists in dev (it also hosts the dev
    // indicator), so detect the actual error dialog text instead.
    const overlayText = await page
      .evaluate(() => {
        const portal = document.querySelector('nextjs-portal')
        const root = portal && portal.shadowRoot
        return root ? root.textContent || '' : ''
      })
      .catch(() => '')
    const hasErrorOverlay =
      /Unhandled Runtime Error|Build Error|Failed to compile|ReactCurrentOwner/i.test(overlayText)

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400))
    const hasReactCurrentOwner = errors.some((e) => e.includes('ReactCurrentOwner'))
    const canvasCount = await page.locator('canvas').count().catch(() => 0)

    // On the dashboard, confirm the MSW mock data actually loaded (total != 0).
    let dataLoaded = true
    if (route === '/dashboard') {
      const activitiesOk = await page
        .evaluate(async () => {
          try {
            const r = await fetch('/api/v1/activities')
            if (!r.ok) return false
            const j = await r.json()
            return Array.isArray(j.activities) && j.activities.length > 0
          } catch {
            return false
          }
        })
        .catch(() => false)
      dataLoaded = activitiesOk
    }

    const routeFailed = hasErrorOverlay || hasReactCurrentOwner || !dataLoaded
    if (routeFailed) failed = true
    if (route === '/dashboard') console.log('  MSW activities loaded:', dataLoaded)

    console.log(`\n=== ${route} ===`)
    console.log('  real error overlay:', hasErrorOverlay)
    console.log('  ReactCurrentOwner error:', hasReactCurrentOwner)
    console.log('  <canvas> elements:', canvasCount)
    console.log('  console errors:', errors.length)
    errors.slice(0, 6).forEach((e) => console.log('    •', e.slice(0, 160)))
    console.log('  404 / failed requests:', [...new Set(failed404)].join(', ') || 'none')
    console.log('  body preview:', JSON.stringify(bodyText.replace(/\s+/g, ' ').slice(0, 140)))

    await page.close()
  }

  await browser.close()
  console.log('\n=== RESULT:', failed ? 'FAIL ❌' : 'PASS ✅', '===')
  process.exit(failed ? 1 : 0)
}

run().catch((e) => {
  console.error('verify-browser crashed:', e)
  process.exit(2)
})
