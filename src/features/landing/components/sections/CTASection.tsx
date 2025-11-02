import React from 'react';
import { Link } from 'react-router-dom';

interface CTASectionProps {
  content: {
    headline: string;
    subtext: string;
    ctaText: string;
  };
}

export const CTASection: React.FC<CTASectionProps> = ({ content }) => {
  const styles = {
    cta: {
      padding: '100px 40px',
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '48px',
      fontWeight: 600,
      marginBottom: '24px',
      color: '#e2e8f0',
    },
    description: {
      fontSize: '18px',
      color: '#a6adc8',
      marginBottom: '40px',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
    buttons: {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center',
    },
    btnPrimary: {
      background: '#00ff88',
      color: '#0f0f23',
      padding: '16px 40px',
      border: 'none',
      borderRadius: '2px',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      textDecoration: 'none',
      display: 'inline-block',
    },
    btnSecondary: {
      background: 'transparent',
      color: '#00ff88',
      padding: '16px 40px',
      border: '1px solid #00ff88',
      borderRadius: '2px',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      textDecoration: 'none',
      display: 'inline-block',
    },
  };

  return (
    <section style={styles.cta}>
      <h2 style={styles.title}>思考を、次のステージへ</h2>
      <p style={styles.description}>
        Poconestは無料で始められます。<br/>
        今すぐ、あなたの知的生産を加速させましょう。
      </p>
      <div style={styles.buttons}>
        <Link to="/login" style={styles.btnPrimary}>無料で始める</Link>
        <a href="#features" style={styles.btnSecondary}>製品デモを見る</a>
      </div>
    </section>
  );
};
