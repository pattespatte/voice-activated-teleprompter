// Test the ?content=<url> query-parameter auto-load path.
// Run with: bunx playwright test --project=chromium test/url-param-load.spec.js

import { test, expect } from '@playwright/test'

const AMAZING_GRACE_URL =
  'https://raw.githubusercontent.com/pattespatte/voice-activated-teleprompter/refs/heads/main/content/public-domain/amazing-grace.md'

test.describe('URL-param content load (?content=)', () => {
  test('loads song from ?content= on page load with no click', async ({ page }) => {
    // Navigate with the content param — the app should fetch and render.
    await page.goto(`http://localhost:5173/?content=${encodeURIComponent(AMAZING_GRACE_URL)}`)
    await page.waitForSelector('.markdown-content', { timeout: 15000 })

    const html = await page.locator('.markdown-content').innerHTML()

    // Title renders (ChordPro {title: Amazing Grace} → <h1>)
    expect(html).toMatch(/Amazing Grace/)

    // Verse label renders ({start_of_verse: label="Verse 1"} → <h2>Verse 1</h2>)
    expect(html).toMatch(/Verse 1/)

    // Lyrics present (word-span injector splits words, check individually)
    expect(html).toMatch(/grace/)

    // Chords rendered as ruby
    expect(html).toContain('ruby')
    expect(html).toContain('rt>')

    // No raw directive text leaked
    expect(html).not.toContain('{title')
    expect(html).not.toContain('{start_of_verse')

    // The ?content= param persists in the URL (shareable/bookmarkable)
    expect(page.url()).toContain('content=')
  })

  test('shows visible error banner on network failure', async ({ page }) => {
    // Point at a port with nothing listening — deterministic network failure
    // (fetch throws TypeError), no external dependency or flakiness.
    await page.goto('http://localhost:5173/?content=http://localhost:9/nothing.md')
    await page.waitForSelector('.url-load-error-banner', { timeout: 15000 })

    const banner = page.locator('.url-load-error-banner')
    await expect(banner).toBeVisible()
    const text = await banner.textContent()
    expect(text.length).toBeGreaterThan(0)
    // Should mention cross-origin/CORS or unreachable
    expect(text).toMatch(/cross-origin|unreachable|load/i)
  })

  test('rejects non-http(s) schemes (javascript:)', async ({ page }) => {
    await page.goto('http://localhost:5173/?content=javascript:alert(1)')
    await page.waitForSelector('.url-load-error-banner', { timeout: 15000 })

    const banner = page.locator('.url-load-error-banner')
    await expect(banner).toBeVisible()
    const text = await banner.textContent()
    expect(text).toMatch(/http/i)
  })

  test('dismiss button clears the error banner', async ({ page }) => {
    await page.goto('http://localhost:5173/?content=javascript:alert(1)')
    await page.waitForSelector('.url-load-error-banner', { timeout: 15000 })

    await page.locator('.url-load-error-dismiss').click()
    await expect(page.locator('.url-load-error-banner')).toHaveCount(0)
  })
})
