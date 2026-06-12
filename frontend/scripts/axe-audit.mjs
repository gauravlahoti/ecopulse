/**
 * Axe-core accessibility audit — runs against the built Next.js app.
 * Fails with exit code 1 if any WCAG 2.2 AA violations are found.
 */
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES = ['/', '/dashboard']
const BASE_URL = process.env['BASE_URL'] ?? 'http://localhost:3000'

async function runAudit() {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  let totalViolations = 0

  for (const path of PAGES) {
    const page = await context.newPage()
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()

    if (results.violations.length > 0) {
      console.error(`\n❌ ${path} — ${results.violations.length} violation(s):\n`)
      results.violations.forEach((v) => {
        console.error(`  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description}`)
        v.nodes.slice(0, 2).forEach((n) => {
          console.error(`    → ${n.html.slice(0, 100)}`)
        })
      })
      totalViolations += results.violations.length
    } else {
      console.log(`✅ ${path} — zero violations`)
    }

    await page.close()
  }

  await browser.close()

  if (totalViolations > 0) {
    console.error(`\n🚫 Total: ${totalViolations} violation(s). Fix before submitting.\n`)
    process.exit(1)
  } else {
    console.log('\n🎉 All pages passed axe-core WCAG 2.2 AA audit.\n')
  }
}

runAudit().catch((err) => {
  console.error(err)
  process.exit(1)
})
