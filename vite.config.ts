import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite 7 + React 19 + Tailwind CSS 4 Optimized Configuration
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    react({
      // React 19 automatic JSX runtime
      jsxRuntime: 'automatic',
      // Fast Refresh for better HMR
      fastRefresh: true,
      babel: {
        plugins: [
          // Future React Compiler optimizations can go here
        ],
      },
    }),
  ],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    target: 'esnext',
    minify: 'esbuild', // esbuild is faster and works well with Tailwind
    cssMinify: 'esbuild', // Use esbuild for CSS minification (compatible with Tailwind CSS 4)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        // Optimized code splitting
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
        // Better asset naming for caching
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Enable source maps for debugging
    sourcemap: false,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
    },
    // Vite 7 warmup feature for faster initial load
    warmup: {
      clientFiles: [
        './src/renderer/App.tsx',
        './src/renderer/components/**/*.tsx',
        './src/renderer/hooks/**/*.ts',
      ],
    },
  },
  // Dependency pre-bundling optimization
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: [],
    // Force optimization even during dev
    force: false,
  },
  // CSS configuration for Tailwind CSS 4
  css: {
    // Let PostCSS handle transformation (required for Tailwind CSS 4)
    transformer: 'postcss',
    postcss: './postcss.config.js',
  },
});

