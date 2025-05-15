import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { AuthProvider, useAuth } from '@contexts/AuthContext';
import { NestProvider, useNest, SAMPLE_NESTS, Nest as ImportedNestType } from './features/nest/contexts/NestContext';
import { NestSpaceProvider, useNestSpace } from '@contexts/NestSpaceContext';
import { ChatProvider } from '@contexts/ChatContext';
import { SafeAreaProvider } from '@platform/web/SafeAreaProvider';
import NestSpaceIntegrationDemo from './features/nest-space/demo/NestSpaceIntegrationDemo';
import NestSelector from './features/nest/components/NestSelector';
import CreateNestModal from './features/nest/components/CreateNestModal';
import LoginScreen from '@screens/auth/LoginScreen';
import theme from './styles/theme';
import { BoardProvider } from './features/board-space/contexts/BoardContext';

// Type alias for clarity within App.tsx, using the context's definition
type Nest = ImportedNestType;

// SVGアイコンコンポーネント
const Icon = ({ name, size = 24, color = 'currentColor', style = {} }: { 
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
}> = ({ selectedNest, onNestSelect }) => {
  const [darkMode, setDarkMode] = useState(false);
  
  return (
    <View style={styles.nestHeader}>
      <TouchableOpacity 
        style={styles.nestSelector}
        onPress={onNestSelect}
      >
        <View style={styles.nestIconContainer}>
          <Icon name="nest" size={20} color="white" />
        </View>
        <Text style={styles.nestName}>{selectedNest.name}</Text>
        <Icon name="chevron-down" size={16} color="white" style={styles.chevronIcon} />
      </TouchableOpacity>
      
      <View style={styles.headerActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => console.log('Settings')}  
        >
          <Icon name="gear" size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setDarkMode(!darkMode)}
        >
          <Icon name={darkMode ? 'light' : 'dark'} size={18} color="white" />
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
          <TouchableOpacity 
            style={styles.nestDropdown}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
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
  const { createNest, refreshData, userNests, selectNest: selectNestFromContext, currentNest } = nestContextValue;

  const nestSpace = useNestSpace();

  const [selectedNest, setSelectedNest] = useState<Nest | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [nestSelectorVisible, setNestSelectorVisible] = useState(false);
  const [isCreateNestModalVisible, setIsCreateNestModalVisible] = useState(false);

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
          selectNestFromContext(nestToSelect.id);
        }
      } else if (!auth.isAuthenticated) {
        setSelectedNest(null);
        localStorage.removeItem('selectedNestId');
      }
      setInitializing(false);
    };
    initializeSelectedNest();
  }, [auth.isAuthenticated, userNests, currentNest, selectNestFromContext]);

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
      selectNestFromContext(newNest.id); 
      setIsCreateNestModalVisible(false); 
    }
  };

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
    console.log('Nest選択画面を表示します (初回またはNestなし)');
    return (
      <NestSelector
        onSelectNest={(nest: ImportedNestType) => {
          setSelectedNest(nest);
          selectNestFromContext(nest.id);
        }}
        onCreateNest={handleOpenCreateNestModal}
      />
    );
  }
  
  if (!selectedNest && userNests.length > 0 && !initializing) {
     console.log('No nest selected, but nests available. Displaying selector to choose or create.');
     return (
        <NestSelector
          onSelectNest={(nest: ImportedNestType) => {
            setSelectedNest(nest);
            selectNestFromContext(nest.id);
          }}
          onCreateNest={handleOpenCreateNestModal}
        />
    );
  }

  return (
    <>
      <CreateNestModal
        visible={isCreateNestModalVisible}
        onClose={() => setIsCreateNestModalVisible(false)}
        onSubmit={handleCreateNestSubmit}
      />
      {/* <BoardProvider> */}
      {/*   <ChatProvider> */}
          <View style={styles.container}>
            {selectedNest && (
              <>
                <NestHeader 
                  selectedNest={selectedNest}
                  onNestSelect={() => setNestSelectorVisible(true)}
                />
                <NestSpaceIntegrationDemo />
                <NestSelectorModal 
                  visible={nestSelectorVisible}
                  onClose={() => setNestSelectorVisible(false)}
                  onSelectNest={(nest) => {
                    setSelectedNest(nest);
                    selectNestFromContext(nest.id);
                  }}
                  currentNestId={selectedNest.id}
                  onCreateNewNest={handleOpenCreateNestModal}
                  nests={userNests}
                />
              </>
            )}
          </View>
      {/*   </ChatProvider> */}
      {/* </BoardProvider> */}
    </>
  );
};

/**
 * アプリケーションのルートコンポーネント
 * グローバルなプロバイダーとレイアウトを設定
 */
const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NestProvider>
          <NestSpaceProvider>
            <AppContent />
          </NestSpaceProvider>
        </NestProvider>
      </AuthProvider>
    </SafeAreaProvider>
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
    backgroundColor: theme.colors.primary, // 薄いグレー
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
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
    color: theme.colors.text.primary, // 濃い色のテキスト
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
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
});

export default App; 