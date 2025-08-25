import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import type { 
  AnalysisSpaceState, 
  NetworkState, 
  Viewport, 
  FilterConfig, 
  ClusteringConfig,
  SidePanelType,
  NetworkNode,
  NetworkEdge,
  NetworkData
} from '../types';
import type { ClusterLabel } from '../../../../services/AnalysisService';
import type { ClusteringResult } from '../../../../services/SmartClusteringService';

// 初期状態
const initialState: AnalysisSpaceState = {
  network: {
    selectedNode: null,
    highlightedNodes: new Set(),
    transform: { x: 400, y: 300, scale: 0.5 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    showClusters: false,
    showDensity: false,
    activeFilters: {
      tags: [],
      types: [],
      relationships: [],
      strengthThreshold: 0.3
    },
    detectedClusters: [],
    containerDimensions: { width: 4800, height: 3600 },
    nodePositions: {}
  },
  networkData: null,
  activeSidePanel: null,
  clusteringConfig: {
    algorithm: 'hdbscan',
    strengthThreshold: 0.3,
    useWeightFiltering: true,
    showFilteredClusters: true
  },
  analysisResults: [],
  savedViews: [],
  searchQuery: '',
  isLoading: false,
  error: null,
  // GTA分析用の状態を追加
  gtaAnalysis: {
    currentAnalysis: null,
    isAnalyzing: false,
    analysisProgress: 0,
    clusters: [],
    clusteringResult: null
  }
};

// アクション型
type AnalysisSpaceAction =
  | { type: 'SET_NETWORK_STATE'; payload: Partial<NetworkState> }
  | { type: 'SET_TRANSFORM'; payload: Viewport }
  | { type: 'SET_SELECTED_NODE'; payload: NetworkNode | null }
  | { type: 'SET_HIGHLIGHTED_NODES'; payload: Set<string> }
  | { type: 'SET_ACTIVE_SIDE_PANEL'; payload: SidePanelType }
  | { type: 'SET_CLUSTERING_CONFIG'; payload: Partial<ClusteringConfig> }
  | { type: 'SET_FILTERS'; payload: Partial<FilterConfig> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'ADD_ANALYSIS_RESULT'; payload: any }
  | { type: 'SET_NETWORK_DATA'; payload: NetworkData | null }
  | { type: 'SET_CLUSTERING_RESULT'; payload: { clusters: any[]; clusteringResult: any | null } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_NETWORK_STATE' };

// リデューサー
const analysisSpaceReducer = (state: AnalysisSpaceState, action: AnalysisSpaceAction): AnalysisSpaceState => {
  switch (action.type) {
    case 'SET_NETWORK_STATE':
      return {
        ...state,
        network: { ...state.network, ...action.payload }
      };
    
    case 'SET_TRANSFORM':
      return {
        ...state,
        network: { ...state.network, transform: action.payload }
      };
    
    case 'SET_SELECTED_NODE':
      return {
        ...state,
        network: { ...state.network, selectedNode: action.payload }
      };
    
    case 'SET_HIGHLIGHTED_NODES':
      return {
        ...state,
        network: { ...state.network, highlightedNodes: action.payload }
      };
    
    case 'SET_ACTIVE_SIDE_PANEL':
      return {
        ...state,
        activeSidePanel: action.payload
      };
    
    case 'SET_NETWORK_DATA':
      return {
        ...state,
        networkData: action.payload
      };
    
    case 'SET_CLUSTERING_CONFIG':
      return {
        ...state,
        clusteringConfig: { ...state.clusteringConfig, ...action.payload }
      };
    
    case 'SET_FILTERS':
      return {
        ...state,
        network: {
          ...state.network,
          activeFilters: { ...state.network.activeFilters, ...action.payload }
        }
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      };
    
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload
      };
    
    case 'ADD_ANALYSIS_RESULT':
      return {
        ...state,
        analysisResults: [...state.analysisResults, action.payload]
      };
    
    case 'SET_CLUSTERING_RESULT':
      return {
        ...state,
        gtaAnalysis: {
          ...state.gtaAnalysis,
          clusters: action.payload.clusters,
          clusteringResult: action.payload.clusteringResult
        }
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'RESET_NETWORK_STATE':
      return {
        ...state,
        network: { ...initialState.network }
      };
    
    default:
      return state;
  }
};

// コンテキスト
interface AnalysisSpaceContextType {
  state: AnalysisSpaceState;
  dispatch: React.Dispatch<AnalysisSpaceAction>;
  // 便利なアクション関数
  setTransform: (transform: Viewport) => void;
  setSelectedNode: (nodeId: NetworkNode | null) => void;
  setHighlightedNodes: (nodeIds: Set<string>) => void;
  setActiveSidePanel: (panel: SidePanelType) => void;
  setClusteringConfig: (config: Partial<ClusteringConfig>) => void;
  setFilters: (filters: Partial<FilterConfig>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetNetworkState: () => void;
  setNetworkData: (data: NetworkData | null) => void;
  setClusteringResult: (clusters: any[], clusteringResult: any | null) => void;
}

const AnalysisSpaceContext = createContext<AnalysisSpaceContextType | undefined>(undefined);

// プロバイダー
interface AnalysisSpaceProviderProps {
  children: ReactNode;
}

export const AnalysisSpaceProvider: React.FC<AnalysisSpaceProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(analysisSpaceReducer, initialState);

  // 便利なアクション関数
  const setTransform = useCallback((transform: Viewport) => {
    dispatch({ type: 'SET_TRANSFORM', payload: transform });
  }, []);

  const setSelectedNode = useCallback((nodeId: NetworkNode | null) => {
    dispatch({ type: 'SET_SELECTED_NODE', payload: nodeId });
  }, []);

  const setHighlightedNodes = useCallback((nodeIds: Set<string>) => {
    dispatch({ type: 'SET_HIGHLIGHTED_NODES', payload: nodeIds });
  }, []);

  const setActiveSidePanel = useCallback((panel: SidePanelType) => {
    dispatch({ type: 'SET_ACTIVE_SIDE_PANEL', payload: panel });
  }, []);

  const setClusteringConfig = useCallback((config: Partial<ClusteringConfig>) => {
    dispatch({ type: 'SET_CLUSTERING_CONFIG', payload: config });
  }, []);

  const setFilters = useCallback((filters: Partial<FilterConfig>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetNetworkState = useCallback(() => {
    dispatch({ type: 'RESET_NETWORK_STATE' });
  }, []);

  const setNetworkData = useCallback((data: NetworkData | null) => {
    dispatch({ type: 'SET_NETWORK_DATA', payload: data });
  }, []);

  const setClusteringResult = useCallback((clusters: any[], clusteringResult: any | null) => {
    dispatch({ type: 'SET_CLUSTERING_RESULT', payload: { clusters, clusteringResult } });
  }, []);

  const value: AnalysisSpaceContextType = {
    state,
    dispatch,
    setTransform,
    setSelectedNode,
    setHighlightedNodes,
    setActiveSidePanel,
    setClusteringConfig,
    setFilters,
    setLoading,
    setError,
    clearError,
    resetNetworkState,
    setNetworkData,
    setClusteringResult
  };

  return (
    <AnalysisSpaceContext.Provider value={value}>
      {children}
    </AnalysisSpaceContext.Provider>
  );
};

// フック
export const useAnalysisSpace = (): AnalysisSpaceContextType => {
  const context = useContext(AnalysisSpaceContext);
  if (context === undefined) {
    throw new Error('useAnalysisSpace must be used within an AnalysisSpaceProvider');
  }
  return context;
};
