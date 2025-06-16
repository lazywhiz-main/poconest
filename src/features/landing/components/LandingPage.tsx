import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTargeting } from '../hooks/useTargeting';
import { LandingHeader } from './navigation/LandingHeader';
import { HeroSection } from './sections/HeroSection';
import { ProblemsSection } from './sections/ProblemsSection';
import { SolutionsSection } from './sections/SolutionsSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { FeatureShowcaseSection } from './sections/FeatureShowcaseSection';
import { SocialProofSection } from './sections/SocialProofSection';
import { PricingSection } from './sections/PricingSection';
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
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
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
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-primary)',
      minHeight: '100vh'
    }}>
      <LandingHeader onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />
      
      <div style={{ paddingTop: '80px' }}> {/* ヘッダー分のスペース */}
        <HeroSection content={content.hero} targetType={targetType} />
        <div id="features">
          <FeaturesSection features={content.features} />
        </div>
        <ProblemsSection content={{ problems: content.problems }} targetType={targetType} />
        <SolutionsSection solutions={content.solutions} />
        <HowItWorksSection targetType={targetType} />
        <FeatureShowcaseSection />
        <div id="testimonials">
          <SocialProofSection testimonials={content.socialProof} />
        </div>
        <div id="pricing">
          <PricingSection pricing={content.pricing} />
        </div>
        <CTASection content={content.hero} />
        <FooterSection />
      </div>
    </div>
  );
}; 