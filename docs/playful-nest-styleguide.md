# 「ポコの巣」UI 実装指示書

## 概要

「ポコの巣」アプリケーションのUIをリデザインして、モダンでプロフェッショナルな印象にアップグレードします。絵文字ベースのアイコンを廃止し、一貫性のあるSVGアイコンシステムを導入、洗練されたカラーパレットとバランスの良いレイアウトで使いやすく美しいインターフェースを実現してください。

## デザイン方針

- **モダンでクリーン**: 洗練された見た目と使いやすさを両立
- **一貫性**: 統一されたアイコン、色、余白で調和のとれたデザイン
- **遊び心**: 基本コンセプトの「楽しさ」は維持しつつ、より洗練された表現に
- **アクセシビリティ**: 読みやすさと操作性を確保、ダークモード対応

## カラーパレット

### リファインされたプレイフルネスト

```javascript
// メインカラー
--color-primary: #FF7A7A;        // ポップレッド（洗練済み）
--color-primary-light: #FFACAC;
--color-primary-dark: #E56565;

// アクセントカラー
--color-accent: #50D0C8;         // ミントグリーン（洗練済み）
--color-accent-light: #7DDED8;
--color-accent-dark: #38B2AB;

// 背景色
--color-background: #FFFAF0;     // クリームホワイト（洗練済み）
--color-background-light: #FFFFFF;
--color-background-dark: #F7F2E8;

// セカンダリーカラー
--color-secondary: #FFDA85;      // サニーイエロー（洗練済み）
--color-secondary-light: #FFEAB2;
--color-secondary-dark: #F0C976;

// ディープカラー
--color-deep: #1F5F68;           // ディープティール（洗練済み）
--color-deep-light: #2A7982;
--color-deep-dark: #184850;

// テキスト色
--color-text-primary: #2C3E50;
--color-text-secondary: #718096;
--color-text-disabled: #A0AEC0;

// ダークモード
--color-dark-background: #2D3748;
--color-dark-surface: #3F495A;
--color-dark-text: #F7FAFC;
```

## モダンアイコンシステム

絵文字を全て以下のSVGベースのアイコンに置き換えてください。

```jsx
// SVGアイコンコンポーネント
const Icon = ({ name, size = 24, color = 'currentColor', className = '' }) => {
  return (
    <svg 
      className={`icon icon-${name} ${className}`}
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="2"
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      {getPath(name)}
    </svg>
  );
};

// アイコンパス定義
const getPath = (name) => {
  switch (name) {
    case 'chat':
      return <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>;
    case 'send':
      return (
        <>
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </>
      );
    case 'board':
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </>
      );
    case 'task':
      return (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </>
      );
    case 'insight':
      return (
        <>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </>
      );
    case 'analytics':
      return (
        <>
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
          <line x1="2" y1="20" x2="22" y2="20"></line>
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </>
      );
    case 'organize':
      return (
        <>
          <line x1="4" y1="9" x2="20" y2="9"></line>
          <line x1="4" y1="15" x2="20" y2="15"></line>
          <line x1="10" y1="3" x2="8" y2="21"></line>
          <line x1="16" y1="3" x2="14" y2="21"></line>
        </>
      );
    case 'idea':
      return (
        <>
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M9 12h6"></path>
          <path d="M12 9v6"></path>
        </>
      );
    case 'document':
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </>
      );
    case 'nest':
      return (
        <>
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="4"></circle>
          <line x1="12" y1="2" x2="12" y2="8"></line>
          <line x1="12" y1="16" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="8" y2="12"></line>
          <line x1="16" y1="12" x2="22" y2="12"></line>
        </>
      );
    case 'light':
      return (
        <>
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </>
      );
    case 'dark':
      return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>;
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};
```

## 主要コンポーネントのデザイン仕様

### 1. ヘッダー

```jsx
<header style={{
  backgroundColor: colors.primary,
  color: 'white',
  padding: '16px 20px',
  borderRadius: '12px',
  marginBottom: '20px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}}>
  {/* ロゴ */}
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ 
      width: '36px', 
      height: '36px', 
      backgroundColor: 'rgba(255,255,255,0.1)', 
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Icon name="nest" size={20} color="white" />
    </div>
    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>ポコの巣</h1>
  </div>
  
  {/* ダークモード切り替え */}
  <button style={{
    background: 'transparent',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }}>
    <Icon name={darkMode ? 'light' : 'dark'} size={20} color="white" />
  </button>
</header>
```

