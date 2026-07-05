// Verbose Debug Test - Capture all console output
// Run with: bunx playwright test test/debug-verbose.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode - Verbose Logging', () => {
  test('should capture all debug logs', async ({ page }) => {
    // Collect ALL console logs
    const allLogs = [];
    page.on('console', msg => {
      allLogs.push({
        type: msg.type(),
        text: msg.text(),
        args: msg.args().map(arg => arg.toString()),
      });
    });

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open by default.
    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();
    await expect(page.locator('.debug-panel')).toBeVisible();

    // Get initial text from debug panel
    const initialInfo = await page.locator('.debug-info small').textContent();
    console.log('\n=== INITIAL DEBUG PANEL STATE ===');
    console.log(initialInfo);
    console.log('=====================================\n');

    // Type some lyrics that match the default text
    const testLyrics = 'Click on the Edit button and paste your content here';
    await page.locator('.debug-textarea').fill(testLyrics);
    console.log('Typed in textarea:', testLyrics);

    // Click Simulate Speech button
    await page.locator('button:has-text("Simulate Speech")').click();

    // Wait for logs to be captured
    await page.waitForTimeout(1000);

    // Check the debug info after simulation
    const afterInfo = await page.locator('.debug-info small').textContent();
    console.log('\n=== AFTER SIMULATION ===');
    console.log(afterInfo);
    console.log('==========================\n');

    // Print all console logs
    console.log('\n=== ALL CONSOLE LOGS ===');
    console.log(`Total logs captured: ${allLogs.length}`);
    allLogs.forEach((log, idx) => {
      console.log(`[${idx}] [${log.type}] ${log.text}`);
      if (log.args.length > 0) {
        console.log(`    Args: ${log.args.join(', ')}`);
      }
    });
    console.log('=========================\n');

    // The key thing: check if the index changed
    const indexMatch = afterInfo.match(/Current transcript index:\s*(-?\d+)/);
    expect(indexMatch, 'index regex should match debug info').not.toBeNull();
    const newIndex = parseInt(indexMatch[1], 10);
    console.log('New transcript index:', newIndex);
    expect(newIndex).toBeGreaterThan(-1); // Should have moved from -1
  });

  test('test incremental simulation', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The navbar menu starts open by default.
    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Simulate speech incrementally - word by word
    const words = ['Click', 'on', 'the', 'Edit', 'button'];

    for (const word of words) {
      await page.locator('.debug-textarea').fill(word);
      await page.locator('button:has-text("Simulate Speech")').click();
      await page.waitForTimeout(200);

      const info = await page.locator('.debug-info small').textContent();
      const indexMatch = info.match(/Current transcript index:\s*(-?\d+)/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1], 10);
        console.log(`After "${word}": index = ${index}`);
      }
    }

    // Final index should be greater than initial
    const finalInfo = await page.locator('.debug-info small').textContent();
    const finalMatch = finalInfo.match(/Current transcript index:\s*(-?\d+)/);
    expect(finalMatch, 'index regex should match debug info').not.toBeNull();
    const finalIndex = parseInt(finalMatch[1], 10);
    console.log('Final index:', finalIndex);
    expect(finalIndex).toBeGreaterThan(0);
  });
});
