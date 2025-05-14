import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
import tsconfigPaths from 'vite-tsconfig-paths';

// Not all React Native packages are compatible with Vite. 
// This rewrites imports for React Native Web compatibility
const require = createRequire(import.meta.url);
const reactNativeWeb = require.resolve('react-native-web');

// Vector Iconsを特別に処理
// const VECTOR_ICON_REGEX = /react-native-vector-icons[/\\].*/; // Commented out

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // 必要に応じてBabelプラグインを追加
        ]
      },
      // JSXがあるコードをトランスパイルするのを助ける
      jsxRuntime: 'automatic'
    }),
    tsconfigPaths(),
    // Vector Iconsの特別処理用プラグイン (Commented out)
    /* 
    {
      name: 'vector-icons-resolver',
      resolveId(id) {
        if (VECTOR_ICON_REGEX.test(id)) {
          // Vector Icons関連のインポートを自前のシム実装にリダイレクト
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
          // その他のVector Iconsのインポートはすべてdummy.jsにリダイレクト
          return path.resolve(__dirname, './src/utils/vector-icons/index.js');
        }
      }
    }
    */
  ],
  resolve: {
    alias: {
      'react-native': reactNativeWeb, // ★ Re-enabled
      'react-native/Libraries/Components/View/ViewStylePropTypes': 'react-native-web/dist/exports/View/ViewStylePropTypes', // ★ Re-enabled
      'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter': 'react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter', // ★ Re-enabled
      'react-native/Libraries/vendor/emitter/EventEmitter': 'react-native-web/dist/vendor/react-native/emitter/EventEmitter', // ★ Re-enabled
      'react-native/Libraries/EventEmitter/NativeEventEmitter': 'react-native-web/dist/vendor/react-native/NativeEventEmitter', // ★ Re-enabled
      'react-native/Libraries/Utilities/codegenNativeComponent': 'react-native-web/dist/cjs/exports/createElement', // ★ Re-enabled
      'react-native/Libraries/Utilities': 'react-native-web/dist/vendor/react-native/Utilities', // ★ Re-enabled
      'react-native/Libraries': 'react-native-web/dist/vendor/react-native', // ★ Re-enabled
      
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
      // 'react-native-vector-icons': path.resolve(__dirname, './src/utils/vector-icons'), // Already commented out
    },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.jsx', '.web.js', '.jsx', '.js']
  },
  // Configure Tauri-specific build settings
  build: {
    outDir: 'dist',
    // Tauri uses vite's development server
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
        '.js': 'jsx', // 全てのJSファイルをJSXとして処理
      },
      define: {
        global: 'globalThis',
      },
      // ビルド時の特別な処理
      // plugins: [ // Commented out vector-icons specific esbuild plugin
      //   {
      //     name: 'jsx-in-node_modules',
      //     setup(build) {
      //       // node_modules 内のJSXを含むファイルを処理
      //       build.onLoad({ filter: /node_modules[/\\]react-native-vector-icons[/\\].*\.js$/ }, async (args) => {
      //         return {
      //           loader: 'jsx',
      //           contents: 'export default {};', // ダミーエクスポート
      //         };
      //       });
      //     },
      //   },
      // ],
    },
    include: [
      'react-dom',
      'react-native-web',
    ],
    // exclude: ['react-native-vector-icons'], // Commented out
  },
  // Handle module type issues
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
    watch: {
      ignored: ['**/node_modules/**'],
    },
  },
}); 