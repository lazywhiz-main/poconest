import React, { createContext, useContext, PropsWithChildren } from 'react';
import { useNestRealtime } from '../hooks/useNestRealtime';

// コンテキストの型定義
interface NestRealtimeContextType {
  isInitialized: boolean;
}

// コンテキストの作成
const NestRealtimeContext = createContext<NestRealtimeContextType | undefined>(undefined);

/**
 * NESTのリアルタイム同期を提供するプロバイダーコンポーネント
 * useNestRealtimeフックを使用して、リアルタイム同期機能を提供します
 */
export const NestRealtimeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // リアルタイム同期フックを使用
  const realtimeState = useNestRealtime();
  
  return (
    <NestRealtimeContext.Provider value={realtimeState}>
      {children}
    </NestRealtimeContext.Provider>
  );
};

/**
 * NESTのリアルタイム同期状態にアクセスするためのフック
 */
export const useNestRealtimeContext = (): NestRealtimeContextType => {
  const context = useContext(NestRealtimeContext);
  
  if (context === undefined) {
    throw new Error('useNestRealtimeContext must be used within a NestRealtimeProvider');
  }
  
  return context;
}; 