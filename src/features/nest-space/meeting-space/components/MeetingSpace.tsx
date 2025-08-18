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
import { useZoomSpace } from '../hooks/useZoomSpace';
import MeetingList from './MeetingList';
import RecordingPlayer from './RecordingPlayer';
import MeetingInsights from './MeetingInsights';
import MeetingForm from './MeetingForm';
import MeetingDetailPanel from './MeetingDetailPanel';
import { supabase } from '../../../../services/supabase/client';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../../contexts/AuthContext';
import MeetingDetail from './MeetingDetail';
import { Meeting, MeetingUI, toMeetingUI, toMeetingDB, CardExtractionSettings } from '../../../meeting-space/types/meeting';
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

// 統合ミーティング機能
import { useUnifiedMeetings } from '../../../meeting-space/hooks/useUnifiedMeetings';
import { UnifiedMeeting } from '../../../meeting-space/types/unifiedMeeting';
import UnifiedMeetingList from '../../../meeting-space/components/UnifiedMeetingList';
import { StorageService } from '../../../../services/StorageService';

// 新しいファイル処理機能
import { useFileProcessing } from '../../../meeting-space/hooks/useFileProcessing';
import FileProcessingStatus from '../../../meeting-space/components/FileProcessingStatus';
import ScheduledMeetingForm from './ScheduledMeetingForm';

interface MeetingSpaceProps {
  nestId: string;
}

