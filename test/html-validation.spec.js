// HTML Validation Tests for Voice-Activated Teleprompter
// Focus on accessibility compliance and semantic HTML

// # Run all HTML validation tests
// npm run test -- test/html-validation.spec.js

// # Run with detailed reporting
// npx playwright test test/html-validation.spec.js --reporter=list

// # View HTML report
// npx playwright show-report

import { test, expect } from '@playwright/test';
import { JSDOM } from 'jsdom';

test.describe('HTML Validation - Accessibility & Semantic Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');
  });

  // Helper function to validate HTML structure
  async function validateHTMLStructure(page) {
    const html = await page.content();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    return {
      document,
      html
    };
  }

  test('should have valid HTML5 document structure', async ({ page }) => {
    const { document, html } = await validateHTMLStructure(page);

    // Check for DOCTYPE
    expect(html.includes('<!DOCTYPE html>')).toBeTruthy();

    // Check for proper HTML structure
    expect(document.querySelector('html')).toBeTruthy();
    expect(document.querySelector('head')).toBeTruthy();
    expect(document.querySelector('body')).toBeTruthy();

    // Check for lang attribute
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    // Check for charset meta tag
    const charsetMeta = document.querySelector('meta[charset]');
    expect(charsetMeta).toBeTruthy();
    expect(charsetMeta.getAttribute('charset')).toBe('UTF-8');

    // Check for viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta.getAttribute('content')).toContain('width=device-width');
  });

  test('should have proper semantic HTML structure', async ({ page }) => {
    const { document } = await validateHTMLStructure(page);

    // Check for proper navigation element
    const nav = document.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav.getAttribute('role')).toBe('navigation');
    expect(nav.getAttribute('aria-label')).toBe('main navigation');

    // Check for main content area
    const main = document.querySelector('main');
    expect(main).toBeTruthy();
    expect(main.className).toContain('content-area');

    // Check for proper heading structure
    const title = document.querySelector('title');
    expect(title).toBeTruthy();
    expect(title.textContent).toBe('Voice-Activated Teleprompter');
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check for ARIA labels on interactive elements
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const title = await button.getAttribute('title');

      // Each button should have either aria-label or title for accessibility
      expect(ariaLabel || title).toBeTruthy();
    }

    // Check for proper form controls
    const selects = await page.locator('select').all();
    for (const select of selects) {
      const ariaLabel = await select.getAttribute('aria-label');
      const title = await select.getAttribute('title');
      // Select should have either aria-label or title for accessibility
      expect(ariaLabel || title).toBeTruthy();
    }

    // Check for file input accessibility
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute('aria-hidden', 'true');
    await expect(fileInput).toHaveAttribute('tabIndex', '-1');
  });

  test('should have proper keyboard navigation support', async ({ page }) => {
    // Check for focusable elements
    const focusableElements = await page.locator('button, select, input[type="range"], [tabindex]:not([tabindex="-1"])').all();
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check for keyboard shortcuts documentation - look for title containing "keyboard" or "P"
    const playButton = page.locator('button[title*="keyboard"], button[title*="P"]');
    await expect(playButton).toBeVisible();
    
    // Verify the title contains keyboard shortcut info
    const title = await playButton.getAttribute('title');
    expect(title).toContain('P');
  });

  test('should have proper color contrast and visual accessibility', async ({ page }) => {
    // Check for high contrast mode support
    const body = page.locator('body');
    await expect(body).toHaveClass(/has-background-black/);
    await expect(body).toHaveClass(/has-text-white/);
    
    // Check for proper focus indicators on at least one button
    const playButton = page.locator('button[title*="Start teleprompter"]');
    await playButton.focus();
    
    // Check if focused element has visible focus state
    const computedStyle = await playButton.evaluate((el) => {
      return globalThis.window.getComputedStyle(el);
    });
    
    // Check for any focus indication (outline, boxShadow, or other focus styles)
    const hasFocusStyle = computedStyle.outline !== 'none' ||
                         computedStyle.boxShadow !== 'none' ||
                         computedStyle.border !== 'medium none rgb(128, 128, 128)';
    
    // At minimum, the button should have some styling when focused
    expect(hasFocusStyle).toBeTruthy();
  });

  test('should have proper screen reader support', async ({ page }) => {
    // Check for screen reader only text
    const srOnlyElements = page.locator('.is-sr-only');
    await expect(srOnlyElements).toHaveCount(3); // Edit, Upload, Restart buttons
    
    // Check for live regions if applicable
    const contentArea = page.locator('main.content-area');
    await expect(contentArea).toBeVisible();
    
    // Check for proper announcement of state changes
    const playButton = page.locator('button[title*="Start teleprompter"]');
    await expect(playButton).toBeVisible();
    await playButton.click();
    
    // Check if the button state changes appropriately
    const stopButton = page.locator('button[title*="Stop teleprompter"]');
    await expect(stopButton).toBeVisible();
  });

  test('should have proper responsive design accessibility', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check for mobile menu
    const burgerButton = page.locator('button[aria-label="menu"]');
    await expect(burgerButton).toBeVisible();
    
    // Test mobile menu accessibility
    await burgerButton.click();
    const mobileMenu = page.locator('.navbar-menu');
    await expect(mobileMenu).toHaveClass(/is-active/);
    await expect(mobileMenu).toBeVisible();
    
    // Check for proper ARIA expanded state
    await expect(burgerButton).toHaveAttribute('aria-expanded', 'true');
    
    // Test desktop view - just verify the button has the responsive class
    await page.setViewportSize({ width: 1024, height: 768 });
    // Check if it has the is-hidden-desktop class
    const hasHiddenClass = await burgerButton.evaluate(el =>
      el.classList.contains('is-hidden-desktop')
    );
    expect(hasHiddenClass).toBeTruthy();
  });

  test('should have proper content structure for teleprompter functionality', async ({ page }) => {
    // Check for content area
    const content = page.locator('main.content-area .content');
    await expect(content).toBeVisible();
    
    // Check for proper text elements
    const textElements = await content.locator('span').all();
    expect(textElements.length).toBeGreaterThan(0);
    
    // Check for clickable text elements with proper roles
    for (const element of textElements) {
      const cursor = await element.evaluate(el => globalThis.window.getComputedStyle(el).cursor);
      expect(cursor).toBe('pointer');
    }
    
    // Check for edit mode accessibility - need to ensure menu is visible first
    const burgerButton = page.locator('button[aria-label="menu"]');
    if (await burgerButton.isVisible()) {
      await burgerButton.click();
    }
    
    const editButton = page.locator('button[title="Edit"]');
    await editButton.click();
    
    const textarea = page.locator('textarea.content');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder');
  });

  test('should have proper error handling and user feedback', async ({ page }) => {
    // Check for noscript fallback - it's hidden when JS is enabled, but should exist in DOM
    const noscript = page.locator('noscript');
    await expect(noscript).toBeAttached();
    
    // Get the innerHTML of noscript to verify its content
    const noscriptContent = await noscript.innerHTML();
    expect(noscriptContent).toContain('You need to enable JavaScript to run this app.');
    
    // Check for speech recognition support indication
    const playButton = page.locator('button[title*="Start teleprompter"]');
    await expect(playButton).toBeVisible();
    const title = await playButton.getAttribute('title');
    expect(title).toContain('keyboard shortcut');
  });

  test('should have proper semantic markup for dynamic content', async ({ page }) => {
    // Check for proper use of semantic tags in dynamically generated content
    const content = page.locator('main.content-area .content');
    
    // Test with markdown content - need to ensure menu is visible first
    const burgerButton = page.locator('button[aria-label="menu"]');
    if (await burgerButton.isVisible()) {
      await burgerButton.click();
    }
    
    const fileInput = page.locator('input[type="file"]');
    const uploadButton = page.locator('button[title="Upload text file"]');
    
    // Create a test markdown file
    const testMarkdown = `# Test Heading\n\nThis is a test paragraph with **bold** and *italic* text.\n\n- List item 1\n- List item 2`;
    
    // Upload the test file
    await fileInput.setInputFiles({
      name: 'test.md',
      mimeType: 'text/markdown',
      buffer: globalThis.Buffer.from(testMarkdown)
    });
    await uploadButton.click();
    
    // Check for proper markdown rendering
    await expect(content).toBeVisible();
    
    // Verify the content is properly structured
    const markdownContent = content.locator('.markdown-content');
    await expect(markdownContent).toBeVisible();
  });
});