import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MeetingUI, CardExtractionSettings, CARD_EXTRACTION_PRESETS } from '../../../meeting-space/types/meeting';
import Tag from '../../../../components/ui/Tag';
import StatusBadge from '../../../../components/ui/StatusBadge';
import CustomDropdown from '../../../../components/ui/CustomDropdown';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Icon from '../../../../components/ui/Icon';
import Markdown from 'react-markdown';
import { getCardsByMeeting, deleteCard, getOrCreateMeetingSource, addCardSource, addBoardCards, getOrCreateDefaultBoard } from '../../../../services/BoardService';
import { supabase } from '../../../../services/supabase/client';
import { BoardCardUI } from '../../../../types/board';
import BoardCardWeb from '../../../board-space/components/BoardCardWeb';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../../components/ui/Modal';
import { useBoardSpace } from '../../board-space/hooks/useBoardSpace';
import { useNest } from '../../../nest/contexts/NestContext';
import { toBoardCardUI } from '../../../../types/board';
import { CardModal } from '../../../board-space/components/BoardSpace';
import MiniCalendar from '../../../../components/ui/MiniCalendar';
import TimeSelect from '../../../../components/ui/TimeSelect';
import { getUserById, UserInfo } from '../../../../services/UserService';
import { useToast } from '../../../../components/ui/Toast';
import ConfirmModal from '../../../../components/ui/ConfirmModal';
import { JobType } from '../../../meeting-space/types/backgroundJob';
// import { useBackgroundJobs } from '../../../meeting-space/hooks/useBackgroundJobs'; // 削除
import SpeakerDiarizationView from './SpeakerDiarizationView';
import SpeakerAnalysisView from './SpeakerAnalysisView';
import SpeakerDiarizationTestPage from './SpeakerDiarizationTestPage';

interface MeetingDetailPanelProps {
  meeting: MeetingUI;
  activeTab: 'transcript' | 'summary' | 'speaker-analysis' | 'cards' | 'test';
  onTabChange: (tab: 'transcript' | 'summary' | 'speaker-analysis' | 'cards' | 'test') => void;
  onSaveMeeting?: (meeting: Partial<MeetingUI>) => void;
  onMeetingUpdate?: (meeting: MeetingUI) => void;
  onAISummary?: () => void;
  onCardExtraction?: (extractionSettings?: CardExtractionSettings) => void;
  onFileUpload?: (file: File) => void;
  isCardExtractionDisabled?: boolean;
  isAISummaryDisabled?: boolean;
  isCreatingJob?: JobType | null;
  isJobRunning?: (jobType: 'ai_summary' | 'card_extraction' | 'speaker_diarization') => boolean;
  onDeleteMeeting?: (meetingId: string) => void;
}

