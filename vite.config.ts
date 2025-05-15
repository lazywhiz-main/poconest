// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
import tsconfigPaths from 'vite-tsconfig-paths';

const require = createRequire(import.meta.url);
const reactNativeWeb = require.resolve('react-native-web');

const VECTOR_ICON_REGEX = /react-native-vector-icons[/\\].*/;

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: []
      },
      jsxRuntime: 'automatic'
    }),
    tsconfigPaths(),
    {
      name: 'vector-icons-resolver',
      resolveId(id) {
        if (VECTOR_ICON_REGEX.test(id)) {
          if (id.includes('/MaterialIcons')) {
            return path.resolve(__dirname, './src/utils/vector-icons/MaterialIcons.js');
          }
          if (id.includes('/lib/create-icon-set')) {
            return path.resolve(__dirname, './src/utils/vector-icons/createIconSetShim.js');
          }
          if (id.includes('/lib/icon-button')) {
            return path.resolve(__dirname, './src/utils/vector-icons/iconButtonShim.js');
          }
          if (id.includes('/lib/NativeRNVectorIcons')) {
            return path.resolve(__dirname, './src/utils/vector-icons/NativeRNVectorIconsShim.js');
          }
          return path.resolve(__dirname, './src/utils/vector-icons/index.js');
        }
      }
    }
  ],
  resolve: {
    alias: {
      'react-native': reactNativeWeb,
      'react-native/Libraries/Components/View/ViewStylePropTypes': 'react-native-web/dist/exports/View/ViewStylePropTypes',
      'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter': 'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter',
      'react-native/Libraries/vendor/emitter/EventEmitter': 'react-native-web/dist/vendor/react-native/emitter/EventEmitter',
      'react-native/Libraries/EventEmitter/NativeEventEmitter': 'react-native-web/dist/vendor/react-native/NativeEventEmitter',
      'react-native/Libraries/Utilities/codegenNativeComponent': 'react-native-web/dist/cjs/exports/createElement',
      'react-native/Libraries/Utilities': 'react-native-web/dist/vendor/react-native/Utilities',
      'react-native/Libraries': 'react-native-web/dist/vendor/react-native',
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@screens': path.resolve(__dirname, './src/screens'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@types': path.resolve(__dirname, './src/types'),
      '@navigation': path.resolve(__dirname, './src/navigation'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@platform': path.resolve(__dirname, './src/platform'),
      '@features': path.resolve(__dirname, './src/features'),
      'react-native-vector-icons': path.resolve(__dirname, './src/utils/vector-icons'),
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js']
  },
  build: {
    outDir: 'dist',
    target: 'esnext', 
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: ['.js', '.jsx', '.ts', '.tsx'],
      loader: {
        '.js': 'jsx',
      },
      define: {
        global: 'globalThis',
      },
      plugins: [
        {
          name: 'jsx-in-node_modules',
          setup(build) {
            build.onLoad({ filter: /node_modules[/\\]react-native-vector-icons[/\\].*\.js$/ }, async (args) => {
              return {
                loader: 'jsx',
                contents: 'export default {};',
              };
            });
          },
        },
      ],
    },
    include: [
      'react-dom',
      'react-native-web',
    ],
    exclude: ['react-native-vector-icons'],
  },
  server: {
    hmr: false,
    fs: {
      allow: ['..'],
    },
    watch: {
      ignored: ['**/node_modules/**'],
    },
  },
});