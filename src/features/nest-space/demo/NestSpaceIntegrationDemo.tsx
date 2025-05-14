import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SpaceType } from '../../../types/nestSpace.types';
import NestSpaceContainer from '../components/NestSpaceContainer';
import AppLayout from '../../../components/layout/AppLayout';

/**
 * NestSpaceIntegrationDemoコンポーネント
 * 
 * NestSpaceContainerをAppLayoutと統合したデモ画面
 * スペース切り替えとマルチタスク設定をテスト可能
 */
const NestSpaceIntegrationDemo: React.FC = () => {
  const [activeSpace, setActiveSpace] = useState<SpaceType>(SpaceType.CHAT);
  const [enableMultitasking, setEnableMultitasking] = useState(true);
  const [preloadAll, setPreloadAll] = useState(false);

  // モックの未読カウント（0の値は含めない）
  const unreadCounts: Partial<Record<SpaceType, number>> = {
    [SpaceType.CHAT]: 3,
    [SpaceType.ZOOM]: 1,
  };
  
  // 空間選択ハンドラー
  const handleSelectSpace = (space: SpaceType) => {
    setActiveSpace(space);
  };

  return (
    <AppLayout
      activeSpace={activeSpace}
      onSelectSpace={handleSelectSpace}
      unreadCounts={unreadCounts}
    >
      {/* NestSpaceContainer */}
      <View style={styles.spaceContainer}>
        <NestSpaceContainer
          initialSpace={activeSpace}
          enableMultitasking={enableMultitasking}
          preloadAll={preloadAll}
        />
      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  spaceContainer: {
    flex: 1,
  },
});

export default NestSpaceIntegrationDemo; 