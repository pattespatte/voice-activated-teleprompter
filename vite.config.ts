import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import { resolve } from "path"
import { viteSingleFile } from "vite-plugin-singlefile"

// Custom plugin to remove crossorigin attribute from style elements
function fixStyleCrossorigin() {
  return {
    name: 'fix-style-crossorigin',
    enforce: 'post' as const,
    generateBundle(_options: any, bundle: any) {
      // Find HTML files in the bundle
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (fileName.endsWith('.html') && (chunk as any).type === 'asset') {
          // Remove crossorigin attribute from style elements
          let fixedSource = (chunk as any).source.replace(
            /<style([^>]*?)\s+crossorigin(?:="[^"]*")?([^>]*?)>/g,
            '<style$1$2>'
          );

          // Fix invalid CSS padding values
          fixedSource = fixedSource.replace(
            /padding:\s*auto\s*!important/g,
            'padding: 0 !important'
          );

          fixedSource = fixedSource.replace(
            /padding-top:\s*auto\s*!important/g,
            'padding-top: 0 !important'
          );

          fixedSource = fixedSource.replace(
            /padding-right:\s*auto\s*!important/g,
            'padding-right: 0 !important'
          );

          fixedSource = fixedSource.replace(
            /padding-bottom:\s*auto\s*!important/g,
            'padding-bottom: 0 !important'
          );

          fixedSource = fixedSource.replace(
            /padding-left:\s*auto\s*!important/g,
            'padding-left: 0 !important'
          );

          (chunk as any).source = fixedSource;
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile({
      removeViteModuleLoader: true,
      inlinePattern: [],
    }),
    fixStyleCrossorigin(),
  ],
  css: {
    postcss: './postcss.config.mjs',
    preprocessorOptions: {
      scss: {
        verbose: true,
        quietDeps: true,
      },
    },
    devSourcemap: true,
  },
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
      },
    },
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    minify: "terser",
  },
  server: {
    open: true,
  },
  resolve: {
    alias: {
      bulma: resolve(__dirname, "node_modules/bulma/sass/_index.scss"),
    },
  },
})
