import { defineConfig } from 'vite-plus'

// Vite+ is used here for static checks only: `vp check` = format (Oxfmt) + lint (Oxlint) + type-check (tsgolint).
// The app itself is a Node server run with tsx and bundled with esbuild, not a Vite app.
export default defineConfig({
  fmt: {
    semi: false,
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: ['dist/**', 'data/**', 'pnpm-lock.yaml'],
  },
  lint: {
    ignorePatterns: ['dist/**', 'data/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
})
