import React, { useState, useEffect } from 'react';
import { AIProviderManager } from '../services/ai/AIProviderManager';
import { AIProviderType } from '../services/ai/providers/AIProvider';

interface ProviderStatus {
  openai: boolean;
  gemini: boolean;
}

interface AIProviderSelectorProps {
  selectedProvider: 'openai' | 'gemini';
  onProviderChange: (provider: 'openai' | 'gemini') => void;
  enableFallback: boolean;
  onFallbackChange: (enabled: boolean) => void;
}

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  selectedProvider,
  onProviderChange,
  enableFallback,
  onFallbackChange,
}) => {
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    openai: false,
    gemini: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  const aiManager = AIProviderManager.getInstance();

  const checkProviderStatus = async () => {
    setIsChecking(true);
    try {
      const [openaiAvailable, geminiAvailable] = await Promise.all([
        aiManager.checkProviderAvailability(AIProviderType.OPENAI),
        aiManager.checkProviderAvailability(AIProviderType.GEMINI),
      ]);

      setProviderStatus({
        openai: openaiAvailable,
        gemini: geminiAvailable,
      });
    } catch (error) {
      console.error('Failed to check provider status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkProviderStatus();
  }, []);

  const getStatusColor = (provider: 'openai' | 'gemini') => {
    if (isChecking) return '#f39c12';
    return providerStatus[provider] ? '#00ff88' : '#e74c3c';
  };

  const getStatusText = (provider: 'openai' | 'gemini') => {
    if (isChecking) return 'チェック中...';
    return providerStatus[provider] ? '利用可能' : '利用不可';
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>AIプロバイダー選択</h3>
        <button 
          onClick={checkProviderStatus}
          style={refreshButtonStyle}
          disabled={isChecking}
        >
          {isChecking ? '⟳' : '↻'} 更新
        </button>
      </div>

      <div style={providersContainerStyle}>
        {/* OpenAI Card */}
        <div 
          style={{
            ...providerCardStyle,
            borderColor: selectedProvider === 'openai' ? '#00ff88' : '#333366',
            backgroundColor: selectedProvider === 'openai' ? 'rgba(0, 255, 136, 0.1)' : '#1a1a2e',
          }}
          onClick={() => onProviderChange('openai')}
        >
          <div style={providerHeaderStyle}>
            <span style={providerNameStyle}>OpenAI GPT-4o</span>
            <div style={{
              ...statusIndicatorStyle,
              backgroundColor: getStatusColor('openai'),
            }} />
          </div>
          <div style={statusTextStyle}>
            {getStatusText('openai')}
          </div>
        </div>

        {/* Gemini Card */}
        <div 
          style={{
            ...providerCardStyle,
            borderColor: selectedProvider === 'gemini' ? '#00ff88' : '#333366',
            backgroundColor: selectedProvider === 'gemini' ? 'rgba(0, 255, 136, 0.1)' : '#1a1a2e',
          }}
          onClick={() => onProviderChange('gemini')}
        >
          <div style={providerHeaderStyle}>
            <span style={providerNameStyle}>Google Gemini</span>
            <div style={{
              ...statusIndicatorStyle,
              backgroundColor: getStatusColor('gemini'),
            }} />
          </div>
          <div style={statusTextStyle}>
            {getStatusText('gemini')}
          </div>
        </div>
      </div>

      {/* Fallback Toggle */}
      <div style={fallbackContainerStyle}>
        <div style={fallbackToggleStyle}>
          <span style={fallbackLabelStyle}>フォールバック機能</span>
          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={enableFallback}
              onChange={(e) => onFallbackChange(e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              ...toggleBackgroundStyle,
              backgroundColor: enableFallback ? '#00ff88' : '#313244',
            }}>
              <div style={{
                ...toggleKnobStyle,
                transform: enableFallback ? 'translateX(20px)' : 'translateX(2px)',
              }} />
            </div>
          </label>
        </div>
        <p style={fallbackDescriptionStyle}>
          プライマリプロバイダーが利用できない場合、自動的に他のプロバイダーに切り替えます
        </p>
      </div>
    </div>
  );
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '20px',
  backgroundColor: '#0f0f1a',
  borderRadius: '12px',
  border: '1px solid #333366',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '16px',
};

const titleStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: 0,
};

const refreshButtonStyle: React.CSSProperties = {
  backgroundColor: '#333366',
  color: '#ffffff',
  border: 'none',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const providersContainerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px',
  marginBottom: '20px',
};

const providerCardStyle: React.CSSProperties = {
  padding: '16px',
  border: '2px solid',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const providerHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '8px',
};

const providerNameStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
};

const statusIndicatorStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
};

const statusTextStyle: React.CSSProperties = {
  color: '#b4b4b4',
  fontSize: '14px',
};

const fallbackContainerStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: '#1a1a2e',
  borderRadius: '8px',
  border: '1px solid #333366',
};

const fallbackToggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '8px',
};

const fallbackLabelStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '500',
};

const toggleStyle: React.CSSProperties = {
  cursor: 'pointer',
};

const toggleBackgroundStyle: React.CSSProperties = {
  width: '44px',
  height: '24px',
  borderRadius: '12px',
  position: 'relative',
  transition: 'background-color 0.2s ease',
};

const toggleKnobStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#ffffff',
  position: 'absolute',
  top: '2px',
  transition: 'transform 0.2s ease',
};

const fallbackDescriptionStyle: React.CSSProperties = {
  color: '#b4b4b4',
  fontSize: '14px',
  margin: 0,
  lineHeight: '1.4',
}; 