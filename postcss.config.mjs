import { purgeCSSPlugin as purgecss } from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    purgecss({
      content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
        './content/**/*.md',
      ],
      defaultExtractor: content => {
        // Extract as much as possible from content files
        const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || []
        const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || []
        return broadMatches.concat(innerMatches)
      },
      safelist: [
        // Keep patterns that might be dynamically added
        /^--/,
        /^is-/,
        // Markdown-generated element selectors: these elements only exist in
        // dangerouslySetInnerHTML output, never in the scanned source files,
        // so purgecss would strip their rules from production builds
        'h1',
        'pre',
        'table',
        'img',
        'video',
        'has-text-white',
        'has-background-black',
        'navbar-burger',
        'navbar-menu',
        'navbar-brand',
        'navbar-end',
        'is-active',
        'content',
        'button',
        'markdown-content',
        /^final-transcript/,
        /^interim-transcript/,
        /^animate/,
        'is-sr-only',
        /^meta-info/,
      ],
      // Keep CSS keyframes that might be used
      keyframes: true,
      // Keep font faces
      fontFace: true,
      // Don't remove variables
      variables: true,
      // Add more aggressive options
      rejected: true,
      rejectedCss: true,
    }),
  ],
};