import React, { 
  useState, 
  useEffect, 
  useMemo, 
  useCallback, 
  Suspense, 
  lazy,
} from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Text, 
  useWindowDimensions,
  Platform,
  TouchableOpacity
} from 'react-native';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType, LayoutType } from '../types/nestSpace.types';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Space component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Mock space components for lazy loading
const MockSpaceComponent = ({ name, color = '#f0f0f0' }: { name: string; color?: string }) => (
  <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: color }]}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>{name}</Text>
    <Text style={{ fontSize: 16, textAlign: 'center' }}>
      こちらは{name}のプレイスホルダーです。
    </Text>
  </View>
);

// 各空間の遅延ロード
const LazySpaceComponents = {
  [SpaceType.CHAT]: lazy(() => import("../../chat-space/components/ChatSpace").catch((err) => { console.error('Failed to load ChatSpace:', err); return { default: () => <MockSpaceComponent name="チャット空間" color="#e3f2fd" /> }; })),
  
  [SpaceType.BOARD]: lazy(() => import("../../board-space/components/BoardSpace").catch((err) => { console.error('Failed to load BoardSpace:', err); return { default: () => <MockSpaceComponent name="ボード空間" color="#e8f5e9" /> }; })),
  
  [SpaceType.MEETING]: lazy(() => import("../../nest-space/meeting-space/components/MeetingSpace").catch((err) => { console.error('Failed to load MeetingSpace:', err); return { default: () => <MockSpaceComponent name="ミーティング空間" color="#f3e5f5" /> }; })),
  
  [SpaceType.ANALYSIS]: lazy(() => import("../../analysis-space/components/AnalysisSpace").catch((err) => { console.error('Failed to load AnalysisSpace:', err); return { default: () => <MockSpaceComponent name="分析空間" color="#fff3e0" /> }; })),
  
  [SpaceType.USER_PROFILE]: lazy(() => import("../../user-profile/components/UserProfileSpace").catch((err) => { console.error('Failed to load UserProfileSpace:', err); return { default: () => <MockSpaceComponent name="プロフィール設定" color="#f5f5f5" /> }; })),
};

// Loading fallback component
const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4a6da7" />
    <Text style={styles.loadingText}>空間を読み込み中...</Text>
  </View>
);

// Error fallback component
const ErrorFallback = ({ spaceType, onRetry }: { spaceType: SpaceType; onRetry: () => void }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>エラーが発生しました</Text>
    <Text style={styles.errorText}>
      {spaceType}空間の読み込み中にエラーが発生しました。
    </Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryButtonText}>再試行</Text>
    </TouchableOpacity>
  </View>
);

interface NestSpaceContainerProps {
  initialSpace?: SpaceType;
  enableMultitasking?: boolean;
  preloadAll?: boolean;
}

// Define a view type for our component usage
interface SpaceView {
  spaceId: string;
  isVisible: boolean;
  splitView?: {
    isEnabled: boolean;
    splitRatio: number;
    secondarySpaceId?: string;
  };
}

/**
 * NestSpaceContainer - マルチスペースコンテナコンポーネント
 * 
 * 各種空間コンポーネントを遅延ロードし、統合されたUXを提供する
 * 分割ビューやPiPモードをサポートし、デバイスサイズに適応する
 */