const EditIcon = ({ size = 14, color = "#888" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const DeleteIcon = ({ size = 20, color = "#ff6b6b" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 11v6M14 11v6" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Markdownカスタムスタイル共通定義
const markdownComponents = {
  h1: (props: any) => <h1 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  h2: (props: any) => <h2 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  h3: (props: any) => <h3 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  h4: (props: any) => <h4 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  h5: (props: any) => <h5 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  h6: (props: any) => <h6 {...props} style={{ color: '#e2e8f0', marginBottom: '0.5em' }} />,
  p: (props: any) => <p {...props} style={{ color: '#a6adc8', lineHeight: 1.6, marginBottom: '1em' }} />,
  ul: (props: any) => (
    <ul 
      {...props} 
      style={{ 
        color: '#a6adc8',
        listStyle: 'none',
        paddingLeft: '1.5em',
        margin: '0.5em 0'
      }} 
    />
  ),
  ol: (props: any) => <ol {...props} style={{ color: '#a6adc8', paddingLeft: '1.5em' }} />,
  li: (props: any) => (
    <li 
      {...props} 
      style={{ 
        position: 'relative',
        marginBottom: '0.25em',
        paddingLeft: '0.5em'
      }}
    >
      <span style={{ 
        position: 'absolute',
        left: '-1em',
        color: '#00ff88'
      }}>
        •
      </span>
      {props.children}
    </li>
  ),
  blockquote: (props: any) => <blockquote {...props} style={{ borderLeft: '4px solid #333366', paddingLeft: '1em', margin: '1em 0', color: '#6c7086' }} />,
  code: (props: any) => <code {...props} style={{ backgroundColor: '#333366', color: '#00ff88', padding: '0.2em 0.4em', borderRadius: '2px', fontFamily: 'JetBrains Mono, monospace' }} />,
  pre: (props: any) => <pre {...props} style={{ backgroundColor: '#0f0f23', color: '#e2e8f0', padding: '1em', borderRadius: '4px', overflow: 'auto', fontFamily: 'JetBrains Mono, monospace' }} />,
};

// スピンアニメーション用のCSS
const spinKeyframes = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

const MeetingDetailPanel: React.FC<MeetingDetailPanelProps> = ({
  meeting,
  activeTab,
  onTabChange,
  onSaveMeeting,
  onMeetingUpdate,
  onAISummary,
  onCardExtraction,
  onFileUpload,
  isCardExtractionDisabled = false,
  isAISummaryDisabled = false,
  isCreatingJob = null,
  isJobRunning,
  onDeleteMeeting,
}) => {
  // 🔧 背景ジョブ状態は親からpropsで受け取る
  // const { getJobsByMeeting } = useBackgroundJobs(); // 削除
  // const meetingJobs = getJobsByMeeting(meeting.id); // 削除
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editedTitle, setEditedTitle] = useState(meeting.title || '');
  const [editedDateTime, setEditedDateTime] = useState(meeting.startTime || '');
  const [isEditingSummary, setIsEditingSummary] = useState(true);
  const [summaryContent, setSummaryContent] = useState(meeting.aiSummary || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const summaryContainerRef = useRef<HTMLDivElement>(null);
  const [textareaHeight, setTextareaHeight] = useState<string>('100%');
  const [relatedCards, setRelatedCards] = useState<BoardCardUI[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetCardId, setDeleteTargetCardId] = useState<string | null>(null);
  const { currentNest } = useNest();
  const [editingCard, setEditingCard] = useState<BoardCardUI | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewCardModal, setShowNewCardModal] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<UserInfo | null>(null);



  // AI要約・カード抽出のモーダル状態
  const [isAISummaryLoading, setIsAISummaryLoading] = useState(false);
  const [isCardExtractionLoading, setIsCardExtractionLoading] = useState(false);
  const [aiSummaryCompleted, setAiSummaryCompleted] = useState(false);
  const [cardExtractionCompleted, setCardExtractionCompleted] = useState(false);
  const [extractedCards, setExtractedCards] = useState<BoardCardUI[]>([]);
  const [extractionGranularity, setExtractionGranularity] = useState<'coarse' | 'medium' | 'fine'>(() => {
    // ローカルストレージから保存された設定を読み込み
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('meetingDetailPanel_extractionGranularity');
      return (saved as 'coarse' | 'medium' | 'fine') || 'medium';
    }
    return 'medium';
  });

  // トーストシステム
  const { showToast } = useToast();



  // ボタン状態の管理
  const getButtonState = useCallback((jobType: 'ai_summary' | 'card_extraction' | 'speaker_diarization') => {
    // 新しいisJobRunning関数を優先して使用
    const isRunning = isJobRunning ? isJobRunning(jobType) : (isCreatingJob === jobType);
    
    // デバッグ用ログをコメントアウト（大量ログ防止）
    // console.log(`[MeetingDetailPanel] getButtonState: jobType=${jobType}, isJobRunning=${isJobRunning ? isJobRunning(jobType) : 'undefined'}, isCreatingJob=${isCreatingJob}, isRunning=${isRunning}`);
    
    // プロパティから受け取った無効化状態を確認
    const isBaseDisabled = jobType === 'ai_summary' ? isAISummaryDisabled : isCardExtractionDisabled;
    
    // 🔧 重複実行防止 - 既に処理中の場合は必ず無効化
    if (isRunning) {
      if (jobType === 'ai_summary') {
        return {
          text: 'AI要約実行中...',
          icon: 'loader' as const,
          disabled: true,
          spinning: true
        };
      } else if (jobType === 'card_extraction') {
        return {
          text: 'カード抽出実行中...',
          icon: 'loader' as const,
          disabled: true,
          spinning: true
        };
      } else {
        return {
          text: '話者分離実行中...',
          icon: 'loader' as const,
          disabled: true,
          spinning: true
        };
      }
    }
    
    // 🔧 基本無効化状態と処理中状態の両方をチェック
    const isDisabled = isBaseDisabled || isRunning;
    
    if (jobType === 'ai_summary') {
      return {
        text: 'AI要約',
        icon: 'ai-summary' as const,
        disabled: isDisabled,
        spinning: false
      };
    } else if (jobType === 'card_extraction') {
      return {
        text: 'カード抽出',
        icon: 'card-extract' as const,
        disabled: isDisabled,
        spinning: false
      };
    } else {
      return {
        text: '話者分離',
        icon: 'analysis' as const,
        disabled: isDisabled,
        spinning: false
      };
    }
  }, [isJobRunning, isCreatingJob, isAISummaryDisabled, isCardExtractionDisabled]);

  // スピンアニメーション用のスタイルを動的に追加
  useEffect(() => {
    if (!document.getElementById('meeting-detail-spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'meeting-detail-spinner-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const loadRelatedCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      console.log('[MeetingDetailPanel] loadRelatedCards開始:', meeting.id);
      const cards = await getCardsByMeeting(meeting.id);
      console.log('[MeetingDetailPanel] loadRelatedCards結果:', {
        cardCount: cards.length,
        cardIds: cards.map(c => c.id),
        cards: cards.map(c => ({ 
          id: c.id, 
          title: c.title, 
          relatedCount: c.relatedCards?.length || 0,
        }))
      });
      setRelatedCards(cards);
    } catch (error) {
      console.error('関連カード読み込みエラー:', error);
      setRelatedCards([]);
    }
    setLoadingCards(false);
  }, [meeting.id]);

  useEffect(() => {
    setEditedTitle(meeting.title || '');
    setEditedDateTime(meeting.startTime || '');
    setSummaryContent(meeting.aiSummary || '');
  }, [meeting.title, meeting.startTime, meeting.aiSummary]);

  // 関連カードを読み込む
  useEffect(() => {
    if (activeTab === 'cards') {
      loadRelatedCards();
    }
  }, [activeTab, meeting.id, loadRelatedCards]);

  useEffect(() => {
    if (isEditingSummary && summaryRef.current) {
      summaryRef.current.style.height = 'auto';
      summaryRef.current.style.height = (summaryRef.current.scrollHeight || 200) + 'px';
    }
  }, [isEditingSummary, summaryContent]);

  useEffect(() => {
    if (isEditingSummary && summaryContainerRef.current) {
      const updateHeight = () => {
        if (summaryContainerRef.current) {
          const containerHeight = summaryContainerRef.current.clientHeight;
          if (containerHeight > 0) {
            setTextareaHeight(`${containerHeight}px`);
          }
        }
      };

      // 初回実行（遅延）
      setTimeout(updateHeight, 10);
      
      // ResizeObserver で継続監視
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(updateHeight, 10);
      });
      
      resizeObserver.observe(summaryContainerRef.current);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [isEditingSummary]);

  // 作成者情報を取得
  const fetchCreatorInfo = useCallback(async () => {
    if (meeting.createdBy) {
      // console.log('Fetching creator info for:', meeting.createdBy);
      const userInfo = await getUserById(meeting.createdBy);
      // console.log('Fetched creator info:', userInfo);
      setCreatorInfo(userInfo);
    }
  }, [meeting.createdBy]);

  useEffect(() => {
    fetchCreatorInfo();
  }, [fetchCreatorInfo]);

  const handleSaveTitle = useCallback(async () => {
    if (onSaveMeeting) {
      onSaveMeeting({ title: editedTitle });
      
      // ミーティングタイトル変更後、関連するカードの出典バッジを更新
      try {
        // ミーティングソースを更新
        const { getOrCreateMeetingSource } = await import('../../../../services/BoardService');
        await getOrCreateMeetingSource(meeting.id, editedTitle);
        
        // 関連カードの出典情報を直接更新
        if (relatedCards.length > 0) {
          const { supabase } = await import('../../../../services/supabase/client');
          
          // 関連カードのmetadata.meeting_titleも更新
          for (const card of relatedCards) {
            if (card.metadata?.meeting_id === meeting.id) {
              await supabase
                .from('board_cards')
                .update({
                  metadata: {
                    ...card.metadata,
                    meeting_title: editedTitle
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', card.id);
            }
          }
        }
        
        // 関連カードを再読み込みして出典バッジを更新
        await loadRelatedCards();
        
        console.log('ミーティングタイトル更新完了:', editedTitle);
      } catch (error) {
        console.error('出典バッジ更新エラー:', error);
      }
    }
    setIsEditingTitle(false);
  }, [onSaveMeeting, editedTitle, meeting.id, loadRelatedCards, relatedCards]);

  const handleSaveDateTime = useCallback(() => {
    if (onSaveMeeting) {
      onSaveMeeting({ startTime: editedDateTime });
    }
    setIsEditingDateTime(false);
  }, [onSaveMeeting, editedDateTime]);

  const handleSaveSummary = useCallback(() => {
    if (onSaveMeeting) {
      onSaveMeeting({ aiSummary: summaryContent });
    }
  }, [onSaveMeeting, summaryContent]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateTimeString;
    }
  };

  const handleCardClick = (cardId: string) => {
    const card = relatedCards.find(c => c.id === cardId);
    if (card) {
      setEditingCard(card);
    }
  };

  const handleCardDelete = async (cardId: string) => {
    console.log('[MeetingDetailPanel] 削除ボタンクリック:', {
      cardId,
      meetingId: meeting.id,
      relatedCardsCount: relatedCards.length,
      targetCard: relatedCards.find(c => c.id === cardId)
    });
    setDeleteTargetCardId(cardId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetCardId) {
      try {
        console.log('[MeetingDetailPanel] カード削除処理開始:', {
          cardId: deleteTargetCardId,
          meetingId: meeting.id,
          timestamp: new Date().toISOString()
        });
        
        const result = await deleteCard(deleteTargetCardId);
        console.log('[MeetingDetailPanel] deleteCard API結果:', result);
        
        if (result.error) {
          const errorMessage = result.error.message || '不明なエラー';
          console.error('[MeetingDetailPanel] API削除エラー:', result.error);
          throw new Error(`削除に失敗しました: ${errorMessage}`);
        }
        
        console.log('[MeetingDetailPanel] カード削除API成功');
        
        // 関連カードを再読み込み
        console.log('[MeetingDetailPanel] 関連カード再読み込み開始');
        await loadRelatedCards();
        console.log('[MeetingDetailPanel] 関連カード再読み込み完了');
        
        // 成功メッセージ
        console.log('[MeetingDetailPanel] カード削除処理完了');
        
      } catch (error) {
        console.error('[MeetingDetailPanel] カード削除エラー:', {
          error,
          cardId: deleteTargetCardId,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        
        // より詳細なエラーメッセージを表示
        const errorMessage = error instanceof Error ? error.message : 'カードの削除に失敗しました';
        alert(`${errorMessage}\n\nコンソールログを確認してください。`);
      }
    }
    setIsDeleteModalOpen(false);
    setDeleteTargetCardId(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setDeleteTargetCardId(null);
  };

  const handleCloseEditModal = () => setEditingCard(null);

  const handleSaveEditCard = async (card: BoardCardUI) => {
    // BoardCardUIからBoardItemへの変換
    const boardItem = {
      ...card,
      sources: card.sources?.map(source => ({
        ...source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) || [],
    };
    // カードを更新
    try {
      await supabase
        .from('board_cards')
        .update({
          title: boardItem.title,
          content: boardItem.content,
          column_type: boardItem.columnType,
          updated_at: new Date().toISOString(),
          metadata: boardItem.metadata
        })
        .eq('id', boardItem.id);
      console.log('カード更新完了:', boardItem.id);
    } catch (error) {
      console.error('カード更新エラー:', error);
    }
    setEditingCard(null);
  };

  // AI要約処理のハンドラー
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'ai-summary' | 'card-extraction' | null>(null);

  const handleAISummaryWithModal = () => {
    // 🔧 重複実行防止
    if (isJobRunning && isJobRunning('ai_summary')) {
      console.log('🔧 [MeetingDetailPanel] AI要約は既に実行中のため、モーダルを表示しません');
      return;
    }
    
    setConfirmAction('ai-summary');
    setShowConfirmModal(true);
  };

  const handleCardExtractionWithModal = () => {
    // 🔧 重複実行防止
    if (isJobRunning && isJobRunning('card_extraction')) {
      console.log('🔧 [MeetingDetailPanel] カード抽出は既に実行中のため、モーダルを表示しません');
      return;
    }
    
    setConfirmAction('card-extraction');
    setShowConfirmModal(true);
  };

  const handleAISummary = useCallback(() => {
    if (onAISummary) {
      onAISummary();
      
      // 開始トーストを表示
      showToast({
        type: 'info',
        title: 'AI要約を開始しました',
        message: 'バックグラウンドで処理中です...',
        duration: 3000
      });
    }
  }, [onAISummary, showToast]);

  const handleCardExtraction = useCallback(() => {
    if (onCardExtraction) {
      // 選択された抽出粒度の設定を取得
      const extractionSettings = CARD_EXTRACTION_PRESETS[extractionGranularity];
      
      onCardExtraction(extractionSettings);
      
      // 開始トーストを表示
      showToast({
        type: 'info',
        title: 'カード抽出を開始しました',
        message: 'バックグラウンドで処理中です...',
        duration: 3000
      });
    }
  }, [onCardExtraction, showToast, extractionGranularity]);

  const handleConfirmAction = () => {
    if (confirmAction === 'ai-summary') {
      handleAISummary();
    } else if (confirmAction === 'card-extraction') {
      handleCardExtraction();
    }
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelAction = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const getConfirmModalConfig = () => {
    if (confirmAction === 'ai-summary') {
      return {
        title: 'AI要約の実行確認',
        message: `この処理には時間がかかる場合があります。\n\n処理中も他の機能をご利用いただけます。\n完了時にはトースト通知でお知らせいたします。\n\n実行しますか？`,
        type: 'info' as const
      };
    } else if (confirmAction === 'card-extraction') {
      return {
        title: 'カード抽出の実行確認',
        message: `この処理には時間がかかる場合があります。\n\n処理中も他の機能をご利用いただけます。\n完了時にはトースト通知でお知らせいたします。\n\n実行しますか？`,
        type: 'info' as const
      };
    }
    return {
      title: '確認',
      message: '実行しますか？',
      type: 'info' as const
    };
  };

  // ボタンスタイルのヘルパー関数
  const getButtonBackgroundColor = (buttonType: 'ai-summary' | 'card-extraction') => {
    const jobType = buttonType === 'ai-summary' ? 'ai_summary' : 'card_extraction';
    const state = getButtonState(jobType);
    
    if (state.disabled) return '#1a1a2e';
    return state.spinning ? '#2a2a4e' : '#333366';
  };

  const getButtonTextColor = (buttonType: 'ai-summary' | 'card-extraction') => {
    const jobType = buttonType === 'ai-summary' ? 'ai_summary' : 'card_extraction';
    const state = getButtonState(jobType);
    
    return state.disabled ? '#6c7086' : '#e2e8f0';
  };

  // ボタンスタイル
  const styles = {
    actionButton: {
      border: 'none',
      borderRadius: 2,
      padding: '8px 16px',
      fontSize: 12,
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      transition: 'all 0.2s ease',
    },
    actionButtonDisabled: {
      cursor: 'not-allowed',
    },
    buttonContent: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    },
    buttonText: {
      fontSize: 12,
      fontWeight: 600,
    },
  };

  // タブUI
  const renderTabs = () => (
    <>
      <style>{`
        .meeting-tab-container {
          display: flex;
          background: transparent;
          border-bottom: 1.5px solid #333366;
          padding: 0;
          margin: 0;
          border-radius: 0;
          position: relative;
        }
        .meeting-tab {
          padding: 16px 24px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #6c7086;
          letter-spacing: 1px;
          border: none;
          background: none;
          border-radius: 0;
          text-transform: none;
          transition: all 0.2s;
          position: relative;
          font-family: 'Space Grotesk', sans-serif;
          box-shadow: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .meeting-tab:not(.active):hover {
          color: #a6adc8;
          background: rgba(51, 51, 102, 0.3);
        }
        .meeting-tab.active {
          color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
          border-bottom: 2px solid #00ff88;
          z-index: 2;
          box-shadow: none;
        }
        .tab-spacer {
          flex: 1;
        }
      `}</style>
      <div className="meeting-tab-container">
        {[
          { key: 'transcript' as const, label: '全文' },
          { key: 'speaker-analysis' as const, label: '話者分析' },
          { key: 'summary' as const, label: '要約' },
          { key: 'cards' as const, label: '関連カード' },
          { key: 'test' as const, label: '🧪 テスト' },
        ].map(tab => (
          <div
            key={tab.key}
            className={"meeting-tab" + (activeTab === tab.key ? " active" : "")}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </div>
        ))}
        <div className="tab-spacer"></div>
      </div>
    </>
  );

  // 基本情報セクション
  const renderBasicInfo = useMemo(() => {
    // console.log('renderBasicInfo - creatorInfo:', creatorInfo, 'meeting.createdBy:', meeting.createdBy);
    const creatorDisplayName = creatorInfo?.display_name || meeting.createdBy || '作成者不明';
    
    return (
      <div style={{ 
        marginBottom: 16,
        padding: '4px 0 12px 0',
        borderBottom: '1px solid #333366', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 6
      }}>
        {/* タイトルは上部のヘッダーで表示・編集するため、ここでは表示しない */}
        {/* 作成者 | 日時 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#a6adc8' }}>
          {/* 作成者情報を表示 */}
          <span>{creatorDisplayName}</span>
          <span style={{ color: '#39396a' }}>|</span>
          {isEditingDateTime ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* プチモーダルでMiniCalendarとTimeSelectを表示（MeetingFormのUIを流用） */}
              <Modal open={isEditingDateTime} onClose={() => setIsEditingDateTime(false)}>
                <div style={{ padding: 16, background: '#18181c', borderRadius: 8, minWidth: 260 }}>
                  <div style={{ marginBottom: 12 }}>
                    <MiniCalendar value={new Date(editedDateTime)} onChange={(d: Date) => {
                      const newDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), new Date(editedDateTime).getHours(), new Date(editedDateTime).getMinutes());
                      setEditedDateTime(newDate.toISOString());
                    }} />
                  </div>
                  <TimeSelect value={{ hour: new Date(editedDateTime).getHours(), minute: new Date(editedDateTime).getMinutes() }} onChange={(t: { hour: number; minute: number }) => {
                    const d = new Date(editedDateTime);
                    d.setHours(t.hour, t.minute);
                    setEditedDateTime(d.toISOString());
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                    <button style={{ background: '#00ff88', color: '#0f0f23', border: 'none', borderRadius: 2, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={handleSaveDateTime}>保存</button>
                    <button style={{ background: 'none', color: '#a6adc8', border: '1px solid #333366', borderRadius: 2, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => setIsEditingDateTime(false)}>キャンセル</button>
                  </div>
                </div>
              </Modal>
              <span style={{ color: '#64b5f6', fontFamily: 'JetBrains Mono, monospace' }}>{formatDateTime(editedDateTime)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => setIsEditingDateTime(true)}>
              <span style={{ color: '#64b5f6', fontFamily: 'JetBrains Mono, monospace' }}>{formatDateTime(meeting.startTime || '')}</span>
              <EditIcon size={14} color="#a6adc8" />
            </div>
          )}
        </div>
        {/* タグと文字起こしステータス */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {meeting.tags && meeting.tags.map((tag, i) => <Tag key={i}>{tag}</Tag>)}
          {meeting.transcript ? (
            <StatusBadge status="active">Uploaded</StatusBadge>
          ) : (
            <StatusBadge status="inactive">文字起こしなし</StatusBadge>
          )}

        </div>
        {/* ファイルアップロードボタン（左寄せ） */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".txt,.md,.doc,.docx,.pdf"
          />
          <button
            onClick={handleFileSelect}
            style={{
              background: '#333366',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 2,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Icon name="upload" size={14} color="#e2e8f0" />
            {meeting.transcript ? '再アップロード' : 'アップロード'}
          </button>
        </div>
      </div>
    );
  }, [
    creatorInfo?.display_name,
    meeting.createdBy,
    meeting.title,
    meeting.startTime,
    meeting.transcript,
    meeting.tags,
    isEditingDateTime,
    editedDateTime,
  ]);

  // --- HEADER with DELETE BUTTON ---
  const renderHeader = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
      {isEditingTitle ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSaveTitle();
              } else if (e.key === 'Escape') {
                setIsEditingTitle(false);
                setEditedTitle(meeting.title || '');
              }
            }}
            style={{
              background: 'transparent',
              border: '1px solid #64b5f6',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 22,
              fontWeight: 700,
              color: '#e2e8f0',
              outline: 'none',
              minWidth: 300,
              letterSpacing: 0.5
            }}
            autoFocus
          />
          <button
            onClick={handleSaveTitle}
            style={{
              background: '#00ff88',
              color: '#0f0f23',
              border: 'none',
              borderRadius: 2,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            保存
          </button>
          <button
            onClick={() => {
              setIsEditingTitle(false);
              setEditedTitle(meeting.title || '');
            }}
            style={{
              background: 'none',
              color: '#a6adc8',
              border: '1px solid #333366',
              borderRadius: 2,
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            キャンセル
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            fontSize: 22, 
            fontWeight: 700, 
            color: '#e2e8f0', 
            letterSpacing: 0.5, 
            padding: '0 0 0 2px',
            cursor: 'pointer'
          }} 
          onClick={() => setIsEditingTitle(true)}
        >
          <span>{meeting.title || '無題ミーティング'}</span>
          <EditIcon size={16} color="#a6adc8" />
        </div>
      )}
      {onDeleteMeeting && (
        <button
          style={{
            background: '#1a1a2e',
            color: '#ff6b6b',
            border: '1px solid #333366',
            borderRadius: 2,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginLeft: 12,
          }}
          onClick={() => setShowDeleteConfirm(true)}
          title="ミーティングを削除"
        >
          <Icon name="delete" size={16} color="#ff6b6b" style={{ margin: 0, verticalAlign: 'middle' }} />
        </button>
      )}
      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} style={{ minWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 32, textAlign: 'center', letterSpacing: 0.5 }}>
            本当にこのミーティングを削除しますか？
            <br />
            <span style={{ fontSize: 12, color: '#a6adc8', fontWeight: 400, marginTop: 8, display: 'block' }}>
              ※ 関連するカードも一緒に削除されます
            </span>
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <Button
              title="キャンセル"
              variant="default"
              style={{ minWidth: 120 }}
              onPress={() => setShowDeleteConfirm(false)}
            />
            <Button
              title="削除"
              variant="danger"
              style={{ minWidth: 120 }}
              onPress={() => { onDeleteMeeting && onDeleteMeeting(meeting.id); setShowDeleteConfirm(false); }}
            />
          </div>
        </Modal>
      )}
    </div>
  );

  // タブコンテンツ
  const renderTabContent = () => {
    switch (activeTab) {
      case 'transcript':
        return (
          <div style={{ 
            height: 'calc(100vh - 330px)',
            display: 'flex', 
            flexDirection: 'column'
          }}>
            <SpeakerDiarizationView 
              meetingId={meeting.id}
              transcript={meeting.transcript || ''}
              onTranscriptUpdate={(newTranscript) => {
                // ミーティングデータをローカルで更新
                if (onMeetingUpdate) {
                  onMeetingUpdate({
                    ...meeting,
                    transcript: newTranscript
                  });
                }
              }}
            />
          </div>
        );

      case 'summary':
        return (
          <div style={{ 
            height: 'calc(100vh - 330px)',
            display: 'flex', 
            flexDirection: 'column'
          }}>
            {/* タブヘッダー */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 12,
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingSummary(!isEditingSummary)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    color: '#a6adc8',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  <EditIcon size={14} color="#a6adc8" />
                  {isEditingSummary ? 'プレビュー' : '編集'}
                </button>
                {summaryContent !== meeting.aiSummary && (
                  <button
                    style={{ 
                      background: '#00ff88', 
                      color: '#0f0f23', 
                      border: 'none', 
                      borderRadius: 2, 
                      padding: '4px 8px', 
                      fontSize: 10, 
                      fontWeight: 600, 
                      cursor: 'pointer' 
                    }}
                    onClick={handleSaveSummary}
                  >
                    保存
                  </button>
                )}
              </div>
              <button
                style={{
                  ...styles.actionButton,
                  ...(getButtonState('ai_summary').disabled ? styles.actionButtonDisabled : {}),
                  backgroundColor: getButtonBackgroundColor('ai-summary'),
                  color: getButtonTextColor('ai-summary'),
                  opacity: getButtonState('ai_summary').disabled ? 0.6 : 1,
                  cursor: getButtonState('ai_summary').disabled ? 'not-allowed' : 'pointer',
                }}
                onClick={handleAISummaryWithModal}
                disabled={getButtonState('ai_summary').disabled}
              >
                <div style={styles.buttonContent}>
                  <Icon 
                    name={getButtonState('ai_summary').icon} 
                    size={16} 
                    color={getButtonTextColor('ai-summary')}
                    style={{
                      ...(getButtonState('ai_summary').spinning ? { animation: 'spin 1s linear infinite' } : {})
                    }}
                  />
                  <span style={styles.buttonText}>{getButtonState('ai_summary').text}</span>
                </div>
              </button>
            </div>

            {/* 要約エディタ */}
            <div 
              ref={summaryContainerRef}
              style={{
                flex: 1,
                minHeight: 0
              }}>
              {isEditingSummary ? (
                <textarea
                  ref={summaryRef}
                  style={{
                    width: '100%',
                    height: textareaHeight, // 動的に計算した高さを使用
                    maxHeight: '100%', // 親コンテナを超えることを防ぐ
                    background: '#0f0f23',
                    border: '1px solid #333366',
                    borderRadius: 4,
                    padding: 16,
                    color: '#e2e8f0',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'none',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                  }}
                  value={summaryContent}
                  onChange={e => {
                    setSummaryContent(e.target.value);
                  }}
                  placeholder="要約を入力してください（マークダウン形式対応）"
                />
              ) : (
                <div
                  className="markdown-preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#0f0f23',
                    border: '1px solid #333366',
                    borderRadius: 4,
                    padding: 16,
                    overflowY: 'auto',
                    boxSizing: 'border-box',
                  }}
                >
                  <Markdown components={markdownComponents}>
                    {summaryContent || '要約がありません。AI要約ボタンで自動生成するか、手動で入力してください。'}
                  </Markdown>
                </div>
              )}
            </div>
          </div>
        );

      case 'speaker-analysis':
        return (
          <div style={{ 
            height: 'calc(100vh - 330px)',
            display: 'flex', 
            flexDirection: 'column'
          }}>
            <SpeakerAnalysisView 
              meetingId={meeting.id}
              transcript={meeting.transcript || ''}
              onAnalysisComplete={(analysisData) => {
                console.log('話者分析完了:', analysisData);
              }}
              isJobRunning={isJobRunning}
              getButtonState={getButtonState}
            />
          </div>
        );

      case 'test':
        return (
          <div style={{ 
            height: 'calc(100vh - 330px)',
            display: 'flex', 
            flexDirection: 'column'
          }}>
            <SpeakerDiarizationTestPage />
          </div>
        );

      case 'cards':
        return (
          <div style={{ 
            height: 'calc(100vh - 330px)',
            display: 'flex', 
            flexDirection: 'column', 
            position: 'relative'
          }}>
            {/* タブヘッダー */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 12,
              flexShrink: 0
            }}>
              <div style={{ color: '#a6adc8', fontSize: 12, fontWeight: 500 }}>
                {relatedCards.length > 0 ? `${relatedCards.length}個のカード` : 'カードなし'}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* 抽出粒度選択UI */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#e2e8f0'
                }}>
                  <span>抽出粒度:</span>
                  <CustomDropdown
                    value={extractionGranularity}
                    onChange={(value) => {
                      const granularity = value as 'coarse' | 'medium' | 'fine';
                      setExtractionGranularity(granularity);
                      // ローカルストレージに保存
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('meetingDetailPanel_extractionGranularity', granularity);
                      }
                    }}
                    options={[
                      { value: 'coarse', label: 'ざっくり' },
                      { value: 'medium', label: '標準' },
                      { value: 'fine', label: '細かめ' }
                    ]}
                    style={{ minWidth: 100 }}
                  />
                </div>
                
                <button
                  style={{
                    ...styles.actionButton,
                    ...(getButtonState('card_extraction').disabled ? styles.actionButtonDisabled : {}),
                    backgroundColor: getButtonBackgroundColor('card-extraction'),
                    color: getButtonTextColor('card-extraction'),
                    opacity: getButtonState('card_extraction').disabled ? 0.6 : 1,
                    cursor: getButtonState('card_extraction').disabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={handleCardExtractionWithModal}
                  disabled={getButtonState('card_extraction').disabled}
                >
                  <div style={styles.buttonContent}>
                    <Icon 
                      name={getButtonState('card_extraction').icon} 
                      size={16} 
                      color={getButtonTextColor('card-extraction')}
                      style={{
                        ...(getButtonState('card_extraction').spinning ? { animation: 'spin 1s linear infinite' } : {})
                      }}
                    />
                    <span style={styles.buttonText}>{getButtonState('card_extraction').text}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* カード一覧エリア */}
            <div style={{ 
              flex: 1,
              background: '#0f0f23', 
              borderRadius: 4, 
              padding: 16,
              overflowY: 'auto'
            }}>
              {loadingCards ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: 200,
                  color: '#6c7086',
                  fontSize: 13,
                }}>
                  カードを読み込み中...
                </div>
              ) : relatedCards.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  minHeight: 200,
                  color: '#6c7086',
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                  関連カードがありません。<br />
                  カード抽出ボタンで自動生成してください。
                </div>
              ) : (
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                  padding: 4,
                }}>
                  <style>{`
                    .meeting-card-override .card-title {
                      font-weight: 600 !important;
                      font-size: 14px !important;
                      color: #e2e8f0 !important;
                      margin-bottom: 6px !important;
                    }
                    .meeting-card-override .card-content {
                      color: #a6adc8 !important;
                      font-size: 12px !important;
                    }
                    .meeting-card-override .card-meta {
                      font-size: 11px !important;
                      color: #6c7086 !important;
                    }
                    .meeting-card-override .card-links {
                      display: flex !important;
                      flex-wrap: wrap !important;
                      gap: 4px !important;
                      max-width: 100% !important;
                      overflow: hidden !important;
                    }
                    .meeting-card-override .card-link,
                    .meeting-card-override .related-card-link {
                      max-width: 120px !important;
                      white-space: nowrap !important;
                      overflow: hidden !important;
                      text-overflow: ellipsis !important;
                      flex-shrink: 0 !important;
                    }
                  `}</style>
                  {relatedCards.map(card => (
                    <div key={card.id} className="meeting-card-override">
                      <BoardCardWeb
                        card={card}
                        onClick={handleCardClick}
                        onDelete={handleCardDelete}
                        showDeleteButton={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* フローティング新規カード作成ボタン */}
            <button
              style={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#00ff88',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 255, 136, 0.3)',
                zIndex: 10,
                transition: 'all 0.2s',
              }}
              onClick={() => setShowNewCardModal(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 136, 0.3)';
              }}
              title="新しいカードを作成"
            >
              <Icon name="plus" size={24} color="#0f0f23" />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      style={{ 
        padding: '8px 16px 0 16px',
        background: '#0f0f23', 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {renderHeader()}
      {renderBasicInfo}
      {renderTabs()}
      <div 
        style={{ 
          flex: 1, 
          minHeight: 0
        }}
      >
        {renderTabContent()}
      </div>
      
      {/* 削除確認モーダル */}
      <Modal open={isDeleteModalOpen} onClose={handleCancelDelete} style={{ minWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 }}>
          本当にこのカードを削除しますか？
        </div>
        {deleteTargetCardId && (
          <div style={{ 
            fontSize: 12, 
            color: '#a6adc8', 
            marginBottom: 24, 
            padding: 12, 
            background: '#1a1a2e', 
            borderRadius: 4,
            border: '1px solid #333366'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {relatedCards.find(c => c.id === deleteTargetCardId)?.title || 'カードタイトル'}
            </div>
            <div style={{ fontSize: 10, color: '#6c7086' }}>
              ID: {deleteTargetCardId}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <Button
            title="キャンセル"
            variant="default"
            style={{ minWidth: 120 }}
            onPress={handleCancelDelete}
          />
          <Button
            title="削除"
            variant="danger"
            style={{ minWidth: 120 }}
            onPress={handleConfirmDelete}
          />
        </div>
      </Modal>
      
      {/* 新規カード作成モーダル */}
      {showNewCardModal && (
        <CardModal
          open={showNewCardModal}
          onClose={() => setShowNewCardModal(false)}
          onSave={async (card) => {
            try {
              // ボードIDを取得または作成
              let boardId = meeting.nestId;
              if (currentNest?.id) {
                boardId = await getOrCreateDefaultBoard(currentNest.id, meeting.createdBy || 'unknown');
              }

              // 新しいカードを作成
              const newCard = {
                board_id: boardId,
                title: card.title || '',
                content: card.content || '',
                column_type: 'INBOX' as const,
                order_index: 0,
                is_archived: false,
                created_by: meeting.createdBy || 'unknown',
                metadata: {
                  meeting_id: meeting.id,
                  meeting_title: meeting.title,
                  source: 'meeting',
                },
              };
              
              // カードを保存
              const { data: savedCards, error } = await addBoardCards([newCard]);
              
              if (savedCards && savedCards.length > 0) {
                console.log('カード作成完了:', savedCards);
                
                // ミーティングソースを作成または取得
                const meetingSource = await getOrCreateMeetingSource(meeting.id, meeting.title);
                
                // カードとミーティングソースをリンク
                for (const savedCard of savedCards) {
                  await addCardSource({
                    card_id: savedCard.id,
                    source_id: meetingSource.id
                  });
                }
                
                setShowNewCardModal(false);
                await loadRelatedCards();
              } else if (error) {
                console.error('カード作成エラー:', error);
              }
            } catch (error) {
              console.error('カード作成エラー:', error);
            }
          }}
          initialData={{
            title: '',
            content: '',
            column_type: 'INBOX',
            metadata: {
              meeting_id: meeting.id,
              meeting_title: meeting.title,
            }
          }}
          columnType="INBOX"
          setColumnType={() => {}}
          boardId=""
        />
      )}
      
      {/* 編集モーダル（仮） */}
      <CardModal
        open={!!editingCard}
        onClose={handleCloseEditModal}
        onSave={(card) => {
          if (editingCard) {
            // 簡素化された更新
            console.log('Saving edited card:', card);
            handleCloseEditModal();
            loadRelatedCards();
          }
        }}
        initialData={editingCard ? {
          ...editingCard,
          related_cards: editingCard.relatedCards || [],
          related_card_ids: editingCard.relatedCards?.map(rc => rc.id) || [],
          tags: editingCard.metadata?.tags || [],
          sources: editingCard.sources || [],
          createdByDisplayName: editingCard.createdByDisplayName,
          updatedByDisplayName: editingCard.updatedByDisplayName,
          created_at: editingCard.createdAt,
          updated_at: editingCard.updatedAt
        } as any : undefined}
        columnType={editingCard?.columnType as any || 'INBOX'}
        setColumnType={() => {}}
        boardId={editingCard?.boardId || ''}
      />



      {/* 確認モーダル */}
      <ConfirmModal
        open={showConfirmModal}
        {...getConfirmModalConfig()}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </div>
  );
};

export default MeetingDetailPanel;