### 2. カードコンポーネント（基本レイアウト）

```jsx
<div style={{
  backgroundColor: darkMode ? colors.darkSurface : 'white',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
}}>
  {/* カードヘッダー - 色は用途により異なる */}
  <div style={{
    backgroundColor: colors.primary, // または colors.secondary, colors.deep
    color: 'white', // または文脈に応じた色
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <Icon name="chat" size={18} color="white" />
    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>タイトル</h2>
  </div>
  
  {/* カード本体 */}
  <div style={{ padding: '16px' }}>
    {/* コンテンツ */}
  </div>
  
  {/* カードフッター - オプション */}
  <div style={{
    padding: '12px 16px',
    borderTop: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
    display: 'flex',
    gap: '8px'
  }}>
    {/* アクション */}
  </div>
</div>
```

### 3. ボタンスタイル

```jsx
// プライマリーボタン
<button style={{
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: colors.accent,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer'
}}>
  <Icon name="plus" size={16} color="white" />
  <span>テキスト</span>
</button>

// アウトラインボタン
<button style={{
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: 'transparent',
  color: colors.secondary,
  border: `1px solid ${colors.secondary}`,
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer'
}}>
  <Icon name="organize" size={16} />
  <span>テキスト</span>
</button>
```

## 機能別デザイン詳細

### 1. チャット空間

- ヘッダー背景: `colors.primary`
- アイコン: `chat`
- レイアウト: メッセージバブル + 入力フィールド + 送信ボタン
- 特徴:
  - 自分のメッセージは右側、相手は左側に配置
  - 自分のメッセージバブルは `rgba(255,122,122,0.08)` のような薄い赤系
  - 相手のメッセージバブルは `#F7F2E8` のようなニュートラル色
  - アバターは円形で、自分のものはアクセントカラーに関連した色
  - 送信ボタンはアクセントカラー

```jsx
// メッセージバブルコンポーネント例
const ChatMessage = ({ sender, text, time, self }) => {
  const messageStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '12px',
    ...(self && { flexDirection: 'row-reverse' })
  };
  
  const avatarStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    marginRight: self ? 0 : '8px',
    marginLeft: self ? '8px' : 0,
    backgroundColor: self 
      ? 'rgba(80, 208, 200, 0.2)' 
      : darkMode ? 'rgba(255, 255, 255, 0.1)' : colors.secondary + '40',
    color: self ? colors.accent : darkMode ? colors.darkText : colors.text
  };
  
  const bubbleStyle = {
    padding: '10px 14px',
    borderRadius: '12px',
    maxWidth: '70%',
    backgroundColor: self 
      ? (darkMode ? 'rgba(255, 122, 122, 0.15)' : 'rgba(255, 122, 122, 0.08)')
      : darkMode ? 'rgba(255, 255, 255, 0.06)' : '#F7F2E8'
  };
  
  return (
    <div style={messageStyle}>
      <div style={avatarStyle}>{sender}</div>
      <div style={bubbleStyle}>
        <div>{text}</div>
        <div style={{ 
          fontSize: '12px', 
          marginTop: '4px', 
          textAlign: 'right',
          color: darkMode ? 'rgba(255, 255, 255, 0.6)' : colors.textSecondary 
        }}>
          {time}
        </div>
      </div>
    </div>
  );
};
```

### 2. ボード空間

- ヘッダー背景: `colors.secondary`
- ヘッダーテキスト色: `colors.deep`
- アイコン: `board`
- レイアウト: 2x2のグリッドカード
- カードタイプ:
  1. アイデアカード: 左ボーダー色 `colors.secondary`
  2. タスクカード: 左ボーダー色 `colors.primary`
  3. インサイトカード: 左ボーダー色 `colors.deep`
  4. リソースカード: 左ボーダー色 `colors.accent`