const NestSpaceContainer: React.FC<NestSpaceContainerProps> = ({
  initialSpace = SpaceType.CHAT,
  enableMultitasking = true,
  preloadAll = false
}) => {
  const { width, height } = useWindowDimensions();
  
  // Use useNestSpace hook again
  const nestSpace = useNestSpace();
  // The undefined check is now inside useNestSpace hook
  
  const navigateToSpace = nestSpace.navigateToSpace;
  
  const [mockState, setMockState] = useState({
    activeSpaceId: initialSpace,
    views: [
      { 
        spaceId: initialSpace, 
        isVisible: true, 
        splitView: { 
          isEnabled: false, 
          splitRatio: 0.5 
        } 
      }
    ],
  });
  
  // エラー発生時のリトライ状態
  const [retryCounter, setRetryCounter] = useState<Record<string, number>>({});
  
  // スプリットビューのサイズ設定
  const [splitRatio, setSplitRatio] = useState(0.5);
  
  // ピクチャーインピクチャー設定
  const [pipSpace, setPipSpace] = useState<any | null>(null);
  
  // 現在のデバイスレイアウト
  const currentLayout = useMemo<LayoutType>(() => {
    return nestSpace.spaceState.layoutType || LayoutType.DESKTOP;
  }, [nestSpace.spaceState.layoutType]);
  
  // アクティブな空間ID
  const activeSpaceId = useMemo(() => {
    return nestSpace.spaceState.activeSpaceType || mockState.activeSpaceId;
  }, [nestSpace.spaceState.activeSpaceType, mockState.activeSpaceId]);
  
  // ビューの状態
  const views = useMemo(() => {
    return mockState.views as any[];
  }, [mockState.views]);
  
  // アクティブな空間ビュー
  const activeView = useMemo(() => {
    return views.find(view => view.spaceId === activeSpaceId);
  }, [views, activeSpaceId]);
  
  // スプリットビュー状態
  const hasSplitView = useMemo(() => {
    return activeView?.splitView?.isEnabled && 
           activeView?.splitView?.secondarySpaceId && 
           currentLayout !== LayoutType.MOBILE;
  }, [activeView, currentLayout]);
  
  // ピクチャーインピクチャーの表示可能判定
  const canShowPiP = useMemo(() => {
    return enableMultitasking && 
           currentLayout !== LayoutType.MOBILE && 
           pipSpace !== null;
  }, [enableMultitasking, currentLayout, pipSpace]);
  
  // 初期空間への遷移
  useEffect(() => {
    if (initialSpace && activeSpaceId !== initialSpace) {
      navigateToSpace(initialSpace);
      setMockState(prev => ({ ...prev, activeSpaceId: initialSpace }));
    }
  }, [initialSpace, activeSpaceId, navigateToSpace]);
  
  // プリロード設定 - 現在は実際の動的インポートがないのでこの部分は効果なし
  useEffect(() => {
    if (preloadAll) {
      console.log('Preloading all spaces (mock)');
      // 実際のダイナミックインポートがない場合は何もしない
    }
  }, [preloadAll]);
  
  // エラー時のリトライハンドラー
  const handleRetry = useCallback((spaceId: string) => {
    setRetryCounter(prev => ({
      ...prev,
      [spaceId]: (prev[spaceId] || 0) + 1
    }));
  }, []);
  
  // スプリットビューのリサイズハンドラー
  const handleSplitResize = useCallback((newRatio: number) => {
    setSplitRatio(newRatio);
    
    // Update split ratio in our state
    setMockState(prev => {
      const updatedViews = prev.views.map(view => {
        if (view.spaceId === prev.activeSpaceId && view.splitView) {
          return {
            ...view,
            splitView: {
              ...view.splitView,
              splitRatio: newRatio
            }
          };
        }
        return view;
      });
      
      return {
        ...prev,
        views: updatedViews
      };
    });
  }, []);
  
  // ピクチャーインピクチャーの移動ハンドラー
  const handlePipMove = useCallback((position: { x: number, y: number }) => {
    if (pipSpace) {
      setPipSpace({
        ...pipSpace,
        position
      });
    }
  }, [pipSpace]);
  
  // 空間を PiP モードに切り替え
  const togglePipMode = useCallback((spaceId: string) => {
    if (pipSpace?.spaceId === spaceId) {
      // PiPを閉じる
      setPipSpace(null);
    } else {
      // 新しいPiP空間を設定
      setPipSpace({
        spaceId,
        position: { x: width - 320, y: height - 240 },
        size: { width: 320, height: 240 }
      });
    }
  }, [pipSpace, width, height]);
  
  // 特定のスペースをレンダリング
  const renderSpace = useCallback((spaceId: string, size?: { width: number, height: number }) => {
    const spaceType = spaceId as SpaceType;
    const SpaceComponent = LazySpaceComponents[spaceType];
    
    if (!SpaceComponent) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>無効な空間タイプです: {spaceType}</Text>
        </View>
      );
    }
    
    // BoardSpaceのみpropsを渡す。as anyで型エラーを一時的に回避
    if (spaceType === SpaceType.BOARD) {
      if (!nestSpace.currentNest?.id) {
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>NEST IDが設定されていません</Text>
          </View>
        );
      }
      return (
        <ErrorBoundary
          fallback={
            <ErrorFallback 
              spaceType={spaceType} 
              onRetry={() => handleRetry(spaceId)} 
            />
          }
        >
          <Suspense fallback={<LoadingFallback />}>
            {React.createElement(SpaceComponent as any, { nestId: nestSpace.currentNest.id })}
          </Suspense>
        </ErrorBoundary>
      );
    }

    // それ以外はpropsなしで呼び出す。as anyで型エラーを一時的に回避
    return (
      <ErrorBoundary
        fallback={
          <ErrorFallback 
            spaceType={spaceType} 
            onRetry={() => handleRetry(spaceId)} 
          />
        }
      >
        <Suspense fallback={<LoadingFallback />}>
          {React.createElement(SpaceComponent as any)}
        </Suspense>
      </ErrorBoundary>
    );
  }, [retryCounter, handleRetry, nestSpace.currentNest?.id]);
  
  // メインコンテンツのレンダリング
  const renderContent = useCallback(() => {
    if (!activeSpaceId) {
      return <LoadingFallback />;
    }
    
    if (hasSplitView && activeView?.splitView?.secondarySpaceId) {
      // スプリットビューのレンダリング
      const secondarySpaceId = activeView.splitView.secondarySpaceId;
      const ratio = activeView.splitView.splitRatio || splitRatio;
      
      return (
        <View style={styles.splitContainer}>
          <View style={[styles.splitPane, { flex: ratio }]}>
            {renderSpace(activeSpaceId)}
          </View>
          
          <View style={styles.splitDivider}>
            <View style={styles.dividerHandle} />
          </View>
          
          <View style={[styles.splitPane, { flex: 1 - ratio }]}>
            {renderSpace(secondarySpaceId)}
          </View>
        </View>
      );
    }
    
    // 通常の単一空間ビュー
    return renderSpace(activeSpaceId);
  }, [activeSpaceId, hasSplitView, activeView, splitRatio, renderSpace]);
  
  // PiP モードのレンダリング
  const renderPiP = useCallback(() => {
    if (!canShowPiP || !pipSpace) return null;
    
    return (
      <View 
        style={[
          styles.pipContainer,
          {
            left: pipSpace.position.x,
            top: pipSpace.position.y,
            width: pipSpace.size.width,
            height: pipSpace.size.height
          }
        ]}
      >
        <View style={styles.pipHeader}>
          <Text style={styles.pipTitle}>
            {pipSpace.spaceId}
          </Text>
          <TouchableOpacity onPress={() => togglePipMode(pipSpace.spaceId)}>
            <Text style={styles.pipClose}>×</Text>
          </TouchableOpacity>
        </View>
        
        {renderSpace(pipSpace.spaceId, pipSpace.size)}
      </View>
    );
  }, [canShowPiP, pipSpace, togglePipMode, renderSpace]);
  
  return (
    <View style={styles.container}>
      {/* メインコンテンツ */}
      <View style={styles.contentContainer}>
        {renderContent()}
      </View>
      
      {/* ピクチャーインピクチャー */}
      {renderPiP()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'cyan',
  },
  contentContainer: {
    flex: 1,
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  splitPane: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  splitDivider: {
    width: 8,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerHandle: {
    width: 4,
    height: 36,
    backgroundColor: '#a0a0a0',
    borderRadius: 2,
  },
  pipContainer: {
    position: 'absolute',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: '#fff',
  },
  pipHeader: {
    height: 24,
    backgroundColor: '#4a6da7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pipTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pipClose: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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

export default NestSpaceContainer; 