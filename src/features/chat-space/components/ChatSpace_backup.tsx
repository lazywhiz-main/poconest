import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList, Modal, useWindowDimensions, Animated, Easing, Dimensions, Alert, Platform } from 'react-native';
import theme from '../../../styles/theme';
import { useChatToBoard } from '../../../hooks/useChatToBoard';
import { useChat } from '../../../contexts/ChatContext';
import { Channel, Message } from '../../../types/chat';
import { useAuth } from '@contexts/AuthContext';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { createPortal } from 'react-dom';
import { useBoardContext } from '../../../features/board-space/contexts/BoardContext';
import { SUPABASE_FUNCTION_URL } from '../../../constants/config';

console.log('ChatSpace.tsx loaded!');

interface ChatSpaceProps {
  // 必要に応じてpropsを追加
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
  const handleCreate = () => {
    if (name.trim()) {
      onSubmit(name.trim(), desc.trim());
      setName('');
      setDesc('');
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(0,0,0,0.2)' }}>
        <View style={{ backgroundColor:'#fff', borderRadius:12, padding:24, width:320, maxWidth:'90%' }}>
          <Text style={{ fontSize:18, fontWeight:'bold', marginBottom:12 }}>新しいチャネルを作成</Text>
          <TextInput
            style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:8, marginBottom:12 }}
            placeholder="チャネル名"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <TextInput
            style={{ borderWidth:1, borderColor:'#ccc', borderRadius:8, padding:8, marginBottom:16 }}
            placeholder="説明 (任意)"
            value={desc}
            onChangeText={setDesc}
          />
          <View style={{ flexDirection:'row', justifyContent:'flex-end' }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight:16 }}>
              <Text style={{ color:'#888', fontSize:16 }}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreate} disabled={!name.trim()}>
              <Text style={{ color:!name.trim() ? '#ccc' : '#007AFF', fontSize:16, fontWeight:'bold' }}>作成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/**
 * チャット空間コンポーネント
 * 
 * チャネルごとに直接メッセージのやり取りを行える
 */
