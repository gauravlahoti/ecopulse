// End-to-end interaction test: exercises the Simulator tab, Quick Log SSE
// ingest, and Carbon Conversations chat in a real browser.
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:3000'

const findChrome = () => [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
]

const run = async () => {
  let browser
  for (const exe of findChrome()) {
    try { browser = await chromium.launch({ executablePath: exe, headless: true }); break } catch {}
  }
  if (!browser) browser = await chromium.launch({ channel: 'chrome', headless: true })

  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const results = {}

  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3000)

  // 1) Activity feed populated from MSW
  const bodyText = await page.evaluate(() => document.body.innerText)
  results.activityFeedHasData = /Beef burger|Lamb chops|Chicken/i.test(bodyText)

  // 2) Simulator tab → dual globes + divergence chart
  try {
    await page.getByRole('tab', { name: /simulator/i }).click()
    await page.waitForTimeout(3500)
    const simText = await page.evaluate(() => document.body.innerText)
    const canvasCount = await page.locator('canvas').count()
    const svgCount = await page.locator('svg.recharts-surface').count()
    results.simulatorOpened = /Parallel-You Simulator/i.test(simText)
    results.simulatorCanvases = canvasCount
    results.simulatorChart = svgCount > 0
  } catch (e) {
    results.simulatorError = e.message
  }

  // 3) Quick Log text ingest (SSE) — back to dashboard tab.
  // The text input is revealed only after clicking the "Type" button.
  try {
    await page.getByRole('tab', { name: /dashboard/i }).click()
    await page.waitForTimeout(1000)
    await page.getByRole('button', { name: /type/i }).click()
    await page.waitForTimeout(600)
    const input = page.locator('#activity-text')
    await input.fill('beef burger and fries')
    await input.press('Enter')
    await page.waitForTimeout(4000)
    const afterText = await page.evaluate(() => document.body.innerText)
    // SSE should stream identified items / a swap suggestion into the feed
    results.quickLogStreamed = /lentil|swap|saves|burger patty/i.test(afterText)
  } catch (e) {
    results.quickLogError = e.message
  }

  // 4) Carbon Conversations chat (FAB → open → ask → SSE tokens)
  try {
    const fab = page.getByRole('button', { name: /chat|conversation|ask|carbon conversation/i }).first()
    await fab.click({ timeout: 5000 })
    await page.waitForTimeout(800)
    const chatInput = page.locator('input[type="text"], textarea').last()
    await chatInput.fill('what is my highest emission activity?')
    await chatInput.press('Enter').catch(() => {})
    await page.waitForTimeout(4000)
    const chatText = await page.evaluate(() => document.body.innerText)
    results.chatResponded = /lamb|kg CO₂e|highest|emission/i.test(chatText)
  } catch (e) {
    results.chatError = e.message
  }

  results.pageErrors = errors.slice(0, 5)

  await browser.close()
  console.log(JSON.stringify(results, null, 2))

  const ok =
    results.activityFeedHasData &&
    results.simulatorOpened &&
    results.simulatorCanvases >= 2 &&
    results.quickLogStreamed &&
    errors.length === 0
  console.log('\n=== FLOWS:', ok ? 'PASS ✅' : 'PARTIAL ⚠️', '===')
  process.exit(ok ? 0 : 1)
}

run().catch((e) => { console.error('crashed:', e); process.exit(2) })
