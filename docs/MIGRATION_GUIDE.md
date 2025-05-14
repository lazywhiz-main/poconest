# poconest 移植ガイド（改訂版）

このドキュメントは、既存のpoconestプロジェクト（アーカイブ）を新しいReact Nativeプロジェクトへ安全かつ段階的に移植する際の計画と手順をまとめたものです。今回はiOSでのリリースを最優先にしながらも、Webブラウザー展開も視野に入れて再構築します。

---

## 既存プロジェクト分析

### 主要な依存関係
- React Native: 0.76.5
- Expo: ~52.0.3
- Supabase: 2.39.3, @supabase/realtime-js: ^2.4.0
- React Navigation: ^6.1.9（native, native-stack, bottom-tabs, stack）
- UI関連: react-native-vector-icons, lottie-react-native, react-native-animatable
- データ可視化: d3, react-native-svg
- その他: dayjs, openai (AI関連)

### アプリケーション構造
- **認証**: Supabaseを使用したメール/パスワード認証
- **データモデル**: 
  - ユーザー (UserProfile)
  - Nest (グループ機能)
  - チャット (ChatMessage)
  - ボード (BoardItem)
  - インサイト (分析機能)
- **UI**: 
  - カスタムヘッダー
  - メッセージバブル
  - カード型UI
  - チャットインターフェース

### 前回の問題点
- 認証システムとDB構築過程で依存関係が壊れた
- Metroハンドラー起動の問題
- Web対応がなかった（iOS専用）
- リアルタイムチャットのRLS（行レベルセキュリティ）の問題

---

## 移行フェーズ計画

### フェーズ1: 基盤構築と最小実行可能製品
**目標**: iOSで動作する最小限のアプリ構造と基本UI

1. **プロジェクト初期化**
   ```bash
   npx react-native init poconest --template react-native-template-typescript
   ```

2. **最小限の依存関係**
   ```bash
   # ナビゲーション
   npm install @react-navigation/native @react-navigation/native-stack 
   npm install react-native-screens react-native-safe-area-context
   
   # Supabase基本セットアップ
   npm install @supabase/supabase-js@2.39.3 @react-native-async-storage/async-storage
   npm install react-native-url-polyfill
   ```

3. **基本構造の実装**
   - src/lib/supabase.ts（既存コードをそのまま移植）
   - src/contexts/AuthContext.tsx（シンプル版）
   - src/navigation/index.tsx（基本ナビゲーション）
   - src/screens/LoginScreen.tsx & HomeScreen.tsx（最小構成）

4. **コンテンツチェックポイント**
   - Metro起動確認
   - iOSビルド・実行確認
   - 基本ナビゲーション動作確認
   - 認証の基本機能確認

### フェーズ2: Web対応の基盤構築
**目標**: モバイルとWebで共有できる基本構造の確立

1. **Web対応の設定**
   ```bash
   npm install react-native-web react-dom
   npm install --save-dev webpack webpack-cli webpack-dev-server babel-loader html-webpack-plugin
   ```

2. **webpack設定**
   - webpack.config.js の作成
   - public/index.html の作成
   - エントリーポイントの調整

3. **レスポンシブ設計の基盤**
   - プラットフォーム検出ユーティリティの実装
   - 基本的なレスポンシブスタイル設計

4. **コンテンツチェックポイント**
   - Webでのビルド・実行確認
   - モバイル・Web間の表示一貫性確認

### フェーズ3: UI/UXコンポーネントの実装
**目標**: 既存UIコンポーネントの段階的な移植

1. **コアUIコンポーネントの移植**
   - src/components/AppHeader.tsx
   - src/components/PocoLogo.tsx
   - src/components/MessageBubble.tsx（シンプル版）

2. **デザインシステムの構築**
   - src/theme/ ディレクトリの作成とテーマ設定
   - 共通スタイルの実装

3. **画面レイアウトの実装**
   - LoginScreen, HomeScreen の完全実装
   - 基本的なナビゲーション・タブの実装

4. **コンテンツチェックポイント**
   - UIコンポーネントの表示・動作確認
   - iOSビルド・実行確認
   - Webビルド・実行確認

### フェーズ4: 認証とデータモデルの実装
**目標**: Supabase連携と基本データモデルの実装

1. **認証コンテキストの完全実装**
   - src/contexts/AuthContext.tsx（既存から移植）
   - ログイン、サインアップ、ログアウト機能
   - セッション管理とプロフィール取得

2. **基本データモデルの実装**
   - src/types/ ディレクトリに各種型定義
   - src/lib/supabase.ts の完全移植

3. **データ取得・保存機能の実装**
   - src/hooks/useNest.tsx などのカスタムフック
   - シンプルなCRUD操作の実装

4. **コンテンツチェックポイント**
   - Supabase接続テスト
   - 認証フロー全体の確認
   - データ取得・表示テスト

### フェーズ5: 主要機能の実装
**目標**: チャット、ボード、インサイト機能の実装

1. **チャット機能の実装**
   - ChatScreen.tsx の実装
   - MessageBubble.tsx の完全実装
   - リアルタイム通信の実装（RLS問題対応）

2. **ボード機能の実装**
   - BoardScreen.tsx の実装
   - カード関連コンポーネントの実装

3. **インサイト機能の実装**
   - InsightContext と関連コンポーネント
   - データ分析・表示機能

4. **コンテンツチェックポイント**
   - 各機能の動作確認
   - パフォーマンステスト
   - ユーザー体験の確認

---

