import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList, useWindowDimensions, Animated, Easing, Dimensions, Alert, Platform } from 'react-native';
import theme from '../../../styles/theme';
import { useChat } from '../../../contexts/ChatContext';
import { Channel, Message } from '../../../types/chat';
import { useAuth } from '@contexts/AuthContext';
import { useNest } from '../../nest/contexts/NestContext';
import { createPortal } from 'react-dom';
// import { useBoardContext } from '../../../features/board-space/contexts/BoardContext';
import { SUPABASE_FUNCTION_URL } from '../../../constants/config';
import { useChatToBoard } from '../../../hooks/useChatToBoard';
// import { useNestSpace } from '../../nest-space/contexts/_NestSpaceContext';
import { useNestSpace } from '@contexts/NestSpaceContext';
import CommonButton from '../../../components/CommonButton';
import ChatMessage from '../../../components/ChatMessage';
import ChatInput from '../../../components/ChatInput';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';

console.log('ChatSpace.tsx loaded!');

interface ChatSpaceProps {
  nestId: string;
  // 必要に応じて他のpropsを追加
}

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
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
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'mail':
      return (
        <>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </>
      );
    case 'send':
      return (
        <>
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </>
      );
    case 'hash':
      return (
        <>
          <line x1="4" y1="9" x2="20" y2="9"></line>
          <line x1="4" y1="15" x2="20" y2="15"></line>
          <line x1="10" y1="3" x2="8" y2="21"></line>
          <line x1="16" y1="3" x2="14" y2="21"></line>
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </>
      );
    case 'unlock':
      return (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </>
      );
    case 'more-vertical':
      return (
        <>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </>
      );
    case 'trash':
      return (
        <>
          <path d="M3 6h18"></path>
          <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"></path>
          <path d="M10 11v6"></path>
          <path d="M14 11v6"></path>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

// チャネル作成モーダル
type CreateChannelModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, desc: string) => void;
};

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ visible, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = () => {
    if (!name.trim()) {
      setError('チャネル名を入力してください');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      onSubmit(name.trim(), desc.trim());
      setName('');
      setDesc('');
      onClose();
    } catch (e) {
      setError('作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.modal}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>新しいチャネルを作成</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn} accessibilityLabel="閉じる">
              <Text style={modalStyles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={modalStyles.body}>
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.label}>チャネル名</Text>
              <TextInput
                style={[modalStyles.input, error ? modalStyles.inputError : null]}
                value={name}
                onChangeText={setName}
                placeholder="例: プロジェクト計画"
                placeholderTextColor="#6c7086"
                autoFocus
              />
              {error && <Text style={modalStyles.error}>{error}</Text>}
            </View>
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.label}>説明（任意）</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                value={desc}
                onChangeText={setDesc}
                placeholder="このチャネルの目的や用途を説明してください"
                placeholderTextColor="#6c7086"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          <View style={modalStyles.footer}>
            <CommonButton
              variant="default"
              onPress={onClose}
              disabled={isCreating}
            >
              キャンセル
            </CommonButton>
            <CommonButton
              variant="primary"
              onPress={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? '作成中...' : '作成'}
            </CommonButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 4,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#333366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#45475a',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 2,
  },
  closeText: {
    color: '#a6adc8',
    fontSize: 18,
  },
  body: {
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  footer: {
    backgroundColor: '#333366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#45475a',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: '#0f0f23',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'System', android: 'System', default: 'sans-serif' }),
    marginBottom: 2,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 60,
    maxHeight: 120,
  },
});

/**
 * チャット空間コンポーネント
 * 
 * チャネルごとに直接メッセージのやり取りを行える
 */
