// Debug Console Test - Check what's happening when simulating speech
// Run with: bunx playwright test test/debug-console.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode - Console Logging', () => {
  test('should log debug information when simulating speech', async ({ page }) => {
    // Collect console logs
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // Open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Wait for debug panel to be visible
    await expect(page.locator('.debug-panel')).toBeVisible();

    // Check the initial state
    const initialText = await page.locator('.debug-info small').textContent();
    console.log('Initial debug info:', initialText);

    // Type some lyrics that match the default text
    const testLyrics = 'Click on the Edit button and paste your content here';
    await page.locator('.debug-textarea').fill(testLyrics);

    // Click Simulate Speech button
    await page.locator('button:has-text("Simulate Speech")').click();

    // Wait a bit for the logs
    await page.waitForTimeout(500);

    // Check console logs
    console.log('\n=== Browser Console Logs ===');
    const debugLogs = consoleLogs.filter(log => /debug/i.test(log.text));
    debugLogs.forEach(log => {
      console.log(`[${log.type}] ${log.text}`);
    });
    console.log('============================\n');

    // Check the debug info after simulation
    const afterText = await page.locator('.debug-info small').textContent();
    console.log('Debug info after simulation:', afterText);

    // Verify we got some debug logs
    expect(debugLogs.length).toBeGreaterThan(0);

    // Check for specific log messages
    const logText = debugLogs.map(l => l.text).join('\n');
    expect(logText).toContain('DEBUG MODE: Simulating Speech');
    expect(logText).toContain('Debug transcript:');
  });

  test('should show warning when teleprompter is running', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // Open the debug panel first (the toggle lives inside the navbar menu, which
    // is collapsed until the burger is clicked). Opening the burger would also
    // stop a running teleprompter via toggleMobileMenu, so we open debug first,
    // then start playback so the warning is shown reactively.
    await page.locator('button[aria-label="menu"]').click();
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Start the teleprompter with the debug panel already open.
    await page.locator('button[aria-label*="Start teleprompter"]').click();

    // Check for warning message
    const warningText = await page.textContent('.debug-panel');
    expect(warningText).toContain('Warning');
    expect(warningText).toContain('Teleprompter is currently running');
    expect(warningText).toContain('Actual speech recognition will override debug mode');
  });

  test('should show available text preview in debug panel', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // Open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Check for debug info
    const debugInfo = await page.locator('.debug-info small').textContent();
    console.log('\n=== Debug Panel Info ===');
    console.log(debugInfo);
    console.log('========================\n');

    expect(debugInfo).toContain('Current transcript index:');
    expect(debugInfo).toContain('Total text elements:');
    expect(debugInfo).toContain('Status:');
    expect(debugInfo).toContain('Available text preview:');
  });
});
