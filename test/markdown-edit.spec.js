// Test debug mode with markdown content using Edit mode
// Run with: bunx playwright test test/markdown-edit.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode with Markdown (Edit Mode)', () => {
  test('should work with markdown song lyrics', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open. Click Edit (the toolbar buttons are
    // already visible) to enter edit mode.
    await page.locator('button[title="Edit"]').click();

    // Paste markdown content
    const markdownContent = `# Amazing Grace

**Key:** G Major
**Time:** 3/4 (Waltz)

## Verse 1

[G]                  [G7]
Amazing grace! How sweet the sound
[C]                   [G]
That saved a wretch like me!

[G]                       [D]    [D7]
I once was lost, but now am found;
[G]         [G7]       [C]      [G]
Was blind, but now I see.
`;

    // Type or paste the content in the textarea
    const textarea = page.locator('textarea.content');
    await textarea.fill(markdownContent);

    // Click Edit (labelled "Save" while editing) again to commit and exit edit
    // mode. This also auto-collapses the navbar menu (to give the text room),
    // so the debug button below needs the menu reopened first.
    await page.locator('button[title="Edit"]').click();
    await expect(page.locator('textarea.content')).not.toBeVisible({ timeout: 3000 });

    // Reopen the menu, then open the debug panel.
    await page.locator('button[aria-label="menu"]').click();
    await page.locator('button[aria-label="Toggle debug mode"]').click();
    await expect(page.locator('.debug-panel')).toBeVisible({ timeout: 3000 });

    // Check initial state
    let info = await page.locator('.debug-info small').textContent();
    console.log('\n=== INITIAL STATE (Markdown via Edit) ===');
    console.log(info);
    console.log('===========================================\n');

    // Check that markdown is rendered
    const hasMarkdownContent = await page.locator('.markdown-content').count();
    console.log('Has markdown-content element:', hasMarkdownContent > 0);

    // The text preview should show "Amazing grace" not "**Key:** G Major"
    const textPreview = await page.locator('.debug-info small').textContent();
    console.log('Text preview:', textPreview);

    // Test with lyrics from the song
    const lyrics = ['Amazing', 'grace', 'How', 'sweet', 'the', 'sound'];

    for (const word of lyrics) {
      await page.locator('.debug-textarea').fill(word);
      await page.locator('button:has-text("+ Add & Simulate")').click();
      await page.waitForTimeout(300);

      info = await page.locator('.debug-info small').textContent();
      const indexMatch = info.match(/Current transcript index:\s*(-?\d+)/);
      const index = indexMatch ? parseInt(indexMatch[1], 10) : -1;

      const panelText = await page.locator('.debug-panel').textContent();
      const accumMatch = panelText.match(/Accumulated transcript:\s*"([^"]*)"/);
      const accumulated = accumMatch ? accumMatch[1] : '';

      console.log(`After "${word}": index=${index}, accumulated="${accumulated}"`);
    }

    // Final state
    info = await page.locator('.debug-info small').textContent();
    const finalMatch = info.match(/Current transcript index:\s*(-?\d+)/);
    const finalIndex = finalMatch ? parseInt(finalMatch[1], 10) : -1;

    console.log('\n=== FINAL STATE ===');
    console.log(`Final index: ${finalIndex}`);
    console.log('==================\n');

    // Should have progressed
    expect(finalIndex).toBeGreaterThan(0);

    // Check that metadata was skipped during speech recognition. Assert against
    // the accumulated transcript element only — the debug panel's "Available text
    // preview" intentionally shows the raw text, which includes the metadata.
    const accumulated = await page.locator('.debug-accumulated').textContent();
    expect(accumulated).toContain('Amazing grace');
    expect(accumulated).not.toContain('Key:');
    expect(accumulated).not.toContain('Time:');

    console.log('✓ Metadata successfully stripped from speech recognition');
    console.log('✓ Debug mode works with markdown content');
  });

  test('should display formatted markdown while debugging', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open; the toolbar buttons are already visible.
    await page.locator('button[title="Edit"]').click();

    // Type markdown content
    const markdownContent = `# Test Song

**Key:** C Major

## Verse 1

Amazing grace how sweet the sound`;

    const textarea = page.locator('textarea.content');
    await textarea.fill(markdownContent);

    // Click Edit (now labelled "Save") to commit and exit edit mode.
    // (There is no Ctrl+S binding; the Edit button toggle is the save action.)
    await page.locator('button[title="Edit"]').click();
    await expect(page.locator('textarea.content')).not.toBeVisible({ timeout: 3000 });

    // Check that markdown is rendered
    const hasH1 = await page.locator('.markdown-content h1').count();
    const hasH2 = await page.locator('.markdown-content h2').count();
    const hasStrong = await page.locator('.markdown-content strong').count();

    console.log('Has h1:', hasH1 > 0);
    console.log('Has h2:', hasH2 > 0);
    console.log('Has strong (bold):', hasStrong > 0);

    expect(hasH1).toBeGreaterThan(0);
    expect(hasH2).toBeGreaterThan(0);

    // Check for visible formatted elements
    await expect(page.locator('.markdown-content')).toContainText('Test Song');
    await expect(page.locator('.markdown-content')).toContainText('Amazing grace how sweet the sound');
  });
});
