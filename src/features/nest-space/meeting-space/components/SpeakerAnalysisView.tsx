import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../services/supabase/client';
import SpeakerAnalysisService, { 
  EmotionAnalysisResult, 
  PatternAnalysisResult,
  DiscourseAnalysisResult,
  SpeakerAnalysisStoredResult,
  SpeakerInsightNote
} from '../../../../services/SpeakerAnalysisService';

interface SpeakerAnalysisViewProps {
  meetingId: string;
  transcript: string;
  onAnalysisComplete?: (analysisData: any) => void;
  isJobRunning?: (jobType: 'ai_summary' | 'card_extraction' | 'speaker_diarization') => boolean;
  getButtonState?: (jobType: 'ai_summary' | 'card_extraction' | 'speaker_diarization') => {
    text: string;
    icon: string;
    disabled: boolean;
    spinning: boolean;
  };
}

type AnalysisType = 'emotion' | 'pattern' | 'discourse' | 'creativity' | 'insights' | 'comparison';

interface AnalysisCardProps {
  icon: string;
  title: string;
  description: string;
  buttonText: string;
  buttonIcon: string;
  onExecute: () => void;
  isAvailable?: boolean;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({
  icon,
  title,
  description,
  buttonText,
  buttonIcon,
  onExecute,
  isAvailable = true
}) => (
  <div style={{
    background: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center',
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    opacity: isAvailable ? 1 : 0.6,
    cursor: isAvailable ? 'pointer' : 'not-allowed',
    transition: 'all 0.2s ease'
  }}>
    <div>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <h3 style={{ 
        color: '#e2e8f0', 
        margin: '0 0 8px 0', 
        fontSize: '16px',
        fontWeight: '600'
      }}>
        {title}
      </h3>
      <p style={{ 
        color: '#a6adc8', 
        margin: 0, 
        fontSize: '13px',
        lineHeight: '1.4'
      }}>
        {description}
      </p>
    </div>
    <button
      onClick={onExecute}
      disabled={!isAvailable}
      style={{
        background: isAvailable ? '#00ff88' : '#555',
        color: isAvailable ? '#0f0f23' : '#888',
        border: 'none',
        borderRadius: '4px',
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        width: '100%'
      }}
    >
      {buttonIcon} {buttonText}
    </button>
  </div>
);

const SpeakerAnalysisView: React.FC<SpeakerAnalysisViewProps> = ({
  meetingId,
  transcript,
  onAnalysisComplete
}) => {
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState<AnalysisType | null>(null);
  const [completedAnalyses, setCompletedAnalyses] = useState<AnalysisType[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'emotion' | 'pattern' | 'discourse' | 'insights'>('emotion');
  const [analysisResults, setAnalysisResults] = useState<{
    emotion?: EmotionAnalysisResult[];
    pattern?: PatternAnalysisResult[];
    discourse?: DiscourseAnalysisResult[];
  }>({});
  const [storedResults, setStoredResults] = useState<SpeakerAnalysisStoredResult[]>([]);
  const [insightNotes, setInsightNotes] = useState<SpeakerInsightNote[]>([]);
  const [insightTextarea, setInsightTextarea] = useState('');

  useEffect(() => {
    loadSpeakerData();
    loadStoredAnalysisResults();
    loadInsightNotes();
  }, [meetingId]);

  const loadSpeakerData = async () => {
    try {
      setLoading(true);
      const { data: speakersData, error } = await supabase
        .from('meeting_speakers')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('speaker_tag');

      if (error) {
        console.error('Error loading speakers:', error);
        return;
      }

      setSpeakers(speakersData || []);
    } catch (error) {
      console.error('Error in loadSpeakerData:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredAnalysisResults = async () => {
    try {
      const results = await SpeakerAnalysisService.getStoredAnalysisResults(meetingId);
      setStoredResults(results);
      
      // 保存済み結果があれば分析完了状態にする
      const completedTypes = [...new Set(results.map(r => r.analysis_type))];
      setCompletedAnalyses(completedTypes as AnalysisType[]);
      
      // 保存済み分析結果を復元
      const emotionResult = results.find(r => r.analysis_type === 'emotion');
      if (emotionResult) {
        setAnalysisResults(prev => ({ ...prev, emotion: emotionResult.analysis_data }));
      }
      
      const patternResult = results.find(r => r.analysis_type === 'pattern');
      if (patternResult) {
        setAnalysisResults(prev => ({ ...prev, pattern: patternResult.analysis_data }));
      }
      
      const discourseResult = results.find(r => r.analysis_type === 'discourse');
      if (discourseResult) {
        setAnalysisResults(prev => ({ ...prev, discourse: discourseResult.analysis_data }));
      }
    } catch (error) {
      console.error('[SpeakerAnalysisView] 保存済み分析結果読み込みエラー:', error);
    }
  };

  const loadInsightNotes = async () => {
    try {
      const notes = await SpeakerAnalysisService.getInsightNotes(meetingId);
      setInsightNotes(notes);
    } catch (error) {
      console.error('[SpeakerAnalysisView] 洞察メモ読み込みエラー:', error);
    }
  };

  const executeAnalysis = async (analysisType: AnalysisType) => {
    try {
      setRunningAnalysis(analysisType);
      console.log(`[SpeakerAnalysisView] ${analysisType}分析開始`);

      switch (analysisType) {
        case 'emotion':
          const emotionResults = await SpeakerAnalysisService.performEmotionAnalysis(meetingId);
          setAnalysisResults(prev => ({ ...prev, emotion: emotionResults }));
          console.log('[SpeakerAnalysisView] 感情分析完了:', emotionResults);
          
          // 分析結果を保存
          await SpeakerAnalysisService.saveAnalysisResult(
            meetingId, 
            'emotion', 
            emotionResults,
            undefined, // 全話者対象
            { 
              executedAt: new Date().toISOString(),
              provider: 'frontend'
            }
          );
          console.log('[SpeakerAnalysisView] 感情分析結果保存完了');
          break;

        case 'pattern':
          const patternResults = await SpeakerAnalysisService.performPatternAnalysis(meetingId);
          setAnalysisResults(prev => ({ ...prev, pattern: patternResults }));
          console.log('[SpeakerAnalysisView] パターン分析完了:', patternResults);
          
          // 分析結果を保存
          await SpeakerAnalysisService.saveAnalysisResult(
            meetingId, 
            'pattern', 
            patternResults,
            undefined,
            { 
              executedAt: new Date().toISOString(),
              provider: 'frontend'
            }
          );
          console.log('[SpeakerAnalysisView] パターン分析結果保存完了');
          break;

        case 'discourse':
          const discourseResults = await SpeakerAnalysisService.performDiscourseAnalysis(meetingId);
          setAnalysisResults(prev => ({ ...prev, discourse: discourseResults }));
          console.log('[SpeakerAnalysisView] ディスクール分析完了:', discourseResults);
          
          // 分析結果を保存
          await SpeakerAnalysisService.saveAnalysisResult(
            meetingId, 
            'discourse', 
            discourseResults,
            undefined,
            { 
              executedAt: new Date().toISOString(),
              provider: 'frontend'
            }
          );
          console.log('[SpeakerAnalysisView] ディスクール分析結果保存完了');
          break;

        default:
          console.log(`[SpeakerAnalysisView] ${analysisType}分析はまだ実装されていません`);
      }

      // Mark analysis as completed
      setCompletedAnalyses(prev => [...prev, analysisType]);
      
      // 保存済み結果を再読み込み
      await loadStoredAnalysisResults();
      
      // Notify parent component
      if (onAnalysisComplete) {
        onAnalysisComplete({ type: analysisType, results: analysisResults });
      }

    } catch (error) {
      console.error(`[SpeakerAnalysisView] ${analysisType}分析エラー:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`分析に失敗しました: ${errorMessage}`);
    } finally {
      setRunningAnalysis(null);
    }
  };

  const saveInsightNote = async () => {
    if (!insightTextarea.trim()) {
      alert('洞察メモの内容を入力してください');
      return;
    }

    try {
      await SpeakerAnalysisService.saveInsightNote(meetingId, insightTextarea.trim());
      setInsightTextarea('');
      await loadInsightNotes();
      console.log('[SpeakerAnalysisView] 洞察メモ保存完了');
    } catch (error) {
      console.error('[SpeakerAnalysisView] 洞察メモ保存エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`洞察メモの保存に失敗しました: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: 'calc(100vh - 330px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a6adc8'
      }}>
        話者データを読み込み中...
      </div>
    );
  }

  if (speakers.length === 0) {
    return (
      <div style={{
        height: 'calc(100vh - 330px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a6adc8',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
        <h3 style={{ color: '#e2e8f0', marginBottom: '8px' }}>話者が検出されていません</h3>
        <p>「全文」タブで話者分離を実行してから分析を開始してください</p>
      </div>
    );
  }

  if (runningAnalysis) {
    return (
      <div style={{
        height: 'calc(100vh - 330px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a6adc8',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
        <h3 style={{ color: '#e2e8f0', marginBottom: '8px' }}>
          {runningAnalysis === 'emotion' && '感情分析実行中...'}
          {runningAnalysis === 'pattern' && 'パターン分析実行中...'}
          {runningAnalysis === 'discourse' && 'ディスクール分析実行中...'}
          {runningAnalysis === 'creativity' && '創造瞬間分析実行中...'}
          {runningAnalysis === 'insights' && '洞察メモを準備中...'}
          {runningAnalysis === 'comparison' && '比較分析を設定中...'}
        </h3>
        <div style={{
          width: '200px',
          height: '4px',
          background: '#333366',
          borderRadius: '2px',
          margin: '16px 0',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '70%',
            height: '100%',
            background: '#00ff88',
            borderRadius: '2px',
            animation: 'progress 2s ease-in-out infinite'
          }} />
        </div>
        <p>AIが分析を実行しています...</p>
        <style>{`
          @keyframes progress {
            0% { width: 30%; }
            50% { width: 70%; }
            100% { width: 90%; }
          }
        `}</style>
      </div>
    );
  }

  // サブタブのレンダリング
  const renderSubTabNavigation = () => (
    <div style={{
      display: 'flex',
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '8px 8px 0 0',
      padding: '0',
      marginBottom: '0'
    }}>
      {[
        { key: 'emotion' as const, label: '💭 感情分析', description: '感情の変化と真の意図' },
        { key: 'pattern' as const, label: '🔁 パターン分析', description: '反復表現と無意識的習慣' },
        { key: 'discourse' as const, label: '🎭 ディスクール分析', description: 'ラカン理論による深層分析' },
        { key: 'insights' as const, label: '📝 洞察メモ', description: '仮説形成と発見の記録' }
      ].map(tab => (
        <button
          key={tab.key}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: activeSubTab === tab.key ? '#333366' : 'transparent',
            color: activeSubTab === tab.key ? '#00ff88' : '#a6adc8',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            borderBottom: activeSubTab === tab.key ? '2px solid #00ff88' : '2px solid transparent',
            fontFamily: "'Space Grotesk', sans-serif"
          }}
          onClick={() => setActiveSubTab(tab.key)}
          onMouseEnter={(e) => {
            if (activeSubTab !== tab.key) {
              e.currentTarget.style.background = 'rgba(51, 51, 102, 0.3)';
              e.currentTarget.style.color = '#e2e8f0';
            }
          }}
          onMouseLeave={(e) => {
            if (activeSubTab !== tab.key) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#a6adc8';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  // サブタブコンテンツのレンダリング
  const renderSubTabContent = () => {
    const contentStyle = {
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderTop: 'none',
      borderRadius: '0 0 8px 8px',
      padding: '20px',
      minHeight: '400px'
    };

    switch (activeSubTab) {
      case 'emotion':
        return (
          <div style={contentStyle}>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 16px 0', fontSize: '16px' }}>
              💭 感情分析
            </h3>
            <div style={{ color: '#a6adc8', fontSize: '14px', lineHeight: '1.6' }}>
              <p>話者の感情の変化、真の意図、感情の抑制や投影パターンを分析します。</p>
              
              {!completedAnalyses.includes('emotion') ? (
                <div style={{ marginTop: '20px' }}>
                  <button
                    style={{
                      background: '#00ff88',
                      color: '#0f0f23',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: runningAnalysis === 'emotion' ? 0.6 : 1
                    }}
                    onClick={() => executeAnalysis('emotion')}
                    disabled={runningAnalysis === 'emotion'}
                  >
                    {runningAnalysis === 'emotion' ? '🔄 分析中...' : '🚀 感情分析を実行'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    marginTop: '20px', 
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#00ff88' }}>
                      ✅ 分析完了 - 結果を表示中
                    </span>
                    <button
                      onClick={() => executeAnalysis('emotion')}
                      disabled={runningAnalysis === 'emotion'}
                      style={{
                        background: runningAnalysis === 'emotion' ? '#333366' : '#1a1a2e',
                        color: runningAnalysis === 'emotion' ? '#a6adc8' : '#00ff88',
                        border: '1px solid #333366',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: runningAnalysis === 'emotion' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="感情分析を再実行"
                    >
                      {runningAnalysis === 'emotion' ? '🔄' : '🔄'} 再分析
                    </button>
                  </div>
                  {analysisResults.emotion && (
                    <div style={{ marginTop: '16px' }}>
                      {analysisResults.emotion.map((result, index) => (
                        <div key={index} style={{
                          background: '#0f0f23',
                          border: '1px solid #333366',
                          borderRadius: '6px',
                          padding: '16px',
                          marginBottom: '12px'
                        }}>
                          <h4 style={{ color: '#e2e8f0', margin: '0 0 12px 0', fontSize: '14px' }}>
                            🔵 話者{result.speakerId} ({result.speakerName})
                          </h4>
                          
                          {/* 全体的な感情プロファイル */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>感情プロファイル:</strong>
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                              <div>主要感情: <span style={{ color: '#00ff88' }}>{result.overallEmotionalProfile.dominantEmotion}</span></div>
                              <div>感情安定性: <span style={{ color: '#00ff88' }}>{Math.round(result.overallEmotionalProfile.emotionalStability * 100)}%</span></div>
                              <div>真正性スコア: <span style={{ color: '#00ff88' }}>{Math.round(result.overallEmotionalProfile.authenticityScore * 100)}%</span></div>
                              <div style={{ marginTop: '8px', fontStyle: 'italic' }}>
                                {result.overallEmotionalProfile.insight}
                              </div>
                            </div>
                          </div>

                          {/* 感情的イベント */}
                          {result.emotionalEvents.length > 0 && (
                            <div>
                              <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                                <strong>注目すべき感情変化:</strong>
                              </div>
                              {result.emotionalEvents.slice(0, 3).map((event, eventIndex) => (
                                <div key={eventIndex} style={{
                                  background: '#1a1a2e',
                                  padding: '8px 12px',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                  fontSize: '12px'
                                }}>
                                  <div style={{ color: '#00ff88', marginBottom: '4px' }}>
                                    {Math.floor(event.timeRange[0] / 60)}:{String(event.timeRange[0] % 60).padStart(2, '0')} - {event.emotion} (強度: {Math.round(event.intensity * 100)}%)
                                  </div>
                                  <div style={{ color: '#a6adc8', marginBottom: '4px' }}>
                                    「{event.triggerText.slice(0, 50)}...」
                                  </div>
                                  <div style={{ color: '#e2e8f0', fontStyle: 'italic' }}>
                                    💡 {event.insight}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'pattern':
        return (
          <div style={contentStyle}>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 16px 0', fontSize: '16px' }}>
              🔁 パターン分析
            </h3>
            <div style={{ color: '#a6adc8', fontSize: '14px', lineHeight: '1.6' }}>
              <p>反復される表現、無意識的な言語習慣、沈黙や間合いのパターンを発見します。</p>
              
              {!completedAnalyses.includes('pattern') ? (
                <div style={{ marginTop: '20px' }}>
                  <button
                    style={{
                      background: '#00ff88',
                      color: '#0f0f23',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: runningAnalysis === 'pattern' ? 0.6 : 1
                    }}
                    onClick={() => executeAnalysis('pattern')}
                    disabled={runningAnalysis === 'pattern'}
                  >
                    {runningAnalysis === 'pattern' ? '🔄 分析中...' : '🚀 パターン分析を実行'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    marginTop: '20px', 
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#00ff88' }}>
                      ✅ 分析完了 - 結果を表示中
                    </span>
                    <button
                      onClick={() => executeAnalysis('pattern')}
                      disabled={runningAnalysis === 'pattern'}
                      style={{
                        background: runningAnalysis === 'pattern' ? '#333366' : '#1a1a2e',
                        color: runningAnalysis === 'pattern' ? '#a6adc8' : '#00ff88',
                        border: '1px solid #333366',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: runningAnalysis === 'pattern' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="パターン分析を再実行"
                    >
                      {runningAnalysis === 'pattern' ? '🔄' : '🔄'} 再分析
                    </button>
                  </div>
                  {analysisResults.pattern && (
                    <div style={{ marginTop: '16px' }}>
                      {analysisResults.pattern.map((result, index) => (
                        <div key={index} style={{
                          background: '#0f0f23',
                          border: '1px solid #333366',
                          borderRadius: '6px',
                          padding: '16px',
                          marginBottom: '12px'
                        }}>
                          <h4 style={{ color: '#e2e8f0', margin: '0 0 12px 0', fontSize: '14px' }}>
                            🔵 話者{result.speakerId} ({result.speakerName})
                          </h4>
                          
                          {/* 反復表現 */}
                          {result.repetitiveExpressions.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                                <strong>よく使う表現:</strong>
                              </div>
                              {result.repetitiveExpressions.slice(0, 3).map((expr, exprIndex) => (
                                <div key={exprIndex} style={{
                                  background: '#1a1a2e',
                                  padding: '8px 12px',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                  fontSize: '12px'
                                }}>
                                  <div style={{ color: '#00ff88', marginBottom: '4px' }}>
                                    「{expr.expression}」 - {expr.frequency}回使用
                                  </div>
                                  <div style={{ color: '#e2e8f0', fontStyle: 'italic' }}>
                                    💡 {expr.insight}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 言語的習慣 */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>言語的特徴:</strong>
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                              {result.linguisticHabits.fillerWords.length > 0 && (
                                <div>フィラーワード: <span style={{ color: '#ff9f43' }}>{result.linguisticHabits.fillerWords.join(', ')}</span></div>
                              )}
                              {result.linguisticHabits.preferredTransitions.length > 0 && (
                                <div>よく使う接続語: <span style={{ color: '#54a0ff' }}>{result.linguisticHabits.preferredTransitions.join(', ')}</span></div>
                              )}
                              <div style={{ marginTop: '8px' }}>
                                発話リズム: <span style={{ color: '#00ff88' }}>{result.temporalPatterns.speakingRhythm}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'discourse':
        return (
          <div style={contentStyle}>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 16px 0', fontSize: '16px' }}>
              🎭 ディスクール分析
            </h3>
            <div style={{ color: '#a6adc8', fontSize: '14px', lineHeight: '1.6' }}>
              <p>ラカンの4つのディスクール構造、権力関係、無意識の欲望の発現を分析します。</p>
              
              {!completedAnalyses.includes('discourse') ? (
                <div style={{ marginTop: '20px' }}>
                  <button
                    style={{
                      background: '#00ff88',
                      color: '#0f0f23',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      opacity: runningAnalysis === 'discourse' ? 0.6 : 1
                    }}
                    onClick={() => executeAnalysis('discourse')}
                    disabled={runningAnalysis === 'discourse'}
                  >
                    {runningAnalysis === 'discourse' ? '🔄 分析中...' : '🚀 ディスクール分析を実行'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ 
                    marginTop: '20px', 
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: '#00ff88' }}>
                      ✅ 分析完了 - 結果を表示中
                    </span>
                    <button
                      onClick={() => executeAnalysis('discourse')}
                      disabled={runningAnalysis === 'discourse'}
                      style={{
                        background: runningAnalysis === 'discourse' ? '#333366' : '#1a1a2e',
                        color: runningAnalysis === 'discourse' ? '#a6adc8' : '#00ff88',
                        border: '1px solid #333366',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        cursor: runningAnalysis === 'discourse' ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="ディスクール分析を再実行"
                    >
                      {runningAnalysis === 'discourse' ? '🔄' : '🔄'} 再分析
                    </button>
                  </div>
                  {analysisResults.discourse && (
                    <div style={{ marginTop: '16px' }}>
                      {analysisResults.discourse.map((result, index) => (
                        <div key={index} style={{
                          background: '#0f0f23',
                          border: '1px solid #333366',
                          borderRadius: '6px',
                          padding: '16px',
                          marginBottom: '12px'
                        }}>
                          <h4 style={{ color: '#e2e8f0', margin: '0 0 12px 0', fontSize: '14px' }}>
                            🔵 話者{result.speakerId} ({result.speakerName})
                          </h4>
                          
                          {/* ディスクール類型 */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>ディスクール類型:</strong>
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}>
                              <span style={{ 
                                color: result.discourseType === 'master' ? '#ff6b6b' :
                                       result.discourseType === 'university' ? '#54a0ff' :
                                       result.discourseType === 'hysteric' ? '#ff9f43' : '#00ff88',
                                fontWeight: '600'
                              }}>
                                {result.discourseType === 'master' && '👑 主人のディスクール'}
                                {result.discourseType === 'university' && '🎓 大学のディスクール'}
                                {result.discourseType === 'hysteric' && '❓ ヒステリーのディスクール'}
                                {result.discourseType === 'analyst' && '🔍 分析家のディスクール'}
                              </span>
                              <div style={{ marginTop: '8px', fontSize: '11px' }}>
                                象徴的位置: <span style={{ color: '#00ff88' }}>{result.discourseAnalysis?.dominantPosition || '分析中'}</span>
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '11px' }}>
                                主体構造: <span style={{ color: '#ff9f43' }}>{result.discourseAnalysis?.subjectStructure || '分析中'}</span>
                              </div>
                              <div style={{ marginTop: '4px', fontSize: '11px', fontStyle: 'italic' }}>
                                享楽様式: {result.discourseAnalysis?.jouissanceMode || '分析中'}
                              </div>
                            </div>
                          </div>

                          {/* 無意識構造 */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>無意識構造（ラカン的分析）:</strong>
                            </div>
                            <div style={{ 
                              background: '#1a1a2e',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              <div style={{ color: '#ff6b6b', marginBottom: '4px' }}>
                                💫 根本的欲望: {result.unconsciousStructure?.primaryDesire || '分析中'}
                              </div>
                              <div style={{ color: '#e2e8f0', marginBottom: '4px' }}>
                                🔍 主体($): {result.unconsciousStructure?.lacanianalySubject || '分析中'}
                              </div>
                              <div style={{ color: '#54a0ff', marginBottom: '4px' }}>
                                ⚡ 対象a: {result.unconsciousStructure?.objectA || '分析中'}
                              </div>
                              <div style={{ color: '#ff9f43', fontSize: '10px', fontStyle: 'italic' }}>
                                象徴界との関係: {result.unconsciousStructure?.symbolicOrder || '分析中'}
                              </div>
                            </div>
                          </div>

                          {/* 言語分析 */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>言語構造分析:</strong>
                            </div>
                            <div style={{ 
                              background: '#1a1a2e',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              <div style={{ color: '#00ff88', marginBottom: '4px' }}>
                                🔗 シニフィアン連鎖: {result.linguisticAnalysis?.signifierChains || '分析中'}
                              </div>
                              <div style={{ color: '#ff9f43', marginBottom: '4px' }}>
                                💭 無意識形成物: {result.linguisticAnalysis?.unconsciousFormations || '分析中'}
                              </div>
                              <div style={{ color: '#e2e8f0', fontSize: '10px', fontStyle: 'italic' }}>
                                沈黙と間: {result.linguisticAnalysis?.silenceAndPauses || '分析中'}
                              </div>
                            </div>
                          </div>

                          {/* 臨床的洞察 */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                              <strong>臨床的洞察:</strong>
                            </div>
                            <div style={{ 
                              background: '#1a1a2e',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              <div style={{ color: '#ff6b6b', marginBottom: '4px' }}>
                                🩺 症状的現れ: {result.clinicalInsights?.symptomaticManifestations || '分析中'}
                              </div>
                              <div style={{ color: '#54a0ff', marginBottom: '4px' }}>
                                🛡️ 防衛機制: {result.clinicalInsights?.defenseMechanisms || '分析中'}
                              </div>
                              <div style={{ color: '#e2e8f0', fontSize: '10px', fontStyle: 'italic' }}>
                                転移力動: {result.clinicalInsights?.transferenceDynamics || '分析中'}
                              </div>
                            </div>
                          </div>

                          {/* ディスクール変化 */}
                          {result.discourseShifts && result.discourseShifts.length > 0 && (
                            <div>
                              <div style={{ color: '#a6adc8', fontSize: '13px', marginBottom: '8px' }}>
                                <strong>ディスクール変化:</strong>
                              </div>
                              {result.discourseShifts.slice(0, 2).map((shift, shiftIndex) => (
                                <div key={shiftIndex} style={{
                                  background: '#1a1a2e',
                                  padding: '8px 12px',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                  fontSize: '11px'
                                }}>
                                  <div style={{ color: '#54a0ff', marginBottom: '4px' }}>
                                    {Math.floor(shift.time)}分: {shift.fromType} → {shift.toType}
                                  </div>
                                  <div style={{ color: '#a6adc8', fontSize: '10px', marginBottom: '2px' }}>
                                    きっかけ: {shift.triggerEvent || '不明'}
                                  </div>
                                  <div style={{ color: '#ff9f43', fontSize: '10px', marginBottom: '2px' }}>
                                    精神分析的意味: {shift.psychoanalyticSignificance || '分析中'}
                                  </div>
                                  <div style={{ color: '#e2e8f0', fontSize: '10px', fontStyle: 'italic' }}>
                                    主体への効果: {shift.subjectiveEffect || '分析中'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'insights':
        return (
          <div style={contentStyle}>
            <h3 style={{ color: '#e2e8f0', margin: '0 0 16px 0', fontSize: '16px' }}>
              📝 洞察メモ
            </h3>
            <div style={{ color: '#a6adc8', fontSize: '14px', lineHeight: '1.6' }}>
              <p>仮説の形成、発見の記録、次のアクションの整理を行います。</p>
              
              <div style={{ marginTop: '20px' }}>
                <textarea
                  placeholder="分析から得られた洞察や仮説を記録してください..."
                  value={insightTextarea}
                  onChange={(e) => setInsightTextarea(e.target.value)}
                  style={{
                    width: '100%',
                    height: '200px',
                    background: '#0f0f23',
                    border: '1px solid #333366',
                    borderRadius: '6px',
                    padding: '12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
                <button
                  onClick={saveInsightNote}
                  disabled={!insightTextarea.trim()}
                  style={{
                    background: insightTextarea.trim() ? '#00ff88' : '#333366',
                    color: insightTextarea.trim() ? '#0f0f23' : '#a6adc8',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: insightTextarea.trim() ? 'pointer' : 'not-allowed',
                    marginTop: '12px'
                  }}
                >
                  💾 保存
                </button>
              </div>

              {/* 保存済み洞察メモ一覧 */}
              {insightNotes.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 12px 0', fontSize: '14px' }}>
                    📚 保存済み洞察メモ
                  </h4>
                  {insightNotes.map((note) => (
                    <div key={note.id} style={{
                      background: '#0f0f23',
                      border: '1px solid #333366',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ color: '#a6adc8', fontSize: '11px', marginBottom: '6px' }}>
                        {new Date(note.created_at).toLocaleString('ja-JP')}
                        {note.is_hypothesis && (
                          <span style={{ color: '#ff6b6b', marginLeft: '8px' }}>🔬 仮説</span>
                        )}
                        {note.confidence_level && (
                          <span style={{ color: '#00ff88', marginLeft: '8px' }}>
                            確信度: {'★'.repeat(note.confidence_level)}
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.4' }}>
                        {note.note_content}
                      </div>
                      {note.note_tags.length > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          {note.note_tags.map((tag, tagIndex) => (
                            <span key={tagIndex} style={{
                              background: '#333366',
                              color: '#a6adc8',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontSize: '10px',
                              marginRight: '4px'
                            }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      height: 'calc(100vh - 330px)',
      padding: '16px',
      overflow: 'auto'
    }}>
      {/* Speaker Summary */}
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #333366',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#e2e8f0', margin: '0 0 12px 0', fontSize: '16px' }}>
          📊 検出された話者（{speakers.length}名）
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {speakers.map((speaker, index) => (
            <div key={speaker.id} style={{
              background: '#2a2a3e',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              color: '#e2e8f0'
            }}>
              🔵 話者{speaker.speaker_tag}（{speaker.name || '未分類'}）
            </div>
          ))}
        </div>
      </div>

      {/* Sub Tab Navigation */}
      {renderSubTabNavigation()}

      {/* Sub Tab Content */}
      {renderSubTabContent()}
    </div>
  );
};

export default SpeakerAnalysisView;
