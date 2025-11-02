import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTargeting } from '../hooks/useTargeting';
import { LandingHeader } from './navigation/LandingHeader';
import { HeroSection } from './sections/HeroSection';
import { ProblemsSection } from './sections/ProblemsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { EcosystemSection } from './sections/EcosystemSection';
import { PersonasSection } from './sections/PersonasSection';
import { ValueSection } from './sections/ValueSection';
import { CTASection } from './sections/CTASection';
import { FooterSection } from './sections/FooterSection';

export const LandingPage: React.FC = () => {
  const { targetType, content } = useTargeting();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // 認証済みユーザーをnest-listへリダイレクト
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/nest-list');
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleSignupClick = () => {
    navigate('/login'); // 現状はログインページに遷移（後でサインアップページを分離可能）
  };

  // 認証チェック中はローディングを表示
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#0f0f23',
        color: '#e2e8f0',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="landing-page" style={{ 
      backgroundColor: '#0f0f23',
      color: '#e2e8f0',
      fontFamily: 'Space Grotesk, Noto Sans JP, sans-serif',
      minHeight: '100vh'
    }}>
      <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      
      <div style={{ paddingTop: '80px' }}> {/* ヘッダー分のスペース */}
        <HeroSection content={content.hero} targetType={targetType} />
        <ProblemsSection content={{ problems: content.problems }} targetType={targetType} />
        <div id="features">
          <FeaturesSection features={content.features} />
        </div>
        <div id="ecosystem">
          <EcosystemSection />
        </div>
        <div id="personas">
          <PersonasSection />
        </div>
        <ValueSection />
        <CTASection content={content.hero} />
        <FooterSection />
      </div>
    </div>
  );
}; 