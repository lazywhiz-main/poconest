# ポコの巣 (Poko's Nest) ナビゲーションシステム

空間間のシームレスな移動と統合されたユーザー体験を提供するナビゲーションシステムです。

## 機能概要

1. **プラットフォーム適応型ナビゲーション**
   - モバイル：ボトムタブ＋スワイプナビゲーション
   - タブレット：サイドナビ＋タブの組み合わせ
   - デスクトップ：サイドナビ＋キーボードショートカット

2. **コンテキスト維持機能**
   - 空間間の状態維持と復元
   - ブラウザライクな履歴管理（戻る/進む機能）
   - 最後のアクティブ位置の記憶
   - ディープリンクとクロス参照サポート

3. **統合体験**
   - マルチタスク支援（分割表示、PiP）
   - コンテキスト認識型トランジション
   - 関連コンテンツの自動提案
   - 空間間のシームレスなデータフロー

4. **カスタマイズ**
   - よく使う空間の優先表示
   - ナビゲーションショートカット
   - レイアウト調整オプション
   - アクセシビリティ設定

## ディレクトリ構造

```
src/features/nest-space/navigation/
├── components/
│   ├── SpaceNavigator.tsx        # 空間ナビゲーター
│   ├── ContextBreadcrumb.tsx     # コンテキストパンくず
│   ├── QuickSwitcher.tsx         # クイック切替
│   └── SpaceDock.tsx             # 空間ドック
├── hooks/
│   ├── useSpaceNavigation.ts     # 空間ナビゲーションフック
│   ├── useNavigationHistory.ts   # 履歴管理フック
│   └── useContextTransition.ts   # コンテキスト遷移フック
└── types/
    └── navigation.types.ts       # ナビゲーション型定義
```

## 使用方法

### 基本的な使用法

```tsx
import { SpaceNavigator } from '../features/nest-space/navigation';
import { SpaceType } from '../features/nest-space/types/nestSpace.types';

// 基本的な空間ナビゲーションの使用
const MyApp = () => {
  return (
    <View style={{ flex: 1 }}>
      <SpaceNavigator 
        initialSpace={SpaceType.CHAT}
        showBreadcrumbs={true}
        enableSwipeNavigation={true}
      />
    </View>
  );
};
```

### NestSpaceNavigatorの使用

```tsx
import NestSpaceNavigator from '../features/nest-space/NestSpaceNavigator';
import { NestSpaceProvider } from '../features/nest-space/contexts/NestSpaceContext';

// 完全な空間ナビゲーション体験の使用
const App = () => {
  return (
    <NestSpaceProvider>
      <NestSpaceNavigator 
        defaultSpace={SpaceType.CHAT}
        enableMultitasking={true}
        enableAnimations={true}
      />
    </NestSpaceProvider>
  );
};
```

### カスタムフックの使用

```tsx
import { useSpaceNavigation } from '../features/nest-space/navigation';

const MyComponent = () => {
  const {
    navigationState,
    navigateToSpace,
    navigateBack,
    navigateForward,
    isSpaceActive
  } = useSpaceNavigation();
  
  return (
    <Button 
      title="チャット空間に移動"
      onPress={() => navigateToSpace(SpaceType.CHAT)}
    />
  );
};
```

## キーボードショートカット

- `⌘+C` / `Ctrl+C`: チャット空間に移動
- `⌘+B` / `Ctrl+B`: ボード空間に移動
- `⌘+A` / `Ctrl+A`: 分析空間に移動
- `⌘+Z` / `Ctrl+Z`: Zoom空間に移動
- `⌘+[` / `Ctrl+[`: 履歴を戻る
- `⌘+]` / `Ctrl+]`: 履歴を進む
- `⌘+K` / `Ctrl+K`: クイックスイッチャーを開く

## レスポンシブ対応

- `width < 768px`: モバイルレイアウト（ボトムタブナビゲーション）
- `768px <= width < 1024px`: タブレットレイアウト（ボトムタブ＋トップバー）
- `width >= 1024px`: デスクトップレイアウト（サイドナビ＋トップバー）

## レイアウトモード

- `stacked`: 標準的な単一ビュー表示
- `split`: 分割表示（メイン＋セカンダリコンテンツ）
- `pip`: ピクチャーインピクチャー表示（小窓表示）

## コンテキスト認識機能

ナビゲーションシステムは現在のコンテキストを維持し、空間移動時に適切なコンテンツを表示します。
例えば、チャット空間からボード空間に移動した際、関連するボードが自動的に表示されます。

## カスタマイズオプション

`NavigationConfig` インターフェースを通じて、以下の設定をカスタマイズできます：

- `preferredSpaces`: 優先的に表示する空間のリスト
- `defaultSpace`: デフォルトの空間
- `layoutMode`: レイアウトモード
- `enableAnimations`: アニメーション有効/無効
- `enableSwipeNavigation`: スワイプナビゲーション有効/無効
- `enableKeyboardShortcuts`: キーボードショートカット有効/無効
- `accessibilityOptions`: アクセシビリティ設定 