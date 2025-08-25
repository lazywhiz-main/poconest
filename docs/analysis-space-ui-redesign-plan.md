# 分析スペースUI再設計計画

## 📋 **概要**

既存の分析スペース（beta）の統合されたUIを、より使いやすく機能を分離した2つの独立したスペースに再設計する計画。

## 🎯 **設計方針**

### **現在の統合UIの問題点**
- データマッピングと理論構築が1つの画面に混在
- 機能が多すぎてユーザーが迷いやすい
- 理論構築の詳細な機能が埋もれている

### **新しい分離UIの利点**
- 各スペースの役割が明確
- 段階的な分析プロセスが理解しやすい
- 機能の発見性が向上
- 既存の分析（beta）と並行して使用可能

## 🏗️ **実装戦略**

### **Phase 1: 既存機能の維持**
- 既存の「分析（beta）」はそのまま維持
- 既存の「分析 v3（2つ分離版）」もそのまま維持
- 新しい2つのスペースと並行して使用可能
- UIが使える形に精査できたらbetaを廃止予定

### **Phase 2: 新UIの段階的実装**
- 既存UIコンポーネントの再利用
- 新機能の段階的追加
- ユーザビリティの継続的改善

## 🎨 **UI設計詳細**

### **1. データマッピングスペース**

#### **実装方法**
- **新しく`DataMappingSpace`コンポーネントを作成**
- 既存の`AnalysisSpaceV2`の内容を綺麗にコピー
- 理論構築ボタンの遷移先のみ変更（理論構築スペースに遷移）

#### **機能**
- **クラスタービュー概要**: 既存の分析（beta）と同じ統計表示
- **表示中クラスター**: 既存の分析（beta）と同じクラスターリスト
- **理論構築ボタン**: 既存の分析（beta）と同じボタン（遷移先を理論構築スペースに変更）

#### **遷移先**
- 理論構築ボタンを押すと `/nest-top?nestId=${nestId}&space=theory-building` に遷移

### **2. 理論構築・管理スペース**

#### **実装方法**
- **新しく`TheoryBuildingSpace`コンポーネントを作成**
- 現在のサイドピークの内容を全て移植
- クラスター情報の表示機能を追加

#### **機能**
- **データマッピング結果参照エリア**: 選択されたクラスターの概要とリスト
- **理論構築プロセス**: 現在のサイドピークの内容を全て移植
- **クラスター詳細モーダル**: 既存の分析（beta）と同じモーダルを再利用

#### **ナビゲーション**
- **「データマッピングに戻る」ボタン**: クラスターリスト表示エリアに設置
- **クラスターが表示されていない場合**: 
  - 「保存されたクラスタービューを呼び出す」オプション
  - 「データマッピングに戻ってクラスタリングを実施」オプション

## 🔧 **技術実装**

### **サイドメニューの分離**

#### **メニュー項目**
```typescript
const menuSections = [
  {
    title: '',
    items: [
      { id: 'home', icon: <Icon name="nest" size={18} />, text: 'NEST ホーム', isActive: space === 'home' },
      { id: 'chat', icon: <Icon name="chat" size={18} />, text: 'チャット', isActive: space === 'chat' },
      { id: 'meeting', icon: <Icon name="meeting" size={18} />, text: 'ミーティング', isActive: space === 'meeting' },
      { id: 'board', icon: <Icon name="board" size={18} />, text: 'ボード', isActive: space === 'board' },
      { id: 'analytics', icon: <Icon name="analysis" size={18} />, text: '分析', isActive: space === 'analytics' },
      { id: 'analytics-beta', icon: <Icon name="zap" size={18} />, text: '分析（beta）', isActive: space === 'analytics-beta', badge: 1 },
      { id: 'data-mapping', icon: <Icon name="map" size={18} />, text: 'データマッピング', isActive: space === 'data-mapping', badge: 3 },
      { id: 'theory-building', icon: <Icon name="brain" size={18} />, text: '理論構築・管理', isActive: space === 'theory-building', badge: 4 },
      { id: 'settings', icon: <Icon name="settings" size={18} />, text: '設定', isActive: space === 'settings' },
    ],
  },
];
```

#### **アイコン定義**
```typescript
const getIconPath = (name: string) => {
  switch (name) {
    // ... existing cases ...
    case 'map':
      return <path d="M21 3H3a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H3"></path>;
    case 'brain':
      return <path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-2a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm-3-2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm6 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"></path>;
    // ... existing default case ...
  }
};
```

### **ルーティングの分離**

#### **ルーティングケース**
```typescript
case 'data-mapping':
  SpaceComponent = (
    <BoardProvider currentNestId={nest.id}>
      <DataMappingSpace boardId={nest.id} nestId={nest.id} />
    </BoardProvider>
  );
  break;
case 'theory-building':
  SpaceComponent = (
    <BoardProvider currentNestId={nest.id}>
      <TheoryBuildingSpace boardId={nest.id} nestId={nest.id} />
    </BoardProvider>
  );
  break;
```

#### **インポート**
```typescript
import { DataMappingSpace, TheoryBuildingSpace } from './features/nest-space/analysis-space-v3';
```

### **既存UIの活用ポイント**

#### **再利用するコンポーネント**
- **クラスタービュー概要**: 既存の統計表示ロジック
- **表示中クラスター**: 既存のクラスターリスト表示
- **クラスター詳細モーダル**: 既存のモーダルコンポーネント
- **理論構築ボタン**: 既存のボタンUI（遷移先のみ変更）

#### **新規作成するコンポーネント**
- **DataMappingSpace**: 既存のAnalysisSpaceV2の内容をコピーして新規作成
- **TheoryBuildingSpace**: 理論構築・管理専用スペース
- **ナビゲーション機能**: スペース間の遷移

## 📊 **実装状況**

### **完了済み**
- [x] 分析スペースv3の基本コンポーネント作成
- [x] サイドメニューへの「分析 v3（2つ分離版）」追加
- [x] ルーティングケース「analytics-v3」の追加

### **実装中**
- [ ] サイドメニューの分離（「データマッピング」と「理論構築・管理」）
- [ ] アイコン定義の追加（map, brain）
- [ ] ルーティングケースの分離（data-mapping, theory-building）
- [ ] インポートの追加（DataMappingSpace, TheoryBuildingSpace）

### **次期実装予定**
- [ ] DataMappingSpaceの作成（AnalysisSpaceV2の内容をコピー）
- [ ] DataMappingSpaceの理論構築ボタン遷移先変更
- [ ] TheoryBuildingSpaceの既存サイドピーク内容移植
- [ ] クラスター情報表示機能の統合
- [ ] ナビゲーション機能の実装

## 🎯 **次のステップ**

1. **サイドメニューの分離完了**
2. **DataMappingSpaceの作成（AnalysisSpaceV2の内容をコピー）**
3. **DataMappingSpaceの理論構築ボタン遷移先変更**
4. **TheoryBuildingSpaceの実装**
5. **既存UIとの統合テスト**
6. **ユーザビリティの検証**

## 📝 **注意事項**

- 既存の分析（beta）は維持し、新しいスペースと並行して使用可能
- 既存の分析 v3（2つ分離版）も維持
- 既存UIコンポーネントを最大限再利用
- 段階的な実装で品質を確保
- ユーザーフィードバックを継続的に収集
