import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../services/supabase/client';
import { Speaker, Word } from '../../../../services/GoogleSpeechToTextService';
// import TextSpeakerDiarizationService from '../../../../services/TextSpeakerDiarizationService';
import { startBackgroundJobWorker } from '../../../../services/backgroundJobWorker';
import { nestAIProviderService } from '../../../../services/ai/NestAIProviderService';
import { SpeakerDiarizationService } from '../../../../services/SpeakerDiarizationService';

interface SpeakerDiarizationViewProps {
  meetingId: string;
  transcript: string;
  onTranscriptUpdate?: (newTranscript: string) => void;
  onAnalysisRequest?: () => void;
}

interface SpeakerWithUtterances extends Speaker {
  utterances: Word[];
}

const SpeakerDiarizationView: React.FC<SpeakerDiarizationViewProps> = ({
  meetingId,
  transcript,
  onTranscriptUpdate,
  onAnalysisRequest
}) => {
  console.log('🔧 SpeakerDiarizationView レンダリング:', { 
    meetingId, 
    transcriptLength: transcript?.length,
    hasOnAnalysisRequest: !!onAnalysisRequest 
  });
  
  const [nestId, setNestId] = useState<string | null>(null);
  // SVGアイコン用のCSSスタイルを動的に挿入
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .svg-icon {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .spinner-icon {
        animation: spin 1s linear infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [speakers, setSpeakers] = useState<SpeakerWithUtterances[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<number | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(transcript);
  const [saving, setSaving] = useState(false);
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [diarizationProgress, setDiarizationProgress] = useState(0);
  const [diarizationMethod, setDiarizationMethod] = useState<'llm' | 'rules' | null>(null);
  const [lastAnalysisMethod, setLastAnalysisMethod] = useState<'llm' | 'rules' | null>(null);
  const [viewMode, setViewMode] = useState<'raw' | 'diarized'>('raw');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('idle');
  const [nestAISettings, setNestAISettings] = useState<any>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

  const viewModeOptions = [
    { value: 'raw', label: '生テキスト', icon: '📝' },
    { value: 'diarized', label: '話者分離済み', icon: '⚡', disabled: speakers.length === 0 }
  ];

  const currentOption = viewModeOptions.find(option => option.value === viewMode);

  // meetingデータからnestIdを取得
  useEffect(() => {
    const fetchMeetingData = async () => {
      if (!meetingId) return;
      
      try {
        console.log('🔍 ミーティングデータからnestId取得中...', { meetingId });
        const { data: meeting, error } = await supabase
          .from('meetings')
          .select('nest_id')
          .eq('id', meetingId)
          .single();
          
        if (error) {
          console.error('❌ ミーティングデータ取得エラー:', error);
          return;
        }
        
        if (meeting?.nest_id) {
          setNestId(meeting.nest_id);
          console.log('✅ nestId取得成功:', meeting.nest_id);
          
          // NEST AI設定を取得
          try {
            const settings = await nestAIProviderService.getNestAIProviderSettings(meeting.nest_id);
            setNestAISettings(settings);
            console.log('✅ NEST AI設定取得成功:', settings);
          } catch (error) {
            console.error('❌ NEST AI設定取得エラー:', error);
          }
        }
      } catch (error) {
        console.error('❌ nestId取得エラー:', error);
      }
    };
    
    fetchMeetingData();
  }, [meetingId]);

  useEffect(() => {
    loadSpeakerData();
  }, [meetingId]);

  // Background Workerの起動（重複起動防止）
  useEffect(() => {
    console.log('🚀 Background Worker起動チェック中...');
    
    // 既に起動されているかチェック
    const checkAndStartWorker = async () => {
      try {
        // Background Workerの状態をチェック（実装が必要）
        // 現在は単純に起動を試行
        startBackgroundJobWorker();
        console.log('✅ Background Worker起動完了');
      } catch (error) {
        console.warn('⚠️ Background Worker起動エラー（既に起動中の可能性）:', error);
      }
    };
    
    checkAndStartWorker();
  }, []);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  // 外側クリックでドロップダウンを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isDropdownOpen && !target.closest('.custom-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const loadSpeakerData = async () => {
    try {
      console.log('🔍 話者データ読み込み開始:', { meetingId });
      setLoading(true);

      const { SpeakerDiarizationService } = await import('../../../../services/SpeakerDiarizationService');
      const { speakers: speakersData, utterances: utterancesData } = await SpeakerDiarizationService.getSpeakerData(meetingId);

      console.log('👥 話者データ取得結果:', { speakersData, utterancesData });

      // 話者ごとに発言をグループ化
      const speakersWithUtterances: SpeakerWithUtterances[] = speakersData.map(speaker => {
        const speakerUtterances = utterancesData
          .filter(u => u.speaker_tag === speaker.speaker_tag)
          .map((utterance, index) => {
            // 時間データのログ
            if (isNaN(utterance.start_time) || isNaN(utterance.end_time)) {
              console.warn(`⚠️ 話者${speaker.speaker_tag}の発言${index + 1}で時間データが無効:`, {
                start_time: utterance.start_time,
                end_time: utterance.end_time,
                text: utterance.word?.substring(0, 50) + '...'
              });
            }
            
            return {
              ...utterance,
              startTime: utterance.start_time || 0,
              endTime: utterance.end_time || 0,
              text: utterance.word,
              speakerTag: utterance.speaker_tag
            };
          });
          
        console.log(`👤 話者${speaker.speaker_tag}のデータ:`, {
          name: speaker.name,
          totalTime: speaker.total_time,
          wordCount: speaker.word_count,
          utterancesCount: speakerUtterances.length,
          timeDataSample: speakerUtterances.slice(0, 3).map(u => ({
            startTime: u.startTime,
            endTime: u.endTime,
            text: u.text?.substring(0, 30) + '...'
          }))
        });
        
        return {
          speakerTag: speaker.speaker_tag,
          name: speaker.name || `話者${speaker.speaker_tag}`,
          totalTime: speaker.total_time,
          wordCount: speaker.word_count,
          utterances: speakerUtterances
        };
      });

      console.log('✅ 話者データ処理完了:', { speakersWithUtterances });
      setSpeakers(speakersWithUtterances);
      
      // 話者データがある場合は話者分離済みモードに切り替え
      if (speakersWithUtterances.length > 0) {
        setViewMode('diarized');
      } else {
        setViewMode('raw');
      }
    } catch (error) {
      console.error('❌ 話者データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    // NaNや無効な値をチェック
    if (isNaN(seconds) || seconds === null || seconds === undefined) {
      console.warn('⚠️ formatTimeで無効な値を受信:', seconds);
      return '0:00';
    }
    
    // 負の値もチェック
    if (seconds < 0) {
      console.warn('⚠️ formatTimeで負の値を受信:', seconds);
      return '0:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speakerTag: number): string => {
    const colors = [
      '#6366f1', // インディゴ
      '#8b5cf6', // パープル  
      '#ef4444', // レッド
      '#06b6d4', // シアン
      '#10b981', // エメラルド
      '#f59e0b', // アンバー
      '#ec4899', // ピンク
      '#84cc16', // ライム
    ];
    return colors[(speakerTag - 1) % colors.length];
  };

  const handleSaveTranscript = async () => {
    if (!editedTranscript.trim()) {
      alert('文字起こしが空です');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          transcript: editedTranscript,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) {
        throw error;
      }

      // 親コンポーネントに更新を通知
      if (onTranscriptUpdate) {
        onTranscriptUpdate(editedTranscript);
      }

      setIsEditingTranscript(false);
      console.log('文字起こしが正常に更新されました');
    } catch (error) {
      console.error('文字起こしの保存に失敗しました:', error);
      alert('文字起こしの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTranscript(transcript);
    setIsEditingTranscript(false);
  };

  const handleDiarization = async () => {
    console.log('🚀 話者分離ボタンがクリックされました');
    console.log('📋 現在の状態:', { transcript: transcript?.length, isDiarizing, meetingId });
    
    if (!transcript || isDiarizing) {
      console.log('❌ 話者分離をスキップ:', { 
        hasTranscript: !!transcript, 
        transcriptLength: transcript?.length,
        isDiarizing 
      });
      return;
    }
    
    try {
      console.log('✅ Background Worker経由で話者分離処理を開始します');
      setIsDiarizing(true);
      setDiarizationProgress(10);
      setDiarizationMethod(null);
      setJobStatus('starting');
      
      // Background Worker経由で話者分離ジョブを作成
      console.log('🎭 Background Worker経由で話者分離ジョブ作成中...');
      // NEST設定からプロバイダーとモデルを取得
      const provider = nestAISettings?.primaryProvider || 'openai';
      const modelConfig = nestAISettings?.providerConfigs?.[provider];
      
      console.log('🔧 使用するAI設定:', {
        provider,
        model: modelConfig?.model,
        embeddingModel: modelConfig?.embeddingModel
      });
      
      const { SpeakerDiarizationService } = await import('../../../../services/SpeakerDiarizationService');
      
      // 統合インターフェースを使用（設定に応じて直接呼び出しまたはBackgroundWorker）
      const result = await SpeakerDiarizationService.executeSpeakerDiarization(
        meetingId,
        provider,
        modelConfig?.model || (provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o')
      );
      
      if (SpeakerDiarizationService.USE_DIRECT_CALL) {
        // 直接呼び出し版の場合は結果を直接処理
        console.log('✅ 直接呼び出し版完了:', result);
        setDiarizationProgress(100);
        setJobStatus('completed');
        
        // 話者データを再読み込み
        await loadSpeakerData();
        setViewMode('diarized');
        setIsDiarizing(false);
        
      } else {
        // BackgroundWorker版の場合は従来の処理
        console.log('✅ BackgroundWorker版ジョブ作成完了:', result);
        setCurrentJobId(result.id);
        setJobStatus('running');
        
        // ジョブの進捗を監視
        const progressInterval = setInterval(async () => {
          try {
            const jobStatus = await SpeakerDiarizationService.getSpeakerDiarizationJobStatus(result.id);
            
            if (jobStatus.status === 'completed') {
              console.log('✅ 話者分離ジョブ完了:', jobStatus);
              setDiarizationProgress(100);
              setJobStatus('completed');
              clearInterval(progressInterval);
              
              // 話者データを再読み込み
              await loadSpeakerData();
              setViewMode('diarized');
              setIsDiarizing(false);
              
            } else if (jobStatus.status === 'failed') {
              console.error('❌ 話者分離ジョブ失敗:', jobStatus);
              setJobStatus('failed');
              clearInterval(progressInterval);
              setIsDiarizing(false);
              alert('話者分離処理に失敗しました。');
              
            } else if (jobStatus.status === 'running') {
              // 進捗を更新
              const progress = jobStatus.progress || 0;
              setDiarizationProgress(Math.max(10, Math.min(progress, 90)));
            }
          } catch (error) {
            console.error('❌ ジョブ状態取得エラー:', error);
          }
        }, 2000); // 2秒間隔で監視
        
        // クリーンアップ関数を保存
        setProgressInterval(progressInterval);
      }
      
    } catch (error) {
      console.error('❌ 話者分離エラー:', error);
      
      if (SpeakerDiarizationService.USE_DIRECT_CALL) {
        alert('話者分離処理に失敗しました。');
      } else {
        alert('話者分離ジョブの作成に失敗しました。');
      }
      
      setIsDiarizing(false);
      setJobStatus('failed');
    }
  };

  const renderSpeakerSummary = () => (
    <div style={styles.summaryContainer}>
      <div style={styles.summaryHeader}>
        <div style={styles.summaryTitle}>📊 話者別サマリー</div>
        {lastAnalysisMethod && (
          <div style={styles.analysisMethodBadge}>
            {lastAnalysisMethod === 'llm' ? (
              <span style={styles.llmBadge}>🤖 LLM分析</span>
            ) : (
              <span style={styles.rulesBadge}>🔧 ルールベース</span>
            )}
          </div>
        )}
      </div>
      <div style={styles.speakersGrid}>
        {speakers.map(speaker => (
          <button
            key={speaker.speakerTag}
            style={{
              ...styles.speakerCard,
              borderColor: getSpeakerColor(speaker.speakerTag),
              ...(selectedSpeaker === speaker.speakerTag && styles.selectedSpeakerCard)
            }}
            onClick={() => setSelectedSpeaker(
              selectedSpeaker === speaker.speakerTag ? null : speaker.speakerTag
            )}
          >
            <div style={{
              ...styles.speakerAvatar,
              backgroundColor: getSpeakerColor(speaker.speakerTag)
            }}>
              <span style={styles.speakerAvatarText}>{speaker.speakerTag}</span>
            </div>
            <div style={styles.speakerName}>{speaker.name}</div>
            <div style={styles.speakerStats}>
              {speaker.totalTime} • {speaker.wordCount}語
            </div>
            <div style={styles.adjustmentNotice}>
              計算式調整中です。
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTimeline = () => {
    if (!speakers.length) return null;

    // 全発言を時間順にソート
    const allUtterances = speakers.flatMap(s => s.utterances);
    const sortedUtterances = allUtterances.sort((a, b) => a.startTime - b.startTime);

    return (
      <div style={styles.timelineContainer}>
        <div style={styles.timelineTitle}>⏰ タイムライン</div>
        <div style={styles.timelineScroll}>
          <div style={styles.timelineContent}>
            {sortedUtterances.map((utterance, index) => {
              const speaker = speakers.find(s => s.speakerTag === utterance.speakerTag);
              return (
                <div key={index} style={styles.timelineItem}>
                  <div style={styles.timelineLeft}>
                    <div style={styles.timelineTime}>
                      <span style={styles.timeText}>{formatTime(utterance.startTime)}</span>
                    </div>
                    <div style={{
                      ...styles.speakerLabel,
                      backgroundColor: getSpeakerColor(utterance.speakerTag)
                    }}>
                      {speaker?.name || `話者${utterance.speakerTag}`}
                    </div>
                  </div>
                  <div style={styles.timelineRight}>
                    <div style={styles.utteranceContent}>
                      {utterance.word}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderSpeakerDetail = () => {
    if (selectedSpeaker === null) return null;

    const speaker = speakers.find(s => s.speakerTag === selectedSpeaker);
    if (!speaker) return null;

    return (
      <div style={styles.detailContainer}>
        <div style={styles.detailHeader}>
          <div style={{
            ...styles.detailAvatar,
            backgroundColor: getSpeakerColor(speaker.speakerTag)
          }}>
            <span style={styles.detailAvatarText}>{speaker.speakerTag}</span>
          </div>
          <div style={styles.detailInfo}>
            <div style={styles.detailName}>{speaker.name}</div>
            <div style={styles.detailStats}>
              発言時間: {speaker.totalTime} • 単語数: {speaker.wordCount}
            </div>
          </div>
        </div>
        
        <div style={styles.detailContent}>
          {speaker.utterances.map((utterance, index) => (
            <div key={index} style={styles.utteranceItem}>
              <div style={styles.utteranceTime}>
                {formatTime(utterance.startTime)} - {formatTime(utterance.endTime)}
              </div>
              <div style={styles.utteranceWord}>{utterance.word}</div>
              {utterance.confidence > 0 && (
                <div style={styles.confidenceText}>
                  信頼度: {(utterance.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDiarizedMode = () => (
    <div>
      {renderSpeakerSummary()}
      {renderTimeline()}
      {renderSpeakerDetail()}
    </div>
  );

  const renderRawTextMode = () => (
    <div>
      {/* 生テキスト編集エリア */}
      <div style={styles.rawTextContainer}>
        <div style={styles.rawTextHeader}>
          <h3 style={styles.rawTextTitle}>📝 文字起こしテキスト</h3>
          <div style={styles.rawTextActions}>
            <span style={styles.textCounter}>
              {editedTranscript.length}文字 • {editedTranscript.split('\n').length}行
            </span>
          </div>
        </div>
        
        <textarea
          value={editedTranscript}
          onChange={(e) => setEditedTranscript(e.target.value)}
          placeholder="ここに文字起こしテキストを入力してください..."
          style={styles.transcriptTextarea}
        />
        
        <div style={styles.rawTextFooter}>
          <button
            onClick={handleSaveTranscript}
            disabled={saving || editedTranscript === transcript}
            style={{
              ...styles.saveButton,
              opacity: saving || editedTranscript === transcript ? 0.6 : 1
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 話者分離実行プロンプト */}
      {editedTranscript && (
        <div style={styles.diarizationPrompt}>
          <div style={styles.promptHeader}>
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }} fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4l-2-2 2-2z"/>
              <path d="M19 11h-4l2 2-2 2h4a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"/>
              <path d="M13 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
            </svg>
            <h3 style={styles.promptTitle}>話者分離のヒント</h3>
          </div>
          <div style={styles.promptContent}>
            <ul style={styles.hintList}>
              <li>🤖 <strong>LLM自動分析</strong>: 話者が明示されていなくても文脈から自動判別</li>
              <li>📝 <strong>対応形式</strong>: A:、話者1:、[名前]: など様々な形式に対応</li>
              <li>🔄 <strong>フォールバック機能</strong>: LLMが利用できない場合はルールベースで処理</li>
              <li>⚡ <strong>高精度</strong>: 文脈を理解した高精度な話者分離</li>
            </ul>
            <button
              onClick={handleDiarization}
              disabled={isDiarizing || !editedTranscript}
              style={{ ...styles.diarizationButton, opacity: isDiarizing || !editedTranscript ? 0.6 : 1, cursor: isDiarizing || !editedTranscript ? 'not-allowed' : 'pointer' }}
            >
              {isDiarizing ? (
                // 実行中: スピナーアイコン
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner-icon">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                // 通常時: 既存の立方体アイコン
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, marginRight: 6 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              )}
              {isDiarizing ? `分離中... ${diarizationProgress}%` : '話者分離を実行'}
            </button>
            {isDiarizing && (
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${diarizationProgress}%` }} />
                </div>
                <div style={styles.progressText}>
                  {!diarizationMethod && diarizationProgress < 30 && 'テキストを解析中...'}
                  {diarizationMethod === 'llm' && diarizationProgress < 30 && 'LLMでテキストを解析中...'}
                  {diarizationMethod === 'llm' && diarizationProgress >= 30 && diarizationProgress < 70 && 'LLMで話者パターンを分析中...'}
                  {diarizationMethod === 'rules' && diarizationProgress >= 30 && diarizationProgress < 70 && 'ルールベースで話者パターンを分析中...'}
                  {diarizationProgress >= 70 && diarizationProgress < 90 && '話者を分離中...'}
                  {diarizationProgress >= 90 && 'データを保存中...'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>話者情報を読み込み中...</div>
      </div>
    );
  }

  // 話者データがない場合は、通常の文字起こしを表示
  if (speakers.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.fallbackTranscript}>
          <div style={styles.fallbackHeader}>
            <div style={styles.fallbackTitle}>📝 文字起こし</div>
            <div style={styles.fallbackActions}>
              {!isEditingTranscript ? (
                <button
                  onClick={() => setIsEditingTranscript(true)}
                  style={styles.editButton}
                >
                  <svg className="svg-icon" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 6 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  編集
                </button>
              ) : (
                <div style={styles.editActions}>
                  <button
                    onClick={handleSaveTranscript}
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.6 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {saving ? (
                      '保存中...'
                    ) : (
                      <>
                        <svg className="svg-icon" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 6 }}>
                          <polyline points="20,6 9,17 4,12"/>
                        </svg>
                        保存
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    style={styles.cancelButton}
                  >
                    <svg className="svg-icon" viewBox="0 0 24 24" style={{ width: 14, height: 14, marginRight: 6 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    キャンセル
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {isEditingTranscript ? (
            <textarea
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              style={styles.transcriptTextArea}
              placeholder="文字起こしを入力してください..."
            />
          ) : (
            <>
              <div style={styles.fallbackContent}>
                {transcript || '文字起こしデータがありません'}
              </div>
              
              {/* 話者分離機能の説明とボタン */}
              {(() => {
                console.log('🔍 話者分離プロンプト表示判定:', { 
                  hasTranscript: !!transcript, 
                  transcriptLength: transcript?.length,
                  speakersLength: speakers.length 
                });
                return transcript;
              })() && (
                <div style={styles.diarizationPrompt}>
                  <div style={styles.promptHeader}>
                    <svg
                      viewBox="0 0 24 24"
                      style={{ width: 18, height: 18 }}
                      fill="none"
                      stroke="#00ff88"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4l-2-2 2-2z"/>
                      <path d="M19 11h-4l2 2-2 2h4a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2z"/>
                      <path d="M13 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                    </svg>
                    <h3 style={styles.promptTitle}>話者分離のヒント</h3>
                  </div>
                  <div style={styles.promptContent}>
                    <ul style={styles.hintList}>
                      <li>🤖 <strong>LLM自動分析</strong>: 話者が明示されていなくても文脈から自動判別</li>
                      <li>📝 <strong>対応形式</strong>: A:、話者1:、[名前]: など様々な形式に対応</li>
                      <li>🔄 <strong>フォールバック機能</strong>: LLMが利用できない場合はルールベースで処理</li>
                      <li>⚡ <strong>高精度</strong>: 文脈を理解した高精度な話者分離</li>
                    </ul>
                    <button
                      onClick={() => {
                        console.log('🖱️ 話者分離ボタンがクリックされました（onClick）');
                        handleDiarization();
                      }}
                      disabled={isDiarizing || !transcript}
                      style={{
                        ...styles.diarizationButton,
                        opacity: isDiarizing || !transcript ? 0.6 : 1,
                        cursor: isDiarizing || !transcript ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        style={{ width: 16, height: 16, marginRight: 6 }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                        <path d="M2 17l10 5 10-5"/>
                        <path d="M2 12l10 5 10-5"/>
                      </svg>
                      {isDiarizing ? `分離中... ${diarizationProgress}%` : '話者分離を実行'}
                    </button>
                    
                    {/* 進捗バー */}
                    {isDiarizing && (
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                          <div 
                            style={{
                              ...styles.progressFill,
                              width: `${diarizationProgress}%`
                            }}
                          />
                        </div>
                        <div style={styles.progressText}>
                          {!diarizationMethod && diarizationProgress < 30 && 'テキストを解析中...'}
                          {diarizationMethod === 'llm' && diarizationProgress < 30 && 'LLMでテキストを解析中...'}
                          {diarizationMethod === 'llm' && diarizationProgress >= 30 && diarizationProgress < 70 && 'LLMで話者パターンを分析中...'}
                          {diarizationMethod === 'rules' && diarizationProgress >= 30 && diarizationProgress < 70 && 'ルールベースで話者パターンを分析中...'}
                          {diarizationProgress >= 70 && diarizationProgress < 90 && '話者を分離中...'}
                          {diarizationProgress >= 90 && 'データを保存中...'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 表示モード切り替えヘッダー */}
      <div style={styles.viewModeHeader}>
        <div style={styles.viewModeSelector}>
          <label style={styles.viewModeLabel}>表示モード:</label>
          <div style={styles.customDropdown} className="custom-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={styles.dropdownButton}
            >
              <span style={styles.dropdownButtonText}>
                <span style={styles.dropdownIcon}>{currentOption?.icon}</span>
                {currentOption?.label}
              </span>
              <svg
                style={{
                  ...styles.dropdownArrow,
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6,9 12,15 18,9" />
              </svg>
            </button>
            {isDropdownOpen && (
              <div style={styles.dropdownMenu}>
                {viewModeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (!option.disabled) {
                        setViewMode(option.value as 'raw' | 'diarized');
                        setIsDropdownOpen(false);
                      }
                    }}
                    style={{
                      ...styles.dropdownOption,
                      ...(option.disabled && styles.dropdownOptionDisabled),
                      ...(option.value === viewMode && styles.dropdownOptionSelected)
                    }}
                    disabled={option.disabled}
                  >
                    <div style={styles.dropdownOptionLeft}>
                      <span style={styles.dropdownOptionIcon}>{option.icon}</span>
                      <span style={styles.dropdownOptionText}>{option.label}</span>
                    </div>
                    {option.value === viewMode && (
                      <svg
                        style={styles.checkIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 右上のアクションボタン群 */}
        {speakers.length > 0 && (
          <div style={styles.headerActions}>
            {onAnalysisRequest && (
              <button
                onClick={onAnalysisRequest}
                style={styles.headerAnalysisButton}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: 16, height: 16, marginRight: 6 }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  <path d="M13 8H7"/>
                  <path d="M17 12H7"/>
                </svg>
                話者分析タブで詳細分析を開始する
              </button>
            )}
            <button
              onClick={() => {
                console.log('🔄 再分析ボタンがクリックされました');
                handleDiarization();
              }}
              disabled={isDiarizing}
              style={{
                ...styles.headerReanalysisButton,
                opacity: isDiarizing ? 0.6 : 1,
                cursor: isDiarizing ? 'not-allowed' : 'pointer'
              }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: 16, height: 16, marginRight: 6 }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              {isDiarizing ? '分析中...' : '再分析'}
            </button>
          </div>
        )}
      </div>

      {/* 条件による表示切り替え */}
      {viewMode === 'raw' ? renderRawTextMode() : renderDiarizedMode()}
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  
  // 表示モード切り替えのスタイル
  viewModeHeader: {
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerAnalysisButton: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  headerReanalysisButton: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  viewModeLabel: {
    color: '#e2e8f0',
    fontSize: '14px',
    fontWeight: '600',
  },
  // カスタムドロップダウンのスタイル
  customDropdown: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  dropdownButton: {
    backgroundColor: '#232345',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    cursor: 'pointer',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '160px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#2a2a4a',
    },
  },
  dropdownButtonText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dropdownIcon: {
    fontSize: '16px',
  },
  dropdownArrow: {
    width: '16px',
    height: '16px',
    marginLeft: '8px',
    transition: 'transform 0.2s ease',
    opacity: 0.7,
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    left: '0',
    right: '0',
    backgroundColor: '#232345',
    border: '1px solid #333366',
    borderRadius: '8px',
    marginTop: '2px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  dropdownOption: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#e2e8f0',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background-color 0.2s ease',
    outline: 'none',
    '&:hover': {
      backgroundColor: '#2a2a4a',
    },
  },
  dropdownOptionSelected: {
    backgroundColor: '#6366f1',
    color: '#ffffff',
  },
  dropdownOptionDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  dropdownOptionLeft: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  dropdownOptionIcon: {
    fontSize: '16px',
    marginRight: '8px',
  },
  dropdownOptionText: {
    textAlign: 'left' as const,
  },
  checkIcon: {
    width: '16px',
    height: '16px',
    marginLeft: '8px',
  },
  
  // 生テキストモードのスタイル
  rawTextContainer: {
    padding: '16px',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  rawTextHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rawTextTitle: {
    color: '#e2e8f0',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },
  rawTextActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  textCounter: {
    color: '#a6adc8',
    fontSize: '12px',
    fontWeight: '500',
  },
  transcriptTextarea: {
    backgroundColor: '#0f0f23',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    lineHeight: '1.6',
    minHeight: '300px',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  rawTextFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    color: '#a6adc8',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    padding: 0,
    backgroundColor: '#0f0f23',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyText: {
    color: '#a6adc8',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    padding: 20,
  },
  fallbackTranscript: {
    backgroundColor: '#0f0f23',
    padding: 16,
    borderRadius: 4,
    border: '1px solid #333366',
    marginTop: 16,
    height: '100%',
    overflow: 'auto',
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  fallbackHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottom: '1px solid #333366',
    paddingBottom: 8,
  },
  fallbackTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fallbackActions: {
    display: 'flex',
    gap: 8,
  },
  editButton: {
    background: '#333366',
    color: '#e2e8f0',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  editActions: {
    display: 'flex',
    gap: 8,
  },
  saveButton: {
    background: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  cancelButton: {
    background: 'none',
    color: '#a6adc8',
    border: '1px solid #333366',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
  },
  transcriptTextArea: {
    flex: 1,
    background: '#1a1a2e',
    color: '#a6adc8',
    border: '1px solid #333366',
    borderRadius: 4,
    padding: 12,
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    resize: 'none' as const,
    outline: 'none',
    minHeight: 200,
  },
  fallbackContent: {
    color: '#a6adc8',
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word' as const,
    flex: 1,
    overflow: 'auto',
  },

  summaryContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisMethodBadge: {
    display: 'flex',
    alignItems: 'center',
  },
  llmBadge: {
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rulesBadge: {
    backgroundColor: '#ffa500',
    color: '#0f0f23',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  speakersGrid: {
    display: 'flex',
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  speakerCard: {
    backgroundColor: '#232345',
    padding: 12,
    borderRadius: 8,
    border: '2px solid',
    minWidth: 120,
    alignItems: 'center',
    cursor: 'pointer',
    borderStyle: 'solid',
  },
  selectedSpeakerCard: {
    backgroundColor: '#2a2a4a',
    borderWidth: 3,
  },
  speakerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    display: 'flex',
  },
  speakerAvatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  speakerName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  speakerStats: {
    color: '#e2e8f0',
    fontSize: 12,
    textAlign: 'center' as const,
    fontWeight: '600',
  },
  adjustmentNotice: {
    color: '#f9e2af',
    fontSize: 10,
    textAlign: 'center' as const,
    fontStyle: 'italic',
    marginTop: 4,
  },

  timelineContainer: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
  },
  timelineTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timelineScroll: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  timelineItem: {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #2a2a4a',
  },
  timelineLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    minWidth: '120px',
    gap: 6,
  },
  timelineRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'flex-start',
  },
  timelineTime: {
    backgroundColor: '#333366',
    color: '#f8fafc',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  speakerLabel: {
    color: '#ffffff',
    padding: '4px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 'bold',
  },
  utteranceContent: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 1.5,
    padding: '8px 12px',
    backgroundColor: '#232345',
    borderRadius: 8,
    border: '1px solid #333366',
    wordBreak: 'break-word' as const,
  },
  timeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  timelineBubble: {
    padding: 8,
    borderRadius: 8,
    textAlign: 'center' as const,
    minWidth: 100,
    wordBreak: 'break-word' as const,
  },
  speakerTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    display: 'block',
    marginBottom: 4,
  },
  utteranceText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 1.4,
    fontWeight: '500',
  },

  detailContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  detailHeader: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    marginBottom: 16,
    borderBottom: '1px solid #333366',
    paddingBottom: 16,
  },
  detailAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    display: 'flex',
  },
  detailAvatarText: {
    color: '#0f0f23',
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailStats: {
    color: '#a6adc8',
    fontSize: 14,
  },
  detailContent: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  utteranceItem: {
    backgroundColor: '#232345',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  utteranceTime: {
    color: '#64b5f6',
    fontSize: 12,
    marginBottom: 8,
  },
  utteranceWord: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  confidenceText: {
    color: '#a6adc8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  // 話者分離プロンプトのスタイル
  diarizationPrompt: {
    marginTop: '20px',
    padding: '16px',
    background: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '8px',
  },
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  promptTitle: {
    color: '#e2e8f0',
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
  },
  promptContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  hintList: {
    color: '#a6adc8',
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  diarizationButton: {
    background: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    alignSelf: 'flex-start',
  },
  progressContainer: {
    marginTop: '12px',
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: '#333366',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ff88, #64b5f6)',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    color: '#a6adc8',
    fontSize: '12px',
    textAlign: 'center' as const,
  },
  // 分析タブへの導線のスタイル
  analysisPrompt: {
    marginTop: '20px',
    padding: '16px',
    borderTop: '1px solid #333366',
  },
  analysisActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisButton: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
  },
  reanalysisButton: {
    background: 'linear-gradient(135deg, #f97316, #ea580c)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)',
  },
};

export default SpeakerDiarizationView; 