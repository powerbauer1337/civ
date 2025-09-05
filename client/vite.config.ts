/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  base: '/civ/', // GitHub Pages repository name
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@store': path.resolve(__dirname, './src/store'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@config': path.resolve(__dirname, './src/config')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('react-router')) {
            return 'react-router';
          }
          
          // MUI packages - split for better caching
          if (id.includes('@mui/material/styles') || id.includes('@mui/system')) {
            return 'mui-core';
          }
          if (id.includes('@mui/material')) {
            return 'mui-components';
          }
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }
          
          // Game libraries
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux')) {
            return 'redux-vendor';
          }
          if (id.includes('socket.io-client')) {
            return 'socket';
          }
          if (id.includes('@civ-game/shared')) {
            return 'shared';
          }
          if (id.includes('phaser')) {
            return 'phaser';
          }
          
          // Keep game components together
          if (id.includes('/components/HexMap/') || id.includes('/components/GameRenderer')) {
            return 'game-components';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  optimizeDeps: {
    include: ['phaser', '@civ-game/shared']
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        './src/components/': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    include: [
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'tests/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'coverage'
    ]
  }
});
