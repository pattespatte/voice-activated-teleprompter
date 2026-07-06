# AGENTS.md

This document provides guidelines for agentic coding assistants working on this repository.

## Project Overview

**Voice-Activated Teleprompter** — a Vite + React 19 + Redux Toolkit + TypeScript
single-page app that auto-scrolls text as you read aloud, using the Web Speech API.
Based on [Julien Lecomte's original](https://github.com/jlecomte/voice-activated-teleprompter).

The production build is bundled into a **single self-contained HTML file** (CSS, JS,
and assets inlined) via `vite-plugin-singlefile`. See [Build Output](#build-output)
for why this matters when editing code and styles.

## Build, Lint, and Test Commands

> **Package manager:** `bun` is the preferred runner (consistent with `README.md`,
> `CLAUDE.md`, and the global ZCode preference). `npm` also works — the repo ships a
> `package-lock.json`. (Note: `package.json` declares `yarn` as `packageManager`, but
> there is no `yarn.lock`; this is contradictory legacy metadata, not a real yarn setup.)

### Core Commands

- `bun run dev` — Start Vite dev server (<http://localhost:5173>)
- `bun run build` — Type-check (`tsc`) and build the single-file production bundle
- `bun run preview` — Preview the production build locally
- `bun run test` — Run Playwright tests (starts the dev server automatically via `webServer`)

### Linting and Formatting

- `bun run lint` — Run ESLint checks
- `bun run lint:fix` — Auto-fix ESLint issues
- `bun run type-check` — Run TypeScript type checking without emitting
- `bun run format` — Format code with Prettier

> **ESLint config:** ESLint 9 flat config in `eslint.config.js` is active. The legacy
> `.eslintrc.json` is unused and can be ignored (do not rely on it). A notable rule is
> enforced via `@typescript-eslint/no-restricted-imports`: **never** import
> `useSelector` / `useStore` / `useDispatch` from `react-redux` directly — use the
> pre-typed hooks from `src/app/hooks.ts`.

### Running Single Tests

Playwright tests run via `bun run test`. To run a specific test file:

```bash
bunx playwright test test-file-name.js
```

To run tests with a specific browser:

```bash
bunx playwright test --project=chromium
bunx playwright test --project=firefox
bunx playwright test --project=webkit
```

## Code Style Guidelines

### Formatting

- **No semicolons** - Enforced by Prettier config
- **Avoid arrow function parens when possible** - `(arg) => {}` over `(arg) => ({} )`
- **2-space indentation** - Default TypeScript/React standard

### TypeScript and Types

- **Separate type imports** - Use `import type { ... }` for type-only imports
- **Explicit type annotations** - Add types for function parameters and return values
- **Interface for shapes, type for unions** - Use `interface` for object shapes, `type` for unions/aliases
- **Use type inference wisely** - Let TypeScript infer when obvious, be explicit when complex

### React Patterns

- **Functional components with hooks only** - No class components
- **useLayoutEffect for DOM measurements** - Prefer over useEffect for layout calculations
- **refs for direct DOM access** - Use `useRef<HTMLElementType | null>(null)` pattern
- **Memoization only when needed** - Don't prematurely optimize

### Redux/State Management

- **Use pre-typed hooks** - Import `useAppDispatch` and `useAppSelector` from `src/app/hooks.ts`
- **Do NOT import from react-redux directly** - Use typed hooks from `app/hooks.ts` (also enforced by ESLint)
- **`combineSlices` pattern** - The store in `src/app/store.ts` uses `combineSlices(...)`,
  not `combineReducers`. Add new slices there.
- **`createAppSlice`** - Use `createAppSlice()` from `src/app/createAppSlice.ts` for slices
- **Selector naming** - Use `select{StateName}` pattern (e.g., `selectStatus`, `selectRawText`)
- **Action naming** - Use `set{StateName}`, `toggle{Feature}`, `reset{State}` patterns
- **Thunk naming** - Use `verb{Feature}` pattern (e.g., `startTeleprompter`, `changeLanguage`, `loadContentFromUrl`).
  Async thunks that callers branch on return a typed promise — see `loadContentFromUrl`,
  which returns `Promise<string | null>` (`null` = success, error string = failure) so
  callers don't need a racy selector read.
- **Store exposed for testing** - `window.__store__` is set in `store.ts` so the Redux store
  can be driven from the browser console (see "Silent Testing" in `README.md`).

### Naming Conventions

- **Components**: PascalCase (e.g., `NavBar`, `Content`, `App`)
- **Functions/Variables**: camelCase (e.g., `tokenize`, `handleFileUpload`)
- **Types/Interfaces**: PascalCase (e.g., `TextElement`, `ContentSliceState`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `SUPPORTED_LOCALES`)
- **Selectors**: `select{PropertyName}` pattern
- **Actions**: descriptive camelCase matching state changes

### Import Organization

1. React imports first
2. Third-party libraries
3. Local app imports (store, hooks, thunks)
4. Feature imports (sorted by feature)
5. Relative imports

Example:

```typescript
import { useEffect } from "react"
import { escape } from "html-escaper"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { setContent } from "./contentSlice"
```

### File Structure

- `src/app/` - Redux configuration, store, hooks, thunks
- `src/features/{featureName}/` - Feature slices and components:
  - `content/` - `Content.tsx`, `contentSlice.ts`, `ChordProConfirmBanner.tsx`
  - `navbar/` - `NavBar.tsx`, `navbarSlice.ts`, `UrlLoadErrorBanner.tsx`
  - `debug/` - `DebugPanel.tsx`, `debugSlice.ts` (dev tool for simulating speech input)
- `src/lib/` - Pure utilities and helpers:
  - `word-tokenizer.ts` - Splits text into `TextElement[]` (tokens vs delimiters)
  - `speech-recognizer.ts` - Wraps the Web Speech API lifecycle
  - `speech-matcher.ts` - Levenshtein-based matcher, advances from last position
  - `levenshtein.ts` - Edit-distance implementation used by the matcher
  - `markdown-processor.ts` - Renders Markdown with marked.js
  - `html-word-injector.ts` - Injects clickable word spans into rendered HTML
- `test/` - Playwright E2E tests

### Content Sources

Content enters the app via three paths that all funnel into the same slice actions:

- **Manual edit** - Paste/type into the content area (Edit mode)
- **File upload** - File input (`NavBar`) reads via `FileReader`
- **URL load** - The `loadContentFromUrl` thunk (`src/app/thunks.ts`) is shared by the
  "Load from URL" button **and** the `?content=<url>` query-param auto-load path. It
  validates the scheme is `http(s)`, fetches, infers markdown from the pathname
  (`.md`/`.markdown`), and dispatches `setContent` + `resetTranscriptionIndices`. On any
  failure (bad scheme, HTTP non-2xx, CORS/network) it dispatches `setUrlLoadError`, which
  `UrlLoadErrorBanner.tsx` surfaces as a dismissable `role="alert"` banner. The query
  param stays in the address bar on success (shareable/bookmarkable).

### Content Processing Pipeline

Text flows through several stages; keep this order in mind when changing content handling:

1. **Ingestion** - One of the sources above populates `rawText` in `contentSlice`
2. **Tokenization** (`src/lib/word-tokenizer.ts`) - Splits raw text into `TextElement[]`
3. **Markdown detection & rendering** (`src/lib/markdown-processor.ts`) - Auto-detects
   Markdown and renders with `marked`
4. **ChordPro detection** - On paste, `[G]`/`[C]`-style chords are detected and a confirm
   banner (`ChordProConfirmBanner.tsx`) is shown; chords are positioned above lyrics.
   ChordPro **directives** are routed by `stripChordProDirectives` in
   `src/lib/markdown-processor.ts`: only `title` and the structural section labels
   (`{start_of_chorus}`, `{start_of_verse}`, `{start_of_bridge}`, …) render as headers
   in the reading view. Every other metadata directive — `subtitle`, `comment`, `key`,
   `time`, `composer`, `year`, `capo`, etc. — is **silent** (consumed, not shown) and
   surfaced instead in the ℹ metadata popover (`Content.tsx`, via
   `parseAllMetadata`/`parseChordProDirectives`). `comment` collects every occurrence
   (frontmatter + mid-song cues) into the popover; other keys keep the first value.
5. **HTML word injection** (`src/lib/html-word-injector.ts`) - Clickable per-word spans
6. **Rendering** (`src/features/content/Content.tsx`) - Display + scroll-to-word logic

### Scrolling Behavior

- **Unidirectional** - Only scrolls forward during speech; prevents jumping back on
  recognition errors
- **Click navigation** - Clicking a word resets the transcript index to that position
- **Smart positioning** - Centers the active word based on the scroll-offset preference

### Error Handling

- **Development logging only** - Check `process.env.NODE_ENV === 'development'` before console.warn/error
- **Graceful degradation** - Handle unsupported features (e.g., speech recognition) with warnings
- **Type guards** - Use type guards for runtime type checking
- **Null checks** - Check for null/undefined before access (e.g., `fileInputRef.current?.click()`)

### Accessibility

- **ARIA attributes** - Always include `aria-label`, `aria-expanded`, `role` where appropriate
- **Keyboard navigation** - Ensure all interactive elements work with keyboard (e.g., **P** toggles play/pause)
- **Screen reader support** - Use `is-sr-only` class for screen-reader-only text
- **Semantic HTML** - Use `<nav>`, `<main>`, `<button>` elements correctly

### Browser APIs

- **Speech Recognition** - Web Speech API (`webkitSpeechRecognition`); requires a secure
  context (HTTPS or localhost). Will not work from `file://`.
- **Local Storage** - Persist user preferences in localStorage
- **File Reader API** - Handle file uploads with FileReader
- **Check support** - Always verify browser support before using APIs

### CSS/Styling

> **There is NO CSS framework installed.** Bulma is **not** a dependency, despite the
> class names looking like Bulma. The `is-*`, `has-*`, `navbar-*`, `button`, etc. classes
> are **hand-written SCSS** in `src/index.scss` that intentionally mimic Bulma's naming.
> Do **not** `npm install bulma` — add new styles to `src/index.scss` (or component SCSS)
> following the existing patterns.

- **Custom styles** - Add in `src/index.scss` or component-specific SCSS
- **Responsive design** - Use the existing responsive modifiers (`is-hidden-mobile`, etc.)
- **Flexbox/Grid** - Prefer the existing utility classes over custom CSS

#### PurgeCSS — read this before adding dynamic classes

Production builds run PostCSS + PurgeCSS (`postcss.config.mjs`). Class names that appear
only in JS/TS (not in static HTML) are stripped unless they match a safelist pattern.
The safelist includes `/^is-/`, `/^final-transcript/`, `/^interim-transcript/`,
`has-text-white`, `navbar-burger`, `navbar-menu`, `navbar-brand`, `navbar-end`,
`is-active`, `content`, `button`, `markdown-content`, `is-sr-only`, `/^meta-info/`,
plus standard CSS variables/keyframes/font-face.

- New dynamic class names **must** either appear verbatim in the source files PurgeCSS
  scans (`index.html`, `src/**/*.{js,ts,jsx,tsx}`, `content/**/*.md`) or be added to the
  `safelist` in `postcss.config.mjs`, otherwise they silently disappear in production.
  (The `.url-load-error-*` classes introduced for URL loading are safe: they appear
  verbatim in `UrlLoadErrorBanner.tsx` + `index.scss`, so PurgeCSS keeps them.)
- The `is-*` prefix is safelisted precisely so the Bulma-style helpers survive — keep
  new helper classes under that prefix.

### Internationalization

- **Language detection** - Auto-detect from `navigator.language`, falling back to `en-US`
- **Persist language** - Save to localStorage as `teleprompter-language`
- **Supported locales** - 7 locales defined in `navbarSlice.ts` as `SUPPORTED_LOCALES`:
  English (US), French (FR), German (DE), Italian (IT), Portuguese (BR), Spanish (ES), Swedish (SE)
- **Translatable content** - Initial/placeholder text lives in the feature slices (no
  separate `placeholder-text.ts` module exists)

### Comments and Documentation

- **No inline comments** - Don't add comments unless explaining complex logic
- **JSDoc sparingly** - Only for public API surfaces
- **Descriptive naming** - Prefer self-documenting code over comments

### Testing

- **Playwright E2E tests** - Browser automation tests in `test/`
- **Test structure** - Separate test files for different features
- **Run all tests before commits** - Ensure tests pass when making changes

## Build Output

- The app builds to a **single HTML file** in `dist/` via `vite-plugin-singlefile` —
  all CSS and JS is inlined.
- `vite.config.ts` contains custom post-build plugins that strip `crossorigin` attributes
  from inlined `<style>` tags and rewrite invalid `padding: auto` rules emitted by some
  inlining. Keep these in mind if changing the HTML/CSS build pipeline.
- Production minification uses Terser.

## Important Notes

- This is a **single-page application** built with Vite + React
- Uses **ESM modules** (`"type": "module"` in package.json)
- **TypeScript strict mode** enabled - must satisfy the type checker
- Development server auto-reloads on file changes
- Speech recognition only works reliably in **Chromium-based browsers** (Chrome, Edge);
  the app was tested primarily in Chrome
