import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MeetingUI } from '../../../meeting-space/types/meeting';
import Tag from '../../../../components/ui/Tag';
import StatusBadge from '../../../../components/ui/StatusBadge';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import Icon from '../../../../components/ui/Icon';
import Markdown from 'react-markdown';
import { getCardsByMeeting, deleteCard, getOrCreateMeetingSource, addCardSource } from '../../../../services/BoardService';
import { BoardCardUI } from '../../../../types/board';
import BoardCardWeb from '../../../board-space/components/BoardCardWeb';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../../components/ui/Modal';
import { useBoardSpace } from '../../board-space/hooks/useBoardSpace';
import { toBoardCardUI } from '../../../../types/board';
import { CardModal } from '../../../board-space/components/BoardSpace';
import MiniCalendar from '../../../../components/ui/MiniCalendar';
import TimeSelect from '../../../../components/ui/TimeSelect';
import { getUserById, UserInfo } from '../../../../services/UserService';

interface MeetingDetailPanelProps {
  meeting: MeetingUI;
  activeTab: 'transcript' | 'summary' | 'cards';
  onTabChange: (tab: 'transcript' | 'summary' | 'cards') => void;
  onSaveMeeting?: (meeting: Partial<MeetingUI>) => void;
  onAISummary?: () => void;
  onCardExtraction?: () => void;
  onFileUpload?: (file: File) => void;
  isCardExtractionDisabled?: boolean;
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
  ul: (props: any) => <ul {...props} style={{ color: '#a6adc8', paddingLeft: '1.5em' }} />,
  ol: (props: any) => <ol {...props} style={{ color: '#a6adc8', paddingLeft: '1.5em' }} />,
  li: (props: any) => <li {...props} style={{ marginBottom: '0.25em' }} />,
  blockquote: (props: any) => <blockquote {...props} style={{ borderLeft: '4px solid #333366', paddingLeft: '1em', margin: '1em 0', color: '#6c7086' }} />,
  code: (props: any) => <code {...props} style={{ backgroundColor: '#333366', color: '#00ff88', padding: '0.2em 0.4em', borderRadius: '2px', fontFamily: 'JetBrains Mono, monospace' }} />,
  pre: (props: any) => <pre {...props} style={{ backgroundColor: '#0f0f23', color: '#e2e8f0', padding: '1em', borderRadius: '4px', overflow: 'auto', fontFamily: 'JetBrains Mono, monospace' }} />,
};