```jsx
// ボードカード例（アイデアカード）
<div style={{
  padding: '12px',
  borderRadius: '8px',
  borderLeft: `3px solid ${colors.secondary}`,
  backgroundColor: darkMode ? 'rgba(255,218,133,0.1)' : 'rgba(255,218,133,0.05)'
}}>
  <div style={{ 
    fontWeight: 500, 
    marginBottom: '8px', 
    color: darkMode ? '#FFEAB2' : '#F0C976' 
  }}>
    アイデア
  </div>
  <ul style={{ 
    margin: 0, 
    paddingLeft: '20px',
    fontSize: '14px',
    color: darkMode ? 'rgba(255,255,255,0.8)' : colors.textSecondary
  }}>
    <li>新機能の提案</li>
    <li>UIの改善点</li>
    <li>コンテンツ戦略</li>
  </ul>
</div>
```

### 3. 分析空間

- ヘッダー背景: `colors.deep`
- アイコン: `analytics`
- レイアウト: 横長のカード、内部にはグリッドレイアウトで3つの分析カード
- 分析カードタイプ:
  1. トピック傾向: 上ボーダー色 `colors.primary`、バーチャートを表示
  2. 感情分析: 上ボーダー色 `colors.secondary`、ゲージチャートを表示
  3. キーワード: 上ボーダー色 `colors.deep`、タグクラウドを表示

```jsx
// バーチャート例
<div style={{ 
  height: '120px', 
  display: 'flex', 
  alignItems: 'flex-end',
  gap: '12px',
  padding: '0 10px'
}}>
  {[60, 40, 75, 50, 85].map((height, index) => (
    <div key={index} style={{ 
      flex: 1,
      height: `${height}%`,
      backgroundColor: darkMode ? colors.primaryLight : colors.primary,
      opacity: 0.7,
      borderRadius: '4px 4px 0 0'
    }}></div>
  ))}
</div>

// ゲージチャート例
<div style={{ position: 'relative', width: '100px', height: '100px' }}>
  <div style={{ 
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    background: `conic-gradient(${colors.accent} 0%, ${colors.accent} 70%, ${colors.secondary} 70%, ${colors.secondary} 100%)`,
    transform: 'rotate(-90deg)'
  }}></div>
  <div style={{ 
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: darkMode ? colors.darkCard : 'white',
    transform: 'translate(-50%, -50%) rotate(90deg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 500,
    color: colors.accent
  }}>
    70%
  </div>
</div>

// キーワードタグ例
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
  {['設計', 'ユーザー', '体験', '提案', 'テスト'].map((word, index) => (
    <span key={index} style={{ 
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      backgroundColor: `rgba(31, 95, 104, ${darkMode ? 0.3 + (index * 0.1) : 0.1 + (index * 0.05)})`,
      color: darkMode ? 'white' : colors.deep,
      fontSize: '12px',
      transform: `rotate(${[-2, 1, -1, 2, -1.5][index]}deg)`
    }}>
      {word}
    </span>
  ))}
</div>
```

## 実装のポイント

1. **一貫性**
   - 同じ種類の要素には必ず同じスタイルを適用
   - 機能ごとにヘッダーカラーを一貫して区別
   - 余白とサイズの比率を統一

2. **アクセシビリティ**
   - テキストと背景のコントラスト比を確保
   - ダークモード対応は単純な色の反転ではなく、読みやすさを考慮
   - クリックターゲットは最低44x44pxの大きさを確保

3. **視覚的な洗練さ**
   - シャドウは控えめに
   - 色の使用量のバランスを考慮（70%が背景/ニュートラル、30%が機能識別色）
   - 余白を惜しまず、ゆったりとしたレイアウト

4. **レスポンシブ対応**
   - モバイルファーストの設計
   - グリッドレイアウトでの柔軟な配置
   - タッチインタラクションを考慮した要素サイズ

## フォント設定

```css
/* フォントファミリー */
font-family: 'Inter', 'Noto Sans JP', sans-serif;

/* フォントウェイト */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;

/* フォントサイズ */
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 18px;
--font-size-xl: 22px;
```

---

このデザイン指示に従って「ポコの巣」アプリケーションのUIを実装してください。モダンなアイコンシステムと洗練されたカラーパレットの導入により、より親しみやすく洗練された印象に生まれ変わります。