const ChatSpace: React.FC<ChatSpaceProps> = () => {
  console.log('ChatSpace mounted!');
  const [newMessage, setNewMessage] = useState('');
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

  // メッセージ送信時に自動スクロール
  useEffect(() => {
    if (scrollViewRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length]);

  // ルームが1つもなければ general を自動作成（重複作成防止）
  const { spaces } = useNestSpace();
  useEffect(() => {
    if (
      isChatRoomsLoaded &&
      Array.isArray(chatRooms) &&
      typeof createChatRoom === 'function' &&
      chatRooms.length === 0
    ) {
      const chatSpace = Object.values(spaces).find(s => s.type === 'chat');
      if (chatSpace) {
        createChatRoom(chatSpace.id, 'general', 'メインチャットルーム');
      }
    }
  }, [isChatRoomsLoaded, chatRooms, createChatRoom, spaces]);

  // メッセージ送信ハンドラー
  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !activeChatRoomId) return;
    
    await sendChatMessage(newMessage);
    setNewMessage('');
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
    // chat空間のspaceIdを取得
    const chatSpace = Object.values(spaces).find(s => s.type === 'chat');
    if (!chatSpace) {
      alert('チャット空間が見つかりません');
      return;
    }
    await createChatRoom(chatSpace.id, name, desc);
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
  const ChatMessageItem = ({ message }: { message: typeof currentMessages[0] }) => {
    const { user } = useAuth();
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
      setMenuPos({ top: rect.bottom, left: rect.right - 200 }); // 200はメニュー幅
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
  }, [activeChatRoomId]);

  // AI抽出API呼び出し
  // const handleAnalyzeChat = async () => {
  //   console.log('handleAnalyzeChat called');
  //   if (!currentChannel || !currentChannel.id) return;
  //   const board_id = currentChannel.id; // board_idはチャネルIDを利用
  //   const created_by = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('user_id') || 'ai' : 'ai';
  //   const messagesForAI = currentMessages.map(msg => ({
  //     text: msg.content,
  //     userName: msg.sender?.name || 'User',
  //     timestamp: msg.created_at
  //   }));
  //   try {
  //     console.log('SUPABASE_FUNCTION_URL:', SUPABASE_FUNCTION_URL);
  //     const res = await fetch(SUPABASE_FUNCTION_URL, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ messages: messagesForAI, board_id, created_by })
  //     });
  //     let data;
  //     if (!res.ok) {
  //       const errText = await res.text();
  //       alert('AI抽出APIエラー: ' + errText);
  //       return;
  //     }
  //     try {
  //       data = await res.json();
  //     } catch (e) {
  //       alert('AI抽出APIレスポンスのパースに失敗: ' + e);
  //       return;
  //     }
  //     if (data.success && data.markdown) {
  //       const insights = parseInsightsFromMarkdown(data.markdown);
  //       if (insights.length === 0) {
  //         alert('AI抽出結果のパースに失敗しました');
  //         return;
  //       }
  //       // カードとして保存
  //       if (typeof addCards === 'function') {
  //         addCards(insights.map((insight: any, idx: number) => ({
  //           ...insight,
  //           board_id,
  //           created_by,
  //           created_at: new Date().toISOString(),
  //           updated_at: new Date().toISOString(),
  //           order_index: idx,
  //           is_archived: false,
  //         })));
  //       }
  //       alert('AI抽出インサイトをカード化しました！');
  //     } else {
  //       alert('AI抽出に失敗しました: ' + (data.error || 'Unknown error'));
  //     }
  //   } catch (e) {
  //     alert('AI抽出エラー: ' + e);
  //   }
  // };

  // Markdown→Insight配列パース関数
  // function parseInsightsFromMarkdown(markdown: string): Array<{ title: string; content: string; tags: string[]; column_type: string }> {
  //   if (!markdown) return [];
  //   const blocks = markdown.split(/## Insight \d+[^\n]*\n/).slice(1); // 先頭は空
  //   const titles = [...markdown.matchAll(/## Insight \d+ ?― ?(.{1,20})/g)].map(m => m[1]?.trim() || '');
  //   return blocks.map((block: string, i: number) => {
  //     const core = (block.match(/\*\*Core Statement\*\*:(.*)/) || [])[1]?.trim() || '';
  //     const evidence = (block.match(/\*\*Evidence\*\*:(.*)/) || [])[1]?.trim() || '';
  //     const interpretation = {
  //       philosophy: (block.match(/哲学的視点: ?(.*)/) || [])[1]?.trim() || '',
  //       culture: (block.match(/文化・人文視点: ?(.*)/) || [])[1]?.trim() || '',
  //       business: (block.match(/経営視点: ?(.*)/) || [])[1]?.trim() || '',
  //       branding: (block.match(/ブランディング視点: ?(.*)/) || [])[1]?.trim() || '',
  //     };
  //     const actions = (block.match(/\*\*Action Ideas\*\*:(.*)/s) || [])[1]?.split(/[-・*] /).map((s: string) => s.trim()).filter(Boolean) || [];
  //     return {
  //       title: titles[i] || `Insight ${i+1}`,
  //       content: core + '\n' + evidence + '\n' + Object.entries(interpretation).map(([k,v])=>`${k}: ${v}`).join('\n') + (actions.length ? ('\n' + actions.join('\n')) : ''),
  //       tags: [],
  //       column_type: 'inbox',
  //     };
  //   });
  // }

  const { addCards } = useBoardContext();

  // デバッグ用ログ
  console.log('chatRooms:', chatRooms);
  console.log('activeChatRoomId:', activeChatRoomId);
  console.log('currentChannel:', currentChannel);

  return (
    <View style={{ flex: 1, flexDirection: 'column' }}>
      {/* チャット空間ヘッダー（常に「チャット空間」＋アイコンで固定） */}
      <View style={styles.spaceHeader}>
        <View style={styles.headerIcon}>
          <Text style={[styles.headerIconText, {color: theme.colors.text.primary}]}>💬</Text>
        </View>
        <Text style={styles.headerTitle}>チャット空間</Text>
      </View>
      {/* 下部（チャネルリスト＋メッセージエリア） */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* チャネルリスト（PC/タブレットのみ常時表示） */}
        {!isMobile && (
          <View style={styles.channelListContainer}>
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
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
        {/* メッセージエリア（本物） */}
        <View style={styles.messagesContainer}>
          {/* メッセージヘッダー（ルーム名・説明） */}
          {currentChannel && (
            <View style={styles.channelHeader}>
              <View style={styles.channelTitleContainer}>
                <View style={styles.channelTitleRow}>
                  <Icon 
                    name={'hash'} 
                    size={18} 
                    color={theme.colors.text.primary} 
                    style={styles.channelHeaderIcon}
                  />
                  <Text style={styles.channelHeaderName}>{currentChannel.name}</Text>
                </View>
                <Text style={styles.channelDescription}>
                  {currentChannel.description}
                </Text>
              </View>
              <View style={[styles.channelActions, { position: 'relative' }]}>
                <TouchableOpacity style={styles.channelAction}>
                  <Icon name="search" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  ref={menuButtonRef}
                  style={styles.channelAction}
                  onPress={openMenu}
                >
                  <Icon name="more-vertical" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                {menuVisible && typeof window !== 'undefined' && createPortal(
                  <>
                    {/* 背景クリックでメニューを閉じる */}
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 99998,
                        background: 'transparent',
                      }}
                      onClick={() => setMenuVisible(false)}
                    />
                    <div
                      style={{
                        position: 'fixed',
                        top: menuPos.top,
                        left: menuPos.left,
                        background: '#fff',
                        borderRadius: 12,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                        minWidth: 200,
                        padding: 0,
                        zIndex: 99999,
                      }}
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      {/* AI抽出関連のUIを一時的に非表示 */}
                      {/* <TouchableOpacity 
                        style={styles.analyzeButton}
                        onPress={startAnalysis}
                        disabled={status.isAnalyzing}
                      >
                        <Text style={styles.analyzeButtonText}>🧠</Text>
                      </TouchableOpacity> */}
                      <button
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 20px',
                          background: 'none',
                          border: 'none',
                          color: theme.colors.text.primary,
                          fontWeight: 600,
                          fontSize: 16,
                          textAlign: 'left',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          if (window.confirm(`「${currentChannel?.name}」を本当に削除しますか？`)) {
                            deleteChatRoom(currentChannel.id);
                            setMenuVisible(false);
                          }
                        }}
                      >
                        チャットルームを削除
                      </button>
                      <button
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '12px 20px',
                          background: 'none',
                          border: 'none',
                          color: theme.colors.text.secondary,
                          fontSize: 15,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                        onClick={() => setMenuVisible(false)}
                      >
                        閉じる
                      </button>
                    </div>
                  </>,
                  window.document.body
                )}
                {/* ネイティブ用 fallback */}
                {menuVisible && typeof window === 'undefined' && (
                  <View style={{ position: 'absolute', top: 44, right: 0, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 99, zIndex: 9999, minWidth: 200, paddingVertical: 8 }}>
                    <TouchableOpacity onPress={handleDeleteRoom} style={{ paddingVertical: 12, paddingHorizontal: 20 }}>
                      <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16, textAlign: 'left' }} numberOfLines={1}>チャットルームを削除</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(false)} style={{ paddingVertical: 12, paddingHorizontal: 20 }}>
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 15, textAlign: 'left' }} numberOfLines={1}>閉じる</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
          {/* メッセージリスト or 運営メッセージ（本物） */}
          {currentMessages.length === 0 ? (
            <View style={styles.emptyMessageContainer}>
              <Text style={styles.emptyMessageTitle}>初めてのメッセージを送ってみてください！</Text>
              <Text style={styles.emptyMessageSub}>このチャットルームの最初の一言を投稿しましょう。</Text>
            </View>
          ) : (
            <ScrollView 
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
            >
              {currentMessages.map(message => (
                <ChatMessageItem key={message.id} message={message} />
              ))}
              {isPocoTyping && (
                <View style={styles.typingIndicator}>
                  <Text style={styles.typingText}>ポコは入力中...</Text>
                </View>
              )}
            </ScrollView>
          )}
          {/* 入力エリア（本物） */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="メッセージを入力..."
              placeholderTextColor={theme.colors.text.hint}
              multiline
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <View style={styles.inputActions}>
              {/* AI抽出関連のUIを一時的に非表示 */}
              {/* <TouchableOpacity 
                style={styles.analyzeButton}
                onPress={startAnalysis}
                disabled={status.isAnalyzing}
              >
                <Text style={styles.analyzeButtonText}>🧠</Text>
              </TouchableOpacity> */}
              <TouchableOpacity
                style={[styles.sendButtonNormal, newMessage.trim() === '' && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={newMessage.trim() === ''}
              >
                <Text style={styles.sendButtonText}>送信</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      {/* モバイル用チャネルリストモーダル（上から下にアニメーション） */}
      {isMobile && (
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
                showsVerticalScrollIndicator={true}
              />
              <TouchableOpacity onPress={() => setShowChannelList(false)} style={{ alignSelf: 'center', marginTop: 12 }}>
                <Text style={{ color: theme.colors.text.secondary, fontSize: 16 }}>閉じる</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
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
  },
  messagesContent: {
    padding: 16,
    paddingRight: 16,
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  typingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    margin: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  emptyMessageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptyMessageSub: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
});

export default ChatSpace; 