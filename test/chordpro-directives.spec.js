// Test full ChordPro directive support per chordpro.org spec.
// Run with: bunx playwright test test/chordpro-directives.spec.js

import { test, expect } from '@playwright/test'

/**
 * Upload markdown content and dismiss the ChordPro confirm banner if it
 * appears. Returns once the rendered markdown is visible.
 */
const uploadMarkdown = async (page, content, filename = 'test.md') => {
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  })
  await page.locator('button[title="Upload text file"]').click()
  await page.waitForTimeout(300)

  // The ChordPro confirm banner may appear. Dismiss it (it renders anyway,
  // but dismissing avoids the banner obscuring the content area).
  const correctBtn = page.locator('button:has-text("Correct")')
  if (await correctBtn.isVisible().catch(() => false)) {
    await correctBtn.click()
    await page.waitForTimeout(200)
  }

  await page.waitForSelector('.markdown-content')
}

/**
 * Open the metadata popover and return its visible text. Assumes the popover
 * button is present (i.e. the content has metadata).
 */
const getPopoverText = async (page) => {
  await page.locator('.meta-info-button').click()
  await page.waitForSelector('.meta-info-popover')
  return page.locator('.meta-info-popover').textContent()
}

test.describe('ChordPro Directive Support', () => {
  test('label="..." argument renders as just the label text', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test Song}
{start_of_verse: label="Verse 1"}
[G]Some [C]lyrics [G]here
{end_of_verse}
{start_of_chorus: label="Refrain"}
[G]Chorus [C]line
{end_of_chorus}
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()

    // The label text must appear as a header
    expect(html).toMatch(/Verse 1/) // appears in heading
    expect(html).toMatch(/Refrain/)

    // The raw argument syntax must NOT leak
    expect(html).not.toContain('label=')
    expect(html).not.toContain('{start_of_verse')
    expect(html).not.toContain('{end_of_verse')
    expect(html).not.toContain('{start_of_chorus')
    expect(html).not.toContain('{end_of_chorus')
  })

  test('bare value argument form also works', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test Song}
{sov: Verse 1}
[G]Some [C]lyrics [G]here
{eov}
{soc: Refrain}
[G]Chorus [C]line
{eoc}
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).toMatch(/Verse 1/)
    expect(html).toMatch(/Refrain/)
    expect(html).not.toContain('{sov')
    expect(html).not.toContain('{soc')
  })

  test('single-quoted label argument works', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{start_of_verse: label='Verse 2'}
lyrics here
{end_of_verse}
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).toMatch(/Verse 2/)
    expect(html).not.toContain('label=')
  })

  test('bare environment directive uses default label', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{start_of_verse}
lyrics here
{end_of_verse}
{start_of_chorus}
chorus line
{end_of_chorus}
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).toMatch(/Verse/)
    expect(html).toMatch(/Chorus/)
    expect(html).not.toContain('{start_of')
  })

  test('bridge environment is recognized', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{start_of_bridge: label="Bridge"}
bridge lyrics
{end_of_bridge}
{sob: Pre-Chorus}
short bridge
{eob}
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).toMatch(/Bridge/)
    expect(html).toMatch(/Pre-Chorus/)
    expect(html).not.toContain('{start_of_bridge')
    expect(html).not.toContain('{sob')
  })

  test('silent directives are consumed and do not leak', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{key: G}
{time: 3/4}
{tempo: 120}
{capo: 2}
{composer: Trad}
{chordfont: Arial}
{chordsize: 14}
{textcolour: blue}
{new_page}
{column_break}
{define: Am x02210}
{transpose: 2}
visible lyrics
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()

    // Title renders
    expect(html).toMatch(/Test/)

    // Lyrics present (word-span injector may split words, so check "visible"
    // and "lyrics" separately rather than as a contiguous string)
    expect(html).toMatch(/visible/)
    expect(html).toMatch(/lyrics/)

    // None of the silent directive text leaks
    expect(html).not.toContain('{key')
    expect(html).not.toContain('{time')
    expect(html).not.toContain('{capo')
    expect(html).not.toContain('{composer')
    expect(html).not.toContain('{chordfont')
    expect(html).not.toContain('{define')
    expect(html).not.toContain('{transpose')
  })

  test('x_* custom directives are ignored per spec', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{x_custom_directive: some value}
{x_app_special}
visible lyrics
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).not.toContain('{x_')
    expect(html).not.toContain('x_custom')
  })

  test('chorus directive replays previous chorus', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{start_of_chorus: Refrain}
[G]Chorus [C]words
{end_of_chorus}
{start_of_verse: label="Verse 1"}
verse lyrics
{end_of_verse}
{chorus}
`
    await uploadMarkdown(page, content)

    // Count headings. The rendered structure should have:
    // h1 "Test", h2 "Refrain", h2 "Verse 1", h2 "Chorus" (the replay)
    const h2Count = await page.locator('.markdown-content h2').count()

    // Refrain + Verse 1 + Chorus (replay) = 3 h2 headings
    expect(h2Count).toBeGreaterThanOrEqual(3)

    // The last h2 should be the replayed "Chorus"
    const h2Texts = await page.locator('.markdown-content h2').allTextContents()
    expect(h2Texts[h2Texts.length - 1]).toMatch(/Chorus/i)

    // Raw directive must not leak
    const html = await page.locator('.markdown-content').innerHTML()
    expect(html).not.toContain('{chorus}')
  })

  test('column_break and new_page render as horizontal rule', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
first part
{column_break}
second part
{new_page}
third part
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()

    // Both directives should produce <hr> separators
    const hrCount = (html.match(/<hr/g) || []).length
    expect(hrCount).toBeGreaterThanOrEqual(2)

    // All three parts present (word-span injector splits words, so check
    // words individually rather than as contiguous strings)
    expect(html).toMatch(/first/)
    expect(html).toMatch(/part/)
    expect(html).toMatch(/second/)
    expect(html).toMatch(/third/)

    // Raw directives must not leak
    expect(html).not.toContain('{column_break')
    expect(html).not.toContain('{new_page')
  })

  test('conditional selector postfix is stripped (comment-alto)', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Test}
{comment-alto: Alto note here}
lyrics
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()
    // comment is popover-only now — must NOT render in the reading view
    expect(html).not.toMatch(/Alto note here/)
    expect(html).not.toContain('{comment-alto')

    // ...but it surfaces in the metadata popover (selector postfix stripped → "comment")
    const popoverText = await getPopoverText(page)
    expect(popoverText).toMatch(/Alto note here/)
  })

  test('amazing-grace.md fixture renders clean (long-form tags)', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Amazing Grace}
{key: G}
{time: 3/4}
{subtitle: Traditional Hymn}
{composer: John Newton}
{year: 1779}
{comment: Originally titled "Faith's Review and Expectation"}

{start_of_chorus: Refrain}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a wretch like [D]me
[G]I once was [G7]lost, but [C]now am [G]found
Was [G]blind, but [D]now I [G]see
{end_of_chorus}

{start_of_verse: label="Verse 1"}
[G]'Twas [G7]grace that [C]taught my [G]heart to fear
And [G]grace my [D]fears relieved
{end_of_verse}
`
    await uploadMarkdown(page, content, 'amazing-grace.md')

    const html = await page.locator('.markdown-content').innerHTML()

    // Title renders; subtitle/comment/metadata are popover-only (not in reading view)
    expect(html).toMatch(/Amazing Grace/)
    expect(html).not.toMatch(/Traditional Hymn/)
    expect(html).not.toMatch(/Originally titled/)

    // Labeled sections
    expect(html).toMatch(/Refrain/)
    expect(html).toMatch(/Verse 1/)

    // Lyrics (word-span injector splits words, so check individually)
    expect(html).toMatch(/Amazing/)
    expect(html).toMatch(/grace/)

    // No raw directive text
    expect(html).not.toContain('{')
    expect(html).not.toContain('label=')

    // Chords rendered (ruby elements)
    expect(html).toContain('ruby')
    expect(html).toContain('rt>')

    // The hidden metadata (subtitle, composer, year, comment) is in the popover
    const popoverText = await getPopoverText(page)
    expect(popoverText).toMatch(/Traditional Hymn/)
    expect(popoverText).toMatch(/John Newton/)
    expect(popoverText).toMatch(/1779/)
    expect(popoverText).toMatch(/Originally titled/)
  })

  test('subtitle and comment are hidden from content but shown in metadata popover', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('main.content-area')

    const content = `{title: Title Shows}
{subtitle: Hidden Subtitle}
{comment: Hidden Cue One}
lyrics here
{comment: Mid-song cue}
more lyrics
`
    await uploadMarkdown(page, content)

    const html = await page.locator('.markdown-content').innerHTML()

    // Title renders in the reading view
    expect(html).toMatch(/Title Shows/)

    // subtitle and comment do NOT render in the reading view
    expect(html).not.toMatch(/Hidden Subtitle/)
    expect(html).not.toMatch(/Hidden Cue One/)
    expect(html).not.toMatch(/Mid-song cue/)

    // Raw directive text never leaks
    expect(html).not.toContain('{subtitle')
    expect(html).not.toContain('{comment')

    // Both surface in the popover; multiple comments are collected (not truncated)
    const popoverText = await getPopoverText(page)
    expect(popoverText).toMatch(/Hidden Subtitle/)
    expect(popoverText).toMatch(/Hidden Cue One/)
    expect(popoverText).toMatch(/Mid-song cue/)
  })
})
