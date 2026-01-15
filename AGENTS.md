# AGENTS.md

This document provides guidelines for agentic coding assistants working on this repository.

## Build, Lint, and Test Commands

### Core Commands

- `npm run dev` - Start Vite dev server (http://localhost:5173)
- `npm run build` - Type-check and build for production
- `npm run preview` - Preview production build locally
- `npm run test` - Run Playwright tests (starts dev server automatically)

### Linting and Formatting

- `npm run lint` - Run ESLint checks
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run type-check` - Run TypeScript type checking without emitting
- `npm run format` - Format code with Prettier

### Running Single Tests

Playwright tests run via `npm run test`. To run a specific test file:

```bash
npx playwright test test-file-name.js
```

To run tests with a specific browser:

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
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
- **Do NOT import from react-redux directly** - Use typed hooks from `app/hooks.ts`
- **createAppSlice pattern** - Use `createAppSlice()` from `src/app/createAppSlice.ts` for slices
- **Selector naming** - Use `select{StateName}` pattern (e.g., `selectStatus`, `selectRawText`)
- **Action naming** - Use `set{StateName}`, `toggle{Feature}`, `reset{State}` patterns
- **Thunk naming** - Use `verb{Feature}` pattern (e.g., `startTeleprompter`, `changeLanguage`)

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
- `src/features/{featureName}/` - Feature slices and components (e.g., `content/`, `navbar/`)
- `src/lib/` - Pure utilities and helpers (e.g., `word-tokenizer.ts`, `speech-recognizer.ts`)
- `test/` - Playwright E2E tests

### Error Handling

- **Development logging only** - Check `process.env.NODE_ENV === 'development'` before console.warn/error
- **Graceful degradation** - Handle unsupported features (e.g., speech recognition) with warnings
- **Type guards** - Use type guards for runtime type checking
- **Null checks** - Check for null/undefined before access (e.g., `fileInputRef.current?.click()`)

### Accessibility

- **ARIA attributes** - Always include `aria-label`, `aria-expanded`, `role` where appropriate
- **Keyboard navigation** - Ensure all interactive elements work with keyboard
- **Screen reader support** - Use `is-sr-only` class for screen-reader-only text
- **Semantic HTML** - Use `<nav>`, `<main>`, `<button>` elements correctly

### Browser APIs

- **Speech Recognition** - Web Speech API (webkitSpeechRecognition)
- **Local Storage** - Persist user preferences in localStorage
- **File Reader API** - Handle file uploads with FileReader
- **Check support** - Always verify browser support before using APIs

### CSS/Styling

- **Bulma CSS framework** - Use Bulma classes for layout and components
- **Custom styles** - Add in `src/index.scss` or component-specific SCSS
- **Responsive design** - Use Bulma's responsive modifiers (`is-hidden-mobile`, etc.)
- **Flexbox/Grid** - Prefer Bulma's utility classes over custom CSS

### Internationalization

- **Language detection** - Auto-detect from `navigator.language`
- **Persist language** - Save to localStorage as `teleprompter-language`
- **Supported locales** - Defined in `navbarSlice.ts` as `SUPPORTED_LOCALES`
- **Translatable content** - Use language dictionary pattern for initial text

### Comments and Documentation

- **No inline comments** - Don't add comments unless explaining complex logic
- **JSDoc sparingly** - Only for public API surfaces
- **Descriptive naming** - Prefer self-documenting code over comments

### Testing

- **Playwright E2E tests** - Browser automation tests in `test/` directory
- **Test structure** - Separate test files for different features
- **Run all tests before commits** - Ensure tests pass when making changes

## Important Notes

- This is a **single-page application** built with Vite + React
- Uses **ESM modules** (`"type": "module"` in package.json)
- **TypeScript strict mode** enabled - must satisfy type checker
- Development server auto-reloads on file changes
- Build output goes to `dist/` directory
- Speech recognition only works in **Chromium-based browsers** (Chrome, Edge)
