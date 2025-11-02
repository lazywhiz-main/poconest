import React from 'react';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeaturesSectionProps {
  features: Feature[];
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => {
  const styles = {
    features: {
      padding: '100px 40px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '80px',
    },
    sectionLabel: {
      fontSize: '11px',
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      marginBottom: '16px',
      fontWeight: 600,
    },
    title: {
      fontSize: '40px',
      fontWeight: 600,
      marginBottom: '20px',
      color: '#e2e8f0',
    },
    lead: {
      fontSize: '18px',
      color: '#a6adc8',
      maxWidth: '700px',
      margin: '0 auto',
    },
    featureBlock: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '80px',
      alignItems: 'center',
      marginBottom: '120px',
    },
    featureContent: {},
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      background: '#333366',
      color: '#00ff88',
      fontSize: '11px',
      fontWeight: 600,
      borderRadius: '2px',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '16px',
    },
    featureTitle: {
      fontSize: '32px',
      fontWeight: 600,
      marginBottom: '16px',
      color: '#e2e8f0',
    },
    description: {
      fontSize: '16px',
      color: '#a6adc8',
      lineHeight: 1.8,
      marginBottom: '24px',
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    listItem: {
      fontSize: '14px',
      color: '#a6adc8',
      marginBottom: '12px',
      paddingLeft: '24px',
      position: 'relative' as const,
    },
    visual: {
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '40px',
      height: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
      overflow: 'hidden',
    },
  };

  const featureData = [
    {
      badge: 'Meeting',
      badgeIcon: (
        <svg style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 15V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: '対話が、知識になる',
      description: '音声から自動で文字起こし、要約、アクションアイテム抽出。議論の内容が自動でボードカードとして構造化され、次の企画に活かせます。',
      items: [
        '音声の自動文字起こし（話者識別対応）',
        'AI要約・アクションアイテム抽出',
        'ボードカード自動生成',
        '議事録作成時間をゼロに'
      ],
      visual: (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 音声波形 */}
          <div style={{ background: '#0f0f23', padding: '16px', borderRadius: '4px', border: '1px solid #333366' }}>
            <div style={{ fontSize: '10px', color: '#6c7086', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>AUDIO INPUT</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '40px' }}>
              {[3, 8, 5, 12, 7, 15, 10, 6, 14, 9, 4, 11, 8, 13, 7, 10, 5, 12, 8, 15].map((height, i) => (
                <div key={i} style={{ flex: 1, background: '#00ff88', opacity: 0.6, height: `${height * 3}px`, borderRadius: '1px' }}></div>
              ))}
            </div>
          </div>
          
          {/* 文字起こし */}
          <div style={{ background: '#0f0f23', padding: '16px', borderRadius: '4px', border: '1px solid #333366', flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#6c7086', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>TRANSCRIPT</div>
            <div style={{ fontSize: '12px', color: '#a6adc8', lineHeight: 1.6 }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ color: '#00ff88', fontWeight: 600 }}>Speaker 1:</span> 新しいプロダクトのコンセプトについて...
              </div>
              <div>
                <span style={{ color: '#64b5f6', fontWeight: 600 }}>Speaker 2:</span> ユーザーインサイトから考えると...
              </div>
            </div>
          </div>
          
          {/* カード生成 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #00ff88', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '10px', color: '#00ff88', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>CARD GENERATED</div>
            <div style={{ flex: 1, fontSize: '11px', color: '#e2e8f0' }}>新プロダクトコンセプト案</div>
            <div style={{ padding: '2px 6px', background: '#00ff88', color: '#0f0f23', fontSize: '9px', borderRadius: '2px', fontWeight: 600 }}>💡 Insight</div>
          </div>
        </div>
      )
    },
    {
      badge: 'Board',
      badgeIcon: (
        <svg style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: 'アイデアが、構造化される',
      description: 'カード型のナレッジベースで、アイデアや議論を柔軟に整理。AIが関連カードを自動提案し、ネットワークマップで知識の繋がりを可視化します。',
      items: [
        'カード型ナレッジベース',
        'タグ・関連カード自動提案',
        'ネットワークマップ可視化',
        'クラスタリング分析'
      ],
      visual: (
        <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* カード1 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ padding: '2px 6px', background: 'rgba(156,39,176,0.2)', color: '#9c27b0', fontSize: '9px', borderRadius: '2px', border: '1px solid #9c27b0', fontFamily: 'JetBrains Mono, monospace' }}>💡 INSIGHT</span>
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>ユーザーニーズ分析</div>
            <div style={{ fontSize: '10px', color: '#a6adc8', lineHeight: 1.4 }}>主要ペインポイントは...</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 4px', background: '#333366', color: '#a6adc8', fontSize: '8px', borderRadius: '2px' }}>UX</span>
              <span style={{ padding: '2px 4px', background: '#333366', color: '#a6adc8', fontSize: '8px', borderRadius: '2px' }}>Research</span>
            </div>
          </div>
          
          {/* カード2 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ padding: '2px 6px', background: 'rgba(100,181,246,0.2)', color: '#64b5f6', fontSize: '9px', borderRadius: '2px', border: '1px solid #64b5f6', fontFamily: 'JetBrains Mono, monospace' }}>🎯 THEME</span>
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>プロダクト方向性</div>
            <div style={{ fontSize: '10px', color: '#a6adc8', lineHeight: 1.4 }}>シンプルさと機能性の...</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 4px', background: '#333366', color: '#a6adc8', fontSize: '8px', borderRadius: '2px' }}>Strategy</span>
            </div>
          </div>
          
          {/* カード3 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              <span style={{ padding: '2px 6px', background: 'rgba(255,165,0,0.2)', color: '#ffa500', fontSize: '9px', borderRadius: '2px', border: '1px solid #ffa500', fontFamily: 'JetBrains Mono, monospace' }}>⚡ ACTION</span>
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 500 }}>プロトタイプ作成</div>
            <div style={{ fontSize: '10px', color: '#a6adc8', lineHeight: 1.4 }}>次週までに初期版を...</div>
          </div>
          
          {/* ネットワーク表示 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ position: 'absolute', top: 0, left: 0 }}>
              <line x1="20" y1="20" x2="80" y2="20" stroke="#00ff88" strokeWidth="1" opacity="0.3"/>
              <line x1="20" y1="20" x2="20" y2="80" stroke="#00ff88" strokeWidth="1" opacity="0.3"/>
              <line x1="80" y1="20" x2="80" y2="80" stroke="#00ff88" strokeWidth="1" opacity="0.3"/>
              <circle cx="20" cy="20" r="4" fill="#00ff88"/>
              <circle cx="80" cy="20" r="4" fill="#64b5f6"/>
              <circle cx="20" cy="80" r="4" fill="#ffa500"/>
              <circle cx="80" cy="80" r="4" fill="#9c27b0"/>
            </svg>
            <div style={{ fontSize: '10px', color: '#00ff88', fontFamily: 'JetBrains Mono, monospace', zIndex: 1 }}>NETWORK MAP</div>
          </div>
        </div>
      )
    },
    {
      badge: 'Trend Insight',
      badgeIcon: (
        <svg style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M20 20L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M11 8V11L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: '世界が、自動で集まる',
      description: 'デザインメディアから最新トレンドを自動収集し、AIが革新性を4軸でスコアリング。あなたのアイデアと世界のトレンドが自動で繋がります。',
      items: [
        'デザインメディア自動収集（Dezeen, YANKO等）',
        'AI 4軸スコアリング（概念転換・カテゴリー破壊等）',
        'パターン検出（ブランド・カテゴリー・時系列）',
        '自分のボードカードと自動連携'
      ],
      visual: (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* トレンドカード1 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', display: 'flex', gap: '12px' }}>
            <div style={{ width: '80px', height: '60px', background: '#333366', borderRadius: '2px', flexShrink: 0 }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ padding: '2px 6px', background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '9px', borderRadius: '2px', border: '1px solid #22c55e', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>HIGH 8.5</span>
                <span style={{ padding: '2px 6px', background: '#333366', color: '#a6adc8', fontSize: '8px', borderRadius: '2px' }}>New</span>
              </div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 500 }}>Modular Furniture System</div>
              <div style={{ fontSize: '9px', color: '#a6adc8' }}>モジュラー家具システム</div>
            </div>
          </div>
          
          {/* トレンドカード2 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', display: 'flex', gap: '12px' }}>
            <div style={{ width: '80px', height: '60px', background: '#333366', borderRadius: '2px', flexShrink: 0 }}></div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ padding: '2px 6px', background: 'rgba(234,179,8,0.2)', color: '#eab308', fontSize: '9px', borderRadius: '2px', border: '1px solid #eab308', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>MED 6.2</span>
              </div>
              <div style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 500 }}>Sustainable Packaging</div>
              <div style={{ fontSize: '9px', color: '#a6adc8' }}>持続可能なパッケージング</div>
            </div>
          </div>
          
          {/* スコア詳細 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366' }}>
            <div style={{ fontSize: '10px', color: '#6c7086', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>SCORE BREAKDOWN</div>
            {[
              { label: '概念転換', value: 85 },
              { label: 'カテゴリー破壊', value: 70 },
              { label: '技術革新', value: 90 },
              { label: 'UX革新', value: 80 }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <div style={{ fontSize: '8px', color: '#6c7086', width: '80px', fontFamily: 'JetBrains Mono, monospace' }}>{item.label}</div>
                <div style={{ flex: 1, height: '4px', background: '#333366', borderRadius: '1px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.value}%`, height: '100%', background: '#00ff88', borderRadius: '1px' }}></div>
                </div>
                <div style={{ fontSize: '8px', color: '#00ff88', fontFamily: 'JetBrains Mono, monospace', width: '24px', textAlign: 'right' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      badge: 'Analysis',
      badgeIcon: (
        <svg style={{ width: '14px', height: '14px', marginRight: '6px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3V21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 16L11 12L15 14L21 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12V8H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'データから、理論が生まれる',
      description: '質的データからグラウンデッド・セオリー分析を実行。概念抽出、カテゴリー生成、理論的飽和度判定まで、AIが分析を支援します。',
      items: [
        'グラウンデッド・セオリー分析',
        '概念抽出・カテゴリー生成',
        '理論的飽和度判定',
        'コーディング支援（自動ラベリング）'
      ],
      visual: (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* コーディング画面 */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #333366', flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#6c7086', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>CODING</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: '#a6adc8', lineHeight: 1.5, padding: '6px', background: 'rgba(156,39,176,0.1)', borderLeft: '2px solid #9c27b0', borderRadius: '2px' }}>
                <span style={{ color: '#9c27b0', fontWeight: 600, fontSize: '9px' }}>[利便性重視]</span> 使いやすさを最優先に考えている
              </div>
              <div style={{ fontSize: '11px', color: '#a6adc8', lineHeight: 1.5, padding: '6px', background: 'rgba(100,181,246,0.1)', borderLeft: '2px solid #64b5f6', borderRadius: '2px' }}>
                <span style={{ color: '#64b5f6', fontWeight: 600, fontSize: '9px' }}>[時間節約]</span> 効率的に作業を進めたい
              </div>
              <div style={{ fontSize: '11px', color: '#a6adc8', lineHeight: 1.5, padding: '6px', background: 'rgba(34,197,94,0.1)', borderLeft: '2px solid #22c55e', borderRadius: '2px' }}>
                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '9px' }}>[品質担保]</span> 高品質な成果物を求める
              </div>
            </div>
          </div>
          
          {/* 概念マップ */}
          <div style={{ background: '#0f0f23', padding: '12px', borderRadius: '4px', border: '1px solid #00ff88', position: 'relative', height: '180px' }}>
            <div style={{ fontSize: '10px', color: '#00ff88', marginBottom: '8px', fontFamily: 'JetBrains Mono, monospace' }}>CONCEPT MAP</div>
            <svg width="100%" height="140" viewBox="0 0 300 140">
              {/* 中心概念 */}
              <rect x="110" y="50" width="80" height="40" fill="#333366" stroke="#00ff88" strokeWidth="2" rx="2"/>
              <text x="150" y="75" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">ユーザー価値</text>
              
              {/* サブ概念1 */}
              <rect x="10" y="10" width="60" height="30" fill="#1a1a2e" stroke="#9c27b0" strokeWidth="1" rx="2"/>
              <text x="40" y="28" textAnchor="middle" fill="#9c27b0" fontSize="8">利便性</text>
              <line x1="70" y1="25" x2="110" y2="60" stroke="#9c27b0" strokeWidth="1" opacity="0.5"/>
              
              {/* サブ概念2 */}
              <rect x="10" y="55" width="60" height="30" fill="#1a1a2e" stroke="#64b5f6" strokeWidth="1" rx="2"/>
              <text x="40" y="73" textAnchor="middle" fill="#64b5f6" fontSize="8">効率性</text>
              <line x1="70" y1="70" x2="110" y2="70" stroke="#64b5f6" strokeWidth="1" opacity="0.5"/>
              
              {/* サブ概念3 */}
              <rect x="10" y="100" width="60" height="30" fill="#1a1a2e" stroke="#22c55e" strokeWidth="1" rx="2"/>
              <text x="40" y="118" textAnchor="middle" fill="#22c55e" fontSize="8">品質</text>
              <line x1="70" y1="115" x2="110" y2="80" stroke="#22c55e" strokeWidth="1" opacity="0.5"/>
              
              {/* サブ概念4 */}
              <rect x="230" y="55" width="60" height="30" fill="#1a1a2e" stroke="#ffa500" strokeWidth="1" rx="2"/>
              <text x="260" y="73" textAnchor="middle" fill="#ffa500" fontSize="8">信頼性</text>
              <line x1="190" y1="70" x2="230" y2="70" stroke="#ffa500" strokeWidth="1" opacity="0.5"/>
            </svg>
          </div>
        </div>
      )
    }
  ];

  return (
    <section style={styles.features} id="features">
      <div style={styles.header}>
        <div style={styles.sectionLabel}>Features</div>
        <h2 style={styles.title}>すべての知的活動を、ひとつのエコシステムに</h2>
        <p style={styles.lead}>
          Poconestは4つのコア機能が有機的に繋がり、<br/>
          あなたの思考を加速させる知的生産プラットフォームです。
        </p>
      </div>

      {featureData.map((feature, index) => (
        <div 
          key={index}
          style={{
            ...styles.featureBlock,
            ...(index % 2 === 1 ? { gridTemplateColumns: '1fr 1fr' } : {})
          }}
        >
          <div style={{
            ...styles.featureContent,
            ...(index % 2 === 1 ? { order: 2 } : {})
          }}>
            <div style={styles.badge}>
              {feature.badgeIcon}
              {feature.badge}
            </div>
            <h3 style={styles.featureTitle}>{feature.title}</h3>
            <p style={styles.description}>{feature.description}</p>
            <ul style={styles.list}>
              {feature.items.map((item, itemIndex) => (
                <li key={itemIndex} style={styles.listItem}>
                  <span style={{ position: 'absolute', left: 0, color: '#00ff88' }}>→</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={styles.visual}>
            {feature.visual}
          </div>
        </div>
      ))}
    </section>
  );
};
