import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { supabase } from '../../../../services/supabase/client';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { Meeting, MeetingUI, toMeetingUI, toMeetingDB } from '../../../meeting-space/types/meeting';
import EmptyState from '../../../../components/ui/EmptyState';
import Input from '../../../../components/ui/Input';
import Tag from '../../../../components/ui/Tag';
import StatusBadge from '../../../../components/ui/StatusBadge';
import Button from '../../../../components/common/Button';
import { Icon } from '../../../../components/Icon';
import { generateMeetingSummary, extractCardsFromMeeting } from '../../../../services/ai/openai';
import { BoardCardUI } from '../../../../types/board';
import { getOrCreateDefaultBoard, addCardsToBoard } from '../../../../services/BoardService';
import { getOrCreateMeetingSource, addCardSource } from '@/services/BoardService';
import { getUsersByIds, UserInfo } from '../../../../services/UserService';
import { useToast } from '../../../../components/ui/Toast';
import { useBackgroundJobs } from '../../../meeting-space/hooks/useBackgroundJobs';
import { JobType } from '../../../meeting-space/types/backgroundJob';

// 新しい統合ミーティング関連のインポート
import { useUnifiedMeetings } from '../../../meeting-space/hooks/useUnifiedMeetings';
import { UnifiedMeeting } from '../../../meeting-space/types/unifiedMeeting';
import UnifiedMeetingList from '../../../meeting-space/components/UnifiedMeetingList';
import MeetingDetailPanel from './MeetingDetailPanel';
import MeetingForm from './MeetingForm';

interface MeetingSpaceUnifiedProps {
  nestId: string;
}

