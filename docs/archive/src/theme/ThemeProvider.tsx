import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import Colors, { BrandColors } from '../constants/Colors';
// フォントとスプラッシュスクリーンを条件付きでインポート
let Font;
let SplashScreen;
try {
  Font = require('expo-font');
  SplashScreen = require('expo-splash-screen');
  // スプラッシュスクリーンを表示し続ける（利用可能な場合）
  if (SplashScreen && SplashScreen.preventAutoHideAsync) {
    SplashScreen.preventAutoHideAsync().catch(() => {
      /* スプラッシュスクリーンのエラーを無視 */
    });
  }
} catch (error) {
  console.warn('expo-font または expo-splash-screen パッケージがインストールされていません', error);
}

// テーマコンテキストの型定義
type ThemeContextType = {
  theme: 'light' | 'dark';
  colors: typeof Colors.light & { brand: typeof BrandColors };
  fonts: {
    heading: string;
    body: string;
  };
  isLoaded: boolean;
  toggleTheme: () => void;
};

// デフォルト値
const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  colors: {
    ...Colors.light,
    brand: BrandColors,
  },
  fonts: {
    heading: 'System',
    body: 'System',
  },
  isLoaded: false,
  toggleTheme: () => {},
};

// コンテキストの作成
const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

// テーマプロバイダーコンポーネント
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme === 'dark' ? 'dark' : 'light');
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // テーマの切り替え
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // フォントの読み込み
  useEffect(() => {
    async function loadFonts() {
      try {
        if (Font && Font.loadAsync) {
          try {
            await Font.loadAsync({
              // システムフォントをデフォルトとして使用
              'System': {
                fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
              },
            });
          } catch (e) {
            console.warn('フォントの読み込みに失敗しました:', e);
          }
        }
        setFontsLoaded(true);
      } catch (e) {
        console.warn('フォントの読み込みに失敗しました:', e);
        // フォントが読み込めなくても進めるようにする
        setFontsLoaded(true);
      }
    }
    
    loadFonts();
  }, []);

  // フォントが読み込まれたらスプラッシュスクリーンを非表示にする
  useEffect(() => {
    if (fontsLoaded && SplashScreen && SplashScreen.hideAsync) {
      SplashScreen.hideAsync().catch(() => {
        /* エラーを無視 */
      });
    }
  }, [fontsLoaded]);

  // 現在のテーマに基づいた色を取得
  const colors = {
    ...Colors[theme],
    brand: BrandColors
  };

  // プロバイダーの値
  const value = {
    theme,
    colors,
    fonts: {
      heading: 'System',
      body: 'System',
    },
    isLoaded: fontsLoaded,
    toggleTheme,
  };

  // すぐに子コンポーネントをレンダリングする（フォントの有無に関わらず）
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// テーマを使用するためのカスタムフック
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider; 