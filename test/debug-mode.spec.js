// Debug Mode Test for Voice-Activated Teleprompter
// Run with: bunx playwright test test/debug-mode.spec.js

import { test, expect } from '@playwright/test';

test.describe('Debug Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');
  });

  test('should have debug toggle button in navbar', async ({ page }) => {
    // First open the navbar menu (it's hidden by default on desktop)
    const burgerButton = page.locator('button[aria-label="menu"]');
    await burgerButton.click();

    // Look for the debug button (bug emoji)
    const debugButton = page.locator('button[aria-label="Toggle debug mode"]');
    await expect(debugButton).toBeVisible();
    await expect(debugButton).toHaveText(/🐛/);
  });

  test('should open debug panel when clicking debug button', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    const debugButton = page.locator('button[aria-label="Toggle debug mode"]');

    // Click the debug button
    await debugButton.click();

    // Debug panel should now be visible
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toBeVisible();

    // Check for the debug header
    await expect(debugPanel.locator('h3')).toContainText('Debug Mode');
  });

  test('should close debug panel when clicking close button', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    const debugButton = page.locator('button[aria-label="Toggle debug mode"]');

    // Open debug panel
    await debugButton.click();
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toBeVisible();

    // Close debug panel using the delete/close button
    await debugPanel.locator('.delete').click();
    await expect(debugPanel).not.toBeVisible();
  });

  test('should have textarea and simulate button in debug panel', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Check for textarea
    const textarea = page.locator('.debug-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /Type a word or phrase/);

    // Check for Simulate Speech button
    const simulateButton = page.locator('.button:has-text("Simulate Speech")');
    await expect(simulateButton).toBeVisible();

    // Check for Clear button
    const clearButton = page.locator('.button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
  });

  test('should be able to type in debug textarea', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Type in textarea
    const testText = 'Amazing grace how sweet the sound';
    const textarea = page.locator('.debug-textarea');
    await textarea.fill(testText);

    await expect(textarea).toHaveValue(testText);
  });

  test('should show transcript index in debug panel', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    // Open debug panel
    await page.locator('button[aria-label="Toggle debug mode"]').click();

    // Check for transcript index display
    const debugInfo = page.locator('.debug-info small');
    await expect(debugInfo).toBeVisible();
    await expect(debugInfo).toContainText('Current transcript index:');
  });

  test('debug button should be highlighted when active', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    const debugButton = page.locator('button[aria-label="Toggle debug mode"]');

    // Initially not highlighted
    await expect(debugButton).not.toHaveClass(/is-warning/);

    // Click to activate
    await debugButton.click();

    // Should now be highlighted
    await expect(debugButton).toHaveClass(/is-warning/);
  });

  test('should close debug panel when clicking toggle button again', async ({ page }) => {
    // First open the navbar menu
    await page.locator('button[aria-label="menu"]').click();

    const debugButton = page.locator('button[aria-label="Toggle debug mode"]');

    // Open debug panel
    await debugButton.click();
    const debugPanel = page.locator('.debug-panel');
    await expect(debugPanel).toBeVisible();

    // Click toggle button again to close
    await debugButton.click();
    await expect(debugPanel).not.toBeVisible();
  });
});
