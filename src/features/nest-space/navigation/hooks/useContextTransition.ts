import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ContextTransition, 
  ViewMode, 
  LayoutMode 
} from '../types/navigation.types';
import { SpaceType } from '../../types/nestSpace.types';

// トランジションの種類に応じたデフォルトアニメーション
const DEFAULT_ANIMATIONS: Record<string, string> = {
  push: 'slide',
  replace: 'fade',
  reset: 'none'
};

/**
 * コンテキスト遷移を管理するフック
 */
export const useContextTransition = (
  viewMode: ViewMode,
  layoutMode: LayoutMode,
  enableAnimations: boolean = true
) => {
  // 現在のトランジション状態
  const [transition, setTransition] = useState<ContextTransition | null>(null);
  
  // トランジション中かどうか
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // アニメーション完了を検知するためのタイマー
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // 前回のトランジションを記憶
  const lastTransitionRef = useRef<ContextTransition | null>(null);
  
  // モードに基づくトランジション時間の決定
  const getTransitionDuration = useCallback(() => {
    if (!enableAnimations) return 0;
    
    // デバイスタイプに応じたトランジション時間
    switch (viewMode) {
      case 'desktop':
        return 200;
      case 'tablet':
        return 250;
      case 'mobile':
        return 300;
      default:
        return 250;
    }
  }, [viewMode, enableAnimations]);
  
  // レイアウトモードに基づくアニメーション調整
  const getAnimationType = useCallback((
    transitionType: 'push' | 'replace' | 'reset',
    specifiedAnimation?: 'slide' | 'fade' | 'none'
  ): 'slide' | 'fade' | 'none' => {
    if (!enableAnimations) return 'none';
    
    // 指定されたアニメーションがあればそれを使用
    if (specifiedAnimation) return specifiedAnimation;
    
    // 分割表示の場合はフェードを使用
    if (layoutMode === 'split') {
      return 'fade';
    }
    
    // デフォルトのアニメーション
    return DEFAULT_ANIMATIONS[transitionType] as 'slide' | 'fade' | 'none';
  }, [enableAnimations, layoutMode]);
  
  // トランジションの開始
  const startTransition = useCallback((newTransition: ContextTransition) => {
    // 前回のトランジションの中断処理
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    
    // アニメーションタイプの決定
    const animationType = getAnimationType(
      newTransition.transitionType,
      newTransition.animationType
    );
    
    // トランジション状態の更新
    setTransition({
      ...newTransition,
      animationType
    });
    
    setIsTransitioning(true);
    lastTransitionRef.current = newTransition;
    
    // トランジション終了タイマーの設定
    const duration = getTransitionDuration();
    if (duration > 0) {
      animationTimerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        animationTimerRef.current = null;
      }, duration);
    } else {
      // アニメーションがない場合は即座に完了
      setIsTransitioning(false);
    }
  }, [getAnimationType, getTransitionDuration]);
  
  // 特定の空間への遷移
  const navigateToSpace = useCallback((
    targetSpaceType: SpaceType,
    options: {
      sourceContextId?: string;
      targetContextId?: string;
      transitionType?: 'push' | 'replace' | 'reset';
      animationType?: 'slide' | 'fade' | 'none';
      payload?: Record<string, any>;
    } = {}
  ) => {
    const {
      sourceContextId,
      targetContextId,
      transitionType = 'push',
      animationType,
      payload
    } = options;
    
    // 現在の空間を取得
    const sourceSpaceType = lastTransitionRef.current?.targetSpaceType || 
                           transition?.targetSpaceType || 
                           SpaceType.CHAT; // デフォルト値
    
    // 同じ空間への遷移でコンテキストも同じ場合は何もしない
    if (
      sourceSpaceType === targetSpaceType && 
      sourceContextId === targetContextId &&
      !payload
    ) {
      return;
    }
    
    // トランジションの開始
    startTransition({
      sourceSpaceType,
      targetSpaceType,
      sourceContextId,
      targetContextId,
      transitionType,
      animationType,
      payload
    });
  }, [transition, startTransition]);
  
  // トランジションの中断
  const cancelTransition = useCallback(() => {
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    
    setIsTransitioning(false);
    setTransition(null);
  }, []);
  
  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);
  
  // トランジションの方向を決定（前進か後退か）
  const getTransitionDirection = useCallback((): 'forward' | 'backward' | 'none' => {
    if (!transition || !lastTransitionRef.current) return 'none';
    
    // トランジションの種類による判定
    if (transition.transitionType === 'push') return 'forward';
    if (transition.transitionType === 'reset') return 'backward';
    
    // 履歴に基づく方向の判定
    const current = transition.targetSpaceType;
    const previous = lastTransitionRef.current.sourceSpaceType;
    
    // 空間タイプのordinal値を使用した方向判定の例
    // 実際の実装ではSpaceTypeの定義に基づいて適切に調整
    return current > previous ? 'forward' : 'backward';
  }, [transition]);
  
  return {
    transition,
    isTransitioning,
    navigateToSpace,
    cancelTransition,
    getTransitionDirection,
    transitionDuration: getTransitionDuration()
  };
}; 