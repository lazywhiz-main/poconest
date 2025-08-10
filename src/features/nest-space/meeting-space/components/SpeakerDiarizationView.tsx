import React, { useState, useEffect } from 'react';
import { supabase } from '../../../../services/supabase/client';
import { Speaker, Word } from '../../../../services/GoogleSpeechToTextService';

interface SpeakerDiarizationViewProps {
  meetingId: string;
  transcript: string;
}

interface SpeakerWithUtterances extends Speaker {
  utterances: Word[];
}

const SpeakerDiarizationView: React.FC<SpeakerDiarizationViewProps> = ({
  meetingId,
  transcript
}) => {
  const [speakers, setSpeakers] = useState<SpeakerWithUtterances[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpeaker, setSelectedSpeaker] = useState<number | null>(null);

  useEffect(() => {
    loadSpeakerData();
  }, [meetingId]);

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
          <div style={styles.fallbackTitle}>📝 文字起こし</div>
          <div style={styles.fallbackContent}>
            {transcript || '文字起こしデータがありません'}
          </div>
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
  },
  fallbackTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottom: '1px solid #333366',
    paddingBottom: 8,
  },
  fallbackContent: {
    color: '#a6adc8',
    fontSize: 13,
    lineHeight: 1.6,
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word' as const,
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