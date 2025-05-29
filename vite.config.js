import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      'react-native-safe-area-context': path.resolve(__dirname, 'src/platform/web/SafeAreaProvider.tsx'),
      'react-native': 'react-native-web',
    },
  },
}); 