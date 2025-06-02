import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import MeetingSpace from '../components/MeetingSpace';
import { useNest } from '../../../nest/contexts/NestContext';

/**
 * ミーティング空間のルートスクリーンコンポーネント
 * NESTアプリのメインナビゲーションから呼び出される
 */
const MeetingSpaceScreen: React.FC = () => {
  const { currentNest } = useNest();
  return (
    <SafeAreaView style={styles.container}>
      <MeetingSpace nestId={currentNest?.id || ''} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default MeetingSpaceScreen; 