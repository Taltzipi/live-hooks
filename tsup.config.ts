import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/useLive.ts',
    'src/useLiveCallback.ts',
    'src/useLiveDebounce.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  banner: {
    js: '"use client";',
  },
});