const MeetingDetailPanel: React.FC<MeetingDetailPanelProps> = ({
  meeting,
  activeTab,
  onTabChange,
  onSaveMeeting,
  onAISummary,
  onCardExtraction,
  onFileUpload,
  isCardExtractionDisabled = false,
  onDeleteMeeting,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDateTime, setIsEditingDateTime] = useState(false);
  const [editedTitle, setEditedTitle] = useState(meeting.title || '');
  const [editedDateTime, setEditedDateTime] = useState(meeting.startTime || '');
  const [isEditingSummary, setIsEditingSummary] = useState(true);
  const [summaryContent, setSummaryContent] = useState(meeting.aiSummary || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const [relatedCards, setRelatedCards] = useState<BoardCardUI[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const navigate = useNavigate();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetCardId, setDeleteTargetCardId] = useState<string | null>(null);
  const { deleteCard, updateCard, allCards, addCards } = useBoardSpace();
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

  const loadRelatedCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const cards = await getCardsByMeeting(meeting.id);
      console.log('[MeetingDetailPanel] loadRelatedCards result:', cards);
      console.log('[MeetingDetailPanel] Cards with related cards:', cards.map(c => ({ 
        id: c.id, 
        title: c.title, 
        relatedCount: c.relatedCards?.length || 0,
        relatedCards: c.relatedCards 
      })));
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

  const handleSaveTitle = useCallback(() => {
    if (onSaveMeeting) {
      onSaveMeeting({ title: editedTitle });
    }
    setIsEditingTitle(false);
  }, [onSaveMeeting, editedTitle]);

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
    setDeleteTargetCardId(cardId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTargetCardId) {
      try {
        await deleteCard(deleteTargetCardId);
        await loadRelatedCards();
      } catch (error) {
        console.error('カード削除エラー:', error);
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

  const handleSaveEditCard = (card: BoardCardUI) => {
    // BoardCardUIからBoardItemへの変換
    const boardItem = {
      ...card,
      sources: card.sources?.map(source => ({
        ...source,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) || [],
    };
    updateCard(boardItem);
    setEditingCard(null);
  };

  // AI要約処理のハンドラー
  const handleAISummaryWithModal = async () => {
    setIsAISummaryLoading(true);
    try {
      if (onAISummary) {
        await onAISummary();
      }
      setAiSummaryCompleted(true);
    } catch (error) {
      console.error('AI要約生成エラー:', error);
    } finally {
      setIsAISummaryLoading(false);
    }
  };

  // カード抽出処理のハンドラー
  const handleCardExtractionWithModal = async () => {
    setIsCardExtractionLoading(true);
    try {
      if (onCardExtraction) {
        await onCardExtraction();
      }
      // カード抽出後にリロードして新しいカードを取得
      await loadRelatedCards();
      // リロード後のカードを抽出完了モーダルで表示するために状態を更新
      setCardExtractionCompleted(true);
    } catch (error) {
      console.error('カード抽出エラー:', error);
    } finally {
      setIsCardExtractionLoading(false);
    }
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
          { key: 'summary' as const, label: '要約' },
          { key: 'cards' as const, label: '関連カード' },
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
      <div style={{ marginBottom: 24, padding: '8px 0 20px 0', borderBottom: '1px solid #333366', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* タイトル（ラベル省略、直接表示） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, color: '#e2e8f0', padding: '4px 0', cursor: 'pointer' }} onClick={() => setIsEditingTitle(true)}>
          <span>{meeting.title || '無題ミーティング'}</span>
          <EditIcon size={14} color="#a6adc8" />
        </div>
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
              padding: '8px 16px',
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.5, padding: '0 0 0 2px' }}>
        {meeting.title || '無題ミーティング'}
      </div>
      {onDeleteMeeting && (
        <button
          style={{
            background: '#1a1a2e',
            color: '#ff6b6b',
            border: '1px solid #333366',
            borderRadius: 2,
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 36,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginLeft: 12,
          }}
          onClick={() => setShowDeleteConfirm(true)}
          title="ミーティングを削除"
        >
          <Icon name="delete" size={18} color="#ff6b6b" style={{ margin: 0, verticalAlign: 'middle' }} />
        </button>
      )}
      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} style={{ minWidth: 360, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 32, textAlign: 'center', letterSpacing: 0.5 }}>
            本当にこのミーティングを削除しますか？
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              background: '#0f0f23', 
              border: '1px solid #333366', 
              borderRadius: 4, 
              padding: 16, 
              color: '#a6adc8', 
              fontSize: 13, 
              lineHeight: 1.6,
              fontFamily: 'inherit',
              maxHeight: 400,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {meeting.transcript || '文字起こしファイルがアップロードされていません。'}
            </div>
          </div>
        );

      case 'summary':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* タブヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
                  background: '#333366', 
                  color: '#e2e8f0', 
                  border: 'none', 
                  borderRadius: 2, 
                  padding: '8px 16px', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                onClick={handleAISummaryWithModal}
              >
                <Icon name="ai-summary" size={14} color="#e2e8f0" />
                AI要約
              </button>
            </div>

            {/* 要約エディタ */}
            {isEditingSummary ? (
              <textarea
                ref={summaryRef}
                style={{
                  flex: 1,
                  background: '#0f0f23',
                  border: '1px solid #333366',
                  borderRadius: 4,
                  padding: 16,
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'none',
                  minHeight: '40vh',
                  maxHeight: '70vh',
                  height: '100%',
                  lineHeight: 1.6,
                }}
                value={summaryContent}
                onChange={e => {
                  setSummaryContent(e.target.value);
                  if (summaryRef.current) {
                    summaryRef.current.style.height = 'auto';
                    summaryRef.current.style.height = (summaryRef.current.scrollHeight || 200) + 'px';
                  }
                }}
                placeholder="要約を入力してください（マークダウン形式対応）"
              />
            ) :
              <div
                className="markdown-preview"
                style={{
                  flex: 1,
                  background: '#0f0f23',
                  border: '1px solid #333366',
                  borderRadius: 4,
                  padding: 16,
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  minHeight: '40vh',
                }}
              >
                <Markdown components={markdownComponents}>
                  {summaryContent || '要約がありません。AI要約ボタンで自動生成するか、手動で入力してください。'}
                </Markdown>
              </div>
            }
          </div>
        );

      case 'cards':
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* タブヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ color: '#a6adc8', fontSize: 12, fontWeight: 500 }}>
                {relatedCards.length > 0 ? `${relatedCards.length}個のカード` : 'カードなし'}
              </div>
              <button
                style={{ 
                  background: '#333366', 
                  color: '#e2e8f0', 
                  border: 'none', 
                  borderRadius: 2, 
                  padding: '8px 16px', 
                  fontSize: 12, 
                  fontWeight: 600, 
                  cursor: isCardExtractionDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isCardExtractionDisabled ? 0.5 : 1,
                }}
                onClick={() => {
                  if (isCardExtractionDisabled) {
                    // alert削除: デザインシステムのモーダルに置き換え済み
                    return;
                  }
                  if (onCardExtraction) handleCardExtractionWithModal();
                }}
                disabled={isCardExtractionDisabled}
              >
                <Icon name="card-extract" size={14} color="#e2e8f0" />
                カード抽出
              </button>
            </div>

            {/* カード一覧エリア */}
            <div style={{ 
              flex: 1, 
              background: '#0f0f23', 
              border: '1px solid #333366', 
              borderRadius: 4, 
              padding: 16,
              minHeight: 200,
              maxHeight: 400,
              overflowY: 'auto',
            }}>
              {loadingCards ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
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
                  height: '100%',
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
    <div style={{ padding: '12px 32px 0 32px', background: '#0f0f23', minHeight: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {renderHeader()}
      {renderBasicInfo}
      {renderTabs()}
      <div style={{ flex: 1, minHeight: 0, marginTop: 12 }}>{renderTabContent()}</div>
      
      {/* 削除確認モーダル */}
      <Modal open={isDeleteModalOpen} onClose={handleCancelDelete} style={{ minWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 32, textAlign: 'center', letterSpacing: 0.5 }}>
          本当にこのカードを削除しますか？
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <Button
            title="キャンセル"
            variant="default"
            style={{ minWidth: 120 }}
            onPress={handleCancelDelete}
          />
          <Button
            title="削除"
            variant="primary"
            style={{ minWidth: 120 }}
            onPress={handleConfirmDelete}
          />
        </div>
      </Modal>
      
      {/* AI要約処理中モーダル */}
      {isAISummaryLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}>
            {/* スピナー */}
            <div style={{
              width: '60px',
              height: '60px',
              border: '3px solid #333366',
              borderTop: '3px solid #ffa500',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }} />
            
            <div style={{
              color: '#ffa500',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              AI要約生成中
            </div>
            
            <div style={{
              color: '#a6adc8',
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '24px',
            }}>
              ミーティング内容を分析して要約を生成しています...
            </div>
            
            <div style={{
              color: '#6c7086',
              fontSize: '12px',
              fontStyle: 'italic',
            }}>
              処理を中断しないでください...
            </div>
          </div>
        </div>
      )}

      {/* AI要約完了モーダル */}
      {aiSummaryCompleted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '480px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              color: '#00ff88',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              AI要約が完了しました
            </div>
            
            <div style={{
              color: '#a6adc8',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}>
              ミーティングの要約が正常に生成されました。要約タブで内容を確認できます。
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                style={{
                  background: '#00ff88',
                  border: '1px solid #00ff88',
                  borderRadius: '4px',
                  color: '#0f0f23',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                onClick={() => setAiSummaryCompleted(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#00cc6a';
                  e.currentTarget.style.borderColor = '#00cc6a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#00ff88';
                  e.currentTarget.style.borderColor = '#00ff88';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カード抽出処理中モーダル */}
      {isCardExtractionLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}>
            {/* スピナー */}
            <div style={{
              width: '60px',
              height: '60px',
              border: '3px solid #333366',
              borderTop: '3px solid #9c27b0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }} />
            
            <div style={{
              color: '#9c27b0',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              カード抽出中
            </div>
            
            <div style={{
              color: '#a6adc8',
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '24px',
            }}>
              ミーティング内容を分析してカードを抽出しています...
            </div>
            
            <div style={{
              color: '#6c7086',
              fontSize: '12px',
              fontStyle: 'italic',
            }}>
              処理を中断しないでください...
            </div>
          </div>
        </div>
      )}

      {/* カード抽出完了モーダル */}
      {cardExtractionCompleted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '8px',
            padding: '32px',
            maxWidth: '480px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              color: '#00ff88',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              カード抽出が完了しました
            </div>
            
            <div style={{
              color: '#a6adc8',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '16px',
            }}>
              {relatedCards.length > 0 ? `${relatedCards.length}個のカードが抽出されました:` : 'カードが抽出されました。'}
            </div>

            {/* 抽出されたカードのタイトルリスト */}
            {relatedCards.length > 0 && (
              <div style={{
                background: '#0f0f23',
                border: '1px solid #333366',
                borderRadius: '4px',
                padding: '16px',
                marginBottom: '24px',
                maxHeight: '200px',
                overflowY: 'auto',
              }}>
                {relatedCards.map((card, index) => (
                  <div key={card.id} style={{
                    color: '#e2e8f0',
                    fontSize: '13px',
                    padding: '4px 0',
                    borderBottom: index < relatedCards.length - 1 ? '1px solid #333366' : 'none',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    • {card.title || '無題のカード'}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                style={{
                  background: '#00ff88',
                  border: '1px solid #00ff88',
                  borderRadius: '4px',
                  color: '#0f0f23',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                onClick={() => setCardExtractionCompleted(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#00cc6a';
                  e.currentTarget.style.borderColor = '#00cc6a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#00ff88';
                  e.currentTarget.style.borderColor = '#00ff88';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      {/* スピナーアニメーション用のスタイル */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      {/* 新規カード作成モーダル */}
      {showNewCardModal && (
        <CardModal
          open={showNewCardModal}
          onClose={() => setShowNewCardModal(false)}
          onSave={async (card) => {
            try {
              // 新しいカードを作成
              const newCard = {
                id: crypto.randomUUID(),
                board_id: meeting.nestId,
                title: card.title || '',
                description: card.content || '',
                content: card.content || '',
                column_type: 'INBOX' as const,
                order_index: 0,
                is_archived: false,
                created_by: meeting.createdBy || 'unknown',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                  meeting_id: meeting.id,
                  meeting_title: meeting.title,
                  source: 'meeting',
                },
                tags: ['ミーティング', meeting.title],
              };
              
              // カードを保存
              await addCards([newCard]);
              
              setShowNewCardModal(false);
              await loadRelatedCards();
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
    </div>
  );
};

export default MeetingDetailPanel;