import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AIUsageLogger, AIUsageSummary } from '../../services/ai/AIUsageLogger';
import Icon from '../../components/ui/Icon';

interface ActivityPageProps {
  onClose: () => void;
}

export const ActivityPage: React.FC<ActivityPageProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-usage' | 'history'>('overview');
  const [loading, setLoading] = useState(false);
  
  // AI使用量データ
  const [todayUsage, setTodayUsage] = useState<AIUsageSummary | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<AIUsageSummary | null>(null);
  const [usageHistory, setUsageHistory] = useState<any[]>([]);

  // データ取得
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchUsageData = async () => {
      setLoading(true);
      try {
        const [today, monthly, history] = await Promise.all([
          AIUsageLogger.getTodayUsage(user.id),
          AIUsageLogger.getMonthlyUsage(user.id),
          AIUsageLogger.getUsageHistory(user.id, undefined, 20)
        ]);
        
        setTodayUsage(today);
        setMonthlyUsage(monthly);
        setUsageHistory(history);
      } catch (error) {
        console.error('Failed to fetch usage data:', error);
      }
      setLoading(false);
    };

    fetchUsageData();
  }, [user?.id]);

  // 機能タイプの日本語表示
  const getFeatureDisplayName = (featureType: string) => {
    const names = {
      'chat_analysis': 'チャット分析',
      'meeting_summary': 'ミーティング要約',
      'card_extraction': 'カード抽出',
      'embedding': '埋め込み生成',
      'relationship_analysis': '関係性分析'
    };
    return names[featureType as keyof typeof names] || featureType;
  };

  // プロバイダーの表示
  const getProviderIcon = (provider: string) => {
    return provider === 'openai' ? '🤖' : provider === 'gemini' ? '💎' : '🔧';
  };

  // 概要タブ
  const renderOverview = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: '24px', fontSize: '18px' }}>
        アクティビティ概要
      </h3>
      
      {/* 今日の使用量サマリー */}
      <div style={{ 
        background: '#232345', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #333366'
      }}>
        <h4 style={{ color: '#64b5f6', marginBottom: '16px', fontSize: '14px' }}>
          🤖 今日のAI使用量
        </h4>
        
        {todayUsage ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#00ff88', fontSize: '24px', fontWeight: 'bold' }}>
                {todayUsage.totalTokens.toLocaleString()}
              </div>
              <div style={{ color: '#a6adc8', fontSize: '12px' }}>トークン</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#64b5f6', fontSize: '24px', fontWeight: 'bold' }}>
                ${todayUsage.totalCostUsd.toFixed(4)}
              </div>
              <div style={{ color: '#a6adc8', fontSize: '12px' }}>推定コスト</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: 'bold' }}>
                {Object.keys(todayUsage.featureBreakdown).length}
              </div>
              <div style={{ color: '#a6adc8', fontSize: '12px' }}>機能使用</div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#a6adc8', textAlign: 'center' }}>
            今日はまだAI機能を使用していません
          </div>
        )}
      </div>

      {/* 月間使用量サマリー */}
      <div style={{ 
        background: '#232345', 
        borderRadius: '8px', 
        padding: '20px',
        border: '1px solid #333366'
      }}>
        <h4 style={{ color: '#64b5f6', marginBottom: '16px', fontSize: '14px' }}>
          📊 今月の使用量
        </h4>
        
        {monthlyUsage && monthlyUsage.totalTokens > 0 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#00ff88', fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlyUsage.totalTokens.toLocaleString()}
                </div>
                <div style={{ color: '#a6adc8', fontSize: '12px' }}>合計トークン</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#64b5f6', fontSize: '20px', fontWeight: 'bold' }}>
                  ${monthlyUsage.totalCostUsd.toFixed(2)}
                </div>
                <div style={{ color: '#a6adc8', fontSize: '12px' }}>合計コスト</div>
              </div>
            </div>

            {/* 機能別内訳 */}
            <div>
              <div style={{ color: '#a6adc8', fontSize: '12px', marginBottom: '8px' }}>機能別使用量</div>
              {Object.entries(monthlyUsage.featureBreakdown).map(([feature, data]) => (
                <div key={feature} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 0',
                  borderBottom: '1px solid #333366'
                }}>
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>
                    {getFeatureDisplayName(feature)}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#00ff88', fontSize: '12px' }}>
                      {data.tokens.toLocaleString()}
                    </span>
                    <span style={{ color: '#a6adc8', fontSize: '11px', marginLeft: '8px' }}>
                      ${data.cost.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: '#a6adc8', textAlign: 'center' }}>
            今月はまだAI機能を使用していません
          </div>
        )}
      </div>
    </div>
  );

  // AI使用量タブ
  const renderAIUsage = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: '24px', fontSize: '18px' }}>
        AI使用量詳細
      </h3>
      
      {/* プロバイダー別使用量 */}
      {monthlyUsage && Object.keys(monthlyUsage.providerBreakdown).length > 0 && (
        <div style={{ 
          background: '#232345', 
          borderRadius: '8px', 
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #333366'
        }}>
          <h4 style={{ color: '#64b5f6', marginBottom: '16px', fontSize: '14px' }}>
            プロバイダー別使用量
          </h4>
          
          {Object.entries(monthlyUsage.providerBreakdown).map(([provider, data]) => (
            <div key={provider} style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid #333366'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>{getProviderIcon(provider)}</span>
                <span style={{ color: '#e2e8f0', fontSize: '14px', textTransform: 'capitalize' }}>
                  {provider}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#00ff88', fontSize: '14px', fontWeight: 'bold' }}>
                  {data.tokens.toLocaleString()} tokens
                </div>
                <div style={{ color: '#64b5f6', fontSize: '12px' }}>
                  ${data.cost.toFixed(3)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使用量予測 */}
      <div style={{ 
        background: '#232345', 
        borderRadius: '8px', 
        padding: '20px',
        border: '1px solid #333366'
      }}>
        <h4 style={{ color: '#64b5f6', marginBottom: '16px', fontSize: '14px' }}>
          📈 使用量予測
        </h4>
        
        {monthlyUsage && monthlyUsage.totalTokens > 0 ? (
          <div>
            <div style={{ color: '#a6adc8', fontSize: '12px', marginBottom: '8px' }}>
              現在のペースで使用を続けた場合の月末予測
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffa500', fontSize: '18px', fontWeight: 'bold' }}>
                  {Math.round(monthlyUsage.totalTokens * (30 / new Date().getDate())).toLocaleString()}
                </div>
                <div style={{ color: '#a6adc8', fontSize: '12px' }}>予測トークン数</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffa500', fontSize: '18px', fontWeight: 'bold' }}>
                  ${(monthlyUsage.totalCostUsd * (30 / new Date().getDate())).toFixed(2)}
                </div>
                <div style={{ color: '#a6adc8', fontSize: '12px' }}>予測コスト</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#a6adc8', textAlign: 'center' }}>
            使用データが不足しています
          </div>
        )}
      </div>
    </div>
  );

  // 履歴タブ
  const renderHistory = () => (
    <div style={{ padding: '24px' }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: '24px', fontSize: '18px' }}>
        使用履歴
      </h3>
      
      <div style={{ 
        background: '#232345', 
        borderRadius: '8px', 
        border: '1px solid #333366',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {usageHistory.length > 0 ? (
          usageHistory.map((log, index) => (
            <div key={log.id} style={{ 
              padding: '16px',
              borderBottom: index < usageHistory.length - 1 ? '1px solid #333366' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{getProviderIcon(log.provider)}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
                    {getFeatureDisplayName(log.feature_type)}
                  </span>
                  <span style={{ 
                    background: '#333366', 
                    color: '#a6adc8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    textTransform: 'uppercase'
                  }}>
                    {log.provider}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#00ff88', fontSize: '12px' }}>
                    {log.total_tokens.toLocaleString()} tokens
                  </div>
                  <div style={{ color: '#64b5f6', fontSize: '11px' }}>
                    ${log.estimated_cost_usd.toFixed(4)}
                  </div>
                </div>
              </div>
              <div style={{ color: '#a6adc8', fontSize: '11px', marginTop: '4px' }}>
                {new Date(log.created_at).toLocaleString('ja-JP')}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '32px', textAlign: 'center', color: '#a6adc8' }}>
            使用履歴がありません
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        width: '800px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        border: '1px solid #333366',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #333366'
        }}>
          <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: '20px' }}>
            📊 アクティビティ
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#a6adc8',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {/* タブナビゲーション */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #333366'
        }}>
          {[
            { key: 'overview', label: '概要', icon: '📊' },
            { key: 'ai-usage', label: 'AI使用量', icon: '🤖' },
            { key: 'history', label: '履歴', icon: '📝' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: activeTab === tab.key ? '#333366' : 'transparent',
                border: 'none',
                color: activeTab === tab.key ? '#e2e8f0' : '#a6adc8',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '200px',
              color: '#a6adc8'
            }}>
              読み込み中...
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'ai-usage' && renderAIUsage()}
              {activeTab === 'history' && renderHistory()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 