import React, { useState, useMemo } from 'react';
import { UnifiedMeeting } from '../types/unifiedMeeting';
import Tag from '../../../components/ui/Tag';
import StatusBadge from '../../../components/ui/StatusBadge';
import EmptyState from '../../../components/ui/EmptyState';
import { getUsersByIds, UserInfo } from '../../../services/UserService';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import { getProcessingState, getStatusDisplay as getProcessingStatusDisplay } from '../utils/meetingStatusUtils';

interface UnifiedMeetingListProps {
  meetings: UnifiedMeeting[];
  selectedMeeting: UnifiedMeeting | null;
  onSelectMeeting: (meeting: UnifiedMeeting | null) => void;
  onMigrateToActual?: (scheduledMeetingId: string) => Promise<void>;
  isLoading?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  users?: Record<string, UserInfo>;
}

const UnifiedMeetingList: React.FC<UnifiedMeetingListProps> = ({
  meetings,
  selectedMeeting,
  onSelectMeeting,
  onMigrateToActual,
  isLoading,
  searchQuery,
  onSearchChange,
  users = {},
}) => {
  const [filterType, setFilterType] = useState<'all' | 'scheduled' | 'actual'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'in_progress' | 'completed'>('all');
  
  // バックグラウンドジョブの状態を取得
  const { jobs: backgroundJobs } = useBackgroundJobs();

  // フィルタリングされたミーティング
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // 検索クエリフィルター
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = meeting.title.toLowerCase().includes(query);
        const descMatch = meeting.description?.toLowerCase().includes(query) || false;
        if (!(titleMatch || descMatch)) {
          return false;
        }
      }

      // タイプフィルター
      if (filterType !== 'all' && meeting.type !== filterType) {
        return false;
      }

      // ステータスフィルター
      if (filterStatus !== 'all' && meeting.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [meetings, searchQuery, filterType, filterStatus]);

  // ステータス表示用の関数
  const getStatusDisplay = (meeting: UnifiedMeeting) => {
    const statusConfig = {
      scheduled: { text: '予定', color: '#4a6da7' },
      in_progress: { text: '進行中', color: '#ff9800' },
      completed: { text: '完了', color: '#4caf50' },
      cancelled: { text: 'キャンセル', color: '#f44336' },
      extracted: { text: '抽出済み', color: '#9c27b0' },
    };

    return statusConfig[meeting.status] || { text: meeting.status, color: '#757575' };
  };

  // タイプ表示用の関数
  const getTypeDisplay = (meeting: UnifiedMeeting) => {
    if (meeting.type === 'scheduled') {
      return {
        text: '予約',
        color: '#2196f3',
        icon: '📅',
      };
    } else {
      return {
        text: '実施',
        color: '#4caf50',
        icon: '✓',
      };
    }
  };

  // 自動化設定の表示 - 削除（自動化は標準機能のため表示不要）

  // ミーティングアイテムのレンダリング
  const renderMeetingItem = (meeting: UnifiedMeeting) => {
    const creatorInfo = meeting.createdBy ? users[meeting.createdBy] : null;
    const creatorDisplayName = creatorInfo?.display_name || meeting.createdBy || '作成者不明';
    const statusDisplay = getStatusDisplay(meeting);
    const typeDisplay = getTypeDisplay(meeting);

    const isSelected = selectedMeeting?.id === meeting.id;
    const isScheduledMeeting = meeting.type === 'scheduled';
    const canMigrate = isScheduledMeeting && 
                      meeting.status === 'scheduled' && 
                      !meeting.actualMeetingId &&
                      onMigrateToActual;

    return (
      <div
        key={meeting.id}
        style={{
          padding: 12,
          marginBottom: 8,
          background: isSelected ? '#333366' : '#232345',
          borderRadius: 4,
          border: '1px solid',
          borderColor: isSelected ? '#39396a' : '#333366',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => onSelectMeeting(isSelected ? null : meeting)}
      >
        <div>
          {/* タイトルとタイプ表示 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 4,
          }}>
            <div style={{ 
              color: '#e2e8f0', 
              fontSize: 12, 
              fontWeight: 500,
              flex: 1,
            }}>
              <span style={{ marginRight: 8 }}>
                {typeDisplay.icon} {meeting.title || '無題ミーティング'}
              </span>
            </div>
            {/* ステータスバッジ削除 - ドット表示で代替 */}
          </div>

          {/* 日時情報 */}
          <div style={{ 
            color: '#64b5f6', 
            fontSize: 11, 
            fontFamily: 'JetBrains Mono, monospace', 
            marginBottom: 2,
          }}>
            {meeting.startTime.toLocaleString('ja-JP')}
            {meeting.duration && (
              <span style={{ color: '#a6adc8', marginLeft: 8 }}>
                ({meeting.duration}分)
              </span>
            )}
          </div>

          {/* プラットフォーム情報（予約ミーティングの場合） */}
          {isScheduledMeeting && meeting.automation?.platformType && (
            <div style={{ 
              color: '#f9e2af', 
              fontSize: 10, 
              fontFamily: 'JetBrains Mono, monospace', 
              marginBottom: 2,
            }}>
              📹 {meeting.automation.platformType.toUpperCase()}
              {meeting.automation.meetingUrl && (
                <span style={{ marginLeft: 8, color: '#89b4fa' }}>
                  URL設定済み
                </span>
              )}
            </div>
          )}

          {/* 作成者情報 */}
          {meeting.createdBy && (
            <div style={{ 
              color: '#a6adc8', 
              fontSize: 10, 
              fontFamily: 'JetBrains Mono, monospace', 
              marginBottom: 4,
            }}>
              作成者: {creatorDisplayName}
            </div>
          )}

          {/* タグと自動化設定 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* 通常のタグ */}
            {meeting.tags.map((tag, i) => (
              <Tag key={i} style={{ fontSize: 10 }}>{tag}</Tag>
            ))}

            {/* 自動化バッジ削除 - 自動化は標準機能のため表示不要 */}

            {/* 実際のミーティングの処理状態（ドット表示） */}
            {meeting.type === 'actual' && meeting.actualMeetingId && (() => {
              // actualMeetingIdからMeetingUI形式に変換して状態判定
              const meetingForStatus = {
                id: meeting.actualMeetingId,
                transcript: meeting.actualData?.transcript,
                aiSummary: meeting.actualData?.aiSummary,
              } as any;
              
                             const processingState = getProcessingState(meetingForStatus, backgroundJobs);
               const transcriptDisplay = getProcessingStatusDisplay(processingState.transcription);
               const summaryDisplay = getProcessingStatusDisplay(processingState.aiSummary);
               const cardDisplay = getProcessingStatusDisplay(processingState.cardExtraction);
              
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* 文字起こし */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ 
                      color: transcriptDisplay.color, 
                      fontSize: 12, 
                      lineHeight: 1,
                      fontFamily: 'monospace',
                    }}>
                      {transcriptDisplay.icon}
                    </span>
                    <span style={{ fontSize: 9, color: '#a6adc8' }}>文字起こし</span>
                  </div>
                  
                  {/* AI要約 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ 
                      color: summaryDisplay.color, 
                      fontSize: 12, 
                      lineHeight: 1,
                      fontFamily: 'monospace',
                    }}>
                      {summaryDisplay.icon}
                    </span>
                    <span style={{ fontSize: 9, color: '#a6adc8' }}>AI要約</span>
                  </div>
                  
                  {/* カード抽出 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ 
                      color: cardDisplay.color, 
                      fontSize: 12, 
                      lineHeight: 1,
                      fontFamily: 'monospace',
                    }}>
                      {cardDisplay.icon}
                    </span>
                    <span style={{ fontSize: 9, color: '#a6adc8' }}>カード抽出</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 移行ボタン（予約ミーティングで適用可能な場合のみ） */}
          {canMigrate && (
            <div style={{ marginTop: 8 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMigrateToActual!(meeting.scheduledMeetingId!);
                }}
                style={{
                  fontSize: 10,
                  color: '#ffffff',
                  backgroundColor: '#00ff88',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                ▶ ミーティング開始
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* フィルターボタンのみ */}
      <div style={{ padding: '0 0 8px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: filterType === 'all' ? '#4a6da7' : '#333366',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            すべて
          </button>
          <button
            onClick={() => setFilterType('scheduled')}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: filterType === 'scheduled' ? '#2196f3' : '#333366',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            📅 予約
          </button>
          <button
            onClick={() => setFilterType('actual')}
            style={{
              fontSize: 11,
              padding: '4px 8px',
              borderRadius: 4,
              border: 'none',
              backgroundColor: filterType === 'actual' ? '#4caf50' : '#333366',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            ✓ 実施
          </button>
        </div>
      </div>

      {/* ミーティングリスト */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        minHeight: 0,
      }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
          }}>
            <div style={{ color: '#a6adc8' }}>読み込み中...</div>
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
          }}>
            <EmptyState 
              title="ミーティングがありません" 
              description="新規ミーティングを作成してください" 
            />
          </div>
        ) : (
          <div>
            {filteredMeetings.map(renderMeetingItem)}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedMeetingList; 