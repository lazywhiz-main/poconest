import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import ZoomSpace from '../components/ZoomSpace';

/**
 * Zoom空間のルートスクリーンコンポーネント
 * NESTアプリのメインナビゲーションから呼び出される
 */
const ZoomSpaceScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ZoomSpace />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default ZoomSpaceScreen; 