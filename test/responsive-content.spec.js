// Regression test: markdown content must fit the viewport width (no
// horizontal clipping) at desktop and mobile sizes.
// Run with: bunx playwright test test/responsive-content.spec.js

import { test, expect } from '@playwright/test';

// Long ChordPro lines, a trailing chord cluster, and one very long plain
// word — the three cases that used to overflow the right edge.
const SONG = `# Responsive Test

[C]Last night I said these words to [F]my [C]girl:

Come [F]on, (come on), come [Dm]on, (come on), come [Am]on, (come on), come [F]on, (come on),

[C] [G7] [D] [Eb]

[F]I don't want to sound complainin', [G7]it's supercalifragilisticexpialidocious [C]end
`;

async function loadSong(page) {
  // Load through the dev-mode Redux store hook (documented in README.md for
  // silent testing) — the file-upload button sits in the collapsible navbar
  // menu and is not reachable at narrow viewports.
  await page.evaluate(
    content => {
      window.__store__.dispatch({
        type: 'content/setContent',
        payload: { content, isMarkdown: true },
      })
    },
    SONG,
  );
  await page.waitForSelector('.markdown-content p');
}

test.describe('Responsive content', () => {
  for (const [width, height] of [
    [1280, 800],
    [768, 1024],
    [390, 844],
    [320, 568],
  ]) {
    test(`markdown fits viewport at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('http://localhost:5173/');
      await page.waitForSelector('main.content-area');
      await loadSong(page);

      const m = await page.evaluate(() => {
        const content = document.querySelector('.content');
        const p = document.querySelector('.markdown-content p');
        return {
          scrollWidth: content.scrollWidth,
          clientWidth: content.clientWidth,
          whiteSpace: p ? getComputedStyle(p).whiteSpace : null,
          fontSize: getComputedStyle(content).fontSize,
        };
      });

      // Lyric lines soft-wrap instead of forming one unbreakable row
      expect(m.whiteSpace).toBe('pre-wrap');
      // The font-size slider value flows through --content-font-size
      expect(m.fontSize).toBe('30px');
      // Nothing is clipped on the right
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth + 1);
    });
  }
});
