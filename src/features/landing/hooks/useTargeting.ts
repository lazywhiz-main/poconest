import { useState, useEffect } from 'react';
import { TargetType, targetingConfig, TargetContent } from '../config/targetingConfig';

interface UseTargetingReturn {
  targetType: TargetType;
  content: TargetContent;
  setTargetType: (target: TargetType) => void;
}

export const useTargeting = (): UseTargetingReturn => {
  const [targetType, setTargetType] = useState<TargetType>('default');

  useEffect(() => {
    // URLパスからターゲットタイプを決定
    const path = window.location.pathname;
    
    if (path.includes('/ux-researcher')) {
      setTargetType('ux-researcher');
    } else if (path.includes('/product-manager')) {
      setTargetType('product-manager');
    } else if (path.includes('/startup-founder')) {
      setTargetType('startup-founder');
    } else if (path === '/' || path === '/landing') {
      setTargetType('default'); // デフォルトはUXリサーチャー向けと同じ
    }
  }, []);

  const content = targetingConfig[targetType];

  return {
    targetType,
    content,
    setTargetType
  };
}; 