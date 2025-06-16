import React from 'react';

export const FooterSection: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-color)',
      padding: '60px 20px 30px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* メインフッターコンテンツ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* ブランド情報 */}
          <div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, var(--primary-green), var(--primary-blue))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Poconest
            </div>
            <p style={{
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              散らばったデータから洞察を生み出す、AI支援プラットフォーム。
              チームの知恵を組織の資産に変換します。
            </p>
            {/* ソーシャルリンク */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
                <a
                  key={social}
                  href="#"
                  style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary-green)';
                    e.currentTarget.style.color = 'var(--bg-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>
          
          {/* プロダクト */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-primary)'
            }}>
              プロダクト
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                '機能一覧',
                '価格プラン',
                'API',
                'セキュリティ',
                'アップデート'
              ].map((item) => (
                <li key={item} style={{ marginBottom: '8px' }}>
                  <a
                    href="#"
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary-green)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* リソース */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-primary)'
            }}>
              リソース
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                'ドキュメント',
                'ヘルプセンター',
                'ブログ',
                'ウェビナー',
                'コミュニティ'
              ].map((item) => (
                <li key={item} style={{ marginBottom: '8px' }}>
                  <a
                    href="#"
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary-green)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* 会社情報 */}
          <div>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '16px',
              color: 'var(--text-primary)'
            }}>
              会社情報
            </h4>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}>
              {[
                'About Us',
                'キャリア',
                'プレス',
                'パートナー',
                'お問い合わせ'
              ].map((item) => (
                <li key={item} style={{ marginBottom: '8px' }}>
                  <a
                    href="#"
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      fontSize: '0.95rem',
                      transition: 'color 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--primary-green)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* 下部フッター */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary)'
          }}>
            © 2024 Poconest. All rights reserved.
          </div>
          
          <div style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap'
          }}>
            {[
              '利用規約',
              'プライバシーポリシー',
              'Cookie設定'
            ].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-green)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}; 