const ChatSpace: React.FC<ChatSpaceProps> = ({ nestId }) => {
  const { currentNest, setCurrentNestById, loading } = useNest();
  const { spaceState } = useNestSpace();
  React.useEffect(() => {
    if (nestId && (!currentNest || nestId !== currentNest.id)) {
      setCurrentNestById(nestId);
    }
  }, [nestId, currentNest, setCurrentNestById]);

  if (!currentNest || nestId !== currentNest.id) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f23' }}>
        <Text style={{ color: '#00ff88', fontSize: 18 }}>NEST情報を取得中...</Text>
      </View>
    );
  }
  console.log('ChatSpace mounted!');
  const scrollViewRef = useRef<ScrollView>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [showChannelList, setShowChannelList] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  // アニメーション用
  const windowHeight = Dimensions.get('window').height;
  const channelListAnim = useRef(new Animated.Value(-windowHeight)).current; // 初期は画面外上部
  
  // ChatContextからチャット関連の状態と機能を取得
  const { 
    chatRooms, 
    messages, 
    activeChatRoomId, 
    setActiveChatRoom, 
    sendMessage: sendChatMessage,
    isPocoTyping,
    extractAndSaveInsights,
    isExtractingInsights,
    createChatRoom,
    isChatRoomsLoaded,
    deleteChatRoom
  } = useChat();
  
  // const { addCards } = useBoardContext();

  // チャットルームのロード完了後、activeChatRoomIdが未設定なら自動で最初のルームを選択
  useEffect(() => {
    if (isChatRoomsLoaded && chatRooms.length > 0 && !activeChatRoomId) {
      setActiveChatRoom(chatRooms[0].id);
    }
  }, [isChatRoomsLoaded, chatRooms, activeChatRoomId, setActiveChatRoom]);

  // ローディング中はローディングUIを表示
  console.log('isChatRoomsLoaded:', isChatRoomsLoaded);
  if (!isChatRoomsLoaded) {
    console.log('returning loading...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' }}>
        <Text style={{ fontSize: 18, color: '#4a6da7' }}>チャットルームを読み込み中...</Text>
      </View>
    );
  }
  console.log('passed loading check');
  
  // 現在選択されているチャネル情報
  const currentChannel = chatRooms.find(room => String(room.id) === String(activeChatRoomId));
  
  // 現在のチャネルのメッセージ一覧
  const currentMessages = activeChatRoomId ? messages[activeChatRoomId] || [] : [];
  console.log('currentMessages:', currentMessages);
  // AI分析用のMessage[]に変換
  const aiMessages = currentMessages.map(msg => ({
    id: msg.id,
    text: msg.content,
    userId: msg.sender?.id || 'unknown',
    userName: msg.sender?.name || 'User',
    timestamp: msg.created_at,
  }));

  // メッセージ送信時に自動スクロール
  useEffect(() => {
    if (scrollViewRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [currentMessages.length]);

  // メッセージ送信ハンドラー
  const handleSendMessage = async (message: string) => {
    if (!activeChatRoomId) return;
    await sendChatMessage(message);
  };

  // インサイト抽出ハンドラー
  const handleExtractInsights = async () => {
    if (!activeChatRoomId) return;
    await extractAndSaveInsights(activeChatRoomId);
  };

  // チャネル追加ハンドラー
  const handleAddChannel = () => {
    setCreateModalVisible(true);
  };

  const handleCreateChannel = async (name: string, desc: string) => {
    setCreateModalVisible(false);

    let chatSpaceId: string | undefined = undefined;

    // 1. activeSpaceTypeで現在のspaceを特定し、そのidを使う
    if (spaceState?.activeSpaceType && Array.isArray(spaceState.availableSpaces)) {
      const activeSpace = spaceState.availableSpaces.find(
        (s: any) => s.type === spaceState.activeSpaceType
      );
      if (activeSpace) chatSpaceId = activeSpace.id;
    }

    // 2. availableSpacesからtype: 'chat'を探す
    if (!chatSpaceId && Array.isArray(spaceState?.availableSpaces)) {
      const chatSpace = spaceState.availableSpaces.find((s: any) => s.type === 'chat');
      if (chatSpace) chatSpaceId = chatSpace.id;
    }

    // 3. chatRoomsが存在する場合はそこからspaceIdを使う
    if (!chatSpaceId && chatRooms && chatRooms.length > 0 && chatRooms[0].spaceId) {
      chatSpaceId = chatRooms[0].spaceId;
    }

    if (!chatSpaceId) {
      alert('チャット空間のspaceIdが見つかりません。管理者にご連絡ください。');
      return;
    }

    await createChatRoom(chatSpaceId, name, desc);
  };

  // チャネルアイテムをレンダリング
  const renderChannelItem = ({ item }: { item: typeof chatRooms[0] }) => {
    const isActive = activeChatRoomId === item.id;
    const isPublic = item.name !== 'プロジェクトアイデア'; // 仮の実装
    
    return (
      <TouchableOpacity
        style={[
          styles.channelItem,
          isActive && styles.activeChannelItem
        ]}
        onPress={() => setActiveChatRoom(item.id)}
      >
        <View style={styles.channelIconContainer}>
          <Icon 
            name={isPublic ? 'hash' : 'lock'} 
            size={16} 
            color={isActive ? theme.colors.primary : theme.colors.text.secondary} 
          />
        </View>
        
        <View style={styles.channelInfo}>
          <Text style={[
            styles.channelName,
            isActive && styles.activeChannelName
          ]}>
            {item.name}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // メッセージ表示コンポーネント
  const { user } = useAuth();
  const ChatMessageItem = ({ message, user }: { message: typeof currentMessages[0], user: any }) => {
    const isSelf = message.sender.id === user?.id;
    const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageRow, isSelf && styles.selfMessageRow]}>
        {!isSelf && (
          <View style={styles.messageAvatar}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=32' }} 
              style={styles.avatar} 
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {/* 自分以外はユーザー名をバブルの上に表示 */}
          {!isSelf && (
            <Text style={styles.messageAuthor}>{message.sender.name}</Text>
          )}
          <View 
            style={[
              styles.messageBubble,
              isSelf ? styles.selfBubble : styles.otherBubble
            ]}
          >
            <Text style={styles.messageText}>{message.content}</Text>
            {/* タイムスタンプは常にバブル内右下 */}
            <Text style={[styles.timestamp, { alignSelf: 'flex-end', marginTop: 4 }]}>{timestamp}</Text>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (isMobile && showChannelList) {
      // モーダル表示時に上から下へスライドイン
      channelListAnim.setValue(-windowHeight);
      Animated.timing(channelListAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [showChannelList, isMobile, channelListAnim, windowHeight]);

  // メニュー表示用の状態
  const [menuVisible, setMenuVisible] = useState(false);
  const menuButtonRef = useRef<any>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const openMenu = () => {
    if (typeof window !== 'undefined' && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const menuWidth = 200;
      let left = rect.left + window.scrollX;
      let top = rect.bottom + window.scrollY;
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 8;
      }
      if (left < 0) left = 8;
      if (top < 0) top = 40;
      const pos = { top, left };
      console.log('[openMenu] menuPos:', pos);
      setMenuPos(pos);
    }
    setMenuVisible(true);
  };

  // メニューが開いた直後にログ
  if (menuVisible && typeof window !== 'undefined') {
    console.log('Menu opened!');
  }

  const handleDeleteRoom = () => {
    if (!currentChannel) return;
    Alert.alert(
      'チャットルームを削除',
      `「${currentChannel.name}」を本当に削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: async () => {
          await deleteChatRoom(currentChannel.id);
          setMenuVisible(false);
        }},
      ]
    );
  };

  // チャネル切り替え時にメニューを自動で閉じる
  useEffect(() => {
    setMenuVisible(false);
  }, [activeChatRoomId, nestId]);

  // デバッグ用ログ
  console.log('chatRooms:', chatRooms);
  console.log('activeChatRoomId:', activeChatRoomId);
  console.log('currentChannel:', currentChannel);

  // チャット→ボード連携の設定
  const [analyzeResult, setAnalyzeResult] = useState<any[] | null>(null);
  const [showAnalyzeResultModal, setShowAnalyzeResultModal] = useState(false);
  const [analyzeWarning, setAnalyzeWarning] = useState<string | null>(null);
  const [showAnalyzeTooltip, setShowAnalyzeTooltip] = useState(false);

  const { status, startAnalysis, insights } = useChatToBoard({
    channelId: currentChannel?.id || '',
    messages: aiMessages,
    enabled: true,
    onNewInsightsGenerated: (newInsights) => {
      setAnalyzeResult(newInsights);
      setShowAnalyzeResultModal(true);
    },
  });

  // 分析ボタン押下時のハンドラ
  const handleAnalyzeClick = async () => {
    console.log('[ChatSpace] handleAnalyzeClick called');
    const warn = await startAnalysis();
    if (warn) {
      setAnalyzeWarning(warn);
      setShowAnalyzeResultModal(true);
    } else if (status.lastError) {
      setAnalyzeWarning(status.lastError.message || 'AI分析でエラーが発生しました');
      setShowAnalyzeResultModal(true);
    }
  };

  // status.isAnalyzingの変化を監視
  useEffect(() => {
    console.log('[ChatSpace] status.isAnalyzing:', status.isAnalyzing);
  }, [status.isAnalyzing]);

  // --- 削除確認モーダル用 state ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // --- メニュー外クリックで閉じる ---
  useEffect(() => {
    if (!menuVisible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)) {
        setMenuVisible(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [menuVisible]);

  // --- 新規チャネル作成フォーム state ---
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelError, setNewChannelError] = useState<string | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  const handleCreateChannelWeb = async () => {
    if (!newChannelName.trim()) {
      setNewChannelError('チャネル名を入力してください');
      return;
    }
    setIsCreatingChannel(true);
    setNewChannelError(null);
    try {
      await handleCreateChannel(newChannelName.trim(), newChannelDesc.trim());
      setNewChannelName('');
      setNewChannelDesc('');
      setCreateModalVisible(false);
    } catch (e) {
      setNewChannelError('作成に失敗しました');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  // --- グローバルクリック監視 ---
  useEffect(() => {
    const handler = e => {
      console.log('window click', e.target);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <>
        {/* 分析進行中モーダル */}
        <Modal open={status.isAnalyzing} onClose={() => {}} title="AI分析中...">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, minWidth: 240 }}>
            <Spinner size={48} strokeWidth={6} />
            <div style={{ fontSize: 15, color: '#a6adc8', textAlign: 'center', fontWeight: 400 }}>しばらくお待ちください</div>
          </div>
        </Modal>
        {/* 分析完了モーダル */}
        <Modal open={showAnalyzeResultModal} onClose={() => { setShowAnalyzeResultModal(false); setAnalyzeWarning(null); }} title="分析完了">
          {analyzeWarning ? (
            <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center', fontWeight: 500, marginBottom: 18 }}>{analyzeWarning}</div>
          ) : analyzeResult && analyzeResult.length > 0 ? (
            <>
              <div style={{ marginBottom: 10, color: '#a6adc8', fontSize: 14, fontWeight: 400 }}>追加されたカード数: <b style={{ color: '#00ff88', fontSize: 15 }}>{analyzeResult.length}</b></div>
              <ul style={{ marginBottom: 14, padding: 0, listStyle: 'none', maxHeight: 140, overflow: 'auto', width: '100%' }}>
                {analyzeResult.map(card => (
                  <li key={card.id} style={{ fontSize: 14, color: '#e2e8f0', background: '#23243a', borderRadius: 4, padding: '8px 10px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" style={{ marginRight: 4 }}><rect x="4" y="4" width="16" height="16" rx="3" fill="#00ff88" opacity="0.18" /><rect x="7" y="7" width="10" height="10" rx="2" fill="#00ff88" opacity="0.38" /></svg>
                    <span style={{ flex: 1 }}>{card.title}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div style={{ marginBottom: 14, color: '#a6adc8', fontSize: 14, fontWeight: 400 }}>カードは抽出されませんでした。</div>
          )}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <Button
              title="OK"
              variant="primary"
              size="md"
              onPress={() => { setShowAnalyzeResultModal(false); setAnalyzeWarning(null); }}
              style={{ minWidth: 96 }}
            />
          </div>
        </Modal>
        {/* --- 新規チャネル作成モーダル（Web用） --- */}
        <Modal open={createModalVisible} onClose={() => setCreateModalVisible(false)} title="新しいチャネルを作成">
          <div style={{ minWidth: 320, maxWidth: 420 }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>チャネル名</div>
              <input
                style={{
                  width: '100%',
                  background: '#0f0f23',
                  border: `1px solid ${newChannelError ? '#ff6b6b' : '#333366'}`,
                  borderRadius: 2,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  marginBottom: 2,
                  outline: 'none',
                }}
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="例: プロジェクト計画"
                autoFocus
              />
              {newChannelError && <div style={{ color: '#ff6b6b', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{newChannelError}</div>}
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>説明（任意）</div>
              <textarea
                style={{
                  width: '100%',
                  minHeight: 60,
                  maxHeight: 120,
                  background: '#0f0f23',
                  border: '1px solid #333366',
                  borderRadius: 2,
                  padding: '8px 12px',
                  color: '#e2e8f0',
                  fontSize: 13,
                  marginBottom: 2,
                  outline: 'none',
                  resize: 'vertical',
                }}
                value={newChannelDesc}
                onChange={e => setNewChannelDesc(e.target.value)}
                placeholder="このチャネルの目的や用途を説明してください"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <Button
                title="キャンセル"
                variant="default"
                size="md"
                onPress={() => setCreateModalVisible(false)}
                style={{ minWidth: 96 }}
                disabled={isCreatingChannel}
              />
              <Button
                title={isCreatingChannel ? '作成中...' : '作成'}
                variant="primary"
                size="md"
                onPress={handleCreateChannelWeb}
                style={{ minWidth: 96 }}
                disabled={!newChannelName.trim() || isCreatingChannel}
              />
            </div>
          </div>
        </Modal>
        {/* --- メニュー本体をPortalで描画 --- */}
        {menuVisible && typeof window !== 'undefined' && (() => {
          console.log('メニューJSX描画！');
          return (
            <div
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                minWidth: 180,
                background: 'rgba(0,255,0,0.15)', // デバッグ用: 緑
                border: '1px solid #333366',
                borderRadius: 4,
                zIndex: 99999, // 極端に上げる
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                padding: 0,
                pointerEvents: 'auto', // 明示的に
              }}
            >
              <button
                key={menuVisible ? 'menu-open' : 'menu-closed'}
                ref={el => { if (el) console.log('button mounted', el); }}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: 14,
                  borderBottom: '1px solid #333366',
                  background: 'rgba(255,0,0,0.2)', // デバッグ用: 赤
                  border: 'none',
                  textAlign: 'left',
                }}
                onClick={e => {
                  console.log('onClick fired');
                  alert('削除クリック');
                  console.log('チャネルを削除クリック');
                  setShowDeleteConfirm(true);
                  setMenuVisible(false);
                }}
              >
                チャネルを削除
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontSize: 14,
                  borderBottom: '1px solid #333366',
                  background: 'rgba(0,0,255,0.2)', // デバッグ用: 青
                  border: 'none',
                  textAlign: 'left',
                }}
                onClick={() => {
                  alert('テストクリック');
                }}
              >
                テスト
              </button>
              <div
                style={{
                  padding: '10px 20px',
                  color: '#a6adc8',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
                onClick={e => {
                  e.stopPropagation();
                  setMenuVisible(false);
                }}
              >
                閉じる
              </div>
            </div>
          );
        })()}
        {/* --- 削除確認モーダル --- */}
        {showDeleteConfirm && (
          <Modal
            open={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            style={{ minWidth: 360, textAlign: 'center' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 32, textAlign: 'center', letterSpacing: 0.5 }}>
              本当にこのチャネルを削除しますか？
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
                onPress={async () => { if(currentChannel) { await deleteChatRoom(currentChannel.id); } setShowDeleteConfirm(false); }}
              />
            </div>
          </Modal>
        )}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          minHeight: 0,
          flex: 1,
        }}>
          {/* サイドバー（固定） */}
          <div style={{
            width: 240,
            background: '#1a1a2e',
            borderRight: '1px solid #333366',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
            overflow: 'hidden',
          }}>
            {/* CHANNELS見出し */}
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#6c7086',
              textTransform: 'uppercase',
              letterSpacing: 1,
              paddingLeft: 16,
              marginTop: 20,
              marginBottom: 8,
            }}>CHANNELS</div>
            {/* チャネルリスト＋ボタン */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              {/* チャネルリスト（スクロール） */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                {chatRooms.map((item) => {
                  const isActive = activeChatRoomId === item.id;
                  const isPublic = item.name !== 'プロジェクトアイデア';
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px',
                        background: isActive ? '#333366' : 'transparent',
                        borderLeft: isActive ? '2px solid #00ff88' : '2px solid transparent',
                        marginBottom: 2,
                        borderRadius: 0,
                        cursor: 'pointer',
                        color: isActive ? '#00ff88' : '#e2e8f0',
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13,
                      }}
                      onClick={() => setActiveChatRoom(item.id)}
                    >
                      <span style={{ color: '#6c7086', fontWeight: 600, marginRight: 4, fontSize: 14 }}>{isPublic ? '#' : '@'}</span>
                      <span style={{ flex: 1 }}>{item.name}</span>
                      <span style={{
                        width: 6,
                        height: 6,
                        borderRadius: 1,
                        background: item.unreadCount > 0 ? '#00ff88' : '#6c7086',
                        marginLeft: 6,
                        display: 'inline-block',
                      }} />
                      {item.unreadCount > 0 && (
                        <span style={{
                          marginLeft: 8,
                          background: '#00ff88',
                          padding: '0 6px',
                          borderRadius: 2,
                          minWidth: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: 18,
                          color: '#0f0f23',
                          fontSize: 10,
                          fontWeight: 600,
                        }}>{item.unreadCount}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* 新規チャネルボタン（リストの直下） */}
              <button
                style={{
                  marginTop: 8,
                  marginLeft: 16,
                  marginRight: 16,
                  marginBottom: 16,
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
                }}
                onClick={() => setCreateModalVisible(true)}
              >
                <span style={{ marginRight: 6 }}><Icon name="plus" size={16} color="#0f0f23" /></span>
                新規チャネル
              </button>
            </div>
          </div>
          {/* 右カラム: チャットエリア（スクロール可能） */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            height: '100%',
          }}>
            {/* メッセージエリア（本物） */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* メッセージヘッダー（ルーム名・説明） */}
              {chatRooms.length === 0 ? (
                <View style={styles.emptyMessageContainer}>
                  <Text style={styles.emptyMessageTitle}>まだチャネルがありません</Text>
                  <Text style={styles.emptyMessageSub}>最初のチャネルを作成してください</Text>
                  <TouchableOpacity style={[styles.sendButtonNormal, { marginTop: 16 }]} onPress={handleAddChannel}>
                    <Text style={styles.sendButtonText}>チャネルを作成</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {currentChannel && (
                    <div style={{
                      background: '#1a1a2e',
                      borderBottom: '1px solid #333366',
                      padding: '16px 24px',
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Icon name={'hash'} size={18} color={'#00ff88'} style={{ marginRight: 8 }} />
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{currentChannel.name}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#6c7086', marginTop: 2 }}>{currentChannel.description}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button style={{
                          width: 28,
                          height: 28,
                          background: '#1a1a2e',
                          border: '1px solid #333366',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#a6adc8',
                          transition: 'all 0.2s',
                        }} onClick={handleAnalyzeClick} disabled={status?.isAnalyzing}>
                          <Icon name="hash" size={18} color="#a6adc8" />
                        </button>
                        <button
                          style={{
                            width: 28,
                            height: 28,
                            background: '#1a1a2e',
                            border: '1px solid #333366',
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: 14,
                            color: '#a6adc8',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => setShowDeleteConfirm(true)}
                          title="チャネルを削除"
                        >
                          <Icon name="trash" size={18} color="#ff6b6b" />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* メッセージリスト or 運営メッセージ */}
                  <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {currentMessages.length === 0 ? (
                      <View style={styles.emptyMessageContainer}>
                        <Text style={styles.emptyMessageTitle}>初めてのメッセージを送ってみてください！</Text>
                        <Text style={styles.emptyMessageSub}>このチャットルームの最初の一言を投稿しましょう。</Text>
                      </View>
                    ) : (
                      <ScrollView 
                        ref={scrollViewRef}
                        style={[styles.messagesList, { flex: 1 }]}
                        contentContainerStyle={styles.messagesContent}
                      >
                        {currentMessages.map(message => (
                          <ChatMessage
                            key={message.id}
                            content={message.content}
                            sender={message.sender}
                            timestamp={message.created_at}
                            isSelf={message.sender.id === user?.id}
                          />
                        ))}
                        {isPocoTyping && (
                          <View style={styles.typingIndicator}>
                            <Text style={styles.typingText}>ポコは入力中...</Text>
                          </View>
                        )}
                      </ScrollView>
                    )}
                  </div>
                </>
              )}
              {/* 入力エリア（下端固定） */}
              <div style={{
                position: 'sticky',
                bottom: 0,
                background: '#0f0f23',
                zIndex: 10,
                borderTop: '1px solid #333366',
                width: '100%',
              }}>
                <ChatInput
                  onSend={handleSendMessage}
                  disabled={!activeChatRoomId}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  // Nativeの場合は従来通り
  return (
    <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
      <View style={{
        width: 240,
        backgroundColor: '#1a1a2e',
        borderRightWidth: 1,
        borderRightColor: '#333366',
        paddingTop: 20,
        paddingBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <Text style={{
          fontSize: 11,
          fontWeight: '600',
          color: '#6c7086',
          textTransform: 'uppercase',
          letterSpacing: 1,
          paddingHorizontal: 16,
          marginBottom: 8,
        }}>CHANNELS</Text>
        <View style={{ flex: 1 }}>
          {chatRooms.map((item) => {
            const isActive = activeChatRoomId === item.id;
            const isPublic = item.name !== 'プロジェクトアイデア';
            return (
              <TouchableOpacity
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  backgroundColor: isActive ? '#333366' : 'transparent',
                  borderLeftWidth: 2,
                  borderLeftColor: isActive ? '#00ff88' : 'transparent',
                  marginBottom: 2,
                  borderRadius: 0,
                }}
                activeOpacity={0.8}
                onPress={() => setActiveChatRoom(item.id)}
              >
                <Text style={{
                  color: '#6c7086',
                  fontWeight: '600',
                  marginRight: 4,
                  fontSize: 14,
                }}>{isPublic ? '#' : '@'}</Text>
                <Text style={{
                  flex: 1,
                  color: isActive ? '#00ff88' : '#e2e8f0',
                  fontSize: 13,
                  fontWeight: isActive ? '600' : '400',
                }}>{item.name}</Text>
                {/* ステータスドット */}
                <View style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: item.unreadCount > 0 ? '#00ff88' : '#6c7086',
                  marginLeft: 6,
                }} />
                {/* 未読バッジ */}
                {item.unreadCount > 0 && (
                  <View style={{
                    marginLeft: 8,
                    backgroundColor: '#00ff88',
                    paddingHorizontal: 6,
                    borderRadius: 2,
                    minWidth: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 18,
                  }}>
                    <Text style={{ color: '#0f0f23', fontSize: 10, fontWeight: '600' }}>{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* 新規チャネルボタン */}
        <TouchableOpacity
          style={{
            marginTop: 16,
            marginHorizontal: 16,
            height: 36,
            backgroundColor: '#00ff88',
            borderRadius: 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          }}
          onPress={handleAddChannel}
          activeOpacity={0.85}
        >
          <Icon name="plus" size={16} color="#0f0f23" />
          <Text style={{ color: '#0f0f23', fontWeight: '600', fontSize: 13 }}>新規チャネル</Text>
        </TouchableOpacity>
      </View>
      {/* 右カラム: チャットエリア（スクロール可能） */}
      <View style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* メッセージエリア（本物） */}
        <View style={styles.messagesContainer}>
          {/* メッセージヘッダー（ルーム名・説明） */}
          {chatRooms.length === 0 ? (
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessageTitle}>まだチャネルがありません</Text>
              <Text style={styles.emptyMessageSub}>最初のチャネルを作成してください</Text>
              <TouchableOpacity style={[styles.sendButtonNormal, { marginTop: 16 }]} onPress={handleAddChannel}>
                <Text style={styles.sendButtonText}>チャネルを作成</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {currentChannel && (
                <div style={{
                  background: '#1a1a2e',
                  borderBottom: '1px solid #333366',
                  padding: '16px 24px',
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name={'hash'} size={18} color={'#00ff88'} style={{ marginRight: 8 }} />
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>{currentChannel.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: '#6c7086', marginTop: 2 }}>{currentChannel.description}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button style={{
                      width: 28,
                      height: 28,
                      background: '#1a1a2e',
                      border: '1px solid #333366',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: '#a6adc8',
                      transition: 'all 0.2s',
                    }} onClick={handleAnalyzeClick} disabled={status?.isAnalyzing}>
                      <Icon name="hash" size={18} color="#a6adc8" />
                    </button>
                    <button
                      style={{
                        width: 28,
                        height: 28,
                        background: '#1a1a2e',
                        border: '1px solid #333366',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#a6adc8',
                        transition: 'all 0.2s',
                      }}
                      onClick={() => setShowDeleteConfirm(true)}
                      title="チャネルを削除"
                    >
                      <Icon name="trash" size={18} color="#ff6b6b" />
                    </button>
                  </div>
                </div>
              )}
              {/* メッセージリスト or 運営メッセージ */}
              <View style={{ flex: 1, minHeight: 0 }}>
                {currentMessages.length === 0 ? (
                  <View style={styles.emptyMessageContainer}>
                    <Text style={styles.emptyMessageTitle}>初めてのメッセージを送ってみてください！</Text>
                    <Text style={styles.emptyMessageSub}>このチャットルームの最初の一言を投稿しましょう。</Text>
                  </View>
                ) : (
                  <ScrollView 
                    ref={scrollViewRef}
                    style={[styles.messagesList, { flex: 1 }]}
                    contentContainerStyle={styles.messagesContent}
                  >
                    {currentMessages.map(message => (
                      <ChatMessage
                        key={message.id}
                        content={message.content}
                        sender={message.sender}
                        timestamp={message.created_at}
                        isSelf={message.sender.id === user?.id}
                      />
                    ))}
                    {isPocoTyping && (
                      <View style={styles.typingIndicator}>
                        <Text style={styles.typingText}>ポコは入力中...</Text>
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </>
          )}
          {/* 入力エリア（下端固定） */}
          <div style={{
            position: 'sticky',
            bottom: 0,
            background: '#0f0f23',
            zIndex: 10,
            borderTop: '1px solid #333366',
            width: '100%',
          }}>
            <ChatInput
              onSend={handleSendMessage}
              disabled={!activeChatRoomId}
            />
          </div>
        </View>
      </View>
      {/* モバイル用チャネルリストモーダル（上から下にアニメーション） */}
      {isMobile && Platform.OS !== 'web' && (
        <Modal
          visible={showChannelList}
          animationType="none"
          transparent={true}
          onRequestClose={() => setShowChannelList(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start' }}>
            <Animated.View
              style={{
                backgroundColor: 'white',
                borderRadius: 16,
                marginTop: 60,
                marginHorizontal: 12,
                padding: 8,
                maxHeight: '80%',
                transform: [{ translateY: channelListAnim }],
              }}
            >
              <View style={styles.channelListHeader}>
                <Text style={styles.listHeaderTitle}>チャネル</Text>
                <TouchableOpacity style={styles.newChannelButton} onPress={handleAddChannel}>
                  <Icon name="plus" size={16} color="white" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={chatRooms}
                keyExtractor={item => item.id}
                renderItem={renderChannelItem}
              />
              <TouchableOpacity onPress={() => setShowChannelList(false)} style={{ alignSelf: 'center', marginTop: 12 }}>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 16 }}>閉じる</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
      {/* チャネル作成モーダル */}
      <CreateChannelModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateChannel}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  spaceHeader: {
    padding: 16,
    backgroundColor: theme.colors.spaces.chat.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  channelListContainer: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    backgroundColor: theme.colors.background.paper,
  },
  channelListHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  newChannelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.action,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    padding: 10,
    paddingLeft: 16,
    alignItems: 'center',
  },
  activeChannelItem: {
    backgroundColor: theme.colors.spaces.chat.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.spaces.chat.primary,
  },
  channelIconContainer: {
    marginRight: 8,
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  activeChannelName: {
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: theme.colors.spaces.chat.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.spaces.chat.background,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minHeight: 0,
  },
  channelHeader: {
    padding: 16,
    backgroundColor: theme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelTitleContainer: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelHeaderIcon: {
    marginRight: 8,
  },
  channelHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  channelDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  channelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#0f0f23',
    minHeight: 0,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingLeft: 24,
    paddingRight: 24,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  selfMessageRow: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '70%',
  },
  selfBubble: {
    backgroundColor: theme.colors.spaces.chat.primary + '15',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
    marginRight: 0,
  },
  otherBubble: {
    backgroundColor: theme.colors.background.paper,
    borderBottomLeftRadius: 4,
    marginRight: 40,
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background.paper,
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 250, 240, 0.5)',
    fontSize: 15,
    maxHeight: 100,
    color: theme.colors.text.primary,
  },
  inputActions: {
    marginLeft: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
  },
  analyzeButton: {
    width: 40,
    height: 40,
    marginRight: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 20,
  },
  sendButtonNormal: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.action,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.action + '60',
    opacity: 0.6,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  aiStatusContainer: {
    marginLeft: 'auto',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  insightIndicator: {
    marginLeft: 'auto',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightCount: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  insightText: {
    color: 'white',
    fontSize: 12,
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 16,
  },
  typingText: {
    fontSize: 12,
    color: '#6c7086',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 2,
    margin: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: '#333366',
  },
  emptyMessageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyMessageSub: {
    fontSize: 12,
    color: '#6c7086',
    textAlign: 'center',
  },
});

export default ChatSpace; 