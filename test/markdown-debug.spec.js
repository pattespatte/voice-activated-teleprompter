// Test debug mode with markdown content
// Run with: bunx playwright test test/markdown-debug.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode with Markdown', () => {
  test('should work with markdown song lyrics', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // Create markdown content for "Amazing Grace"
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

    // Upload the markdown file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'amazing-grace.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(markdownContent)
    });

    // Open navbar menu first
    await page.locator('button[aria-label="menu"]').click();

    // Click the upload button (the menu stays open after inner-button clicks)
    await page.locator('button[title="Upload text file"]').click();
    await page.waitForTimeout(500);

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();
    await expect(page.locator('.debug-panel')).toBeVisible();

    // Check initial state
    let info = await page.locator('.debug-info small').textContent();
    console.log('\n=== INITIAL STATE (Markdown) ===');
    console.log(info);
    console.log('===================================\n');

    // The text should have been stripped of markdown for speech recognition
    // So we should see "Amazing grace" not "**Key:** G Major"
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

    // Check that metadata like "**Key:** G Major" was skipped during speech
    // recognition. Assert against the accumulated transcript element only — the
    // debug panel's "Available text preview" intentionally shows the raw text,
    // which includes the metadata, so asserting on the whole panel is wrong.
    const accumulated = await page.locator('.debug-accumulated').textContent();
    expect(accumulated).toContain('Amazing grace');
    expect(accumulated).not.toContain('Key:');
  });

  test('should display formatted markdown while stripping for speech', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // Simple markdown test
    const markdownContent = `# Test Song

**Key:** C Major

## Verse 1

Amazing grace how sweet the sound`;

    // Upload markdown
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(markdownContent)
    });

    // Open navbar menu first
    await page.locator('button[aria-label="menu"]').click();

    await page.locator('button[title="Upload text file"]').click();
    await page.waitForTimeout(500);

    // Check that markdown is rendered (should have formatted elements)
    const content = page.locator('.content');
    await expect(content).toBeVisible();

    // Check for markdown content class
    const hasMarkdown = await page.locator('.markdown-content').count();
    console.log('Has markdown-content element:', hasMarkdown > 0);

    // Open debug panel (the menu is still open from the upload)
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // The debug panel should show the stripped text (without markdown)
    const info = await page.locator('.debug-info small').textContent();
    console.log('Debug info:', info);

    // Should show "Amazing grace" not "**Key:** C Major"
    expect(info).toContain('Amazing grace');
  });
});
