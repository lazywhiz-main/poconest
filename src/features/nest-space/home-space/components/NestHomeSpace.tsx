import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { supabase } from '../../../../services/supabase/client';
import Icon from '../../../../components/ui/Icon';

interface NestHomeSpaceProps {
  nestId: string;
}

interface DashboardStats {
  chatMessages: number;
  meetings: number;
  boardCards: number;
  analysisLogs: number;
}

const NestHomeSpace: React.FC<NestHomeSpaceProps> = ({ nestId }) => {
  const { currentNest } = useNest();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    chatMessages: 0,
    meetings: 0,
    boardCards: 0,
    analysisLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  // ダッシュボード統計を取得
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!nestId) return;

      try {
        setLoading(true);

        // チャットメッセージ数（chat_roomsを通じて取得）
        const { data: chatRooms } = await supabase
          .from('chat_rooms')
          .select('id')
          .eq('space_id', (await supabase
            .from('spaces')
            .select('id')
            .eq('nest_id', nestId)
            .eq('type', 'chat')
            .single()
          ).data?.id);

        let chatCount = 0;
        if (chatRooms && chatRooms.length > 0) {
          const roomIds = chatRooms.map(room => room.id);
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .in('chat_id', roomIds);
          chatCount = count || 0;
        }

        // ミーティング数
        const { count: meetingCount } = await supabase
          .from('meetings')
          .select('*', { count: 'exact', head: true })
          .eq('nest_id', nestId)
          .is('deleted_at', null);

        // ボードカード数（boardsを通じて取得）
        const { data: boards } = await supabase
          .from('boards')
          .select('id')
          .eq('nest_id', nestId);

        let cardCount = 0;
        if (boards && boards.length > 0) {
          const boardIds = boards.map(board => board.id);
          const { count } = await supabase
            .from('board_cards')
            .select('*', { count: 'exact', head: true })
            .in('board_id', boardIds);
          cardCount = count || 0;
        }

        // AI使用ログ数（仮のテーブル名）
        const { count: analysisCount } = await supabase
          .from('ai_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('nest_id', nestId);

        setStats({
          chatMessages: chatCount || 0,
          meetings: meetingCount || 0,
          boardCards: cardCount || 0,
          analysisLogs: analysisCount || 0,
        });
      } catch (error) {
        console.error('ダッシュボード統計の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [nestId]);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: string;
    color: string;
    description?: string;
  }> = ({ title, value, icon, color, description }) => (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 8,
      padding: 20,
      border: `1px solid ${color}20`,
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}>
          <Icon name={icon as any} size={20} color={color} />
        </div>
        <div>
          <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{title}</div>
          {description && (
            <div style={{ color: '#6c7086', fontSize: 12 }}>{description}</div>
          )}
        </div>
      </div>
      <div style={{ color: color, fontSize: 32, fontWeight: 700 }}>{value.toLocaleString()}</div>
    </div>
  );

  const TutorialSection: React.FC = () => (
    <div style={{
      background: '#1a1a2e',
      borderRadius: 8,
      padding: 24,
      marginBottom: 24,
      border: '1px solid #333366',
    }}>
      <h3 style={{ color: '#e2e8f0', marginBottom: 20, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
        <Icon name="tutorial" size={18} color="#e2e8f0" style={{ marginRight: 8 }} />
        利用チュートリアル
      </h3>
      
      <div style={{ display: 'grid', gap: 20 }}>
        {/* コミュニケーションのストック */}
        <div style={{
          padding: 20,
          background: '#232345',
          borderRadius: 8,
          border: '1px solid #45475a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#00ff8820',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Icon name="chat" size={20} color="#00ff88" />
            </div>
            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, margin: 0 }}>
                コミュニケーションのストック
              </h4>
              <p style={{ color: '#a6adc8', fontSize: 14, margin: '4px 0 0 0' }}>
                どんなコミュニケーションも、ストックしておけば、適切な洞察に繋げられます
              </p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#1a1a2e',
              borderRadius: 6,
              border: '1px solid #333366',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Icon name="chat" size={16} color="#00ff88" />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500, marginLeft: 8 }}>チャット</span>
              </div>
              <p style={{ color: '#a6adc8', fontSize: 12, margin: 0 }}>
                AIとの対話を記録し、アイデアを整理
              </p>
            </div>
            
            <div style={{
              padding: 12,
              background: '#1a1a2e',
              borderRadius: 6,
              border: '1px solid #333366',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Icon name="meeting" size={16} color="#2196f3" />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500, marginLeft: 8 }}>ミーティング</span>
              </div>
              <p style={{ color: '#a6adc8', fontSize: 12, margin: 0 }}>
                会議の音声・動画を文字起こしして保存
              </p>
            </div>
          </div>
        </div>

        {/* ボード機能 */}
        <div style={{
          padding: 20,
          background: '#232345',
          borderRadius: 8,
          border: '1px solid #45475a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#4caf5020',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Icon name="board" size={20} color="#4caf50" />
            </div>
            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, margin: 0 }}>
                ボード機能
              </h4>
              <p style={{ color: '#a6adc8', fontSize: 14, margin: '4px 0 0 0' }}>
                意味のある塊を、一枚のカードで表現します
              </p>
            </div>
          </div>
          
          <div style={{
            padding: 16,
            background: '#1a1a2e',
            borderRadius: 6,
            border: '1px solid #333366',
          }}>
            <p style={{ color: '#e2e8f0', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              カンバンボードでタスクやアイデアを整理し、プロジェクト管理を行います。
              各カードは意味のある情報の塊として扱われ、関連性を持たせることができます。
            </p>
          </div>
        </div>

        {/* ミーティングのカード化 */}
        <div style={{
          padding: 20,
          background: '#232345',
          borderRadius: 8,
          border: '1px solid #45475a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#2196f320',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Icon name="meeting" size={20} color="#2196f3" />
            </div>
            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, margin: 0 }}>
                ミーティングのカード化
              </h4>
              <p style={{ color: '#a6adc8', fontSize: 14, margin: '4px 0 0 0' }}>
                文字起こしし、AIで要約するとともに、意味のある塊ごとにカード化します
              </p>
            </div>
          </div>
          
          <div style={{
            padding: 16,
            background: '#1a1a2e',
            borderRadius: 6,
            border: '1px solid #333366',
          }}>
            <p style={{ color: '#e2e8f0', fontSize: 14, margin: '0 0 12px 0', lineHeight: 1.5 }}>
              ミーティングの音声・動画をアップロードすると、自動的に文字起こしされ、AIが要約を生成します。
              さらに、内容を分析して意味のある塊ごとにカードを作成します。
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="board" size={14} color="#4caf50" />
                <span style={{ color: '#a6adc8', fontSize: 12 }}>ミーティングの「関連カード」タブ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="board" size={14} color="#4caf50" />
                <span style={{ color: '#a6adc8', fontSize: 12 }}>サイドメニューのボード</span>
              </div>
            </div>
            <p style={{ color: '#a6adc8', fontSize: 12, margin: '8px 0 0 0' }}>
              カードにしたものは、上記の場所から確認できます
            </p>
          </div>
        </div>

        {/* 分析機能 */}
        <div style={{
          padding: 20,
          background: '#232345',
          borderRadius: 8,
          border: '1px solid #45475a',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#9c27b020',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}>
              <Icon name="analysis" size={20} color="#9c27b0" />
            </div>
            <div>
              <h4 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 600, margin: 0 }}>
                分析機能
              </h4>
              <p style={{ color: '#a6adc8', fontSize: 14, margin: '4px 0 0 0' }}>
                カード間の関係性を分析します
              </p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{
              padding: 12,
              background: '#1a1a2e',
              borderRadius: 6,
              border: '1px solid #333366',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#9c27b0',
                  marginRight: 8,
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>ノード表現</span>
              </div>
              <p style={{ color: '#a6adc8', fontSize: 12, margin: 0 }}>
                1つのカードは、1つのノードで表現されます
              </p>
            </div>
            
            <div style={{
              padding: 12,
              background: '#1a1a2e',
              borderRadius: 6,
              border: '1px solid #333366',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 16,
                  height: 8,
                  borderRadius: 4,
                  background: '#4caf50',
                  marginRight: 8,
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>クラスタリング</span>
              </div>
              <p style={{ color: '#a6adc8', fontSize: 12, margin: 0 }}>
                たくさんのカードを近しいものどうしでクラスタリングできます
              </p>
            </div>
            
            <div style={{
              padding: 12,
              background: '#1a1a2e',
              borderRadius: 6,
              border: '1px solid #333366',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  width: 20,
                  height: 2,
                  background: '#2196f3',
                  marginRight: 8,
                }} />
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 500 }}>関係性分析</span>
              </div>
              <p style={{ color: '#a6adc8', fontSize: 12, margin: 0 }}>
                ノードとノードの間での関係性を分析し、線でつなげます。ノードをクリックすると、関係するノードへの矢印を確認できます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f0f23',
      }}>
        <div style={{ color: '#e2e8f0', fontSize: 16 }}>読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: '#0f0f23',
      padding: 24,
      overflow: 'auto',
    }}>


      {/* 統計カード */}
                        <div style={{ marginBottom: 32 }}>
                    <h2 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                      <Icon name="stats" size={20} color="#e2e8f0" style={{ marginRight: 8 }} />
                      利用統計
                    </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 16,
        }}>
          <StatCard
            title="チャットメッセージ"
            value={stats.chatMessages}
            icon="chat"
            color="#00ff88"
            description="AIとの対話数"
          />
          <StatCard
            title="ミーティング"
            value={stats.meetings}
            icon="meeting"
            color="#2196f3"
            description="作成されたミーティング数"
          />
          <StatCard
            title="ボードカード"
            value={stats.boardCards}
            icon="board"
            color="#4caf50"
            description="作成されたカード数"
          />
                     <StatCard
             title="AI分析ログ"
             value={stats.analysisLogs}
             icon="analysis"
             color="#9c27b0"
             description="AI機能の使用回数"
           />
        </div>
      </div>

      {/* チュートリアルセクション */}
      <TutorialSection />

      {/* クイックアクション */}
      <div style={{
        background: '#1a1a2e',
        borderRadius: 8,
        padding: 24,
        border: '1px solid #333366',
      }}>
        <h3 style={{ color: '#e2e8f0', marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
          ⚡ クイックアクション
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate(`/nest-top?nestId=${nestId}&space=chat`)}
            style={{
              padding: '12px 20px',
              background: '#00ff88',
              color: '#0f0f23',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="chat" size={16} color="#0f0f23" />
            新しいチャットを開始
          </button>
          <button 
            onClick={() => navigate(`/nest-top?nestId=${nestId}&space=meeting`)}
            style={{
              padding: '12px 20px',
              background: '#2196f3',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="meeting" size={16} color="#ffffff" />
            ミーティングを作成
          </button>
          <button 
            onClick={() => navigate(`/nest-top?nestId=${nestId}&space=board`)}
            style={{
              padding: '12px 20px',
              background: '#4caf50',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="board" size={16} color="#ffffff" />
            カードを作成
          </button>
        </div>
      </div>
    </div>
  );
};

export default NestHomeSpace; 