# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development

- `yarn dev` - Start dev server (Vite)
- `yarn build` - Type-check and build for production
- `yarn preview` - Preview production build locally

### Code Quality

- `yarn lint` - Run ESLint
- `yarn lint:fix` - Fix ESLint issues automatically
- `yarn type-check` - Run TypeScript type checking without emitting
- `yarn format` - Format code with Prettier

### Testing

- `yarn test` - Run Playwright tests

## Architecture Overview

This is a **Voice-Activated Teleprompter** - a React SPA that auto-scrolls text as you read it aloud using the Web Speech API. The app builds to a single HTML file with all CSS/JS inlined for easy deployment.

### Tech Stack

- **React 19** with TypeScript
- **Redux Toolkit** for state management (modern `combineSlices` approach)
- **Vite** with `vite-plugin-singlefile` for single-file builds
- **Bulma CSS** for styling
- **Web Speech API** for voice recognition
- **marked.js** for markdown rendering

### State Management

Redux is configured in `/src/app/store.ts` using `combineSlices`. There are two feature slices:

1. **`navbarSlice`** (`/src/features/navbar/navbarSlice.ts`) - UI state
   - Playback status, edit mode
   - Font size, scroll offset preferences
   - Language selection (7 languages supported)
   - Translation settings

2. **`contentSlice`** (`/src/features/content/contentSlice.ts`) - Content and speech state
   - Raw text content
   - Speech recognition status and transcript index
   - Processed tokens (TextElement[])

Use typed hooks `useAppDispatch` and `useAppSelector` from `/src/app/hooks.ts`.

### Speech Recognition System

The core innovation is a robust speech-to-text matching algorithm that handles mispronunciations and off-script moments:

- **`SpeechRecognizer`** (`/src/lib/speech-recognizer.ts`) - Wraps Web Speech API, handles lifecycle
- **`SpeechMatcher`** (`/src/lib/speech-matcher.ts`) - Uses Levenshtein distance to match spoken words to text, continuing from last recognized position rather than resetting
- **Thunks** (`/src/app/thunks.ts`) - Async operations for starting/stopping recognition

### Content Processing Pipeline

Text flows through multiple processing stages:

1. **Tokenization** (`/src/lib/word-tokenizer.ts`) - Splits text into `TextElement[]` (words vs delimiters)
2. **Markdown Detection** - Auto-detects markdown, processes with marked.js if needed
3. **HTML Word Injection** (`/src/lib/html-word-injector.ts`) - Injects clickable word spans into rendered HTML
4. **Rendering** (`/src/features/content/Content.tsx`) - Displays content with scroll-to-word logic

### Scrolling Algorithm

- **Unidirectional**: Only scrolls forward during speech (prevents jumping back on recognition errors)
- **Click Navigation**: Clicking any word jumps the transcript index to that position
- **Smart Positioning**: Centers words based on scroll offset preference from navbar slice
- **Manual Mode**: Works without speech recognition (user can still scroll/click)

### Build Configuration

The app builds to a single HTML file using:

- `vite-plugin-singlefile` - Inlines all CSS and JS
- Custom Vite plugins in `/src/plugins/` - Fix crossorigin issues, CSS padding problems
- PostCSS with PurgeCSS - Removes unused Bulma styles

See `/vite.config.ts` for build configuration.

### Internationalization

Supports 7 languages: English, French, German, Italian, Portuguese, Spanish, Swedish.

Browser language detection with localStorage persistence. Placeholder text is translated in `/src/lib/placeholder-text.ts`.

### Key Files

- `/src/main.tsx` - React entry point with Redux provider
- `/src/App.tsx` - Main component, keyboard shortcuts (P key for play/pause)
- `/src/features/navbar/NavBar.tsx` - Controls and settings UI
- `/src/features/content/Content.tsx` - Text display and scrolling logic
- `/src/lib/markdown-processor.ts` - Markdown rendering with word span injection
- `/src/lib/chord-processor.ts` - Handles musical notation ([G], [C], etc.)

### Language Support Note

The app was tested only in Chrome. Web Speech API support varies by browser and language.
