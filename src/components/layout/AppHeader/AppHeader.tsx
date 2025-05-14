import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { COLORS } from '@constants/config';
import { createStyles } from './AppHeader.styles';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
  showActionButton?: boolean;
  showEmoji?: boolean;
  emoji?: string;
  onBackPress?: () => void;
  onActionPress?: () => void;
  actionIcon?: React.ReactNode;
  actionLabel?: string;
  backgroundColor?: string;
  borderBottomColor?: string;
  testID?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  leftComponent,
  rightComponent,
  showBackButton = false,
  showActionButton = false,
  showEmoji = false,
  emoji = '🏡',
  onBackPress,
  onActionPress,
  actionIcon,
  actionLabel,
  backgroundColor = COLORS.white,
  borderBottomColor = COLORS.lightGray,
  testID = 'app-header',
}) => {
  // レスポンシブデザイン用に画面サイズを監視
  const { width } = useWindowDimensions();
  const [styles, setStyles] = useState(createStyles(backgroundColor, borderBottomColor));

  // 画面サイズが変わったらスタイルを更新
  useEffect(() => {
    setStyles(createStyles(backgroundColor, borderBottomColor));
  }, [width, backgroundColor, borderBottomColor]);

  // バックボタンのハンドラ
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    }
  };

  // アクションボタンのハンドラ
  const handleActionPress = () => {
    if (onActionPress) {
      onActionPress();
    }
  };

  // 戻るアイコン（プラットフォームに応じて異なる形状）
  const backIcon = () => {
    // ここでイオンアイコンの代わりにUnicodeシンボルを使用
    return <Text style={{ fontSize: 24 }}>
      {Platform.OS === 'ios' ? '‹' : '←'}
    </Text>;
  };

  return (
    <View style={styles.header} testID={testID}>
      {/* 左側領域 */}
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={handleBackPress} 
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            {backIcon()}
          </TouchableOpacity>
        )}
        {leftComponent}
      </View>

      {/* タイトル領域 */}
      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          {showEmoji && <Text style={styles.emoji}>{emoji}</Text>}
          <View style={styles.titleTextContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* 右側領域 */}
      <View style={styles.rightContainer}>
        {showActionButton && (
          <TouchableOpacity
            onPress={handleActionPress}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={actionLabel || "アクション"}
          >
            {actionIcon ? (
              actionIcon
            ) : (
              <Text style={styles.actionButtonText}>
                {actionLabel?.substring(0, 1) || '+'}
              </Text>
            )}
          </TouchableOpacity>
        )}
        {rightComponent}
      </View>
    </View>
  );
};

export default AppHeader; 