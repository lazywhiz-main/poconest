import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import MeetingSpace from '../components/MeetingSpace';

/**
 * ミーティング空間のルートスクリーンコンポーネント
 * NESTアプリのメインナビゲーションから呼び出される
 */
const MeetingSpaceScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <MeetingSpace />
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