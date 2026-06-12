import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Homepage smoke tests', () => {
  test('loads and displays the EcoPulse brand', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/EcoPulse/i)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText('EcoPulse')).toBeVisible()
  })

  test('has no accessibility violations (axe-core)', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('skip-to-content link is the first focusable element', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('href'))
    expect(focused).toBe('#main-content')
  })

  test('dashboard link is keyboard reachable', async ({ page }) => {
    await page.goto('/')
    // Tab through to the dashboard link
    let found = false
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab')
      const tag = await page.evaluate(() => document.activeElement?.textContent?.trim())
      if (tag?.toLowerCase().includes('dashboard')) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })
})

test.describe('Gateway health', () => {
  test('gateway health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('ok')
  })
})
