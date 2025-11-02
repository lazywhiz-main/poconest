import React, { useState, useEffect } from 'react';
import {
  TrendPatternService,
  TrendPattern,
  BrandAnalysis,
  CategoryAnalysis,
  WeeklyStats,
} from '../services/TrendPatternService';

interface TrendPatternsViewProps {
  nestId: string;
}

const TrendPatternsView: React.FC<TrendPatternsViewProps> = ({ nestId }) => {
  const [patterns, setPatterns] = useState<TrendPattern[]>([]);
  const [brandAnalysis, setBrandAnalysis] = useState<BrandAnalysis[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true); // 初期ロード用
  const [analyzing, setAnalyzing] = useState(false); // 分析中フラグ
  const [activeTab, setActiveTab] = useState<'patterns' | 'brands' | 'categories' | 'trends'>('patterns');
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null); // 最終分析時刻
  const [hasCheckedCache, setHasCheckedCache] = useState(false); // キャッシュチェック済みフラグ

  // 初回マウント時: キャッシュをチェック（データがあれば自動ロード）
  useEffect(() => {
    loadCachedAnalysis();
  }, [nestId]);

  const loadCachedAnalysis = async () => {
    setLoading(true);
    try {
      // キャッシュから分析結果を取得
      const cache = await TrendPatternService.getCachedAnalysis(nestId);
      
      if (cache) {
        // キャッシュが存在する場合、そのデータを表示
        setPatterns(cache.patterns);
        setBrandAnalysis(cache.brand_analysis);
        setCategoryAnalysis(cache.category_analysis);
        setWeeklyStats(cache.weekly_stats);
        setLastAnalyzedAt(new Date(cache.analyzed_at));
        setHasCheckedCache(true);
      } else {
        // キャッシュがない場合は初期画面表示
        setHasCheckedCache(true);
      }
    } catch (error) {
      console.error('Error loading cached analysis:', error);
      setHasCheckedCache(true);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setLoading(true);
    try {
      // 新規分析を実行
      const [patternsData, brandsData, categoriesData, weeklyData] = await Promise.all([
        TrendPatternService.detectPatterns(nestId),
        TrendPatternService.getBrandAnalysis(nestId, 10),
        TrendPatternService.getCategoryAnalysis(nestId, 10),
        TrendPatternService.getWeeklyStats(nestId, 8),
      ]);

      // 分析結果をキャッシュに保存
      await TrendPatternService.saveAnalysisCache(
        nestId,
        patternsData,
        brandsData,
        categoriesData,
        weeklyData
      );

      // UIを更新
      setPatterns(patternsData);
      setBrandAnalysis(brandsData);
      setCategoryAnalysis(categoriesData);
      setWeeklyStats(weeklyData);
      setLastAnalyzedAt(new Date());
      setHasCheckedCache(true);
    } catch (error) {
      console.error('Error running analysis:', error);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.7) return '#00ff88';
    if (confidence >= 0.4) return '#ffd93d';
    return '#6c7086';
  };

  const getPatternIconSVG = (type: string): JSX.Element => {
    const iconSize = '20px';
    
    switch (type) {
      case 'brand':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#00ff88" strokeWidth="2" />
            <line x1="4" y1="10" x2="20" y2="10" stroke="#00ff88" strokeWidth="2" />
            <line x1="9" y1="10" x2="9" y2="20" stroke="#00ff88" strokeWidth="2" />
            <line x1="15" y1="10" x2="15" y2="20" stroke="#00ff88" strokeWidth="2" />
          </svg>
        );
      case 'category':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M3 12 L8 7 L13 12 L21 4" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 4 L21 9 L16 9" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="20" x2="21" y2="20" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'score_trend':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <path d="M3 17 L7 13 L11 15 L21 5" stroke="#64b5f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="16,5 21,5 21,10" stroke="#64b5f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'emerging':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#ffd93d" />
            <path d="M12 3 L12 6" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 18 L12 21" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 12 L18 12" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12 L3 12" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.36 5.64 L16.24 7.76" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M7.76 16.24 L5.64 18.36" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M18.36 18.36 L16.24 16.24" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
            <path d="M7.76 7.76 L5.64 5.64" stroke="#ffd93d" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      default:
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#a6adc8" strokeWidth="2" />
            <path d="M12 8 L12 12" stroke="#a6adc8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="#a6adc8" />
          </svg>
        );
    }
  };

  return (
    <div style={styles.container}>
      {/* タブ + 分析更新ボタン */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          {[
            { id: 'patterns' as const, label: '検出パターン', count: patterns.length },
            { id: 'brands' as const, label: 'ブランド分析', count: brandAnalysis.length },
            { id: 'categories' as const, label: 'カテゴリー分析', count: categoryAnalysis.length },
            { id: 'trends' as const, label: '時系列トレンド', count: weeklyStats.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
            >
              {tab.label}
              <span style={styles.tabCount}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div style={styles.rightSection}>
          {lastAnalyzedAt && (
            <span style={styles.lastAnalyzed}>
              最終分析: {lastAnalyzedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            style={{
              ...styles.analyzeButton,
              ...(analyzing ? styles.analyzeButtonDisabled : {}),
            }}
          >
            {analyzing ? '分析中...' : '🔄 分析更新'}
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div style={styles.content}>
        {loading && !hasCheckedCache ? (
          // 初回ロード中
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>データを確認中...</div>
          </div>
        ) : !lastAnalyzedAt ? (
          // 初回分析前の状態
          <div style={styles.initialState}>
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={styles.initialIcon}>
              {/* 背景円 */}
              <circle cx="60" cy="60" r="55" fill="rgba(0, 255, 136, 0.05)" stroke="#333366" strokeWidth="2" />
              
              {/* 3本の棒グラフ */}
              <rect x="25" y="50" width="18" height="35" rx="2" fill="#00ff88" opacity="0.8" />
              <rect x="51" y="35" width="18" height="50" rx="2" fill="#ffd93d" opacity="0.8" />
              <rect x="77" y="25" width="18" height="60" rx="2" fill="#64b5f6" opacity="0.8" />
              
              {/* トレンドライン */}
              <path 
                d="M 20 70 Q 40 60, 60 45 T 100 25" 
                stroke="#00ff88" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
                opacity="0.6"
              />
              
              {/* データポイント */}
              <circle cx="33" cy="65" r="3.5" fill="#00ff88" />
              <circle cx="60" cy="48" r="3.5" fill="#00ff88" />
              <circle cx="86" cy="30" r="3.5" fill="#00ff88" />
              
              {/* 上昇矢印 */}
              <path 
                d="M 95 32 L 100 25 L 105 32" 
                stroke="#00ff88" 
                strokeWidth="2.5" 
                fill="none" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={styles.initialTitle}>パターン分析を開始</div>
            <div style={styles.initialText}>
              「分析更新」ボタンをクリックすると、<br />
              収集された製品データからトレンドパターンを検出します
            </div>
            <button onClick={runAnalysis} style={styles.initialButton}>
              分析を開始
            </button>
          </div>
        ) : analyzing ? (
          <div style={styles.loading}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>分析中...</div>
          </div>
        ) : (
          <>
            {/* 検出パターン */}
            {activeTab === 'patterns' && (
              <div style={styles.patternList}>
                {patterns.length === 0 ? (
                  <div style={styles.empty}>
                    まだパターンが検出されていません。<br />
                    データが蓄積されると自動的にパターンが検出されます。
                  </div>
                ) : (
                  patterns.map((pattern, index) => (
                    <div key={index} style={styles.patternCard}>
                      <div style={styles.patternHeader}>
                        <div style={styles.patternTitleRow}>
                          {getPatternIconSVG(pattern.type)}
                          <div style={styles.patternTitle}>{pattern.title}</div>
                        </div>
                        <div style={styles.confidenceContainer}>
                          <div style={styles.confidenceLabel}>信頼度</div>
                          <div
                            style={{
                              ...styles.confidenceValue,
                              color: getConfidenceColor(pattern.confidence),
                            }}
                          >
                            {Math.round(pattern.confidence * 100)}%
                          </div>
                          <div style={styles.confidenceBar}>
                            <div
                              style={{
                                ...styles.confidenceBarFill,
                                width: `${pattern.confidence * 100}%`,
                                background: getConfidenceColor(pattern.confidence),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={styles.patternDescription}>{pattern.description}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ブランド分析 */}
            {activeTab === 'brands' && (
              <div style={styles.analysisGrid}>
                {brandAnalysis.map((brand) => (
                  <div key={brand.brand_designer} style={styles.analysisCard}>
                    <div style={styles.analysisHeader}>
                      <div style={styles.analysisName}>{brand.brand_designer}</div>
                      <div style={styles.analysisCount}>{brand.product_count}製品</div>
                    </div>
                    <div style={styles.analysisStats}>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>平均スコア</span>
                        <span style={styles.statValue}>{brand.avg_score.toFixed(1)}</span>
                      </div>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>最高スコア</span>
                        <span style={styles.statValue}>{brand.max_score.toFixed(1)}</span>
                      </div>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>高スコア製品</span>
                        <span style={styles.statValue}>{brand.high_score_count}</span>
                      </div>
                    </div>
                    <div style={styles.scoreBreakdown}>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>コンセプト</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(brand.avg_concept_shift / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{brand.avg_concept_shift.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>破壊性</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(brand.avg_category_disruption / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{brand.avg_category_disruption.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>価格革新</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(brand.avg_philosophical_pricing / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{brand.avg_philosophical_pricing.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>体験変化</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(brand.avg_experience_change / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{brand.avg_experience_change.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* カテゴリー分析 */}
            {activeTab === 'categories' && (
              <div style={styles.analysisGrid}>
                {categoryAnalysis.map((category) => (
                  <div key={category.category} style={styles.analysisCard}>
                    <div style={styles.analysisHeader}>
                      <div style={styles.analysisName}>{category.category}</div>
                      <div style={styles.analysisCount}>{category.product_count}製品</div>
                    </div>
                    <div style={styles.analysisStats}>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>平均スコア</span>
                        <span style={styles.statValue}>{category.avg_score.toFixed(1)}</span>
                      </div>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>今週</span>
                        <span style={styles.statValue}>{category.weekly_count}</span>
                      </div>
                      <div style={styles.statRow}>
                        <span style={styles.statLabel}>今月</span>
                        <span style={styles.statValue}>{category.monthly_count}</span>
                      </div>
                    </div>
                    <div style={styles.scoreBreakdown}>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>コンセプト</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(category.avg_concept_shift / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{category.avg_concept_shift.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>破壊性</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(category.avg_category_disruption / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{category.avg_category_disruption.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>価格革新</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(category.avg_philosophical_pricing / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{category.avg_philosophical_pricing.toFixed(1)}</span>
                      </div>
                      <div style={styles.scoreRow}>
                        <span style={styles.scoreLabel}>体験変化</span>
                        <div style={styles.miniBar}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${(category.avg_experience_change / 10) * 100}%`,
                            }}
                          />
                        </div>
                        <span style={styles.scoreNum}>{category.avg_experience_change.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 時系列トレンド */}
            {activeTab === 'trends' && (
              <div style={styles.trendsContainer}>
                {weeklyStats.map((week) => (
                  <div key={week.week_start} style={styles.trendCard}>
                    <div style={styles.trendHeader}>
                      <div style={styles.trendWeek}>
                        {new Date(week.week_start).toLocaleDateString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        週
                      </div>
                      <div style={styles.trendCount}>{week.product_count}製品</div>
                    </div>
                    <div style={styles.trendStats}>
                      <div style={styles.trendStat}>
                        <div style={styles.trendStatLabel}>平均スコア</div>
                        <div style={styles.trendStatValue}>{week.avg_score.toFixed(1)}</div>
                      </div>
                      <div style={styles.trendStat}>
                        <div style={styles.trendStatLabel}>高スコア</div>
                        <div style={styles.trendStatValue}>{week.high_score_count}</div>
                      </div>
                      <div style={styles.trendStat}>
                        <div style={styles.trendStatLabel}>カテゴリー</div>
                        <div style={styles.trendStatValue}>{week.unique_categories}</div>
                      </div>
                      <div style={styles.trendStat}>
                        <div style={styles.trendStatLabel}>ブランド</div>
                        <div style={styles.trendStatValue}>{week.unique_brands}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#0f0f23',
  },
  lastAnalyzed: {
    fontSize: '12px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
  },
  analyzeButton: {
    padding: '8px 16px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#333366',
    color: '#6c7086',
    cursor: 'not-allowed',
  },
  tabsContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '16px 32px',
    borderBottom: '1px solid #333366',
    backgroundColor: '#1a1a2e',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    overflowX: 'auto' as const,
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexShrink: 0,
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    border: '1px solid #333366',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#a6adc8',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Space Grotesk, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  },
  tabActive: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
    color: '#00ff88',
  },
  tabCount: {
    fontSize: '11px',
    fontFamily: 'JetBrains Mono, monospace',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '32px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #333366',
    borderTopColor: '#00ff88',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  initialState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    textAlign: 'center' as const,
  },
  initialIcon: {
    marginBottom: '32px',
  },
  initialTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  initialText: {
    fontSize: '14px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: '22px',
    marginBottom: '32px',
  },
  initialButton: {
    padding: '12px 32px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '14px',
    color: '#6c7086',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: '24px',
  },
  patternList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  patternCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '20px',
    transition: 'all 0.2s',
  },
  patternHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '12px',
  },
  patternTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  patternTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  patternDescription: {
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: '20px',
    marginLeft: '30px', // アイコン分のインデント
  },
  confidenceContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    minWidth: '100px',
  },
  confidenceLabel: {
    fontSize: '10px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
  },
  confidenceValue: {
    fontSize: '20px',
    fontWeight: 700,
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: '4px',
  },
  confidenceBar: {
    width: '100px',
    height: '4px',
    backgroundColor: '#333366',
    borderRadius: '2px',
    overflow: 'hidden' as const,
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  analysisCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '16px',
  },
  analysisHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #333366',
  },
  analysisName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  analysisCount: {
    fontSize: '11px',
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
  },
  analysisStats: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '16px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
  },
  statLabel: {
    color: '#6c7086',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  statValue: {
    color: '#e2e8f0',
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 600,
  },
  scoreBreakdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  scoreLabel: {
    fontSize: '9px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
    width: '50px',
    flexShrink: 0,
  },
  miniBar: {
    flex: 1,
    height: '4px',
    backgroundColor: '#333366',
    borderRadius: '2px',
    overflow: 'hidden' as const,
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: '2px',
  },
  scoreNum: {
    fontSize: '10px',
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
    fontWeight: 600,
    width: '24px',
    textAlign: 'right' as const,
  },
  trendsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  trendCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '16px',
  },
  trendHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  trendWeek: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  trendCount: {
    fontSize: '11px',
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
  },
  trendStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  trendStat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: '9px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
    marginBottom: '4px',
  },
  trendStatValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#e2e8f0',
    fontFamily: 'JetBrains Mono, monospace',
  },
};

export default TrendPatternsView;