const MeetingSpaceUnified: React.FC<MeetingSpaceUnifiedProps> = ({ nestId }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  
  const { currentNest } = useNest();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { createJob, getJobsByMeeting } = useBackgroundJobs();
  
  // 統合ミーティング機能
  const {
    meetings: unifiedMeetings,
    selectedMeeting: selectedUnifiedMeeting,
    isLoading: loadingUnifiedMeetings,
    error: unifiedMeetingsError,
    selectMeeting: selectUnifiedMeeting,
    migrateScheduledToActual,
    refresh: refreshUnifiedMeetings,
  } = useUnifiedMeetings(nestId);

  // フォーム関連
  const [showForm, setShowForm] = useState(false);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  
  // ミーティング空間関連
  const [meetingSpace, setMeetingSpace] = useState<any>(null);
  const [checkingSpace, setCheckingSpace] = useState(true);
  const [creatingSpace, setCreatingSpace] = useState(false);
  
  // UI状態
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  
  // レガシーミーティング管理（下位互換のため保持）
  const [meetings, setMeetings] = useState<MeetingUI[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingUI | null>(null);
  
  // タブ状態管理
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'speaker-analysis' | 'cards' | 'test'>('transcript');
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  
  // ドラッグ&ドロップ用のstate
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);

  // Background jobs状態管理（統合ミーティング用）
  const activeJobs = selectedUnifiedMeeting?.type === 'actual' && selectedUnifiedMeeting.actualMeetingId 
    ? getJobsByMeeting(selectedUnifiedMeeting.actualMeetingId).filter(job => 
        job.status === 'pending' || job.status === 'running'
      ) 
    : [];
  
  const currentRunningJob = activeJobs.find(job => job.status === 'running')?.type || null;
  
  // ジョブ実行状態チェック
  const isJobRunning = (jobType: 'ai_summary' | 'card_extraction' | 'speaker_diarization') => {
    return activeJobs.some(job => job.type === jobType);
  };

  // ミーティング空間の存在チェック
  useEffect(() => {
    if (!currentNest?.id) return;
    const checkMeetingSpace = async () => {
      setCheckingSpace(true);
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('type', 'meeting')
        .eq('nest_id', currentNest.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (data) setMeetingSpace(data);
      setCheckingSpace(false);
    };
    checkMeetingSpace();
  }, [currentNest?.id]);
  
  // ミーティング空間作成
  const handleCreateMeetingSpace = async () => {
    if (!currentNest?.id || !user?.id) return;
    setCreatingSpace(true);
    const { data, error } = await supabase
      .from('spaces')
      .insert([
        {
          nest_id: currentNest.id,
          type: 'meeting',
          name: 'ミーティング',
          created_by: user.id,
          is_active: true,
        },
      ])
      .select()
      .single();
    if (data) setMeetingSpace(data);
    setCreatingSpace(false);
  };

  // 作成者のユーザー情報を取得
  useEffect(() => {
    const fetchUsers = async () => {
      const creatorIds = unifiedMeetings
        .map(meeting => meeting.createdBy)
        .filter((id): id is string => !!id);
      
      if (creatorIds.length > 0) {
        const userInfos = await getUsersByIds(creatorIds);
        setUsers(userInfos);
      }
    };

    if (unifiedMeetings.length > 0) {
      fetchUsers();
    }
  }, [unifiedMeetings]);

  // 新規ミーティング作成ハンドラ
  const handleCreateMeeting = useCallback(async (formData: any) => {
    setShowForm(false);
    const now = new Date().toISOString();
    
    if (!(formData.date instanceof Date) || isNaN(formData.date.getTime())) {
      showToast({ title: 'エラー', message: '日時が不正です。正しい形式で入力してください。', type: 'error' });
      return;
    }
    
    const dbMeeting: Meeting = {
      id: crypto.randomUUID(),
      nest_id: nestId,
      title: formData.title,
      description: '',
      start_time: formData.date.toISOString(),
      end_time: formData.date.toISOString(),
      participants: [],
      uploaded_files: [],
      recording_url: '',
      transcript: formData.transcript || '',
      ai_summary: '',
      status: 'scheduled',
      tags: [],
      created_at: now,
      updated_at: now,
      created_by: user?.id || user?.email || 'unknown',
      deleted_at: null,
    };
    
    const { error } = await supabase.from('meetings').insert([dbMeeting]);
    if (error) {
      showToast({ title: 'エラー', message: 'ミーティングの保存に失敗しました: ' + error.message, type: 'error' });
      return;
    }
    
    showToast({ title: '成功', message: 'ミーティングが作成されました', type: 'success' });
    await refreshUnifiedMeetings();
  }, [nestId, user, showToast, refreshUnifiedMeetings]);

  // 統合ミーティング選択ハンドラ
  const handleSelectUnifiedMeeting = useCallback((meeting: UnifiedMeeting | null) => {
    selectUnifiedMeeting(meeting);
    
    // 従来のselectedMeetingも更新（下位互換のため）
    if (meeting?.type === 'actual' && meeting.actualMeetingId) {
      // 実際のミーティングの場合、レガシーMeetingUI形式に変換
      const legacyMeeting: MeetingUI = {
        id: meeting.actualMeetingId,
        nestId: meeting.nestId,
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime?.toISOString() || meeting.startTime.toISOString(),
        participants: meeting.participants,
        uploadedFiles: meeting.actualData?.uploadedFiles || [],
        recordingUrl: meeting.actualData?.recordingUrl,
        transcript: meeting.actualData?.transcript,
        aiSummary: meeting.actualData?.aiSummary,
        status: meeting.status === 'in_progress' ? 'completed' : meeting.status,
        tags: meeting.tags,
        createdAt: meeting.createdAt.toISOString(),
        updatedAt: meeting.updatedAt.toISOString(),
        createdBy: meeting.createdBy,
        deletedAt: null,
      };
      setSelectedMeeting(legacyMeeting);
    } else {
      setSelectedMeeting(null);
    }
  }, [selectUnifiedMeeting]);

  // 予約ミーティングの実際のミーティングへの移行
  const handleMigrateToActual = useCallback(async (scheduledMeetingId: string) => {
    try {
      await migrateScheduledToActual(scheduledMeetingId);
      showToast({ title: '成功', message: 'ミーティングが開始されました', type: 'success' });
    } catch (error) {
      showToast({ title: 'エラー', message: 'ミーティングの開始に失敗しました', type: 'error' });
      console.error('Failed to migrate scheduled meeting:', error);
    }
  }, [migrateScheduledToActual, showToast]);

  // ドラッグ&ドロップハンドラ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setDroppedFile(files[0]);
      handleUpload({ file: files[0] });
    }
  };

  // ファイルアップロード処理
  const handleUpload = async (data: any) => {
    if (selectedUnifiedMeeting?.type !== 'actual' || !selectedUnifiedMeeting?.actualMeetingId) {
      showToast({ title: '警告', message: '実際のミーティングを選択してください', type: 'warning' });
      return;
    }

    // ファイルアップロード処理のロジックは既存のものを使用
    showToast({ title: '情報', message: 'ファイルアップロード機能は実装中です', type: 'info' });
  };

  // カード抽出処理
  const handleExtractInsight = async () => {
    if (selectedUnifiedMeeting?.type !== 'actual' || !selectedUnifiedMeeting?.actualMeetingId) {
      showToast({ title: '警告', message: '実際のミーティングを選択してください', type: 'warning' });
      return;
    }

    try {
      console.log('🔍 [handleExtractInsight] カード抽出ジョブ作成開始', {
        timestamp: new Date().toISOString(),
        meetingId: selectedUnifiedMeeting.actualMeetingId
      });
      
      await createJob(
        'card_extraction' as JobType,  // 🔧 AI要約からカード抽出に修正
        selectedUnifiedMeeting.actualMeetingId,
        {
          nestId: nestId,
          // ユーザー情報とミーティング詳細は createJob 内で設定される
        }
      );
      showToast({ title: '成功', message: 'カード抽出処理を開始しました', type: 'success' });
    } catch (error) {
      showToast({ title: 'エラー', message: 'カード抽出処理の開始に失敗しました', type: 'error' });
      console.error('Failed to start card extraction job:', error);
    }
  };

  // メインレンダリング
  const renderLayout = () => {
    if (checkingSpace) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh' 
        }}>
          <div style={{ color: '#a6adc8' }}>ミーティング空間を確認中...</div>
        </div>
      );
    }

    if (!meetingSpace) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          gap: 16,
        }}>
          <EmptyState 
            title="ミーティング空間がありません" 
            description="ミーティング機能を使用するには、まず空間を作成する必要があります" 
          />
          <Button 
            title={creatingSpace ? '作成中...' : 'ミーティング空間を作成'}
            onPress={handleCreateMeetingSpace}
            disabled={creatingSpace}
          />
        </div>
      );
    }

    if (isDesktop) {
      return (
        <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e2e' }}>
          {/* 左側: 統合ミーティングリスト */}
          <div style={{ 
            width: 400, 
            backgroundColor: '#181825', 
            borderRight: '1px solid #333366',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* ヘッダー */}
            <div style={{ 
              padding: 16, 
              borderBottom: '1px solid #333366',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: 16 }}>
                ミーティング
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    backgroundColor: '#4caf50',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  + 実際
                </button>
                <button
                  onClick={() => setShowScheduledForm(true)}
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    backgroundColor: '#2196f3',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  📅 予約
                </button>
              </div>
            </div>

            {/* ファイルドロップエリア */}
            <div
              style={{
                margin: 16,
                padding: 20,
                border: '2px dashed',
                borderColor: isDragOver ? '#00ff88' : '#333366',
                borderRadius: 8,
                backgroundColor: isDragOver ? '#00ff8820' : '#232345',
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.mp4,.mp3,.wav,.pdf';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleUpload({ file });
                };
                input.click();
              }}
            >
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: isDragOver ? '#00ff88' : '#a6adc8',
                textAlign: 'center',
                lineHeight: 1.2,
                letterSpacing: 0.5,
              }}>
                {isDragOver ? 'ファイルをドロップ' : 'ファイルをドロップまたはクリック'}
              </div>
              <div style={{
                fontSize: 9,
                color: '#6c7086',
                textAlign: 'center',
                marginTop: 2,
              }}>
                テキスト・動画・音声・PDF
              </div>
            </div>

            {/* 統合ミーティングリスト */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <UnifiedMeetingList
                meetings={unifiedMeetings}
                selectedMeeting={selectedUnifiedMeeting}
                onSelectMeeting={handleSelectUnifiedMeeting}
                onMigrateToActual={handleMigrateToActual}
                isLoading={loadingUnifiedMeetings}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                users={users}
              />
            </div>
          </div>

          {/* 右側: 詳細パネル */}
          <div style={{ flex: 1, backgroundColor: '#1e1e2e' }}>
            {selectedUnifiedMeeting?.type === 'actual' && selectedMeeting ? (
              <MeetingDetailPanel
                meeting={selectedMeeting}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSaveMeeting={refreshUnifiedMeetings}
                onCardExtraction={handleExtractInsight}
                isJobRunning={isJobRunning}
              />
            ) : selectedUnifiedMeeting?.type === 'scheduled' ? (
              <div style={{ 
                padding: 24, 
                color: '#e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                  <h3 style={{ marginBottom: 16 }}>📅 予約ミーティング</h3>
                  <p style={{ color: '#a6adc8', marginBottom: 24 }}>
                    {selectedUnifiedMeeting.title}
                  </p>
                  <p style={{ color: '#64b5f6', marginBottom: 24 }}>
                    開始予定: {selectedUnifiedMeeting.startTime.toLocaleString('ja-JP')}
                  </p>
                  
                  {selectedUnifiedMeeting.automation && (
                    <div style={{ marginBottom: 24 }}>
                      <h4 style={{ marginBottom: 12, color: '#f9e2af' }}>🤖 自動化設定</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                        {selectedUnifiedMeeting.automation.autoJoin && (
                          <span style={{ 
                            fontSize: 12, 
                            backgroundColor: '#8b5cf6', 
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}>
                            自動参加
                          </span>
                        )}
                        {selectedUnifiedMeeting.automation.autoTranscribe && (
                          <span style={{ 
                            fontSize: 12, 
                            backgroundColor: '#8b5cf6', 
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}>
                            自動転写
                          </span>
                        )}
                        {selectedUnifiedMeeting.automation.autoSummarize && (
                          <span style={{ 
                            fontSize: 12, 
                            backgroundColor: '#8b5cf6', 
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}>
                            自動要約
                          </span>
                        )}
                        {selectedUnifiedMeeting.automation.autoExtractCards && (
                          <span style={{ 
                            fontSize: 12, 
                            backgroundColor: '#8b5cf6', 
                            color: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: 4,
                          }}>
                            自動抽出
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedUnifiedMeeting.status === 'scheduled' && 
                   !selectedUnifiedMeeting.actualMeetingId && (
                    <button
                      onClick={() => handleMigrateToActual(selectedUnifiedMeeting.scheduledMeetingId!)}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#00ff88',
                        color: '#000000',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ▶ ミーティングを開始
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%' 
              }}>
                <EmptyState 
                  title="ミーティングを選択してください" 
                  description="左側のリストからミーティングを選択すると詳細が表示されます" 
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // モバイル・タブレット表示は省略（既存のコードを流用）
    return <div>モバイル・タブレット表示は実装中</div>;
  };

  return (
    <>
      {renderLayout()}
      
      {/* 新規ミーティング作成フォーム */}
      {showForm && (
        <Modal
          visible={showForm}
          onRequestClose={() => setShowForm(false)}
          animationType="slide"
          transparent={true}
        >
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 500,
              maxHeight: '80vh',
              overflow: 'auto',
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16 
              }}>
                <h3 style={{ margin: 0 }}>新規ミーティング作成</h3>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <MeetingForm
                onSubmit={handleCreateMeeting}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 予約ミーティング作成フォーム（今後実装） */}
      {showScheduledForm && (
        <Modal
          visible={showScheduledForm}
          onRequestClose={() => setShowScheduledForm(false)}
          animationType="slide"
          transparent={true}
        >
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 8,
              padding: 24,
              width: '90%',
              maxWidth: 500,
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16 
              }}>
                <h3 style={{ margin: 0 }}>予約ミーティング作成</h3>
                <button
                  onClick={() => setShowScheduledForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 18,
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ textAlign: 'center', color: '#666' }}>
                <p>予約ミーティング作成フォームは実装中です</p>
                <p>Phase 2で自動化設定も含めて実装予定です</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MeetingSpaceUnified; 