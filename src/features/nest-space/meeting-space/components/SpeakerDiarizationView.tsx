import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../services/supabase/client';
import { Speaker, Word } from '../../../../services/GoogleSpeechToTextService';

interface SpeakerDiarizationViewProps {
  meetingId: string;
  transcript: string;
  onTranscriptUpdate?: (newTranscript: string) => void;
}

interface SpeakerWithUtterances extends Speaker {
  utterances: Word[];
}

const SpeakerDiarizationView: React.FC<SpeakerDiarizationViewProps> = ({
  meetingId,
  transcript,
  onTranscriptUpdate
}) => {
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

  useEffect(() => {
    loadSpeakerData();
  }, [meetingId]);

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  const loadSpeakerData = async () => {
    try {
      setLoading(true);

      // 話者情報を取得
      const { data: speakersData, error: speakersError } = await supabase
        .from('meeting_speakers')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('speaker_tag');

      if (speakersError) {
        console.error('話者情報取得エラー:', speakersError);
        return;
      }

      // 発言詳細を取得
      const { data: utterancesData, error: utterancesError } = await supabase
        .from('meeting_utterances')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('start_time');

      if (utterancesError) {
        console.error('発言詳細取得エラー:', utterancesError);
        return;
      }

      // 話者ごとに発言をグループ化
      const speakersWithUtterances: SpeakerWithUtterances[] = speakersData.map(speaker => ({
        speakerTag: speaker.speaker_tag,
        name: speaker.name || `話者${speaker.speaker_tag}`,
        totalTime: speaker.total_time,
        wordCount: speaker.word_count,
        utterances: utterancesData.filter(u => u.speaker_tag === speaker.speaker_tag)
      }));

      setSpeakers(speakersWithUtterances);
    } catch (error) {
      console.error('話者データ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speakerTag: number): string => {
    const colors = [
      '#00ff88', // 緑
      '#ff6b6b', // 赤
      '#4ecdc4', // シアン
      '#45b7d1', // 青
      '#96ceb4', // 薄緑
      '#feca57', // 黄
      '#ff9ff3', // ピンク
      '#54a0ff', // 青
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

  const renderSpeakerSummary = () => (
    <div style={styles.summaryContainer}>
      <div style={styles.summaryTitle}>📊 話者別サマリー</div>
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
                  <div style={styles.timelineTime}>
                    <span style={styles.timeText}>{formatTime(utterance.startTime)}</span>
                  </div>
                  <div style={{
                    ...styles.timelineBubble,
                    backgroundColor: getSpeakerColor(utterance.speakerTag)
                  }}>
                    <span style={styles.speakerTagText}>話者{utterance.speakerTag}</span>
                    <span style={styles.utteranceText}>{utterance.word}</span>
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
            <div style={styles.fallbackContent}>
              {transcript || '文字起こしデータがありません'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {renderSpeakerSummary()}
      {renderTimeline()}
      {renderSpeakerDetail()}
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
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
  summaryTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
    color: '#0f0f23',
    fontSize: 14,
    fontWeight: 'bold',
  },
  speakerName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center' as const,
  },
  speakerStats: {
    color: '#a6adc8',
    fontSize: 12,
    textAlign: 'center' as const,
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
    overflowX: 'auto' as const,
  },
  timelineContent: {
    display: 'flex',
    flexDirection: 'row' as const,
    gap: 12,
    paddingBottom: 8,
  },
  timelineItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: 120,
  },
  timelineTime: {
    backgroundColor: '#333366',
    color: '#e2e8f0',
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 11,
    marginBottom: 8,
  },
  timeText: {
    color: '#e2e8f0',
    fontSize: 11,
  },
  timelineBubble: {
    padding: 8,
    borderRadius: 8,
    textAlign: 'center' as const,
    minWidth: 100,
    wordBreak: 'break-word' as const,
  },
  speakerTagText: {
    color: '#0f0f23',
    fontSize: 10,
    fontWeight: 'bold',
    display: 'block',
    marginBottom: 4,
  },
  utteranceText: {
    color: '#0f0f23',
    fontSize: 12,
    lineHeight: 1.4,
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
};

export default SpeakerDiarizationView; 