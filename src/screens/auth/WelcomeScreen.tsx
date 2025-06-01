import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';

interface WelcomeScreenProps {
  userName: string;
  onEnterNest: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName, onEnterNest }) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Top gradient bar */}
        <View style={styles.topGradientBar} pointerEvents="none">
          <svg width="100%" height="3" style={{ display: 'block' }}>
            <defs>
              <linearGradient id="welcomeBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ff88" />
                <stop offset="50%" stopColor="#64b5f6" />
                <stop offset="100%" stopColor="#9c27b0" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100%" height="3" fill="url(#welcomeBarGradient)" rx="2" />
          </svg>
        </View>
        <Text style={styles.welcomeTitle}>{userName}さん、Welcome to TechOS!</Text>
        <Text style={styles.welcomeSubtitle}>あなた専用の <Text style={styles.nestText}>NEST</Text> を作成しました。</Text>
        <Text style={styles.sectionTitle}>NESTには、すぐに使える4つのSPACEを用意しています:</Text>
        <View style={styles.spaceList}>
          <View style={styles.spaceItem}>
            <Text style={styles.spaceIcon}>💬</Text>
            <Text style={styles.spaceName}>Chat</Text>
            <Text style={styles.spaceDesc}>チームとのリアルタイムコミュニケーション</Text>
          </View>
          <View style={styles.spaceItem}>
            <Text style={styles.spaceIcon}>📅</Text>
            <Text style={styles.spaceName}>Meeting</Text>
            <Text style={styles.spaceDesc}>スケジュールと議事録の一元管理</Text>
          </View>
          <View style={styles.spaceItem}>
            <Text style={styles.spaceIcon}>🗂️</Text>
            <Text style={styles.spaceName}>Board</Text>
            <Text style={styles.spaceDesc}>タスクやアイデアの可視化</Text>
          </View>
          <View style={styles.spaceItem}>
            <Text style={styles.spaceIcon}>📊</Text>
            <Text style={styles.spaceName}>Analysis</Text>
            <Text style={styles.spaceDesc}>データ分析とレポート</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={onEnterNest}>
          <Text style={styles.ctaButtonText}>NESTに入る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 16,
    padding: 40,
    position: 'relative',
    alignItems: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  topGradientBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00ff88',
    fontFamily: 'JetBrains Mono',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#a6adc8',
    marginBottom: 24,
    textAlign: 'center',
  },
  nestText: {
    color: '#64b5f6',
    fontWeight: '700',
    fontFamily: 'JetBrains Mono',
  },
  sectionTitle: {
    fontSize: 15,
    color: '#e2e8f0',
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'JetBrains Mono',
    textAlign: 'center',
  },
  spaceList: {
    width: '100%',
    marginBottom: 32,
  },
  spaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  spaceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  spaceName: {
    fontFamily: 'JetBrains Mono',
    color: '#00ff88',
    fontWeight: '700',
    fontSize: 15,
    marginRight: 8,
  },
  spaceDesc: {
    color: '#a6adc8',
    fontSize: 14,
  },
  ctaButton: {
    marginTop: 12,
    backgroundColor: '#00ff88',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#0f0f23',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase',
  },
});

export default WelcomeScreen; 