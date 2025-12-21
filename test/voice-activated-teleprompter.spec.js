// npx playwright test voice-activated-teleprompter.spec.js

import { test, expect } from '@playwright/test';

test.describe('Voice-Activated Teleprompter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('div.content-area');
  });

  test('should load page and display title', async ({ page }) => {
    await expect(page.locator('.navbar .title')).toContainText('Voice-Activated Teleprompter');
    await expect(page.locator('.navbar .title span.is-hidden-mobile')).toBeVisible(); // GitHub link
    await expect(page.locator('.navbar .title span.is-hidden-desktop')).toBeHidden(); // Desktop-only elements
  });

  test('should have language selector with default English', async ({ page }) => {
    const select = page.locator('.control select');
    await expect(select).toHaveValue('en-US');
    await expect(select).toHaveText('🇺🇸 English (USA)');
  });

  test('should change language', async ({ page }) => {
    const select = page.locator('.control select');
    await select.selectOption('fr-FR');
    await expect(select).toHaveValue('fr-FR');
    await expect(select).toHaveText('🇫🇷 French (France)');
  });

  test('should change font size', async ({ page }) => {
    const slider = page.locator('#font-size-slider');
    const fontSize = page.locator('.content');
    
    // Test increasing font size
    await slider.fill({ value: '60' });
    await fontSize.haveCSS('font-size', '60px');
    
    // Test decreasing font size
    await slider.fill({ value: '30' });
    await fontSize.haveCSS('font-size', '30px');
  });

  test('should change margin', async ({ page }) => {
    const slider = page.locator('#margin-slider');
    const content = page.locator('.content');
    
    // Test increasing margin
    await slider.fill({ value: '100' });
    await content.haveCSS('margin', '0px 0.25rem');
    
    // Test decreasing margin
    await slider.fill({ value: '10' });
    await content.haveCSS('margin', '0px 0.025rem');
  });

  test('should change brightness', async ({ page }) => {
    const slider = page.locator('#brightness-slider');
    await slider.fill({ value: '90' });
    await page.locator('.content').toHaveCSS('opacity', '0.9');
    
    await slider.fill({ value: '50' });
    await page.locator('.content').toHaveCSS('opacity', '0.5');
  });

  test('should change line position', async ({ page }) => {
    const slider = page.locator('#line-position-slider');
    await slider.fill({ value: '150' });
    await page.locator('.content').toHaveCSS('line-height', '2.4');
    
    await slider.fill({ value: '100' });
    await page.locator('.content').toHaveCSS('line-height', '1.6');
  });

  test('should restart from beginning', async ({ page }) => {
    const restartButton = page.locator('button[title="Restart from beginning"]');
    await restartButton.click();
    
    // Second restart
    await restartButton.click();
    
    // Verify we're still on same page
    await expect(page.locator('.navbar .title')).toContainText('Voice-Activated Teleprompter');
  });

  test('should handle file upload', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('button[title="Upload text file"]');
    
    // Create a test file
    const testFile = await page.evaluate(() => {
      return new Promise((resolve) => {
        const file = new globalThis.File(['test content'], { type: 'text/plain' });
        globalThis.setTimeout(() => resolve(file), 100);
      });
    });
    
    // Upload file
    await fileInput.setInputFiles([testFile]);
    await uploadButton.click();
    
    // Verify content appears
    await expect(page.locator('.content')).toContainText('test content');
  });

  test('should have edit functionality', async ({ page }) => {
    const editButton = page.locator('button[title="Edit"]');
    
    await editButton.click();
    const contentEditable = page.locator('.content[contenteditable="true"]');
    await contentEditable.fill('Test edit');
    await expect(contentEditable).toHaveValue('Test edit');
    
    // Save edit
    await page.keyboard.press('Control+s');
    await expect(contentEditable).toHaveValue('Test edit');
  });

  test('should have clickable elements', async ({ page }) => {
    const clickableElements = [
      '.navbar .title span.is-hidden-mobile', // GitHub link
      '.navbar .title span.is-hidden-desktop', // Desktop-only elements
      '.content span', // "Klicka"
      '.content span:nth-child(1)', // "å"
      '.content span:nth-child(2)', // "på"
      '.content span:nth-child(3)', // "Redigera"
      '.content span:nth-child(4)', // "och"
      '.content span:nth-child(5)', // "in"
      '.content span:nth-child(6)', // "nehåll"
      '.content span:nth-child(7)', // "här"
      '.content span:nth-child(8)', // "är"
      '.content span:nth-child(9)', // "..."
      '.content span:nth-child(10)' // "..."
    ];
    
    for (const selector of clickableElements) {
      const element = page.locator(selector);
      await element.click();
    }
  });

  test('should have working hamburger menu', async ({ page }) => {
    const burgerButton = page.locator('button[aria-label="menu"]');
    const mobileMenu = page.locator('.navbar-menu');
    
    // Initially hidden on desktop
    await expect(mobileMenu).not.toBeVisible();
    expect(page.locator('.is-hidden-desktop')).toBeVisible();
    expect(page.locator('.is-hidden-mobile')).not.toBeVisible();
    
    // Visible on mobile
    await page.setViewportSize({ width: 375 }); // Mobile width
    await burgerButton.click();
    await expect(mobileMenu).toBeVisible();
    
    // Toggle back
    await burgerButton.click();
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Desktop view
    await page.setViewportSize({ width: 1024 });
    await expect(page.locator('.is-hidden-desktop')).toBeVisible();
    expect(page.locator('.is-hidden-mobile')).not.toBeVisible();
    
    // Mobile view
    await page.setViewportSize({ width: 375 });
    expect(page.locator('.is-hidden-desktop')).not.toBeVisible();
    expect(page.locator('.is-hidden-mobile')).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for ARIA attributes
    // nav element should not have role attribute as it's semantically correct without it
    await expect(page.locator('nav')).toBeAttached();
    await expect(page.locator('nav[role="navigation"]')).not.toBeAttached();
    await expect(page.locator('button[aria-label*=""]')).toHaveAttribute('aria-label');
    await expect(page.locator('select[aria-label="Select Language"]')).toHaveAttribute('aria-label');
    await expect(page.locator('input[aria-label="Upload text file"]')).toHaveAttribute('aria-label');
    await expect(page.locator('button[aria-label="Restart from beginning"]')).toHaveAttribute('aria-label');
    
    // Check for keyboard navigation support
    const restartButton = page.locator('button[title="Restart from beginning"]');
    await expect(restartButton).toHaveAttribute('shortcut', 'P'); // P key
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**network-error**');
    await page.waitForSelector('.navbar .title', { state: 'hidden' });
    await expect(page.locator('.navbar .title')).toBeHidden();
    
    // Verify error handling
    await expect(page.locator('.content')).toContainText('Error loading content');
  });

  test('should handle file processing', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    const content = page.locator('.content');
    
    // Upload a large file
    const largeFileContent = new Array(10000).fill('x').join('');
    const largeFile = {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(largeFileContent) // eslint-disable-line no-undef
    };
    
    await fileInput.setInputFiles([largeFile]);
    await page.locator('button[title="Upload text file"]').click();
    
    // Verify processing
    await expect(content).toContainText('Processing file...');
    await expect(content).toContainText('File processed successfully');
  });
});
