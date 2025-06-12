import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { acceptInviteByEmail } from '../services/invitationService';
import { useAuth } from '../../../../contexts/AuthContext';

const AcceptInviteScreen: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    nestId?: string;
    nestName?: string;
  } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      // ログインページにリダイレクト（招待トークンを保持）
      navigate(`/login?invite=${token}`, { replace: true });
      return;
    }

    if (token) {
      handleAcceptInvitation();
    }
  }, [token, isAuthenticated]);

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setLoading(true);
    try {
      console.log('Accepting invitation with token:', token);
      const result = await acceptInviteByEmail(token);
      console.log('Accept invitation result:', result);
      
      if (result.error) {
        console.error('Invitation acceptance failed:', result.error);
        setResult({
          success: false,
          message: result.error.message || '招待の承諾に失敗しました'
        });
      } else {
        console.log('Invitation accepted successfully:', result);
        setResult({
          success: true,
          message: `${result.nestName || 'NEST'}に参加しました！`,
          nestId: result.nestId,
          nestName: result.nestName
        });
      }
    } catch (err: any) {
      console.error('Exception during invitation acceptance:', err);
      setResult({
        success: false,
        message: err.message || '招待の承諾中にエラーが発生しました'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoToNest = () => {
    if (result?.nestId) {
      navigate(`/nests/${result.nestId}`);
    } else {
      navigate('/nest-list');
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f0f23',
        color: '#e2e8f0',
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '3px solid #333366',
          borderTop: '3px solid #00ff88',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '24px'
        }} />
        <div style={{ fontSize: '18px', fontWeight: '600' }}>
          招待を処理中...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0f0f23',
        color: '#e2e8f0'
      }}>
        <div>招待トークンが無効です</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f0f23',
      color: '#e2e8f0',
      fontFamily: 'JetBrains Mono, monospace',
      padding: '32px'
    }}>
      <div style={{
        background: '#1a1a2e',
        border: '1px solid #333366',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '480px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)'
      }}>
        {result.success ? (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#00ff88',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '36px'
            }}>
              ✓
            </div>
            <div style={{
              color: '#00ff88',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              招待を承諾しました！
            </div>
            <div style={{
              color: '#a6adc8',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '32px'
            }}>
              {result.message}
            </div>
            <button
              onClick={handleGoToNest}
              style={{
                background: '#00ff88',
                color: '#0f0f23',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {`${result.nestName || 'NEST'}に移動`}
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              background: '#ff6b6b',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '36px'
            }}>
              ✗
            </div>
            <div style={{
              color: '#ff6b6b',
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '16px'
            }}>
              招待の承諾に失敗しました
            </div>
            <div style={{
              color: '#a6adc8',
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              {result.message}
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                color: '#666',
                fontSize: '12px',
                background: '#1a1a1a',
                padding: '8px',
                borderRadius: '4px',
                marginBottom: '16px',
                fontFamily: 'monospace',
                wordBreak: 'break-all'
              }}>
                Debug: Token = {token}
                <br />
                Check browser console for detailed error logs
              </div>
            )}
            <button
              onClick={() => navigate('/nest-list')}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                background: '#333366',
                color: '#e2e8f0',
                border: '1px solid #555588',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInviteScreen; 