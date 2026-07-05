// Test the new "+ Add & Simulate" functionality
// Run with: bunx playwright test test/debug-accumulate.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode - Accumulate & Simulate', () => {
  test('should accumulate words and progress through text', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open by default.
    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();
    await expect(page.locator('.debug-panel')).toBeVisible();

    // Get initial state
    let info = await page.locator('.debug-info small').textContent();
    console.log('\n=== INITIAL STATE ===');
    console.log(info);
    console.log('=====================\n');

    // Test word-by-word accumulation
    const words = ['Click', 'on', 'the', 'Edit', 'button'];

    for (const word of words) {
      // Type the word
      await page.locator('.debug-textarea').fill(word);

      // Click "+ Add & Simulate" button
      await page.locator('button:has-text("+ Add & Simulate")').click();

      // Wait for the update
      await page.waitForTimeout(300);

      // Get the current state
      info = await page.locator('.debug-info small').textContent();
      const indexMatch = info.match(/Current transcript index:\s*(-?\d+)/);
      const index = indexMatch ? parseInt(indexMatch[1], 10) : -1;

      // Check if accumulated transcript is shown
      const accumulatedText = await page.locator('.debug-panel').textContent();
      const hasAccumulated = accumulatedText.includes('Accumulated transcript:');

      console.log(`After adding "${word}":`);
      console.log(`  Index: ${index}`);
      console.log(`  Has accumulated display: ${hasAccumulated}`);

      if (hasAccumulated) {
        const accumMatch = accumulatedText.match(/Accumulated transcript:\s*"([^"]*)"/);
        if (accumMatch) {
          console.log(`  Accumulated: "${accumMatch[1]}"`);
        }
      }
    }

    // Check that we progressed
    info = await page.locator('.debug-info small').textContent();
    const finalMatch = info.match(/Current transcript index:\s*(-?\d+)/);
    const finalIndex = finalMatch ? parseInt(finalMatch[1], 10) : -1;

    console.log('\n=== FINAL STATE ===');
    console.log(`Final index: ${finalIndex}`);
    console.log('====================\n');

    // The index should have progressed
    expect(finalIndex).toBeGreaterThan(0);

    // Check for accumulated transcript display
    const panelText = await page.locator('.debug-panel').textContent();
    expect(panelText).toContain('Accumulated transcript:');
  });

  test('should reset accumulated transcript', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open by default.
    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Add some words
    await page.locator('.debug-textarea').fill('Click');
    await page.locator('button:has-text("+ Add & Simulate")').click();
    await page.waitForTimeout(300);

    await page.locator('.debug-textarea').fill('on');
    await page.locator('button:has-text("+ Add & Simulate")').click();
    await page.waitForTimeout(300);

    // Check that accumulated transcript is shown
    let panelText = await page.locator('.debug-panel').textContent();
    expect(panelText).toContain('Accumulated transcript:');

    // Click Reset button
    await page.locator('button:has-text("Reset")').click();
    await page.waitForTimeout(300);

    // Check that accumulated transcript is gone
    panelText = await page.locator('.debug-panel').textContent();
    expect(panelText).not.toContain('Accumulated transcript:');

    // Check that index is reset to -1
    const info = await page.locator('.debug-info small').textContent();
    const indexMatch = info.match(/Current transcript index:\s*(-?\d+)/);
    const index = indexMatch ? parseInt(indexMatch[1], 10) : -999;
    expect(index).toBe(-1);
  });

  test('should show all debug buttons', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open by default.
    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Check for all buttons
    await expect(page.locator('button:has-text("Simulate Speech")')).toBeVisible();
    await expect(page.locator('button:has-text("+ Add & Simulate")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Input")')).toBeVisible();
  });
});