// ZoomSpaceコンポーネント
const MeetingSpace: React.FC<MeetingSpaceProps> = ({ nestId }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  
  // useZoomSpaceは使わず、CRUD用stateのみ利用
  
  const { currentNest } = useNest();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { createJob, getJobsByMeeting } = useBackgroundJobs();
  
  // 新しいファイル処理管理
  const fileProcessing = useFileProcessing();
  
  // 新しいアーキテクチャでのファイル処理関数
  const processFileWithDetailedStatus = useCallback(async (
    meetingId: string, 
    file: File, 
    sessionId: string
  ) => {
    try {
      // Step 1: ファイル検証
      fileProcessing.updateStep('VALIDATION', {
        status: 'running',
        progress: 50,
        message: 'ファイル形式を確認中...'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500)); // UI反映のため少し待機
      
      fileProcessing.updateStep('VALIDATION', {
        status: 'completed',
        progress: 100,
        message: 'ファイル検証完了'
      });
      
      // Step 2: 新しいアーキテクチャでの文字起こし処理
      fileProcessing.updateStep('UPLOAD', {
        status: 'running',
        progress: 0,
        message: 'GCSにアップロード中...'
      });
      
      console.log('🔧 [processFileWithDetailedStatus] 新しいアーキテクチャで処理開始');
      
      const { TranscriptionServiceV2 } = await import('../../../../services/TranscriptionServiceV2');
      
      fileProcessing.updateStep('UPLOAD', {
        progress: 50,
        message: '署名付きURL取得中...'
      });
      
      const result = await TranscriptionServiceV2.transcribeAudio(
        file,
        meetingId,
        nestId
      );
      
      if (!result.success) {
        throw new Error(result.error || '文字起こし処理に失敗しました');
      }
      
      fileProcessing.updateStep('UPLOAD', {
        status: 'completed',
        progress: 100,
        message: 'アップロード完了'
      });
      
      // Step 3: 文字起こしジョブ開始
      fileProcessing.updateStep('TRANSCRIPTION_START', {
        status: 'completed',
        progress: 100,
        message: '文字起こしジョブ開始完了'
      });
      
      // Step 4: 処理完了待機
      fileProcessing.updateStep('TRANSCRIPTION_PROCESS', {
        status: 'running',
        progress: 10,
        message: '文字起こし処理中...'
      });
      
      // 実際の処理は非同期で実行されるため、ここでは完了メッセージを表示
      fileProcessing.updateStep('TRANSCRIPTION_PROCESS', {
        status: 'completed',
        progress: 100,
        message: '文字起こしジョブが開始されました'
      });
      
      // Step 5: 結果保存
      fileProcessing.updateStep('TRANSCRIPTION_SAVE', {
        status: 'completed',
        progress: 100,
        message: 'ジョブ情報を保存しました'
      });
      
      // セッション完了
      fileProcessing.completeSession(true, {
        storagePath: `gcs://poconest-audio-files/${result.jobId}`,
        transcriptText: '文字起こしジョブが開始されました。処理完了までお待ちください。',
        processingTime: Date.now() - new Date(fileProcessing.currentSession?.startTime || 0).getTime()
      });
      
    } catch (error) {
      console.error('詳細ファイル処理エラー:', error);
      fileProcessing.completeSession(false, undefined, error instanceof Error ? error.message : 'Unknown error');
    }
  }, [fileProcessing, nestId]);
  
  // 統合ミーティング機能
  const {
    meetings: unifiedMeetings,
    selectedMeeting: selectedUnifiedMeeting,
    isLoading: loadingUnifiedMeetings,
    selectMeeting: selectUnifiedMeeting,
    migrateScheduledToActual,
    refresh: refreshUnifiedMeetings,
  } = useUnifiedMeetings(nestId);

  // ユーザー情報の取得
  useEffect(() => {
    const fetchUsers = async () => {
      if (unifiedMeetings.length === 0) return;
      
      // 作成者IDを収集
      const creatorIds = unifiedMeetings
        .map(meeting => meeting.createdBy)
        .filter((id): id is string => !!id);
      
      if (creatorIds.length > 0) {
        const userInfos = await getUsersByIds(creatorIds);
        setUsers(userInfos);
      }
    };

    fetchUsers();
  }, [unifiedMeetings]);

  const [showForm, setShowForm] = useState(false);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  // 統合ビューを常に使用
  const useUnifiedView = true;
  
  const [meetingSpace, setMeetingSpace] = useState<any>(null);
  const [checkingSpace, setCheckingSpace] = useState(true);
  const [creatingSpace, setCreatingSpace] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  

  const [selectedMeeting, setSelectedMeeting] = useState<MeetingUI | null>(null);
  
  // Background jobs状態管理
  const activeJobs = selectedMeeting ? getJobsByMeeting(selectedMeeting.id).filter(job => 
    job.status === 'pending' || job.status === 'running'
  ) : [];
  
  const currentRunningJob = activeJobs.find(job => job.status === 'running')?.type || null;
  
  // 🔧 シンプルなジョブ実行状態チェック
  const isJobRunning = (jobType: 'ai_summary' | 'card_extraction') => {
    return activeJobs.some(job => job.type === jobType);
  };
  
  // タブ状態管理
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'speaker-analysis' | 'cards'>('transcript');
  
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  
  // ドラッグ&ドロップ用のstate
  const [isDragOver, setIsDragOver] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  
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
  

  
  // 新規作成ハンドラ
  const handleCreateMeeting = useCallback(async (formData: any) => {
    setShowForm(false);
    setDroppedFile(null);
    
    const now = new Date().toISOString();
    if (!(formData.date instanceof Date) || isNaN(formData.date.getTime())) {
      showToast({ title: 'エラー', message: '日時が不正です。正しい形式で入力してください。', type: 'error' });
      return;
    }
    
    // 音声・動画ファイルが含まれているかチェック
    const hasAudioVideo = droppedFile && (
      droppedFile.type.startsWith('audio/') || droppedFile.type.startsWith('video/')
    );
    
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
      transcript: hasAudioVideo ? '' : (formData.transcript || ''), // 音声・動画の場合は空にして後で文字起こし
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
      showToast({ title: 'エラー', message: `ミーティングの保存に失敗しました: ${error.message}`, type: 'error' });
      return;
    }
    
    // 音声・動画ファイルの場合、詳細な文字起こし処理を開始
    if (hasAudioVideo && user?.id) {
      // 新しい詳細状態管理でファイル処理開始
      const sessionId = fileProcessing.startProcessing(dbMeeting.id, droppedFile);
      
      // 非同期でファイル処理を実行
      processFileWithDetailedStatus(dbMeeting.id, droppedFile, sessionId);
    } else {
      console.log('🔧 新規ミーティング - 音声・動画ファイルなし、またはユーザー情報なし');
      showToast({ title: '成功', message: 'ミーティングを作成しました。', type: 'success' });
    }
    
    // 統合表示のリスト更新
    await refreshUnifiedMeetings();
  }, [nestId, user?.id, user?.email, refreshUnifiedMeetings, droppedFile, createJob, showToast]);
  
  // ミーティング選択
  const handleSelectMeeting = (meeting: MeetingUI) => setSelectedMeeting(meeting);

  // 統合ミーティング選択ハンドラ
  const handleSelectUnifiedMeeting = useCallback((meeting: UnifiedMeeting | null) => {
    selectUnifiedMeeting(meeting);
    
    // 実際のミーティングの場合、レガシーMeetingUI形式に変換
    if (meeting?.type === 'actual' && meeting.actualMeetingId) {
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
        status: meeting.status === 'in_progress' ? 'scheduled' : meeting.status,
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
  
  // ドラッグ&ドロップハンドラー
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
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // ファイルサイズをチェック（200MB制限）
      const maxSizeBytes = 200 * 1024 * 1024; // 200MB
      if (file.size > maxSizeBytes) {
        showToast({ 
          title: 'エラー', 
          message: `ファイルサイズが大きすぎます。200MB以下のファイルをご利用ください。（現在: ${Math.round(file.size / (1024 * 1024))}MB）`, 
          type: 'error' 
        });
        return;
      }
      
      // ファイルタイプをチェック
      const supportedTypes = [
        'text/plain',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'audio/mp3',
        'audio/wav',
        'audio/m4a',
        'application/pdf'
      ];
      
      if (supportedTypes.some(type => file.type.startsWith(type.split('/')[0]) || file.type === type)) {
        // 常に設定画面（サイドピーク）を表示してからミーティング作成+文字起こし開始
        setDroppedFile(file);
        setShowForm(true);
      } else {
        showToast({ 
          title: 'エラー', 
          message: 'サポートされていないファイル形式です。テキスト、動画、音声、PDFファイルをご利用ください。', 
          type: 'error' 
        });
      }
    }
  };
  
  // ミーティング更新
  const handleUpdateMeeting = useCallback(async (updates: Partial<MeetingUI>) => {
    if (!selectedMeeting) return;
    
    // Supabaseに保存
    const { error } = await supabase
      .from('meetings')
      .update({
        title: updates.title || selectedMeeting.title,
        start_time: updates.startTime || selectedMeeting.startTime,
        transcript: updates.transcript !== undefined ? updates.transcript : selectedMeeting.transcript,
        ai_summary: updates.aiSummary !== undefined ? updates.aiSummary : selectedMeeting.aiSummary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedMeeting.id);
    
    if (error) {
      console.error('ミーティング更新エラー:', error);
      alert('ミーティングの更新に失敗しました: ' + error.message);
      return;
    }
    
    // selectedMeetingを最新の状態で更新
    const { data: updatedMeeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', selectedMeeting.id)
      .single();
    
    if (updatedMeeting) {
      setSelectedMeeting(toMeetingUI(updatedMeeting));
    }
  }, [selectedMeeting]);

  // ミーティング削除（UnifiedMeetingServiceを使用）
  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    try {
      // 選択されたミーティングを取得
      const meetingToDelete = selectedUnifiedMeeting || selectedMeeting;
      if (!meetingToDelete) {
        console.error('削除対象のミーティングが見つかりません');
        return;
      }

      // UnifiedMeetingServiceを使用してミーティングを削除
      const { UnifiedMeetingService } = await import('../../../meeting-space/services/UnifiedMeetingService');
      const meetingService = new UnifiedMeetingService();
      
      // MeetingUIをUnifiedMeetingに変換
      if (meetingToDelete && 'type' in meetingToDelete) {
        // 既にUnifiedMeetingの場合
        await meetingService.deleteMeeting(meetingToDelete);
      } else if (meetingToDelete) {
        // MeetingUIの場合、UnifiedMeetingに変換
        const unifiedMeeting = {
          id: `actual_${meetingToDelete.id}`,
          title: meetingToDelete.title,
          description: meetingToDelete.description,
          startTime: new Date(meetingToDelete.startTime),
          endTime: new Date(meetingToDelete.endTime),
          participants: meetingToDelete.participants,
          tags: meetingToDelete.tags,
          type: 'actual' as const,
          status: meetingToDelete.status,
          scheduledMeetingId: undefined,
          actualMeetingId: meetingToDelete.id,
          nestId: meetingToDelete.nestId,
          automation: undefined,
          actualData: {
            uploadedFiles: meetingToDelete.uploadedFiles,
            recordingUrl: meetingToDelete.recordingUrl,
            transcript: meetingToDelete.transcript,
            aiSummary: meetingToDelete.aiSummary,
          },
          createdBy: meetingToDelete.createdBy,
          createdAt: new Date(meetingToDelete.createdAt),
          updatedAt: new Date(meetingToDelete.updatedAt),
        };
        await meetingService.deleteMeeting(unifiedMeeting);
      }
      
      // ストレージからオーディオファイルを削除
      try {
        await StorageService.deleteMeetingAudioFiles(meetingId);
        console.log('🔧 ストレージファイル削除完了');
      } catch (storageError) {
        console.error('🔧 ストレージファイル削除エラー（処理は続行）:', storageError);
        // ストレージ削除に失敗しても、ミーティング削除は続行
      }
      
      setSelectedMeeting(null);
      await refreshUnifiedMeetings();
      
      showToast({ 
        title: '削除完了', 
        message: 'ミーティング、オーディオファイル、関連するカードを削除しました。', 
        type: 'success' 
      });
      
    } catch (error) {
      console.error('🔧 ミーティング削除エラー:', error);
      alert('ミーティングの削除に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  }, [selectedUnifiedMeeting, selectedMeeting, refreshUnifiedMeetings, showToast]);

  // 🔧 重複呼び出し防止フラグ
  const [isCardExtractionInProgress, setIsCardExtractionInProgress] = useState(false);
  const [isAISummaryInProgress, setIsAISummaryInProgress] = useState(false);

  // カード抽出
  const handleCardExtraction = useCallback(async (extractionSettings?: CardExtractionSettings) => {
    console.log('🔍 [handleCardExtraction] 関数呼び出し開始', {
      timestamp: new Date().toISOString(),
      meetingId: selectedMeeting?.id,
      meetingTitle: selectedMeeting?.title,
      stackTrace: new Error().stack
    });

    // 🔧 重複呼び出し防止 - 複数レベルのチェック
    if (isCardExtractionInProgress) {
      console.log('🔧 [handleCardExtraction] 既に処理中のため、重複呼び出しをスキップ（フラグレベル）');
      showToast({ title: '情報', message: 'カード抽出は既に処理中です。', type: 'info' });
      return;
    }

    if (isJobRunning && isJobRunning('card_extraction')) {
      console.log('🔧 [handleCardExtraction] 既に処理中のため、重複呼び出しをスキップ（ジョブレベル）');
      showToast({ title: '情報', message: 'カード抽出は既に処理中です。', type: 'info' });
      return;
    }

    // 🔧 処理開始フラグを設定
    setIsCardExtractionInProgress(true);

    if (!selectedMeeting || !selectedMeeting.transcript || selectedMeeting.transcript.trim() === '') {
      showToast({ title: 'エラー', message: '文字起こしファイルがアップロードされていません。', type: 'error' });
      return;
    }
    
    if (!user?.id) {
      showToast({ title: 'エラー', message: 'ユーザー情報が取得できません。', type: 'error' });
      return;
    }

    try {
      console.log('🔍 [handleCardExtraction] createJob呼び出し前');
      // 🔧 Background jobでカード抽出を実行（即座にローカル状態更新される）
      const job = await createJob(
        'card_extraction',
        selectedMeeting.id,
        {
          nestId: nestId,
          userId: user.id,
          meetingTitle: selectedMeeting.title,
          transcript: selectedMeeting.transcript,
          extractionSettings: extractionSettings
        }
      );
      
      console.log('🔍 [handleCardExtraction] createJob完了', { jobId: job?.id });
      
      if (job) {
        showToast({ title: '成功', message: 'カード抽出を開始しました。処理完了まで少々お待ちください。', type: 'success' });
      }
      
    } catch (error) {
      console.error('カード抽出ジョブ作成エラー:', error);
      showToast({ title: 'エラー', message: 'カード抽出の開始に失敗しました。', type: 'error' });
    } finally {
      // 🔧 処理完了後にフラグをリセット
      setIsCardExtractionInProgress(false);
    }
  }, [selectedMeeting, user?.id, nestId, createJob, showToast, isJobRunning]);
  
  // AI要約
  const handleAISummary = useCallback(async () => {
    // 🔧 重複呼び出し防止 - 複数レベルのチェック
    if (isAISummaryInProgress) {
      console.log('🔧 [handleAISummary] 既に処理中のため、重複呼び出しをスキップ（フラグレベル）');
      showToast({ title: '情報', message: 'AI要約は既に処理中です。', type: 'info' });
      return;
    }

    if (isJobRunning && isJobRunning('ai_summary')) {
      console.log('🔧 [handleAISummary] 既に処理中のため、重複呼び出しをスキップ（ジョブレベル）');
      showToast({ title: '情報', message: 'AI要約は既に処理中です。', type: 'info' });
      return;
    }

    // 🔧 処理開始フラグを設定
    setIsAISummaryInProgress(true);

    if (!selectedMeeting || !selectedMeeting.transcript || selectedMeeting.transcript.trim() === '') {
      showToast({ title: 'エラー', message: '文字起こしファイルがアップロードされていません。', type: 'error' });
      return;
    }

    if (!user?.id) {
      showToast({ title: 'エラー', message: 'ユーザー情報が取得できません。', type: 'error' });
      return;
    }

    try {
      // 🔧 Background jobでAI要約を実行（即座にローカル状態更新される）
      const job = await createJob(
        'ai_summary',
        selectedMeeting.id,
        {
          nestId: nestId,
          userId: user.id,
          meetingTitle: selectedMeeting.title,
          transcript: selectedMeeting.transcript
        }
      );
      
      if (job) {
        showToast({ title: '成功', message: 'AI要約を開始しました。処理完了まで少々お待ちください。', type: 'success' });
      }
      
    } catch (error) {
      console.error('AI要約ジョブ作成エラー:', error);
      showToast({ title: 'エラー', message: 'AI要約の開始に失敗しました。', type: 'error' });
    } finally {
      // 🔧 処理完了後にフラグをリセット
      setIsAISummaryInProgress(false);
    }
  }, [selectedMeeting, user?.id, nestId, createJob, showToast, isJobRunning]);
  
  // ファイルアップロード処理
  const handleFileUpload = useCallback(async (file: File) => {
    if (!selectedMeeting || !user?.id) {
      console.error('🔧 selectedMeetingまたはuserが不正:', { selectedMeeting: !!selectedMeeting, user: !!user?.id });
      return;
    }
    
    try {
      // ファイルサイズをチェック（200MB制限）
      const maxSizeBytes = 200 * 1024 * 1024; // 200MB
      console.log('🔧 ファイルサイズチェック:', { size: file.size, maxSize: maxSizeBytes });
      
      if (file.size > maxSizeBytes) {
        console.error('🔧 ファイルサイズ超過');
        showToast({ 
          title: 'エラー', 
          message: `ファイルサイズが大きすぎます。200MB以下のファイルをご利用ください。（現在: ${Math.round(file.size / (1024 * 1024))}MB）`, 
          type: 'error' 
        });
        return;
      }
      
      // ファイルタイプによって処理を分岐
      const isAudio = file.type.startsWith('audio/');
      const isVideo = file.type.startsWith('video/');
      const isText = file.type === 'text/plain';
      
      console.log('🔧 ファイルタイプ判定:', { isAudio, isVideo, isText, fileType: file.type });
      
      if (isText) {
        // テキストファイルの場合：従来の処理
        const text = await file.text();
        
        // 直接Supabaseに保存
        const { error } = await supabase
          .from('meetings')
          .update({
            transcript: text,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedMeeting.id);
        
        if (error) {
          console.error('ファイルアップロード保存エラー:', error);
          showToast({ title: 'エラー', message: 'ファイルの保存に失敗しました。', type: 'error' });
          return;
        }
        
        // selectedMeetingを更新
        setSelectedMeeting(prev => prev ? { ...prev, transcript: text } : null);
        showToast({ title: '成功', message: 'テキストファイルをアップロードしました。', type: 'success' });
        
      } else       if (isAudio || isVideo) {
        // 音声・動画ファイルの場合：新しいアーキテクチャで処理
        console.log('🔧 音声・動画ファイル処理開始（新しいアーキテクチャ）');
        
        try {
          console.log('🔧 [DEBUG] TranscriptionServiceV2処理開始');
          console.log('🔧 [DEBUG] ファイル情報:', {
            name: file.name,
            type: file.type,
            size: file.size,
            sizeMB: (file.size / 1024 / 1024).toFixed(2)
          });
          
          console.log('🔧 [DEBUG] TranscriptionServiceV2インポート開始');
          const { TranscriptionServiceV2 } = await import('../../../../services/TranscriptionServiceV2');
          console.log('🔧 [DEBUG] TranscriptionServiceV2インポート完了');
          
          console.log('🔧 [DEBUG] TranscriptionServiceV2呼び出し準備:', {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            meetingId: selectedMeeting.id,
            nestId: nestId
          });
          
          console.log('🔧 [DEBUG] TranscriptionServiceV2.transcribeAudio呼び出し開始');
          const result = await TranscriptionServiceV2.transcribeAudio(
            file,
            selectedMeeting.id,
            nestId
          );
          
          console.log('🔧 [DEBUG] TranscriptionServiceV2結果:', result);
          
          if (result.success) {
            console.log('🔧 [DEBUG] 文字起こしジョブ開始成功:', result.jobId);
            showToast({ 
              title: '成功', 
              message: '文字起こしジョブを開始しました。処理完了までお待ちください。', 
              type: 'success' 
            });
            
            // ミーティング一覧を更新
            await refreshUnifiedMeetings();
          } else {
            console.error('🔧 [DEBUG] 文字起こしジョブ開始エラー:', result.error);
            showToast({ 
              title: 'エラー', 
              message: `文字起こし処理に失敗しました: ${result.error}`, 
              type: 'error' 
            });
          }
          
        } catch (error) {
          console.error('🔧 [DEBUG] TranscriptionServiceV2処理エラー:', error);
          showToast({ 
            title: 'エラー', 
            message: `文字起こし処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            type: 'error' 
          });
        }
        
      } else {
        showToast({ title: 'エラー', message: 'サポートされていないファイル形式です。', type: 'error' });
      }
      
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      showToast({ title: 'エラー', message: 'ファイルアップロードに失敗しました。', type: 'error' });
    }
  }, [selectedMeeting, user?.id, nestId, createJob, showToast]);
  
  // ミーティング詳細のアップロード
  const handleUpload = async (data: any) => {
    // TODO: 実際のアップロード処理を実装
    setUploadResult('アップロード成功');
  };
  
  // ミーティング詳細の結果描画
  const handleExtractInsight = async () => {
    // TODO: 実際の結果描画処理を実装
    setExtracting(true);
    // 仮の結果を設定
    setSummary('これは要約です');
    setExtracting(false);
  };
  

    
  
  // レイアウトのレンダリング（デスクトップ、タブレット、モバイルで分岐）
  const renderLayout = () => {
    // デスクトップレイアウト（分割ビュー）
    if (isDesktop) {
      return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            {/* 左カラム：ミーティングリストに新規追加 */}
            <div style={{ 
              width: 260, 
              padding: 16, 
              background: '#1a1a2e', 
              borderRight: '1px solid #45475a', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}>
              <style>{`
                .meeting-list-scroll {
                  scrollbar-width: thin;
                  scrollbar-color: #333366 #1a1a2e;
                }
                .meeting-list-scroll::-webkit-scrollbar {
                  width: 6px;
                }
                .meeting-list-scroll::-webkit-scrollbar-track {
                  background: #1a1a2e;
                }
                .meeting-list-scroll::-webkit-scrollbar-thumb {
                  background: #333366;
                  border-radius: 3px;
                }
                .meeting-list-scroll::-webkit-scrollbar-thumb:hover {
                  background: #45475a;
                }
              `}</style>
              {/* 固定ヘッダー部分 */}
              <div style={{ flexShrink: 0 }}>
                <button
                  style={{
                    marginTop: 8,
                    marginBottom: 16,
                    width: '100%',
                    height: 36,
                    background: '#00ff88',
                    borderRadius: 2,
                    border: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: 6,
                    fontWeight: 600,
                    fontSize: 13,
                    color: '#0f0f23',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    setDroppedFile(null);
                    setShowForm(true);
                  }}
                  disabled={false}
                >
                  <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                  新規ミーティング
                </button>

                {/* 予約ミーティング作成 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setShowScheduledForm(true)}
                    style={{
                      flex: 1,
                      fontSize: 10,
                      padding: '6px 8px',
                      backgroundColor: '#8b5cf6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    🤖 予約作成
                  </button>
                </div>
                
                {/* ファイルドロップゾーン */}
                <div
                  style={{
                    marginBottom: 16,
                    width: '100%',
                    height: 64,
                    background: isDragOver ? '#2a2a4a' : '#232345',
                    border: isDragOver ? '2px dashed #00ff88' : '1px dashed #45475a',
                    borderRadius: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                  onClick={() => {
                    // ファイル選択ダイアログを開く
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.txt,.mp4,.webm,.mov,.mp3,.wav,.m4a,.pdf';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        // 選択されたミーティングがある場合は直接アップロード処理を実行
                        if (selectedMeeting) {
                          handleFileUpload(file);
                        } else {
                          // ミーティングが選択されていない場合はフォームを表示
                          setDroppedFile(file);
                          setShowForm(true);
                        }
                      }
                    };
                    input.click();
                  }}
                >
                  <div style={{
                    fontSize: isDragOver ? 20 : 16,
                    marginBottom: 2,
                    transition: 'font-size 0.2s'
                  }}>
                    📎
                  </div>
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
                
                <div style={{ marginBottom: 16 }}>
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ミーティングを検索..."
                  />
                </div>
              </div>
              
              {/* スクロール可能なリスト部分 */}
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
            {/* 右カラム：ミーティング詳細 */}
            <div style={{ flex: 1, minWidth: 0, background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
              {selectedUnifiedMeeting?.type === 'actual' && selectedMeeting ? (
                <MeetingDetailPanel
                  key={`meeting-detail-${selectedMeeting.id}`}
                  meeting={selectedMeeting}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onSaveMeeting={handleUpdateMeeting}
                  onMeetingUpdate={(updatedMeeting) => {
                    // 選択中のミーティングも更新
                    if (selectedMeeting?.id === updatedMeeting.id) {
                      setSelectedMeeting(updatedMeeting);
                    }
                    // unifiedMeetingsの更新は useUnifiedMeetings hook内で自動的に行われる
                    refreshUnifiedMeetings();
                  }}
                  onAISummary={handleAISummary}
                  onCardExtraction={handleCardExtraction}
                  onFileUpload={handleFileUpload}
                  isCardExtractionDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                  isAISummaryDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                  isCreatingJob={currentRunningJob as JobType | null}
                  isJobRunning={isJobRunning}
                  onDeleteMeeting={handleDeleteMeeting}
                />
              ) : selectedUnifiedMeeting?.type === 'scheduled' ? (
                // 予約ミーティングの詳細表示
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
                    <h3 style={{ marginBottom: 16, color: '#2196f3' }}>📅 予約ミーティング</h3>
                    <p style={{ color: '#a6adc8', marginBottom: 8, fontSize: 18, fontWeight: 600 }}>
                      {selectedUnifiedMeeting.title}
                    </p>
                    <p style={{ color: '#64b5f6', marginBottom: 24, fontSize: 14 }}>
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
                          color: '#0f0f23',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginBottom: 16,
                        }}
                      >
                        ▶ ミーティングを開始
                      </button>
                    )}
                    
                    <p style={{ color: '#6c7086', fontSize: 12, textAlign: 'center' }}>
                      このボタンをクリックすると、予約ミーティングが実際のミーティングに変換されます。
                    </p>
                  </div>
                </div>
              ) : (
                // 何も選択されていない場合
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
                    <h3 style={{ marginBottom: 16, color: '#2196f3' }}>ミーティングを選択してください</h3>
                    <p style={{ color: '#a6adc8', marginBottom: 8, fontSize: 16 }}>
                      左側のリストからミーティングを選択してください
                    </p>
                    <p style={{ color: '#6c7086', fontSize: 12, textAlign: 'center' }}>
                      予約ミーティングと実際のミーティングを<br/>
                      一つのリストで管理しています。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // タブレット/モバイルレイアウト（全画面表示）
    return (
      <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* ヘッダー部分 */}
          <div style={{ 
            padding: 16, 
            background: '#1a1a2e', 
            borderBottom: '1px solid #45475a',
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                style={{
                  height: 36,
                  background: '#00ff88',
                  borderRadius: 2,
                  border: 'none',
                  padding: '0 16px',
                  fontWeight: 600,
                  fontSize: 13,
                  color: '#0f0f23',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => {
                  setDroppedFile(null);
                  setShowForm(true);
                }}
              >
                <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                新規ミーティング
              </button>
              
              <button
                onClick={() => setShowScheduledForm(true)}
                style={{
                  fontSize: 10,
                  padding: '6px 8px',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                🤖 予約作成
              </button>
            </div>
            
            {/* ファイルドロップゾーン */}
            <div
              style={{
                width: '100%',
                height: 64,
                background: isDragOver ? '#2a2a4a' : '#232345',
                border: isDragOver ? '2px dashed #00ff88' : '1px dashed #45475a',
                borderRadius: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleFileDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.txt,.mp4,.webm,.mov,.mp3,.wav,.m4a,.pdf';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    if (selectedMeeting) {
                      handleFileUpload(file);
                    } else {
                      setDroppedFile(file);
                      setShowForm(true);
                    }
                  }
                };
                input.click();
              }}
            >
              <div style={{
                fontSize: isDragOver ? 20 : 16,
                marginBottom: 2,
                transition: 'font-size 0.2s'
              }}>
                📎
              </div>
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
            
            <div>
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ミーティングを検索..."
              />
            </div>
          </div>
          
          {/* メインコンテンツ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            {/* 左カラム：ミーティングリスト */}
            <div style={{ 
              width: 260, 
              background: '#1a1a2e', 
              borderRight: '1px solid #45475a', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
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
            
            {/* 右カラム：ミーティング詳細 - 重複を避けるため削除 */}
            <div style={{ flex: 1, minWidth: 0, background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
              {/* 🔧 重複レンダリングを避けるため、この部分は削除 */}
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
                  <h3 style={{ marginBottom: 16, color: '#a6adc8' }}>📋 ミーティング詳細</h3>
                  <p style={{ color: '#8b5cf6', fontSize: 16 }}>
                    左側のリストからミーティングを選択してください
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // ミーティング空間がなければ作成ボタンを表示
  if (checkingSpace) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>ミーティング空間を確認中...</Text>
      </SafeAreaView>
    );
  }
  if (!meetingSpace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>ミーティング空間がまだ作成されていません。</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateMeetingSpace} disabled={creatingSpace}>
            <Text style={styles.createButtonText}>{creatingSpace ? '作成中...' : 'ミーティング空間を作成'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      {renderLayout()}
      {showForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15,18,34,0.85)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: 700,
            maxWidth: '95vw',
            height: '100%',
            background: '#232345',
            borderLeft: '1px solid #39396a',
            borderRadius: '4px 0 0 4px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            padding: '0',
            position: 'relative',
          }}>
            {/* ヘッダー */}
            <div style={{
              background: '#39396a',
              padding: '18px 24px 12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>新しいミーティングを作成</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', marginLeft: 12, lineHeight: 1, borderRadius: 2, padding: 4, transition: 'background 0.2s' }} aria-label="閉じる" title="閉じる">×</button>
            </div>
            {/* 本体 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 24px 24px' }}>
              <MeetingForm 
                onSubmit={handleCreateMeeting} 
                onCancel={() => {
                  setShowForm(false);
                  setDroppedFile(null);
                }}
                droppedFile={droppedFile}
              />
            </div>
          </div>
        </div>
      )}

      {/* 予約ミーティング作成フォーム */}
      {showScheduledForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15,18,34,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}>
          <div style={{
            width: 500,
            maxWidth: '95vw',
            maxHeight: '90vh',
            background: '#232345',
            border: '1px solid #39396a',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* ヘッダー */}
            <div style={{
              background: '#39396a',
              padding: '18px 24px 12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 48,
            }}>
              <span style={{ 
                fontSize: 16, 
                fontWeight: 700, 
                color: '#fff', 
                letterSpacing: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                🤖 予約ミーティング作成
              </span>
              <button 
                onClick={() => setShowScheduledForm(false)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#fff', 
                  fontSize: 22, 
                  cursor: 'pointer', 
                  lineHeight: 1, 
                  borderRadius: 2, 
                  padding: 4,
                }} 
                aria-label="閉じる" 
                title="閉じる"
              >
                ×
              </button>
            </div>
            
            {/* 本体 */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '24px',
              color: '#e2e8f0',
            }}>
              <ScheduledMeetingForm
                nestId={nestId}
                onCancel={() => setShowScheduledForm(false)}
                onSuccess={() => {
                  refreshUnifiedMeetings();
                  setShowScheduledForm(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: 320,
    padding: 16,
  },
  rightColumn: {
    flex: 1,
    padding: 24,
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#4a6da7',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4a6da7',
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  modalBody: {
    // Add any additional styles for the modal body if needed
  },
});

export default MeetingSpace; 