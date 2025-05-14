import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import { useZoomSpace } from '../hooks/useZoomSpace';
import MeetingList from './MeetingList';
import RecordingPlayer from './RecordingPlayer';
import MeetingInsights from './MeetingInsights';

// タブの型定義
type TabType = 'meetings' | 'recordings' | 'insights';

// ZoomSpaceコンポーネント
const ZoomSpace: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  
  const { 
    zoomSpaceState, 
    filteredMeetings, 
    selectedMeeting,
    loadMeetings,
    selectMeeting
  } = useZoomSpace();
  
  // アクティブなタブ状態
  const [activeTab, setActiveTab] = useState<TabType>('meetings');
  
  // 分割ビュー状態（デスクトップのみ）
  const [splitView, setSplitView] = useState(isDesktop);
  
  // コンポーネントがマウントされたときに会議データをロード
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);
  
  // 画面サイズが変わったときに分割ビューを調整
  useEffect(() => {
    setSplitView(isDesktop);
  }, [isDesktop]);
  
  // 選択されたミーティングが変わったときに分割ビューを有効化
  useEffect(() => {
    if (selectedMeeting && !splitView && isDesktop) {
      setSplitView(true);
    }
  }, [selectedMeeting, splitView, isDesktop]);
  
  // 録画プレーヤーコンポーネントの表示判定
  const shouldShowRecordingPlayer = () => {
    if (activeTab === 'recordings') return true;
    if (splitView && selectedMeeting?.recording) return true;
    return false;
  };
  
  // 洞察コンポーネントの表示判定
  const shouldShowInsights = () => {
    if (activeTab === 'insights') return true;
    if (splitView && selectedMeeting?.analysis) return true;
    return false;
  };
  
  // タブ切り替えハンドラー
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    // モバイル/タブレットでは、タブ切り替え時に選択解除
    if (!isDesktop) {
      selectMeeting(null);
    }
  };
  
  // レイアウトのレンダリング（デスクトップ、タブレット、モバイルで分岐）
  const renderLayout = () => {
    // デスクトップレイアウト（分割ビュー）
    if (isDesktop && splitView) {
      return (
        <View style={styles.desktopContainer}>
          {/* 左側：ミーティングリスト */}
          <View style={styles.sidebarContainer}>
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'meetings' && styles.activeTab]}
                onPress={() => handleTabChange('meetings')}
              >
                <Text style={[styles.tabText, activeTab === 'meetings' && styles.activeTabText]}>
                  ミーティング
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'recordings' && styles.activeTab]}
                onPress={() => handleTabChange('recordings')}
              >
                <Text style={[styles.tabText, activeTab === 'recordings' && styles.activeTabText]}>
                  録画
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
                onPress={() => handleTabChange('insights')}
              >
                <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
                  分析
                </Text>
              </TouchableOpacity>
            </View>
            
            <MeetingList 
              meetings={filteredMeetings}
              selectedMeetingId={selectedMeeting?.id}
              onSelectMeeting={selectMeeting}
              loading={zoomSpaceState.isLoading}
              compact={true}
            />
          </View>
          
          {/* 右側：詳細ビュー（録画/洞察） */}
          <View style={styles.mainContainer}>
            <View style={styles.mainHeader}>
              <Text style={styles.mainTitle}>
                {selectedMeeting ? selectedMeeting.title : 'Zoom会議'}
              </Text>
              <TouchableOpacity
                style={styles.splitViewButton}
                onPress={() => setSplitView(false)}
              >
                <Text style={styles.splitViewButtonText}>全画面表示</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.contentContainer}>
              {shouldShowRecordingPlayer() && (
                <View style={styles.playerContainer}>
                  <RecordingPlayer meeting={selectedMeeting} />
                </View>
              )}
              
              {shouldShowInsights() && (
                <View style={styles.insightsContainer}>
                  <MeetingInsights meeting={selectedMeeting} />
                </View>
              )}
              
              {!shouldShowRecordingPlayer() && !shouldShowInsights() && (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    ミーティングを選択すると、詳細情報が表示されます
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      );
    }
    
    // タブレット/デスクトップの全画面レイアウト
    if ((isTablet || isDesktop) && !splitView) {
      return (
        <View style={styles.fullscreenContainer}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'meetings' && styles.activeTab]}
              onPress={() => handleTabChange('meetings')}
            >
              <Text style={[styles.tabText, activeTab === 'meetings' && styles.activeTabText]}>
                ミーティング
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'recordings' && styles.activeTab]}
              onPress={() => handleTabChange('recordings')}
            >
              <Text style={[styles.tabText, activeTab === 'recordings' && styles.activeTabText]}>
                録画
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
              onPress={() => handleTabChange('insights')}
            >
              <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
                分析
              </Text>
            </TouchableOpacity>
            
            {isDesktop && selectedMeeting && (
              <TouchableOpacity
                style={styles.splitViewButton}
                onPress={() => setSplitView(true)}
              >
                <Text style={styles.splitViewButtonText}>分割表示</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.contentContainer}>
            {activeTab === 'meetings' && (
              <MeetingList 
                meetings={filteredMeetings}
                selectedMeetingId={selectedMeeting?.id}
                onSelectMeeting={selectMeeting}
                loading={zoomSpaceState.isLoading}
                compact={false}
              />
            )}
            
            {activeTab === 'recordings' && (
              <RecordingPlayer meeting={selectedMeeting} />
            )}
            
            {activeTab === 'insights' && (
              <MeetingInsights meeting={selectedMeeting} />
            )}
          </View>
        </View>
      );
    }
    
    // モバイルレイアウト
    return (
      <View style={styles.mobileContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'meetings' && styles.activeTab]}
            onPress={() => handleTabChange('meetings')}
          >
            <Text style={[styles.tabText, activeTab === 'meetings' && styles.activeTabText]}>
              ミーティング
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recordings' && styles.activeTab]}
            onPress={() => handleTabChange('recordings')}
          >
            <Text style={[styles.tabText, activeTab === 'recordings' && styles.activeTabText]}>
              録画
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
            onPress={() => handleTabChange('insights')}
          >
            <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>
              分析
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentContainer}>
          {activeTab === 'meetings' && (
            <MeetingList 
              meetings={filteredMeetings}
              selectedMeetingId={selectedMeeting?.id}
              onSelectMeeting={selectMeeting}
              loading={zoomSpaceState.isLoading}
              compact={false}
            />
          )}
          
          {activeTab === 'recordings' && (
            <RecordingPlayer meeting={selectedMeeting} />
          )}
          
          {activeTab === 'insights' && (
            <MeetingInsights meeting={selectedMeeting} />
          )}
        </View>
      </View>
    );
  };
  
  // ローディング状態の表示
  if (zoomSpaceState.isLoading && filteredMeetings.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>ミーティングデータを読み込み中...</Text>
      </SafeAreaView>
    );
  }
  
  // エラー状態の表示
  if (zoomSpaceState.error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorText}>{zoomSpaceState.error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadMeetings}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ミーティング管理</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadMeetings}
        >
          <Text style={styles.refreshButtonText}>更新</Text>
        </TouchableOpacity>
      </View>
      
      {renderLayout()}
    </SafeAreaView>
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
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#4a6da7',
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  fullscreenContainer: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a6da7',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  splitViewButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  splitViewButtonText: {
    fontSize: 12,
    color: '#4a6da7',
  },
  contentContainer: {
    flex: 1,
  },
  playerContainer: {
    flex: 1,
  },
  insightsContainer: {
    flex: 1,
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
});

export default ZoomSpace; 