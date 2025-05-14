import React from 'react';
import { StyleSheet } from 'react-native';
import { TwoTierHeader } from './TwoTierHeader';
import { useNest } from '../contexts/NestContext';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showEmoji?: boolean;
  emoji?: string;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

/**
 * アプリ全体で使用する共通ヘッダーコンポーネント
 * 上段にNestセレクター、下段に各画面のタイトルとアクションを表示
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showEmoji = false,
  emoji,
  onBackPress,
  rightComponent,
}) => {
  const { currentNest, nestMembers } = useNest();
  
  // 現在のNestに関する情報をサブタイトルに表示
  const defaultSubtitle = nestMembers?.length 
    ? `${nestMembers.length}人のメンバー` 
    : undefined;

  return (
    <TwoTierHeader
      title={title}
      subtitle={subtitle || defaultSubtitle}
      showBackButton={showBackButton}
      showEmoji={showEmoji}
      emoji={emoji}
      onBackPress={onBackPress}
      rightComponent={rightComponent}
    />
  );
}; 