import React, { useState, useEffect } from 'react';
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
  Modal
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
  
  const [showForm, setShowForm] = useState(false);
  
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
  
  // タブ状態管理
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'cards'>('transcript');
  
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  
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
  const fetchMeetings = async () => {
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
  };

  useEffect(() => {
    if (nestId) fetchMeetings();
  }, [nestId]);
  
  // 新規作成ハンドラ
  const handleCreateMeeting = async (formData: any) => {
    setShowForm(false);
    const now = new Date().toISOString();
    if (!(formData.date instanceof Date) || isNaN(formData.date.getTime())) {
      alert('日時が不正です。正しい形式で入力してください');
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
      alert('ミーティングの保存に失敗しました: ' + error.message);
      return;
    }
    fetchMeetings();
  };
  
  // ミーティング選択
  const handleSelectMeeting = (meeting: MeetingUI) => setSelectedMeeting(meeting);
  
  // ミーティング更新
  const handleUpdateMeeting = async (updates: Partial<MeetingUI>) => {
    if (!selectedMeeting) return;
    
    const updatedMeeting = { ...selectedMeeting, ...updates };
    setSelectedMeeting(updatedMeeting);
    
    // Supabaseに保存
    const { error } = await supabase
      .from('meetings')
      .update({
        title: updatedMeeting.title,
        start_time: updatedMeeting.startTime,
        transcript: updatedMeeting.transcript,
        ai_summary: updatedMeeting.aiSummary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedMeeting.id);
    
    if (error) {
      console.error('ミーティング更新エラー:', error);
      alert('ミーティングの更新に失敗しました: ' + error.message);
      return;
    }
    
    // リストも更新
    fetchMeetings();
  };
  
  // ミーティング削除（ソフトデリート）
  const handleDeleteMeeting = async (meetingId: string) => {
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
    fetchMeetings();
  };
  
  // AI要約生成
  const handleAISummary = async () => {
    if (!selectedMeeting || !selectedMeeting.transcript) {
      alert('文字起こしファイルがアップロードされていません。');
      return;
    }
    
    try {
      let summary: string;
      // 常にEdge Function経由でAI要約を生成
      summary = await generateMeetingSummary(selectedMeeting.transcript);
      await handleUpdateMeeting({ aiSummary: summary });
      alert('AI要約を生成しました。');
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      alert('AI要約の生成に失敗しました: ' + (error as Error).message);
    }
  };
  
  // カード抽出
  const handleCardExtraction = async () => {
    if (!selectedMeeting || !selectedMeeting.transcript || selectedMeeting.transcript.trim() === '') {
      alert('文字起こしファイルがアップロードされていません。');
      return;
    }
    
    if (!user?.id) {
      alert('ユーザー情報が取得できません。');
      return;
    }
    
    try {
      let extractedCards: any[];
      
      // OpenAI APIキーがある場合は実際のカード抽出を実行
      extractedCards = await extractCardsFromMeeting(selectedMeeting.id);
      
      if (extractedCards.length > 0) {
        // デフォルトボードを取得または作成
        const boardId = await getOrCreateDefaultBoard(nestId, user.id);
        
        // カードをボードに追加
        const savedCards = await addCardsToBoard(
          boardId,
          extractedCards,
          user.id,
          selectedMeeting.id
        );
        
        // --- ここで出典紐付け ---
        try {
          const meetingSource = await getOrCreateMeetingSource(selectedMeeting.id, selectedMeeting.title);
          await Promise.all(savedCards.map(card => addCardSource({ card_id: card.id, source_id: meetingSource.id })));
        } catch (err) {
          console.error('出典紐付けエラー:', err);
        }
        // --- ここまで追加 ---
        const cardCount = savedCards.length;
        const cardTypes = extractedCards.map(card => card.type).join(', ');
        
        alert(`${cardCount}個のカードを抽出し、ボードに追加しました。\n\nカード種類: ${cardTypes}\n\n※ ボードスペースでカードを確認できます。`);
        
        console.log('ボードに追加されたカード:', savedCards);
      } else {
        alert('カードを抽出できませんでした。');
      }
    } catch (error) {
      console.error('カード抽出エラー:', error);
      alert('カード抽出に失敗しました: ' + (error as Error).message);
    }
  };
  
  // ファイルアップロード
  const handleFileUpload = async (file: File) => {
    if (!selectedMeeting) return;
    
    try {
      // ファイル内容を読み取り
      const text = await file.text();
      await handleUpdateMeeting({ transcript: text });
      alert('ファイルをアップロードしました。');
    } catch (error) {
      console.error('ファイルアップロードエラー:', error);
      alert('ファイルのアップロードに失敗しました。');
    }
  };
  
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
          <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{item.title || '無題ミーティング'}</div>
          <div style={{ color: '#64b5f6', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>
            {item.startTime ? new Date(item.startTime).toLocaleString() : ''}
          </div>
          {item.createdBy && (
            <div style={{ color: '#a6adc8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
              作成者: {creatorDisplayName}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {item.tags && item.tags.map((tag, i) => <Tag key={i}>{tag}</Tag>)}
            {item.transcript ? (
              <StatusBadge status="active">Uploaded</StatusBadge>
            ) : (
              <StatusBadge status="inactive">文字起こしなし</StatusBadge>
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
            {/* 左カラム：ミーティングリスト＋新規追加 */}
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
                  onClick={() => setShowForm(true)}
                  disabled={false}
                >
                  <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                  新規ミーティング
                </button>
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
    
    // タブレット/デスクトップの全画面レイアウト
    if ((isTablet || isDesktop)) {
      return (
        <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
            {/* 左カラム：ミーティングリスト＋新規追加 */}
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
                  onClick={() => setShowForm(true)}
                  disabled={false}
                >
                  <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                  新規ミーティング
                </button>
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
          {/* 左カラム：ミーティングリスト＋新規追加 */}
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
                onClick={() => setShowForm(true)}
                disabled={false}
              >
                <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                新規ミーティング
              </button>
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
              <MeetingForm onSubmit={handleCreateMeeting} onCancel={() => setShowForm(false)} />
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