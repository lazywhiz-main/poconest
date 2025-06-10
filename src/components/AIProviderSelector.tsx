import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIProviderManager } from '../services/ai/AIProviderManager';
import { AIProviderType } from '../services/ai/providers/AIProvider';

export interface AIProviderSelectorProps {
  nestId?: string; // Nest-specific settings support
}

const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({ nestId }) => {
  const [primaryProvider, setPrimaryProvider] = useState<'openai' | 'gemini'>('openai');
  const [enableFallback, setEnableFallback] = useState(true);
  const [providerStatus, setProviderStatus] = useState<{
    openai: 'available' | 'unavailable' | 'checking';
    gemini: 'available' | 'unavailable' | 'checking';
  }>({
    openai: 'checking',
    gemini: 'checking'
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load settings based on nestId or global settings
  useEffect(() => {
    loadSettings();
    checkProviderStatus();
  }, [nestId]);

  const getStorageKey = (key: string) => {
    return nestId ? `nest_${nestId}_${key}` : key;
  };

  const loadSettings = () => {
    try {
      const savedPrimary = localStorage.getItem(getStorageKey('ai_primary_provider')) as 'openai' | 'gemini';
      const savedFallback = localStorage.getItem(getStorageKey('ai_enable_fallback'));
      
      if (savedPrimary) {
        setPrimaryProvider(savedPrimary);
      }
      if (savedFallback !== null) {
        setEnableFallback(savedFallback === 'true');
      }
    } catch (error) {
      console.error('Failed to load AI provider settings:', error);
    }
  };

  const saveSettings = (primary: 'openai' | 'gemini', fallback: boolean) => {
    try {
      localStorage.setItem(getStorageKey('ai_primary_provider'), primary);
      localStorage.setItem(getStorageKey('ai_enable_fallback'), fallback.toString());
    } catch (error) {
      console.error('Failed to save AI provider settings:', error);
    }
  };

  const checkProviderStatus = async () => {
    setProviderStatus({
      openai: 'checking',
      gemini: 'checking'
    });

    try {
      const { AIProviderManager } = await import('../services/ai/AIProviderManager');
      const manager = AIProviderManager.getInstance();
      
      const [openaiAvailable, geminiAvailable] = await Promise.all([
        manager.checkProviderAvailability('openai'),
        manager.checkProviderAvailability('gemini')
      ]);

      setProviderStatus({
        openai: openaiAvailable ? 'available' : 'unavailable',
        gemini: geminiAvailable ? 'available' : 'unavailable'
      });
    } catch (error) {
      console.error('Failed to check provider status:', error);
      setProviderStatus({
        openai: 'unavailable',
        gemini: 'unavailable'
      });
    }
  };

  const handlePrimaryProviderChange = (provider: 'openai' | 'gemini') => {
    setPrimaryProvider(provider);
    saveSettings(provider, enableFallback);
  };

  const handleFallbackToggle = () => {
    const newFallback = !enableFallback;
    setEnableFallback(newFallback);
    saveSettings(primaryProvider, newFallback);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkProviderStatus();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#00ff88';
      case 'unavailable': return '#e74c3c';
      case 'checking': return '#f39c12';
      default: return '#6c7086';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return '利用可能';
      case 'unavailable': return '利用不可';
      case 'checking': return '確認中...';
      default: return '不明';
    }
  };

  return (
    <div style={styles.container}>
      {nestId && (
        <div style={styles.nestInfo}>
          <Text style={styles.nestInfoText}>
            このNest専用の設定 (ID: {nestId.slice(0, 8)}...)
          </Text>
        </div>
      )}
      
      <div style={styles.section}>
        <Text style={styles.sectionTitle}>プライマリプロバイダー</Text>
        <Text style={styles.sectionDescription}>
          メインで使用するAIプロバイダーを選択してください
        </Text>
        
        <div style={styles.providerGrid}>
          {/* OpenAI Option */}
          <button
            style={{
              ...styles.providerCard,
              borderColor: primaryProvider === 'openai' ? '#00ff88' : '#333366',
              backgroundColor: primaryProvider === 'openai' ? 'rgba(0, 255, 136, 0.1)' : '#1a1a2e'
            }}
            onClick={() => handlePrimaryProviderChange('openai')}
          >
            <div style={styles.providerHeader}>
              <Text style={styles.providerName}>OpenAI</Text>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(providerStatus.openai)
              }}>
                <Text style={styles.statusText}>
                  {getStatusText(providerStatus.openai)}
                </Text>
              </div>
            </div>
            <Text style={styles.providerDescription}>
              GPT-4, text-embedding-3-small
            </Text>
          </button>

          {/* Gemini Option */}
          <button
            style={{
              ...styles.providerCard,
              borderColor: primaryProvider === 'gemini' ? '#00ff88' : '#333366',
              backgroundColor: primaryProvider === 'gemini' ? 'rgba(0, 255, 136, 0.1)' : '#1a1a2e'
            }}
            onClick={() => handlePrimaryProviderChange('gemini')}
          >
            <div style={styles.providerHeader}>
              <Text style={styles.providerName}>Gemini</Text>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(providerStatus.gemini)
              }}>
                <Text style={styles.statusText}>
                  {getStatusText(providerStatus.gemini)}
                </Text>
              </div>
            </div>
            <Text style={styles.providerDescription}>
              Gemini 2.0 Flash, gemini-embedding-exp
            </Text>
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.settingRow}>
          <div>
            <Text style={styles.settingTitle}>フォールバック機能</Text>
            <Text style={styles.settingDescription}>
              プライマリプロバイダーが利用できない場合、自動的に他のプロバイダーを使用
            </Text>
          </div>
          <button
            style={{
              ...styles.toggleButton,
              backgroundColor: enableFallback ? '#00ff88' : '#313244'
            }}
            onClick={handleFallbackToggle}
          >
            <div style={{
              ...styles.toggleThumb,
              transform: enableFallback ? 'translateX(20px)' : 'translateX(2px)'
            }} />
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <button
          style={styles.refreshButton}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <Text style={styles.refreshButtonText}>
            {isRefreshing ? '確認中...' : 'プロバイダー状況を更新'}
          </Text>
        </button>
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  nestInfo: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  nestInfoText: {
    color: '#00ff88',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6c7086',
    marginBottom: 16,
    lineHeight: '1.5',
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 12,
  },
  providerCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: 6,
    padding: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  providerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  providerDescription: {
    fontSize: 12,
    color: '#6c7086',
    lineHeight: '1.4',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#6c7086',
    lineHeight: '1.4',
  },
  toggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    outline: 'none',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    position: 'absolute',
    top: 2,
    transition: 'transform 0.2s ease',
  },
  refreshButton: {
    backgroundColor: '#313244',
    border: '1px solid #45475a',
    borderRadius: 6,
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    width: '100%',
  },
  refreshButtonText: {
    color: '#a6adc8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
});

export default AIProviderSelector; 