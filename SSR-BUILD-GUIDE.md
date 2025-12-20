# SSR Build Guide for Voice-Activated Teleprompter

This guide explains how to build and use the Server-Side Rendering (SSR) version of the voice-activated teleprompter that works without an HTTP server.

## Overview

The SSR build creates a self-contained HTML file that can be opened directly in a browser using the `file://` protocol. All JavaScript, CSS, and other assets are inlined into a single file, making it fully portable.

## Building the SSR Version

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Build Process

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the SSR version:

   ```bash
   npm run build:ssr
   ```

3. Verify the build:

   ```bash
   node test-ssr.mjs
   ```

The build will create a `dist-ssr` directory containing:

- `index.html` - The self-contained application
- `icon-Dsr8upmd.png` - Application icon

## Using the SSR Build

### Direct Usage

1. Open the HTML file in your browser:

   ```
   file:///path/to/project/dist-ssr/index.html
   ```

2. The application will load and work without requiring a server.

### Distribution

The `dist-ssr/index.html` file can be:

- Shared with others
- Hosted on any static file server
- Opened directly from local storage
- Included in documentation or packages

## Features and Limitations

### Features

- ✅ Fully self-contained (no external dependencies)
- ✅ Works with `file://` protocol
- ✅ All JavaScript and CSS inlined
- ✅ Speech recognition with browser compatibility checks
- ✅ Relative paths for portability
- ✅ Fallback UI for unsupported browsers

### Limitations

- ⚠️ Speech recognition only works in supported browsers (Chrome, Edge)
- ⚠️ Larger file size due to inlined assets (~900KB)
- ⚠️ No hot-reloading or development features

## Browser Compatibility

### Supported Features

- Text input and editing
- Manual scrolling controls
- Keyboard shortcuts
- Visual feedback

### Speech Recognition

- **Full Support**: Chrome, Edge (WebKit-based browsers)
- **Limited Support**: Safari (may require HTTPS)
- **No Support**: Firefox (as of current version)

The application will show appropriate warnings when speech recognition is not available.

## Technical Implementation

### Build Configuration

The SSR build uses:

- `vite-plugin-singlefile` to inline all assets
- Custom Vite configuration in `vite.ssr.config.ts`
- Relative paths (`./`) for file:// protocol compatibility
- Terser for minification

### Key Files

- `vite.ssr.config.ts` - SSR-specific build configuration
- `src/lib/speech-recognizer.ts` - Speech recognition with compatibility checks
- `src/features/navbar/NavBar.tsx` - UI with fallback warnings
- `test-ssr.mjs` - Build validation script

## Troubleshooting

### Build Issues

1. **Dependencies not found**:

   ```bash
   npm install
   ```

2. **Build fails**:
   - Check Node.js version (v16+ required)
   - Clear node_modules and reinstall:

     ```bash
     rm -rf node_modules package-lock.json
     npm install
     ```

### Runtime Issues

1. **File not loading**:
   - Ensure you're opening `dist-ssr/index.html`
   - Check browser console for errors

2. **Speech recognition not working**:
   - Verify you're using a supported browser
   - Check for microphone permissions
   - Look for browser compatibility warnings

## Development vs. SSR Build

| Feature | Development Build | SSR Build |
|---------|-------------------|-----------|
| Server Required | Yes (npm run dev) | No |
| Hot Reload | Yes | No |
| File Size | Small (split chunks) | Large (single file) |
| Speech Recognition | Full | Full (with checks) |
| Portability | No | Yes |

## Contributing

When making changes that affect the SSR build:

1. Test with development server first
2. Build SSR version and validate:

   ```bash
   npm run build:ssr && node test-ssr.mjs
   ```

3. Test the SSR build in different browsers
4. Verify file:// protocol compatibility

## Automation

The `test-ssr.mjs` script validates:

- JavaScript and CSS inlining
- Relative path usage
- Speech recognition fallback implementation
- File size optimization

Include this in CI/CD pipelines to ensure SSR build quality.
