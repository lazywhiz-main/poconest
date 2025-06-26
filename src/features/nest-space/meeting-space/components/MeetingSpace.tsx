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
import { Meeting, MeetingUI, toMeetingUI, toMeetingDB } from '../../../meeting-space/types/meeting';
import EmptyState from '../../../../components/ui/EmptyState';
import Input from '../../../../components/ui/Input';
import Tag from '../../../../components/ui/Tag';
import StatusBadge from '../../../../components/ui/StatusBadge';
import Button from '../../../../components/common/Button';
import { Icon } from '../../../../components/Icon';
import { generateMeetingSummary, extractCardsFromMeeting, generateMockSummary, generateMockCards } from '../../../../services/ai/openai';
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
  
  // 統合ミーティング機能
  const {
    meetings: unifiedMeetings,
    selectedMeeting: selectedUnifiedMeeting,
    isLoading: loadingUnifiedMeetings,
    selectMeeting: selectUnifiedMeeting,
    migrateScheduledToActual,
    refresh: refreshUnifiedMeetings,
  } = useUnifiedMeetings(nestId);

  const [showForm, setShowForm] = useState(false);
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  const [useUnifiedView, setUseUnifiedView] = useState(true); // 統合ビューのオン/オフ
  
  const [meetingSpace, setMeetingSpace] = useState<any>(null);
  const [checkingSpace, setCheckingSpace] = useState(true);
  const [creatingSpace, setCreatingSpace] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  
  const [meetings, setMeetings] = useState<MeetingUI[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'cards'>('transcript');
  
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
  
  // ミーティング一覧取得
  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('nest_id', nestId)
      .is('deleted_at', null)
      .order('start_time', { ascending: false });
    if (error) {
      setLoadingMeetings(false);
      return;
    }
    const uiMeetings = (data as Meeting[]).map(toMeetingUI);
    setMeetings(uiMeetings);
    
    // 作成者のユーザー情報を取得
    const creatorIds = data
      .map(meeting => meeting.created_by)
      .filter((id): id is string => !!id);
    
    if (creatorIds.length > 0) {
      const userInfos = await getUsersByIds(creatorIds);
      setUsers(userInfos);
    }
    
    setLoadingMeetings(false);
  }, [nestId]);

  useEffect(() => {
    if (nestId) fetchMeetings();
  }, [nestId, fetchMeetings]);
  
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
    
    // 音声・動画ファイルの場合、文字起こしジョブを作成
    if (hasAudioVideo && user?.id) {
      console.log('🔧 新規ミーティング - 音声・動画ファイル処理開始:', droppedFile.name);
      try {
        // Step 1: Supabase Storageにファイルをアップロード
        console.log('🔧 新規ミーティング - Storageアップロード開始');
        
        // ファイル名をサニタイズ（日本語・特殊文字を除去）
        const sanitizedFileName = droppedFile.name
          .replace(/[^a-zA-Z0-9.-]/g, '_') // 英数字、ドット、ハイフン以外をアンダースコアに
          .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
          .toLowerCase(); // 小文字に統一
        
        const fileName = `${dbMeeting.id}_${Date.now()}_${sanitizedFileName}`;
        console.log('🔧 新規ミーティング - サニタイズ後ファイル名:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('meeting-files')
          .upload(fileName, droppedFile, {
            contentType: droppedFile.type,
            upsert: false
          });
        
        if (uploadError) {
          console.error('🔧 新規ミーティング - Storageアップロードエラー:', uploadError);
          throw new Error(`ファイルアップロードエラー: ${uploadError.message}`);
        }
        
        console.log('🔧 新規ミーティング - Storageアップロード成功:', uploadData);
        
        // Step 2: アップロード完了後に文字起こしジョブを作成
        console.log('🔧 新規ミーティング - 文字起こしジョブ作成開始');
        const job = await createJob(
          'transcription',
          dbMeeting.id,
          {
            source: 'file_upload',              // 新規追加: ソース情報
            nestId: nestId,
            userId: user.id,
            meetingTitle: formData.title,
            storagePath: uploadData.path,       // Blob URLではなくStorage Path
            fileName: droppedFile.name,         // 元のファイル名を保持
            fileSize: droppedFile.size,
            fileType: droppedFile.type
          }
        );
        
        console.log('🔧 新規ミーティング - createJob結果:', job);
        
        if (job) {
          console.log('🔧 新規ミーティング - ジョブ作成成功');
          showToast({ 
            title: '成功', 
            message: `ミーティングを作成し、${droppedFile.type.startsWith('audio/') ? '音声' : '動画'}ファイルのアップロードと文字起こしを開始しました。`, 
            type: 'success' 
          });
        } else {
          console.error('🔧 新規ミーティング - ジョブ作成失敗');
          showToast({ title: '警告', message: 'ミーティングは作成されましたが、文字起こし処理の開始に失敗しました。', type: 'warning' });
        }
        
      } catch (error) {
        console.error('🔧 新規ミーティング - ファイル処理エラー:', error);
        showToast({ 
          title: '警告', 
          message: `ミーティングは作成されましたが、ファイル処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`, 
          type: 'warning' 
        });
      }
    } else {
      console.log('🔧 新規ミーティング - 音声・動画ファイルなし、またはユーザー情報なし');
      showToast({ title: '成功', message: 'ミーティングを作成しました。', type: 'success' });
    }
    
    // 従来表示のリスト更新
    await fetchMeetings();
    // 統合表示のリスト更新（useUnifiedViewの時）
    if (useUnifiedView) {
      await refreshUnifiedMeetings();
    }
  }, [nestId, user?.id, user?.email, useUnifiedView, fetchMeetings, refreshUnifiedMeetings, droppedFile, createJob, showToast]);
  
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
      
      // ファイルサイズをチェック（100MB制限）
      const maxSizeBytes = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSizeBytes) {
        showToast({ 
          title: 'エラー', 
          message: `ファイルサイズが大きすぎます。100MB以下のファイルをご利用ください。（現在: ${Math.round(file.size / (1024 * 1024))}MB）`, 
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

  // ミーティング削除（ソフトデリート）
  const handleDeleteMeeting = useCallback(async (meetingId: string) => {
    if (!window.confirm('本当にこのミーティングを削除しますか？')) return;
    const { error } = await supabase
      .from('meetings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', meetingId);
    if (error) {
      alert('ミーティングの削除に失敗しました: ' + error.message);
      return;
    }
    setSelectedMeeting(null);
    await fetchMeetings();
  }, []);

  // カード抽出
  const handleCardExtraction = useCallback(async () => {
    if (!selectedMeeting || !selectedMeeting.transcript || selectedMeeting.transcript.trim() === '') {
      showToast({ title: 'エラー', message: '文字起こしファイルがアップロードされていません。', type: 'error' });
      return;
    }
    
    if (!user?.id) {
      showToast({ title: 'エラー', message: 'ユーザー情報が取得できません。', type: 'error' });
      return;
    }

    try {
      // 🔧 Background jobでカード抽出を実行（即座にローカル状態更新される）
      const job = await createJob(
        'card_extraction',
        selectedMeeting.id,
        {
          nestId: nestId,
          userId: user.id,
          meetingTitle: selectedMeeting.title,
          transcript: selectedMeeting.transcript
        }
      );
      
      if (job) {
        showToast({ title: '成功', message: 'カード抽出を開始しました。処理完了まで少々お待ちください。', type: 'success' });
      }
      
    } catch (error) {
      console.error('カード抽出ジョブ作成エラー:', error);
      showToast({ title: 'エラー', message: 'カード抽出の開始に失敗しました。', type: 'error' });
    }
  }, [selectedMeeting, user?.id, nestId, createJob, showToast]);
  
  // AI要約
  const handleAISummary = useCallback(async () => {
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
    }
  }, [selectedMeeting, user?.id, nestId, createJob, showToast]);
  
  // ファイルアップロード
  const handleFileUpload = useCallback(async (file: File) => {
    console.log('🔧 handleFileUpload開始:', { file: file.name, size: file.size, type: file.type });
    console.log('🔧 selectedMeeting:', selectedMeeting?.id);
    console.log('🔧 user:', user?.id);
    
    if (!selectedMeeting || !user?.id) {
      console.error('🔧 selectedMeetingまたはuserが不正:', { selectedMeeting: !!selectedMeeting, user: !!user?.id });
      return;
    }
    
    try {
      // ファイルサイズをチェック（100MB制限）
      const maxSizeBytes = 100 * 1024 * 1024; // 100MB
      console.log('🔧 ファイルサイズチェック:', { size: file.size, maxSize: maxSizeBytes });
      
      if (file.size > maxSizeBytes) {
        console.error('🔧 ファイルサイズ超過');
        showToast({ 
          title: 'エラー', 
          message: `ファイルサイズが大きすぎます。100MB以下のファイルをご利用ください。（現在: ${Math.round(file.size / (1024 * 1024))}MB）`, 
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
        
              } else if (isAudio || isVideo) {
        // 音声・動画ファイルの場合：まずStorageにアップロード、その後文字起こしジョブを作成
        console.log('🔧 音声・動画ファイル処理開始');
        
        try {
          // Step 1: Supabase Storageにファイルをアップロード
          console.log('🔧 Storageアップロード開始');
          
          // ファイル名をサニタイズ（日本語・特殊文字を除去）
          const sanitizedFileName = file.name
            .replace(/[^a-zA-Z0-9.-]/g, '_') // 英数字、ドット、ハイフン以外をアンダースコアに
            .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
            .toLowerCase(); // 小文字に統一
          
          const fileName = `${selectedMeeting.id}_${Date.now()}_${sanitizedFileName}`;
          console.log('🔧 サニタイズ後ファイル名:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meeting-files')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });
          
          if (uploadError) {
            console.error('🔧 Storageアップロードエラー:', uploadError);
            throw new Error(`ファイルアップロードエラー: ${uploadError.message}`);
          }
          
          console.log('🔧 Storageアップロード成功:', uploadData);
          
          // Step 2: アップロード完了後に文字起こしジョブを作成
          console.log('🔧 文字起こしジョブ作成開始');
          const job = await createJob(
            'transcription',
            selectedMeeting.id,
            {
              nestId: nestId,
              userId: user.id,
              meetingTitle: selectedMeeting.title,
              storagePath: uploadData.path, // Blob URLではなくStorage Path
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            }
          );
          
          console.log('🔧 createJob結果:', job);
          
          if (job) {
            console.log('🔧 ジョブ作成成功');
            showToast({ 
              title: '成功', 
              message: `${isAudio ? '音声' : '動画'}ファイルのアップロードと文字起こしを開始しました。処理完了まで少々お待ちください。`, 
              type: 'success' 
            });
          } else {
            console.error('🔧 ジョブ作成失敗');
            showToast({ title: 'エラー', message: '文字起こしジョブの作成に失敗しました。', type: 'error' });
          }
          
        } catch (storageError) {
          console.error('🔧 ファイル処理エラー:', storageError);
          showToast({ 
            title: 'エラー', 
            message: `ファイル処理に失敗しました: ${storageError instanceof Error ? storageError.message : 'Unknown error'}`, 
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
  
  // ミーティングリスト1件の描画
  const renderMeetingItem = ({ item }: { item: MeetingUI }) => {
    const creatorInfo = item.createdBy ? users[item.createdBy] : null;
    console.log('MeetingItem - createdBy:', item.createdBy, 'users:', users, 'creatorInfo:', creatorInfo);
    const creatorDisplayName = creatorInfo?.display_name || item.createdBy || '作成者不明';

    return (
      <div
        key={item.id}
        style={{
          padding: 12,
          marginBottom: 8,
          background: selectedMeeting?.id === item.id ? '#333366' : '#232345',
          borderRadius: 4,
          border: '1px solid',
          borderColor: selectedMeeting?.id === item.id ? '#39396a' : '#333366',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onClick={() => handleSelectMeeting(item)}
      >
        <div>
          {/* タイトルとステータス */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 2,
          }}>
            <div style={{ 
              color: '#e2e8f0', 
              fontSize: 13, 
              fontWeight: 500,
              flex: 1,
            }}>
              ✓ {item.title || '無題ミーティング'}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{
                fontSize: 10,
                color: '#4caf50',
                backgroundColor: '#4caf5020',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 500,
              }}>
                実施
              </span>
              <span style={{
                fontSize: 10,
                color: '#ffffff',
                backgroundColor: item.status === 'scheduled' ? '#4a6da7' : 
                                item.status === 'completed' ? '#4caf50' :
                                item.status === 'extracted' ? '#9c27b0' : '#6c7086',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 500,
              }}>
                {item.status === 'scheduled' ? '実施予定' : 
                 item.status === 'completed' ? '完了' : 
                 item.status === 'extracted' ? '抽出済み' : 
                 item.status === 'cancelled' ? 'キャンセル' : '完了'}
              </span>
            </div>
          </div>
          
          <div style={{ color: '#64b5f6', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>
            {item.startTime ? new Date(item.startTime).toLocaleString() : ''}
          </div>
          {item.createdBy && (
            <div style={{ color: '#a6adc8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
              作成者: {creatorDisplayName}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {item.tags && item.tags.map((tag, i) => <Tag key={i} style={{ fontSize: 10 }}>{tag}</Tag>)}
            {item.transcript ? (
              <StatusBadge status="active" style={{ fontSize: 9 }}>文字起こし済み</StatusBadge>
            ) : (
              <StatusBadge status="inactive" style={{ fontSize: 9 }}>文字起こしなし</StatusBadge>
            )}
            {item.aiSummary && (
              <StatusBadge status="active" style={{ fontSize: 9 }}>AI要約済み</StatusBadge>
            )}
          </div>
        </div>
      </div>
    );
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

                {/* 統合ビュー切り替えと予約ミーティング作成 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    onClick={() => setUseUnifiedView(!useUnifiedView)}
                    style={{
                      flex: 1,
                      fontSize: 10,
                      padding: '6px 8px',
                      backgroundColor: useUnifiedView ? '#2196f3' : '#333366',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {useUnifiedView ? '📅 統合表示' : '📄 従来表示'}
                  </button>
                  {useUnifiedView && (
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
                  )}
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
                        setDroppedFile(file);
                        setShowForm(true);
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
              {useUnifiedView ? (
                // 統合ミーティングリスト
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
              ) : (
                // 従来のミーティングリスト
                meetings.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EmptyState title="ミーティングがありません" description="新規ミーティングを作成してください" />
                  </div>
                ) : (
                  <div 
                    className="meeting-list-scroll" 
                    style={{ 
                      flex: 1, 
                      overflowY: 'auto',
                      overflowX: 'hidden',
                      minHeight: 0, // flex itemがshrinkできるようにする
                    }}
                  >
                    {meetings.map(mtg => renderMeetingItem({ item: mtg }))}
                  </div>
                )
              )}
            </div>
            {/* 右カラム：ミーティング詳細 */}
            <div style={{ flex: 1, minWidth: 0, background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
              {useUnifiedView ? (
                // 統合ビューの詳細表示
                selectedUnifiedMeeting?.type === 'actual' && selectedMeeting ? (
                  <MeetingDetailPanel
                    meeting={selectedMeeting}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onSaveMeeting={handleUpdateMeeting}
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
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#0f0f23'
                  }}>
                    <div style={{ textAlign: 'center', maxWidth: 400 }}>
                      <div style={{ 
                        fontSize: 16, 
                        fontWeight: 600, 
                        color: '#e2e8f0', 
                        marginBottom: 8,
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        ミーティングを選択してください
                      </div>
                      <div style={{ 
                        fontSize: 13, 
                        color: '#6c7086',
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        左のリストからミーティングを選択してください
                      </div>
                    </div>
                  </div>
                )
              ) : (
                // 従来ビューの詳細表示
                selectedMeeting ? (
                  <MeetingDetailPanel
                    meeting={selectedMeeting}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onSaveMeeting={handleUpdateMeeting}
                    onAISummary={handleAISummary}
                    onCardExtraction={handleCardExtraction}
                    onFileUpload={handleFileUpload}
                    isCardExtractionDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                    isAISummaryDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                    isCreatingJob={currentRunningJob as JobType | null}
                    isJobRunning={isJobRunning}
                    onDeleteMeeting={handleDeleteMeeting}
                  />
                ) : (
                  <div style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: '#0f0f23'
                  }}>
                    <div style={{ textAlign: 'center', maxWidth: 400 }}>
                      <div style={{ 
                        fontSize: 16, 
                        fontWeight: 600, 
                        color: '#e2e8f0', 
                        marginBottom: 8,
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        ミーティングを選択してください
                      </div>
                      <div style={{ 
                        fontSize: 13, 
                        color: '#6c7086',
                        fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        左のリストからミーティングを選択、または新規作成してください
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // タブレット/デスクトップの全画面レイアウト
    if ((isTablet || isDesktop)) {
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
                        setDroppedFile(file);
                        setShowForm(true);
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
              {meetings.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EmptyState title="ミーティングがありません" description="新規ミーティングを作成してください" />
                </div>
              ) : (
                <div 
                  className="meeting-list-scroll" 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    minHeight: 0, // flex itemがshrinkできるようにする
                  }}
                >
                  {meetings.map(mtg => renderMeetingItem({ item: mtg }))}
                </div>
              )}
            </div>
            {/* 右カラム：ミーティング詳細 */}
            <div style={{ flex: 1, minWidth: 0, background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
              {selectedMeeting ? (
                <MeetingDetailPanel
                  meeting={selectedMeeting}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  onSaveMeeting={handleUpdateMeeting}
                  onAISummary={handleAISummary}
                  onCardExtraction={handleCardExtraction}
                  onFileUpload={handleFileUpload}
                  isCardExtractionDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                  isAISummaryDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                  isCreatingJob={currentRunningJob as JobType | null}
                  isJobRunning={isJobRunning}
                  onDeleteMeeting={handleDeleteMeeting}
                />
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: '#0f0f23'
                }}>
                  <div style={{ textAlign: 'center', maxWidth: 400 }}>
                    <div style={{ 
                      fontSize: 16, 
                      fontWeight: 600, 
                      color: '#e2e8f0', 
                      marginBottom: 8,
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                      ミーティングを選択してください
                    </div>
                    <div style={{ 
                      fontSize: 13, 
                      color: '#6c7086',
                      fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                      左のリストからミーティングを選択、または新規作成してください
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // モバイルレイアウト
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
                      setDroppedFile(file);
                      setShowForm(true);
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
            {meetings.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState title="ミーティングがありません" description="新規ミーティングを作成してください" />
              </div>
            ) : (
              <div 
                className="meeting-list-scroll" 
                style={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  minHeight: 0, // flex itemがshrinkできるようにする
                }}
              >
                {meetings.map(mtg => renderMeetingItem({ item: mtg }))}
              </div>
            )}
          </div>
          {/* 右カラム：ミーティング詳細 */}
          <div style={{ flex: 1, minWidth: 0, background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
            {selectedMeeting ? (
              <MeetingDetailPanel
                meeting={selectedMeeting}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSaveMeeting={handleUpdateMeeting}
                onAISummary={handleAISummary}
                onCardExtraction={handleCardExtraction}
                onFileUpload={handleFileUpload}
                isCardExtractionDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                isAISummaryDisabled={!selectedMeeting?.transcript || selectedMeeting.transcript.trim() === ''}
                isCreatingJob={currentRunningJob as JobType | null}
                isJobRunning={isJobRunning}
                onDeleteMeeting={handleDeleteMeeting}
              />
            ) : (
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#0f0f23'
              }}>
                <div style={{ textAlign: 'center', maxWidth: 400 }}>
                  <div style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: '#e2e8f0', 
                    marginBottom: 8,
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    ミーティングを選択してください
                  </div>
                  <div style={{ 
                    fontSize: 13, 
                    color: '#6c7086',
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}>
                    左のリストからミーティングを選択、または新規作成してください
                  </div>
                </div>
              </div>
            )}
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
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
                  <h3 style={{ marginBottom: 16, color: '#f9e2af' }}>
                    予約ミーティング機能は実装中です
                  </h3>
                  <p style={{ color: '#a6adc8', marginBottom: 8 }}>
                    Phase 2で以下の機能を実装予定：
                  </p>
                </div>
                
                <div style={{ 
                  textAlign: 'left', 
                  maxWidth: 350, 
                  margin: '0 auto',
                  backgroundColor: '#181825',
                  padding: 20,
                  borderRadius: 8,
                  border: '1px solid #333366',
                }}>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0,
                    color: '#a6adc8',
                    fontSize: 14,
                  }}>
                    <li style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📅 <span>日時・期間設定</span>
                    </li>
                    <li style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🔗 <span>Zoom/Teams/Meet統合</span>
                    </li>
                    <li style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🤖 <span>自動参加設定</span>
                    </li>
                    <li style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📝 <span>自動文字起こし</span>
                    </li>
                    <li style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🧠 <span>自動AI要約</span>
                    </li>
                    <li style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📋 <span>自動カード抽出</span>
                    </li>
                  </ul>
                </div>

                <div style={{ 
                  marginTop: 24,
                  padding: 16,
                  backgroundColor: '#181825',
                  borderRadius: 8,
                  border: '1px solid #333366',
                }}>
                  <p style={{ 
                    fontSize: 12, 
                    color: '#6c7086', 
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    💡 現在は「統合表示」で予約ミーティングと実際のミーティングを<br/>
                    一元管理できます。今後、完全自動化機能を追加予定です。
                  </p>
                </div>
              </div>
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