## 前回の失敗を防ぐための対策

### 1. 依存関係の管理
- **バージョン固定**: 主要依存パッケージは固定バージョンを使用
  ```json
  "@supabase/supabase-js": "2.39.3",
  "react-native-safe-area-context": "4.8.2",
  ```
- **依存関係のスナップショット**: 各フェーズ後に動作する依存関係をロックファイルごと保存
- **インクリメンタルな追加**: 依存関係は一度に多数追加せず、必要なものから段階的に追加

### 2. Metroバンドラー対策
- 各フェーズでの `npx react-native start --reset-cache` による確認
- Metro設定ファイルの適切な管理
- キャッシュクリア手順の文書化

### 3. 認証システムの堅牢化
- AsyncStorage処理の改善
- エラーハンドリングの強化
- セッション管理の安定化

### 4. Web対応のためのポイント
- プラットフォーム固有コードの分離
- レスポンシブデザインパターンの採用
- Webブラウザ特有の問題への対処法

---

## チェックポイント確認事項

各フェーズ終了時には以下を確認します：

1. **ビルド確認**
   - iOSビルドが成功する
   - （必要に応じて）Androidビルドが成功する
   - Webビルドが成功する

2. **動作確認**
   - 新規追加した機能が意図通り動作する
   - 既存機能が引き続き動作する
   - パフォーマンスに問題がない

3. **依存関係確認**
   - 新規追加した依存関係が問題を引き起こしていないか
   - ネイティブモジュールのリンクが正しく行われているか

4. **クロスプラットフォーム確認**
   - iOS, Web両方で一貫した体験が提供されているか
   - プラットフォーム固有の問題が適切に対処されているか

---

## 具体的な実装ステップ（フェーズ1の詳細例）

1. **プロジェクト作成**
   ```bash
   npx react-native init poconest --template react-native-template-typescript
   cd poconest
   ```

2. **基本ディレクトリ構造の作成**
   ```bash
   mkdir -p src/{components,contexts,hooks,lib,navigation,screens,theme,types,utils}
   ```

3. **Supabase連携の最小実装**
   ```typescript
   // src/lib/supabase.ts
   import 'react-native-url-polyfill/auto';
   import { createClient } from '@supabase/supabase-js';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const supabaseUrl = 'https://fibhpcmpdduwtvnsxuhu.supabase.co';
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // 省略

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```

4. **シンプルな認証コンテキスト**
   ```typescript
   // src/contexts/AuthContext.tsx (シンプル版)
   import React, { createContext, useContext, useState, useEffect } from 'react';
   import { supabase } from '../lib/supabase';
   import { Session, User } from '@supabase/supabase-js';

   type AuthContextType = {
     user: User | null;
     session: Session | null;
     loading: boolean;
     signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
     signOut: () => Promise<{ error: Error | null }>;
   };

   const AuthContext = createContext<AuthContextType>({} as AuthContextType);

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [user, setUser] = useState<User | null>(null);
     const [session, setSession] = useState<Session | null>(null);
     const [loading, setLoading] = useState(true);

     // 最小限のログイン機能
     const signIn = async (email: string, password: string) => {
       try {
         const { data, error } = await supabase.auth.signInWithPassword({
           email, password
         });
         return { error };
       } catch (error: any) {
         return { error };
       }
     };

     // ログアウト機能
     const signOut = async () => {
       try {
         const { error } = await supabase.auth.signOut();
         return { error };
       } catch (error: any) {
         return { error };
       }
     };

     // 認証状態の監視
     useEffect(() => {
       supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
         setUser(session?.user ?? null);
         setLoading(false);
       });

       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (_event, session) => {
           setSession(session);
           setUser(session?.user ?? null);
           setLoading(false);
         }
       );

       return () => subscription.unsubscribe();
     }, []);

     return (
       <AuthContext.Provider value={{
         user,
         session,
         loading,
         signIn,
         signOut,
       }}>
         {children}
       </AuthContext.Provider>
     );
   }

   export const useAuth = () => useContext(AuthContext);
   ```

5. **基本ナビゲーション**
   ```typescript
   // src/navigation/index.tsx
   import React from 'react';
   import { NavigationContainer } from '@react-navigation/native';
   import { createNativeStackNavigator } from '@react-navigation/native-stack';
   import { useAuth } from '../contexts/AuthContext';
   import LoginScreen from '../screens/LoginScreen';
   import HomeScreen from '../screens/HomeScreen';

   const Stack = createNativeStackNavigator();

   export default function Navigation() {
     const { user, loading } = useAuth();

     if (loading) {
       return null; // またはローディングインジケーター
     }

     return (
       <NavigationContainer>
         <Stack.Navigator screenOptions={{ headerShown: false }}>
           {user ? (
             <Stack.Screen name="Home" component={HomeScreen} />
           ) : (
             <Stack.Screen name="Login" component={LoginScreen} />
           )}
         </Stack.Navigator>
       </NavigationContainer>
     );
   }
   ```

6. **App.tsx の更新**
   ```typescript
   import React from 'react';
   import { AuthProvider } from './src/contexts/AuthContext';
   import Navigation from './src/navigation';

   export default function App() {
     return (
       <AuthProvider>
         <Navigation />
       </AuthProvider>
     );
   }
   ```

---

この計画に従って段階的に実装を進めることで、依存関係の問題を早期に発見し、適切に対処することができます。各フェーズ終了時には必ずチェックポイントの確認を行い、問題が発生した場合はその段階で修正してください。