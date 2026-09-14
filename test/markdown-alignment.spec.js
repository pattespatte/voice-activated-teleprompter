// Regression test: rendered markdown lyric rows are flush left. Paragraphs
// used to carry a 2em hanging indent (padding-left + negative text-indent)
// intended for soft-wrapped continuation rows, but a stanza renders as one
// <p> with <br>-separated lines, so every lyric line after the first sat 2em
// to the right. Also guards the HTML validation fixes (favicon data URI,
// redundant button role).
// Run with: bunx playwright test test/markdown-alignment.spec.js

import { test, expect } from '@playwright/test';

// ChordPro test song with directive headers, inline chords, and no blank
// lines between lyric lines — the whole body renders as a single <p> with
// <br> separators, the exact shape that exposed the indent.
const SONG = `{title: 1960}
{artist: America}
{meta: spotify 1uWtiecGoeWarPyLJzaplD}
{album: Silent Letter}
{year: 1979}
{meta: source https://www.chordie.com/chord.pere/www.azchords.com/a/america-tabs-196/19601-tabs-843418.html}

[AM7]How 'bout a tear
for the [G#m7]year of 1960
[F#m7]I watched the fins
of the [E]Cadillac [E7]fall
[AM7]I remember Dad ex[G#m7]plained
about the Berlin [D]Wall[A] [-] [E]
[AM7]How 'bout a tear
for the [G#m7]torment and the trouble
[F#m7]That was brewing in the [E]Asian [E7]way
[AM7]I wore a smile
like the [G#m7]faces that surround [D]L.A.[A] [-] [E]
[D]In the city of the [Ddim]lost and found
[C#m7]It's hard to get a [F#m7]break[F#m] [-] [E]
[D]Hard to stop from getting [Ddim]turned around
[C#m7]And make the same mis[F#7]takes
[A]My reputation's [E/G#]on the line
[F#m7]The final day of '[E]59[F#m7] [-] [E/G#]
[A]But like the sun, just [E/G#]watch me shine
To[D]day[A-E]
[AM7]How 'bout a cheer for the [G#m7]piano virtuoso
[F#m7]I practiced 61 [E]minutes a [E7]day
[AM7]I could never reach the [G#m7]keys
But it was all [D]OK[A-E]
[AM7]How 'bout a cheer for the [G#m7]humor in my brother
[F#m7]That could brighten up the d[E]arkest [E7]nights
[AM7]It's just another sign of [G#m7]love
Whenever we would [D]fight[A] [-] [E]
[D]It's all the same twenty [Ddim]years ago
[C#m7]As it is right[F#m7] now[F#m-E]
[D]Like a tour at the [Ddim]closing show
[C#m7]When I take my [F#7]bow
[A]My reputation's [E/G#]on the line
[F#m7]At the start of '7[E]9[F#m7] [-] [E/G#]
[A]But like the sun, just [E/G#]watch me shine
Tod[D]ay[A-E]
[A]I've played this part so [E/G#]many times
[F#m7]Since the end of '5[E]9[F#m7] [-] [E/G#]
[A]But like the sun, just [E/G#]watch me shine
`;

test.describe('Markdown alignment', () => {
  test('lyric rows are flush left with no indent', async ({ page }, testInfo) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');
    await page.evaluate(
      content => {
        window.__store__.dispatch({
          type: 'content/setContent',
          payload: { content, isMarkdown: true },
        });
      },
      SONG,
    );
    await page.waitForSelector('.markdown-content p');

    // The hanging indent is gone from the stylesheet
    const p = page.locator('.markdown-content p').first();
    const styles = await p.evaluate(el => {
      const cs = getComputedStyle(el);
      return { paddingLeft: cs.paddingLeft, textIndent: cs.textIndent };
    });
    expect(styles.paddingLeft).toBe('0px');
    expect(styles.textIndent).toBe('0px');

    // Every visual row starts at the same left edge: collect the client
    // rects of every text fragment in the paragraph (skipping chord
    // annotations in <rt>, which sit above the line), cluster them into
    // rows by vertical position (rows are >= ~39px apart at the default
    // font size), and compare each row's leftmost fragment with the first
    // row's. With the old hanging indent, every row after the first sat 2em
    // (~60px) to the right. Text fragments are used instead of
    // [data-word-index] spans because the word injector does not wrap every
    // word (a separate, pre-existing matching desync).
    const rowLefts = await p.evaluate(el => {
      const rects = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: node =>
          node.parentElement.closest('rt')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (r.width > 0) rects.push({ top: r.top, left: r.left });
        }
      }
      rects.sort((a, b) => a.top - b.top);
      const rows = [];
      for (const item of rects) {
        const current = rows[rows.length - 1];
        if (current && Math.abs(item.top - current.top) < 5) {
          current.left = Math.min(current.left, item.left);
        } else {
          rows.push({ top: item.top, left: item.left });
        }
      }
      return rows.map(row => row.left);
    });
    expect(rowLefts.length).toBeGreaterThan(5);
    const spread = Math.max(...rowLefts) - Math.min(...rowLefts);
    expect(spread).toBeLessThan(1);

    // For visual comparison with the reported screenshot
    await testInfo.attach('test-song-rendered', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  });

  test('html validation regressions', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('main.content-area');

    // The favicon data URI must not contain raw spaces (validator error).
    // getAttribute returns the raw string; the href IDL property would
    // silently serialize spaces as %20 and false-pass.
    const iconHref = await page.evaluate(() =>
      document.querySelector('link[rel="icon"]').getAttribute('href'),
    );
    expect(iconHref).not.toContain(' ');

    // A native <button> must not carry a redundant role
    const role = await page.locator('button.play-button').getAttribute('role');
    expect(role).toBeNull();
  });
});
