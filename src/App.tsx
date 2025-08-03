import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { NestProvider, useNest, Nest as ImportedNestType } from './features/nest/contexts/NestContext';
import { NestSpaceProvider, useNestSpace } from '@contexts/NestSpaceContext';
import { ChatProvider } from '@contexts/ChatContext';
import NestSelector from './features/nest/components/NestSelector';
import CreateNestModal from './features/nest/components/CreateNestModal';
import LoginScreen from '@screens/auth/LoginScreen';
import theme from './styles/theme';
import { BoardProvider } from './features/board-space/contexts/BoardContext';
import CreateTestNestScreen from './features/nest/screens/CreateTestNestScreen';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import NestSettingsScreen from './features/nest/screens/NestSettingsScreen';
import { Layout } from './components/Layout';
import { BottomNavigationLayout } from './components/BottomNavigationLayout';
import './styles/common.css';
import ChatSpace from './features/chat-space/components/ChatSpace';
import ResponsiveChatSpace from './features/chat-space/components/ResponsiveChatSpace';
import BoardSpace from './features/board-space/components/BoardSpace';
import MeetingSpace from './features/nest-space/meeting-space/components/MeetingSpace';
import AnalysisSpace from './features/analysis-space/components/AnalysisSpace';
import UserProfileSpace from './features/user-profile/components/UserProfileSpace';
import { MeetingProvider } from './features/meeting-space/contexts/MeetingContext';
import NestHomeSpace from './features/nest-space/home-space/components/NestHomeSpace';
import { NestListScreen } from './screens/NestListScreen';
import ProfilePage from './features/user-profile/components/ProfilePage';
import SettingsPage from './features/user-profile/components/SettingsPage';
import WelcomeScreen from '@screens/auth/WelcomeScreen';
import BackgroundJobDemo from './features/meeting-space/components/BackgroundJobDemo';
import TranscriptionTestPage from './features/meeting-space/components/TranscriptionTestPage';
import NotificationDemo from './features/notifications/components/NotificationDemo';
import NotificationPage from './features/notifications/components/NotificationPage';
import NotificationTester from './features/notifications/components/NotificationTester';
import NotificationSettings from './features/notifications/components/NotificationSettings';
import AuthenticatedRoutes from './navigation';
import Icon from './components/ui/Icon';
import AcceptInviteScreen from './features/nest/invitation/screens/AcceptInviteScreen';
import TermsOfServiceScreen from './screens/legal/TermsOfServiceScreen';
import PrivacyPolicyScreen from './screens/legal/PrivacyPolicyScreen';
import { LandingPage } from './features/landing/components/LandingPage';
import { startBackgroundJobWorker } from './services/backgroundJobWorker';
import { ToastProvider } from './components/ui/Toast';
// Webではreact-native-screensを無効化
if (typeof window !== 'undefined') {
  // @ts-ignore
  globalThis.__REACT_NATIVE_SCREENS_DISABLE_WARNINGS = true;
  // @ts-ignore
  globalThis.__REACT_NATIVE_SCREENS_DISABLE = true;
}

// Type alias for clarity within App.tsx, using the context's definition
type Nest = ImportedNestType;

// SVGアイコンコンポーネント
const IconComponent = ({ name, size = 24, color = 'currentColor', style = {} }: { 
  name: string; 
  size?: number; 
  color?: string; 
  style?: any 
}) => {
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
    case 'nest':
      return (
        <>
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="4"></circle>
          <line x1="12" y1="2" x2="12" y2="8"></line>
          <line x1="12" y1="16" x2="12" y2="22"></line>
          <line x1="2" y1="12" x2="8" y2="12"></line>
          <line x1="16" y1="12" x2="22" y2="12"></line>
        </>
      );
    case 'light':
      return (
        <>
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </>
      );
    case 'dark':
      return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>;
    case 'gear':
      return (
        <>
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </>
      );
    case 'user':
      return (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </>
      );
    case 'chevron-down':
      return <polyline points="6 9 12 15 18 9"></polyline>;
    case 'settings':
      return <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>;
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

/**
 * Slack/Notion風のネストヘッダーコンポーネント
 */
const NestHeader: React.FC<{
  selectedNest: Nest;
  onNestSelect: () => void;
  onOpenSettings: () => void;
}> = ({ selectedNest, onNestSelect, onOpenSettings }) => {
  const [darkMode, setDarkMode] = useState(false);
  const buttonRef = React.useRef<any>(null);

  const handleNestSelect = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      onNestSelect();
    } else {
      onNestSelect();
    }
  };

  return (
    <View style={styles.nestHeader}>
      <IconComponent name="gear" size={32} color="#FFF" style={styles.nestHeaderIcon} />
      <TouchableOpacity 
        style={styles.nestSelector}
        onPress={handleNestSelect}
        ref={buttonRef}
      >
        <Text style={styles.nestName}>{selectedNest.name}</Text>
        <IconComponent name="chevron-down" size={16} color="#FFF" style={styles.chevronIcon} />
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onOpenSettings}
        >
          <IconComponent name="gear" size={18} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setDarkMode(!darkMode)}
        >
          <IconComponent name={darkMode ? 'light' : 'dark'} size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * ネスト選択モーダル
 */
const NestSelectorModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectNest: (nest: Nest) => void;
  currentNestId: string;
  onCreateNewNest: () => void;
  nests: Nest[];
}> = ({ visible, onClose, onSelectNest, currentNestId, onCreateNewNest, nests }) => {
  // Web用のスタイルは直接オブジェクトで定義
  const webDropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20%',
    left: '50%',
    transform: 'translateX(-150px)', // width: 300px の半分
    width: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 1000,
  };
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          {Platform.OS === 'web' ? (
            <div style={webDropdownStyle}>
              <TouchableOpacity 
                style={{}}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation && e.stopPropagation()}
              >
                <Text style={styles.dropdownTitle}>巣を切り替え</Text>
                {nests.map(nest => (
                  <TouchableOpacity
                    key={nest.id}
                    style={styles.nestOption}
                    onPress={() => {
                      onSelectNest(nest);
                      onClose();
                    }}
                  >
                    <View style={styles.nestOptionIcon}>
                      <Text style={styles.nestOptionIconText}>{nest.icon || '🏠'}</Text>
                    </View>
                    <View style={styles.nestOptionContent}>
                      <Text style={styles.nestOptionName}>{nest.name}</Text>
                      {nest.description && (
                        <Text style={styles.nestOptionDescription}>{nest.description}</Text>
                      )}
                    </View>
                    {nest.id === currentNestId && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={styles.createNestOption} 
                  onPress={() => {
                    onClose();
                    onCreateNewNest();
                  }}
                >
                  <Text style={styles.createNestText}>+ 新しい巣を作成</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </div>
          ) : (
            <TouchableOpacity 
              style={styles.rnDropdownStyle}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation && e.stopPropagation()}
            >
              <Text style={styles.dropdownTitle}>巣を切り替え</Text>
              {nests.map(nest => (
                <TouchableOpacity
                  key={nest.id}
                  style={styles.nestOption}
                  onPress={() => {
                    onSelectNest(nest);
                    onClose();
                  }}
                >
                  <View style={styles.nestOptionIcon}>
                    <Text style={styles.nestOptionIconText}>{nest.icon || '🏠'}</Text>
                  </View>
                  <View style={styles.nestOptionContent}>
                    <Text style={styles.nestOptionName}>{nest.name}</Text>
                    {nest.description && (
                      <Text style={styles.nestOptionDescription}>{nest.description}</Text>
                    )}
                  </View>
                  {nest.id === currentNestId && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={styles.createNestOption} 
                onPress={() => {
                  onClose();
                  onCreateNewNest();
                }}
              >
                <Text style={styles.createNestText}>+ 新しい巣を作成</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/**
 * アプリのレンダリング選択を行うコンポーネント
 * 認証状態とNest選択状態に基づいて表示を切り替える
 */
const AppContent: React.FC = () => {
  console.log('AppContent RENDER: --- TOP OF FUNCTION ---');
  const auth = useAuth();
  
  const nestContextValue = useNest();
  const { createNest, refreshData, userNests, setCurrentNestById, currentNest } = nestContextValue;

  const nestSpace = useNestSpace();

  const [selectedNest, setSelectedNest] = useState<Nest | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [nestSelectorVisible, setNestSelectorVisible] = useState(false);
  const [isCreateNestModalVisible, setIsCreateNestModalVisible] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    console.log('AppContent initializeSelectedNest EFFECT RUNNING - auth.isAuthenticated:', auth.isAuthenticated, 'userNests.length:', userNests.length, 'currentNest:', currentNest ? currentNest.id : null);
    const initializeSelectedNest = async () => {
      if (currentNest) {
        setSelectedNest(currentNest);
      } else if (auth.isAuthenticated && userNests.length > 0) {
        const storedNestId = localStorage.getItem('selectedNestId');
        const nestToSelect = storedNestId
          ? userNests.find(n => n.id === storedNestId)
          : userNests[0];
        if (nestToSelect) {
          setSelectedNest(nestToSelect);
          setCurrentNestById(nestToSelect.id);
        }
      } else if (!auth.isAuthenticated) {
        setSelectedNest(null);
        localStorage.removeItem('selectedNestId');
      }
      setInitializing(false);
    };
    initializeSelectedNest();
  }, [auth.isAuthenticated, userNests, currentNest, setCurrentNestById]);

  useEffect(() => {
    console.log('AppContent isCreateNestModalVisible CHANGED to:', isCreateNestModalVisible);
  }, [isCreateNestModalVisible]);

  const handleOpenCreateNestModal = () => {
    console.log('handleOpenCreateNestModal CALLED');
    setIsCreateNestModalVisible(true);
  };

  const handleCreateNestSubmit = async (nestData: { name: string; description?: string; color?: string; icon?: string }) => {
    console.log('handleCreateNestSubmit CALLED with:', nestData);
    const { error, nest: newNest } = await createNest(nestData);
    if (error) {
      console.error('Failed to create nest in AppContent:', error);
      throw error; 
    }
    if (newNest) {
      console.log('Nest created successfully:', newNest);
      await refreshData(); 
      setCurrentNestById(newNest.id); 
      setIsCreateNestModalVisible(false); 
    }
  };

  // Add effect to reset modal state when selectedNest changes
  useEffect(() => {
    setIsCreateNestModalVisible(false);
  }, [selectedNest]);

  useEffect(() => {
    if (currentNest) {
      if (window.location.pathname === '/') {
        navigate(`/nest-top?nestId=${currentNest.id}&space=home`, { replace: true });
      }
    }
  }, [currentNest, navigate]);

  if (auth.loading || initializing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  if (!auth.isAuthenticated) {
    console.log('未認証状態: ログイン画面を表示します');
    return <LoginScreen />;
  }

  if (!selectedNest && userNests.length === 0) {
    console.log('NESTが一つも紐づいていないのでTest_NEST作成ページを表示します');
    return <CreateTestNestScreen />;
  }
  
  if (!selectedNest && userNests.length > 0 && !initializing) {
     console.log('No nest selected, but nests available. Displaying selector to choose or create.');
     return (
        <NestSelector
          onSelectNest={(nest: ImportedNestType) => {
            setSelectedNest(nest);
            setCurrentNestById(nest.id);
            setIsCreateNestModalVisible(false);
          }}
          onCreateNest={handleOpenCreateNestModal}
        />
    );
  }

  if (currentNest) {
    if (window.location.pathname === '/') {
      return null; // リダイレクト中は何も表示しない
    }
    const params = new URLSearchParams(window.location.search);
    const space = params.get('space') || 'home';
    const menuSections = [
      {
        title: '',
        items: [
          { id: 'home', icon: <Icon name="nest" size={18} />, text: 'NEST ホーム', isActive: space === 'home' },
          { id: 'chat', icon: <Icon name="chat" size={18} />, text: 'チャット', isActive: space === 'chat' },
          { id: 'meeting', icon: <Icon name="meeting" size={18} />, text: 'ミーティング', isActive: space === 'meeting' },
          { id: 'board', icon: <Icon name="board" size={18} />, text: 'ボード', isActive: space === 'board' },
          { id: 'analytics', icon: <Icon name="analysis" size={18} />, text: '分析', isActive: space === 'analytics' },
          { id: 'settings', icon: <Icon name="settings" size={18} />, text: '設定', isActive: space === 'settings' },
        ],
      },
    ];
    const handleMenuItemClick = (itemId: string) => {
      if (itemId && currentNest.id) {
        navigate(`/nest-top?nestId=${currentNest.id}&space=${itemId}`);
      }
    };
    let SpaceComponent = null;
    // レスポンシブチャットの切り替え（環境変数で制御）
    const useResponsiveChat = import.meta.env.VITE_USE_RESPONSIVE_CHAT === 'true';
    // デスクトップサイズ（992px以上）では常に従来のChatSpaceを使用
    const isDesktopSizeForChat = typeof window !== 'undefined' && window.innerWidth >= 992;
    
    switch (space) {
      case 'chat':
        SpaceComponent = (
          <BoardProvider currentNestId={currentNest.id}>
            {(useResponsiveChat && !isDesktopSizeForChat) ? (
              <ResponsiveChatSpace nestId={currentNest.id} />
            ) : (
              <ChatSpace nestId={currentNest.id} />
            )}
          </BoardProvider>
        );
        break;
      case 'board':
        SpaceComponent = (
          <BoardProvider currentNestId={currentNest.id}>
            <BoardSpace nestId={currentNest.id} />
          </BoardProvider>
        );
        break;
      case 'meeting':
        SpaceComponent = (
          <BoardProvider currentNestId={currentNest.id}>
            <MeetingProvider>
              <MeetingSpace nestId={currentNest.id} />
            </MeetingProvider>
          </BoardProvider>
        );
        break;
      case 'analytics':
        SpaceComponent = (
          <BoardProvider currentNestId={currentNest.id}>
            <AnalysisSpace />
          </BoardProvider>
        );
        break;
      case 'settings':
        SpaceComponent = <NestSettingsScreen nestId={currentNest.id} />;
        break;
      default:
        SpaceComponent = (
          <BoardProvider currentNestId={currentNest.id}>
            {(useResponsiveChat && !isDesktopSizeForChat) ? (
              <ResponsiveChatSpace nestId={currentNest.id} />
            ) : (
              <ChatSpace nestId={currentNest.id} />
            )}
          </BoardProvider>
        );
        break;
    }
    // レスポンシブレイアウトの切り替え（環境変数で制御）
    const useBottomNavigation = import.meta.env.VITE_USE_BOTTOM_NAV === 'true';
    // デスクトップサイズ（992px以上）では常に従来のLayoutを使用
    const isDesktopSize = typeof window !== 'undefined' && window.innerWidth >= 992;
    const LayoutComponent = (useBottomNavigation && !isDesktopSize) ? BottomNavigationLayout : Layout;
    
    return (
      <LayoutComponent
        workspaceTitle={currentNest.name + ' ▼'}
        menuSections={menuSections}
        onMenuItemClick={handleMenuItemClick}
        nestId={currentNest.id}
        onSettingsClick={() => navigate(`/nest-settings?nestId=${currentNest.id}`)}
      >
        {SpaceComponent}
      </LayoutComponent>
    );
  }

  return null;
};

// --- 画面コンポーネント ---
const NestTopScreen: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const nestId = params.get('nestId');
  const space = params.get('space') || 'home';
  const { userNests, currentNest, setCurrentNestById } = useNest();
  const { user } = useAuth();
  const [nestSelectorVisible, setNestSelectorVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  // NEST情報を取得
  const nest = userNests.find(n => n.id === nestId) || currentNest;

  // NESTが選択されていない場合は選択
  useEffect(() => {
    if (nestId && !currentNest) {
      setCurrentNestById(nestId);
    }
  }, [nestId, currentNest, setCurrentNestById]);

  if (!nest) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>NEST情報を読み込み中...</Text>
      </View>
    );
  }

  // レスポンシブチャットの切り替え（環境変数で制御）
  const useResponsiveChat = import.meta.env.VITE_USE_RESPONSIVE_CHAT === 'true';
  // デスクトップサイズ（992px以上）では常に従来のChatSpaceを使用
  const isDesktopSizeForChat = typeof window !== 'undefined' && window.innerWidth >= 992;
  
  let SpaceComponent = null;
  switch (space) {
    case 'home':
      SpaceComponent = <NestHomeSpace nestId={nest.id} />;
      break;
    case 'chat':
      SpaceComponent = (
        <BoardProvider currentNestId={nest.id}>
          {(useResponsiveChat && !isDesktopSizeForChat) ? (
            <ResponsiveChatSpace nestId={nest.id} />
          ) : (
            <ChatSpace nestId={nest.id} />
          )}
        </BoardProvider>
      );
      break;
    case 'board':
      SpaceComponent = (
        <BoardProvider currentNestId={nest.id}>
          <BoardSpace nestId={nest.id} />
        </BoardProvider>
      );
      break;
    case 'meeting':
      SpaceComponent = (
        <BoardProvider currentNestId={nest.id}>
          <MeetingProvider>
            <MeetingSpace nestId={nest.id} />
          </MeetingProvider>
        </BoardProvider>
      );
      break;
    case 'analytics':
      SpaceComponent = (
        <BoardProvider currentNestId={nest.id}>
          <AnalysisSpace />
        </BoardProvider>
      );
      break;
    case 'settings':
      SpaceComponent = <NestSettingsScreen nestId={nest.id} />;
      break;
    default:
      SpaceComponent = (
        <BoardProvider currentNestId={nest.id}>
          {(useResponsiveChat && !isDesktopSizeForChat) ? (
            <ResponsiveChatSpace nestId={nest.id} />
          ) : (
            <ChatSpace nestId={nest.id} />
          )}
        </BoardProvider>
      );
      break;
  }

  // --- サイドメニュー定義 ---
  const menuSections = [
    {
      title: '',
      items: [
        { id: 'home', icon: <Icon name="nest" size={18} />, text: 'NEST ホーム', isActive: space === 'home' },
        { id: 'chat', icon: <Icon name="chat" size={18} />, text: 'チャット', isActive: space === 'chat' },
        { id: 'meeting', icon: <Icon name="meeting" size={18} />, text: 'ミーティング', isActive: space === 'meeting' },
        { id: 'board', icon: <Icon name="board" size={18} />, text: 'ボード', isActive: space === 'board' },
        { id: 'analytics', icon: <Icon name="analysis" size={18} />, text: '分析', isActive: space === 'analytics' },
        { id: 'settings', icon: <Icon name="settings" size={18} />, text: '設定', isActive: space === 'settings' },
      ],
    },
  ];
  const handleMenuItemClick = (itemId: string) => {
    if (itemId && nest.id) {
      navigate(`/nest-top?nestId=${nest.id}&space=${itemId}`);
    }
  };

  // --- workspace-headerのカスタムアクション ---
  const headerActions = (
    <div className="workspace-controls">
      <div className="workspace-btn" onClick={() => navigate(`/nest-settings?nestId=${nest.id}`)}>⚙</div>
      <div className="workspace-btn" onClick={() => setDarkMode(dm => !dm)}>{darkMode ? '☀️' : '🌙'}</div>
      {/* 必要なら他のアクションも追加 */}
    </div>
  );

  // レスポンシブレイアウトの切り替え（環境変数で制御）
  const useBottomNavigation = import.meta.env.VITE_USE_BOTTOM_NAV === 'true';
  // デスクトップサイズ（992px以上）では常に従来のLayoutを使用
  const isDesktopSize = typeof window !== 'undefined' && window.innerWidth >= 992;
  const LayoutComponent = (useBottomNavigation && !isDesktopSize) ? BottomNavigationLayout : Layout;

  return (
    <LayoutComponent
      workspaceTitle={nest.name + ' ▼'}
      menuSections={menuSections}
      onMenuItemClick={handleMenuItemClick}
      nestId={nest.id}
      onSettingsClick={() => navigate(`/nest-settings?nestId=${nest.id}`)}
    >
      {SpaceComponent}
      {nestSelectorVisible && (
        <NestSelectorModal 
          visible={nestSelectorVisible}
          onClose={() => setNestSelectorVisible(false)}
          onSelectNest={(selected) => {
            setCurrentNestById(selected.id);
            setNestSelectorVisible(false);
          }}
          currentNestId={nest.id}
          onCreateNewNest={() => {}}
          nests={userNests}
        />
      )}
    </LayoutComponent>
  );
};

const NestSelectorScreenWrapper: React.FC = (props: any) => {
  const navigate = useNavigate();
  const { setCurrentNestById } = useNest();

  return (
    <NestSelector
      {...props}
      onCreateNest={() => navigate('/create-nest')}
      onSelectNest={(nest) => {
        setCurrentNestById(nest.id); // Providerの状態を更新
        navigate(`/nest-top?nestId=${nest.id}`);
      }}
    />
  );
};

const CreateTestNestScreenWrapper: React.FC = (props: any) => {
  const navigate = useNavigate();
  return (
    <CreateTestNestScreen
      {...props}
      onCreated={(nestId: string) => navigate(`/nest-top?nestId=${nestId}`)}
    />
  );
};

const NestSettingsScreenWrapper: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const nestId = params.get('nestId');
  const { userNests } = useNest();

  if (!nestId) {
    return <View><Text>nestIdが指定されていません</Text></View>;
  }
  if (!userNests || userNests.length === 0) {
    return <View><Text>巣情報を読み込み中...</Text></View>;
  }
  const nest = userNests.find(n => n.id === nestId);
  if (!nest) {
    return <View><Text>該当する巣が見つかりません</Text></View>;
  }
  return <NestSettingsScreen nestId={nestId} />;
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  console.log('AuthGuard:', { isAuthenticated, loading });
  if (loading) return <div style={{ color: '#718096', fontSize: 18, textAlign: 'center', marginTop: 40 }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, isAuthenticated, isFirstSignIn, setFirstSignInShown } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (isFirstSignIn && user) {
    return (
      <WelcomeScreen
        userName={user.user_metadata?.name || user.email || 'User'}
        onEnterNest={async () => {
          await setFirstSignInShown();
          navigate('/nest-list');
        }}
      />
    );
  }

  // 通常の認証済みルートはProviderでラップ
  return (
    <NestProvider>
      <NestSpaceProvider>
        <ChatProvider>
          <AuthenticatedRoutes />
        </ChatProvider>
      </NestSpaceProvider>
    </NestProvider>
  );
};

const App: React.FC = () => {
  // バックグラウンドジョブワーカーを起動
  useEffect(() => {
    console.log('[App] Starting background job worker...');
    startBackgroundJobWorker();
    
    // クリーンアップは通常不要（アプリ全体のライフサイクルなので）
    // return () => stopBackgroundJobWorker();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/nest-list" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <NestListScreen />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/nests/:id" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <NestTopScreen />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/nests/create" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <CreateTestNestScreenWrapper />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/nest-top" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <NestTopScreen />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/create-nest" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <CreateTestNestScreenWrapper />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/nest-settings" element={
                <AuthGuard>
                  <NestProvider>
                    <NestSpaceProvider>
                      <ChatProvider>
                        <NestSettingsScreenWrapper />
                      </ChatProvider>
                    </NestSpaceProvider>
                  </NestProvider>
                </AuthGuard>
              } />
              <Route path="/invite/:token" element={<AcceptInviteScreen />} />
              <Route path="/terms-of-service" element={<TermsOfServiceScreen />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />
              
              {/* ランディングページルート */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/ux-researcher" element={<LandingPage />} />
              <Route path="/product-manager" element={<LandingPage />} />
              <Route path="/startup-founder" element={<LandingPage />} />
              
              {/* 通知ページ */}
              <Route path="/notifications" element={<NotificationPage />} />
              <Route path="/notification-demo" element={<NotificationDemo />} />
              <Route path="/notification-tester" element={<NotificationTester />} />
              <Route path="/notification-settings" element={<NotificationSettings />} />
              
              {/* ユーザープロフィールページ */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* デモページルート */}
              <Route path="/demo/background-jobs" element={
                <AuthGuard>
                  <BackgroundJobDemo />
                </AuthGuard>
              } />
              <Route path="/demo/transcription-test" element={
                <AuthGuard>
                  <TranscriptionTestPage />
                </AuthGuard>
              } />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF0', // クリームホワイト
  },
  loadingText: {
    fontSize: 18,
    color: '#718096',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  nestHeader: {
    backgroundColor: theme.colors.primaryDark,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    cursor: 'pointer',
  },
  nestIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  nestName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  nestHeaderIcon: {
    marginRight: 12,
  },
  chevronIcon: {
    marginLeft: 6,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  nestDropdown: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    paddingVertical: 16,
    zIndex: 1000,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nestOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  nestOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F7F2E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nestOptionIconText: {
    fontSize: 20,
  },
  nestOptionContent: {
    flex: 1,
  },
  nestOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
  },
  nestOptionDescription: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.accent, // アクセントカラー（ミント色）に更新
  },
  createNestOption: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createNestText: {
    fontSize: 16,
    color: theme.colors.secondary, // セカンダリカラー（コーラル）に更新
    fontWeight: '500',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  nestHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  nestHeaderInfo: {
    marginLeft: 12,
  },
  nestDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  nestContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  spacesSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  spacesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  spaceCard: {
    width: '50%',
    padding: 8,
  },
  spaceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f4f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  spaceName: {
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  rnDropdownStyle: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    width: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 16,
    zIndex: 1000,
  },
});

export default App; 