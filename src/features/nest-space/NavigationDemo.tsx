import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, useWindowDimensions } from 'react-native';
import { NestSpaceProvider } from '@contexts/NestSpaceContext';
import NestSpaceNavigator from './NestSpaceNavigator';

/**
 * ナビゲーションシステムのデモコンポーネント
 */
const NavigationDemo: React.FC = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  return (
    <SafeAreaView style={styles.container}>
      <NestSpaceProvider>
        <View style={styles.contentContainer}>
          <Text style={styles.headerText}>ポコの巣（Poko's Nest）</Text>
          
          <View style={styles.demoContainer}>
            <Text style={styles.infoText}>
              下部または左側のナビゲーションを使って空間を切り替えてみてください。
              {isLargeScreen ? ' デスクトップモードでは、分割表示やPiP表示も利用できます。' : ''}
            </Text>
            
            {/* ナビゲーターコンポーネント */}
            <NestSpaceNavigator enableMultitasking={true} enableAnimations={true}>
              {/* Zoom空間のコンテンツを直接表示 */}
              {/* <ZoomSpaceScreen /> */}
            </NestSpaceNavigator>
            
            <Text style={styles.footnote}>
              キーボードショートカット: ⌘+[空間の頭文字] で素早く切り替え
            </Text>
          </View>
        </View>
      </NestSpaceProvider>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  demoContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  footnote: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    padding: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  }
});

export default NavigationDemo; 