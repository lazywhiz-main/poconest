import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { responsiveFontSize, responsiveSpacing } from '../../utils/responsiveUtils';
import '../../styles/responsive.css';

/**
 * レスポンシブ機能のテストコンポーネント
 * 開発者がレスポンシブ動作を確認するためのテスト用コンポーネント
 * 
 * 使用方法:
 * import { ResponsiveTest } from '../components/test/ResponsiveTest';
 * <ResponsiveTest />
 */
export const ResponsiveTest: React.FC = () => {
  const responsive = useResponsive();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📱 レスポンシブテスト</Text>
      
      <View style={styles.infoSection}>
        <Text style={[styles.label, responsiveFontSize(14)]}>
          画面幅: {responsive.width}px
        </Text>
        <Text style={[styles.label, responsiveFontSize(14)]}>
          画面高さ: {responsive.height}px
        </Text>
        <Text style={[styles.label, responsiveFontSize(14)]}>
          ブレークポイント: {responsive.breakpoint}
        </Text>
        <Text style={[styles.label, responsiveFontSize(14)]}>
          デバイス: {responsive.isMobile ? 'モバイル' : responsive.isTablet ? 'タブレット' : 'デスクトップ'}
        </Text>
        <Text style={[styles.label, responsiveFontSize(14)]}>
          向き: {responsive.isLandscape ? 'ランドスケープ' : 'ポートレート'}
        </Text>
      </View>

      <View style={styles.testSection}>
        <Text style={[styles.sectionTitle, responsiveFontSize(16)]}>
          レスポンシブテスト
        </Text>
        
        <View style={[styles.testBox, responsiveSpacing(16)]}>
          <Text style={[styles.testText, responsiveFontSize(14)]}>
            このテキストはレスポンシブフォントサイズを使用
          </Text>
        </View>
        
        <div className="grid-responsive" style={{ marginTop: 16 }}>
          <div style={styles.gridItem}>
            <Text style={[styles.gridText, responsiveFontSize(12)]}>
              グリッド 1
            </Text>
          </div>
          <div style={styles.gridItem}>
            <Text style={[styles.gridText, responsiveFontSize(12)]}>
              グリッド 2
            </Text>
          </div>
          <div style={styles.gridItem}>
            <Text style={[styles.gridText, responsiveFontSize(12)]}>
              グリッド 3
            </Text>
          </div>
        </div>
      </View>

      <View style={styles.breakpointIndicator}>
        <Text style={[styles.breakpointText, responsiveFontSize(12)]}>
          {responsive.isMobile && '📱 モバイル表示'}
          {responsive.isTablet && '📱 タブレット表示'}
          {responsive.isDesktop && '💻 デスクトップ表示'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333366',
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#0f0f23',
    borderRadius: 4,
  },
  label: {
    color: '#e2e8f0',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  testSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#00ff88',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testBox: {
    backgroundColor: '#333366',
    borderRadius: 4,
    marginBottom: 8,
  },
  testText: {
    color: '#e2e8f0',
  },
  gridItem: {
    backgroundColor: '#4a6da7',
    padding: 8,
    borderRadius: 4,
    minHeight: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  breakpointIndicator: {
    backgroundColor: '#00ff88',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  breakpointText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ResponsiveTest; 