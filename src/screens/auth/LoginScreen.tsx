import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, Platform, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useAuth } from '@contexts/AuthContext';
import Screen from '@components/layout/Screen';
import { SPACING } from '@constants/config';
import theme from '../../styles/theme';
import ReactDOM from 'react-dom';
import { useNavigation } from '@react-navigation/native';
import { useNavigate } from 'react-router-dom';

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'mail':
      return (
        <>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </>
      );
    case 'eye':
      return (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </>
      );
    case 'eye-off':
      return (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </>
      );
    case 'user':
      return (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </>
      );
    case 'github':
      return (
        <>
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </>
      );
    case 'google':
      return (
        <>
          <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#FFC107"/>
          <path d="M3.15283 7.3455L6.43833 9.755C7.32733 7.554 9.48083 6 11.9998 6C13.5293 6 14.9208 6.577 15.9803 7.5195L18.8088 4.691C17.0228 3.0265 14.6338 2 11.9998 2C8.15883 2 4.82783 4.1685 3.15283 7.3455Z" fill="#FF3D00"/>
          <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5718 17.5742 13.3038 18.0011 12 18C9.39903 18 7.19053 16.3415 6.35853 14.027L3.09753 16.5395C4.75253 19.778 8.11353 22 12 22Z" fill="#4CAF50"/>
          <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2"/>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

// SVGロゴコンポーネント
const PoconestLogo: React.FC = () => {
  // Webのみlinear-gradient背景、Nativeは単色
  if (typeof window !== 'undefined' && window.document) {
    return (
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #00ff88 0%, #64b5f6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 16px 2px #00ff8855, 0 4px 12px rgba(0, 255, 136, 0.18)',
        position: 'relative',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="18" cy="18" rx="16" ry="16" fill="#fff" fillOpacity="0.10" />
          <ellipse cx="18" cy="22" rx="10" ry="5" fill="#fff" fillOpacity="0.85" />
          <ellipse cx="18" cy="18" rx="14" ry="14" stroke="#fff" strokeOpacity="0.18" strokeWidth="2" />
        </svg>
      </div>
    );
  } else {
    // Native: backgroundColorのみ
    return (
      <View style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: '#00ff88',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}>
        {/* SVGはWeb専用。NativeはImage等に差し替え推奨 */}
      </View>
    );
  }
};

const LoginScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const isMobile = width <= 900;
  const mobilePanelWidth = Math.max(width - 32, 0); // 16px padding on each side
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const { login, register, user, session } = useAuth();
  const navigation = (typeof window === 'undefined' || !window.document) ? useNavigation() : null;
  const navigate = (typeof window !== 'undefined' && window.document) ? useNavigate() : null;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        if (navigate) navigate('/nest-list');
      } else {
        if (!displayName) {
          Alert.alert('エラー', '表示名を入力してください');
          setIsLoading(false);
          return;
        }
        await register(email, password, displayName);
        if (navigate) navigate('/nest-list');
      }
    } catch (error) {
      setErrorMessage('ログインに失敗しました。メールアドレスとパスワードを確認してください');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const demoEmail = 'demo@example.com';
      const demoPassword = 'password123';
      
      const { error } = await login(demoEmail, demoPassword);
      if (error) {
        if (typeof window !== 'undefined' && window.document) {
          localStorage.setItem('demo_mode', 'true');
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('デモログインエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
  };

  return (
    <Screen scrollable={false} statusBarStyle="light-content">
      {(typeof window !== 'undefined' && window.document) ? (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            padding: 0,
            background: 'transparent',
            overflowY: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 40, alignItems: 'center', justifyContent: 'center' }}>
            {/* Left side - Brand/Info panel (simple) */}
            <View
              style={{
                ...styles.leftSimplePanel,
                flex: isMobile ? undefined : 1,
                maxWidth: isMobile ? 480 : undefined,
                minWidth: isMobile ? 0 : styles.leftSimplePanel.minWidth,
                width: isMobile ? '100%' : undefined,
                padding: isMobile ? 12 : styles.leftSimplePanel.padding,
              }}
            >
              {/* Brand section */}
              <View style={styles.brandSection}>
                <View style={styles.brandLogo}>
                  <PoconestLogo />
                  <span style={{
                    fontSize: 42,
                    fontWeight: 700,
                    fontFamily: 'Space Grotesk',
                    background: 'linear-gradient(135deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block',
                  }}>poconest</span>
                </View>
                <Text style={styles.brandTagline}>Your team's digital nest</Text>
              </View>
              {/* Key Value */}
              <View style={styles.keyValue}>
                <Text style={styles.kvTitle}>
                  少人数チームの
                  <span style={{
                    background: 'linear-gradient(135deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    display: 'inline-block',
                  }}>深い対話</span>
                  から<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #64b5f6 0%, #9c27b0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    display: 'inline-block',
                  }}>哲学的な洞察</span>
                  を自動抽出
                </Text>
                <Text style={styles.kvDescription}>
                  単なる情報共有を超えて、チームの集合知を育む新しいプラットフォーム。
                  AIが会話の奥にある本質的なパターンを発見します。
                </Text>
              </View>
              {/* Feature pills */}
              <View style={styles.featurePills}>
                <Text style={styles.featurePill}>Deep Conversations</Text>
                <Text style={styles.featurePill}>AI Philosophy</Text>
                <Text style={styles.featurePill}>Team Intelligence</Text>
              </View>
              {/* Demo snippet */}
              <View
                style={{
                  ...styles.demoSnippet,
                  maxWidth: isMobile ? mobilePanelWidth : styles.demoSnippet.maxWidth,
                  padding: isMobile ? 8 : styles.demoSnippet.padding,
                }}
              >
                <View style={styles.demoHeader}>
                  <Text style={styles.demoHeaderEmoji}>🧠</Text>
                  <span style={{
                    background: 'linear-gradient(90deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'inline-block',
                  }}>LIVE ANALYSIS</span>
                </View>
                <View style={styles.chatLine}><Text style={styles.chatUser}>@designer:</Text><Text style={styles.chatText}>なぜか愛されないプロダクト...</Text></View>
                <View style={styles.chatLine}><Text style={styles.chatUser}>@dev:</Text><Text style={styles.chatText}>機能は完璧なのに</Text></View>
                <View style={styles.aiInsight}>
                  <View style={styles.insightHeader}><Text style={styles.insightHeaderEmoji}>🤖</Text><Text style={styles.insightHeaderText}>AI Insight</Text></View>
                  <Text style={styles.insightText}>
                    "「機能 vs 感情」の根本的なジレンマを検出。人間中心設計のアプローチを提案します。"
                  </Text>
                </View>
              </View>
            </View>

            {/* Right side - Auth forms */}
            <View
              style={{
                ...styles.authPanel,
                maxWidth: 420,
                minWidth: isMobile ? 0 : undefined,
                width: '100%',
                padding: isMobile ? 12 : styles.authPanel.padding,
              }}
            >
              {/* Top gradient bar */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 2 }} pointerEvents="none">
                <svg width="100%" height="3" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="authBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#64b5f6" />
                      <stop offset="50%" stopColor="#00ff88" />
                      <stop offset="100%" stopColor="#26c6da" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="100%" height="3" fill="url(#authBarGradient)" rx="2" />
                </svg>
              </View>
              {typeof window !== 'undefined' && window.document ? (
                <div className="filter-tabs" style={{ marginBottom: 32 }}>
                  <button
                    className={`filter-tab${isLogin ? ' active' : ''}`}
                    type="button"
                    onClick={() => setIsLogin(true)}
                    style={{ flex: 1 }}
                  >
                    LOGIN
                  </button>
                  <button
                    className={`filter-tab${!isLogin ? ' active' : ''}`}
                    type="button"
                    onClick={() => setIsLogin(false)}
                    style={{ flex: 1 }}
                  >
                    SIGN UP
                  </button>
                </div>
              ) : (
                <View style={styles.authTabs}>
                  <TouchableOpacity 
                    style={[styles.authTab, isLogin && styles.authTabActive]} 
                    onPress={() => setIsLogin(true)}
                  >
                    <Text style={[styles.authTabText, isLogin && styles.authTabTextActive]}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.authTab, !isLogin && styles.authTabActive]} 
                    onPress={() => setIsLogin(false)}
                  >
                    <Text style={[styles.authTabText, !isLogin && styles.authTabTextActive]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              )}

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.authForm}>
                <Text style={styles.formTitle}>
                  {isLogin ? 'システムにアクセス' : '新規アカウント作成'}
                </Text>

                {!isLogin && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Full Name</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="田中 太郎"
                      placeholderTextColor={theme.colors.text.hint}
                      value={displayName}
                      onChangeText={setDisplayName}
                    />
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email Address</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="user@example.com"
                    placeholderTextColor={theme.colors.text.hint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Password</Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      style={styles.formInput}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.text.hint}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '🙈' : '👁'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isLogin && (
                  <View style={styles.formCheckbox}>
                    <TouchableOpacity style={styles.checkboxInput}>
                      <Text style={styles.checkmark}>✓</Text>
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>ログイン状態を保持する</Text>
                  </View>
                )}

                {!isLogin && (
                  <View style={styles.formCheckbox}>
                    <TouchableOpacity style={styles.checkboxInput}>
                      <Text style={styles.checkmark}>✓</Text>
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>
                      <Text style={styles.checkboxLink}>利用規約</Text> および <Text style={styles.checkboxLink}>プライバシーポリシー</Text> に同意する
                    </Text>
                  </View>
                )}

                {typeof window !== 'undefined' && window.document ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoading}
                    style={{ width: '100%', marginBottom: 20 }}
                  >
                    {isLoading ? '...' : (isLogin ? 'Sign In' : 'アカウント作成')}
                  </button>
                ) : (
                  <TouchableOpacity 
                    style={[styles.formButton, isLoading && styles.formButtonLoading]} 
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0f0f23" size="small" />
                    ) : (
                      <Text style={styles.formButtonText}>
                        {isLogin ? 'Sign In' : 'アカウント作成'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>または</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Icon name="google" size={18} color={theme.colors.text.secondary} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Icon name="github" size={18} color={theme.colors.text.secondary} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>GitHub</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.authFooter}>
                  <Text style={styles.authFooterText}>
                    {isLogin ? 'パスワードを忘れた場合は ' : '既にアカウントをお持ちですか？ '}
                  </Text>
                  <TouchableOpacity onPress={toggleAuthMode}>
                    <Text style={styles.authFooterLink}>
                      {isLogin ? 'こちら' : 'ログイン'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={handleDemoLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.demoButtonText}>デモモードで入る</Text>
                </TouchableOpacity>
              </View>
            </View>
          </div>
        </div>
      ) : (
        <View
          style={{
            flex: 1,
            minHeight: height,
            justifyContent: 'center',
            alignItems: 'center',
            width: width,
            padding: 0,
          }}
        >
          <View
            style={{
              flexDirection: isMobile ? 'column' : 'row',
              width: isMobile ? width : '100%',
              maxWidth: isMobile ? width : 1100,
              alignSelf: 'center',
              justifyContent: 'center',
              alignItems: 'center',
              gap: isMobile ? 12 : 40,
            }}
          >
            {/* Left side - Brand/Info panel (simple) */}
            <View
              style={{
                ...styles.leftSimplePanel,
                maxWidth: isMobile ? 480 : styles.leftSimplePanel.maxWidth,
                minWidth: isMobile ? 0 : styles.leftSimplePanel.minWidth,
                width: isMobile ? '100%' : undefined,
                padding: isMobile ? 12 : styles.leftSimplePanel.padding,
              }}
            >
              {/* Brand section */}
              <View style={styles.brandSection}>
                <View style={styles.brandLogo}>
                  <PoconestLogo />
                  <span style={{
                    fontSize: 42,
                    fontWeight: 700,
                    fontFamily: 'Space Grotesk',
                    background: 'linear-gradient(135deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    display: 'inline-block',
                  }}>poconest</span>
                </View>
                <Text style={styles.brandTagline}>Your team's digital nest</Text>
              </View>
              {/* Key Value */}
              <View style={styles.keyValue}>
                <Text style={styles.kvTitle}>
                  少人数チームの
                  <span style={{
                    background: 'linear-gradient(135deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    display: 'inline-block',
                  }}>深い対話</span>
                  から<br />
                  <span style={{
                    background: 'linear-gradient(135deg, #64b5f6 0%, #9c27b0 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    display: 'inline-block',
                  }}>哲学的な洞察</span>
                  を自動抽出
                </Text>
                <Text style={styles.kvDescription}>
                  単なる情報共有を超えて、チームの集合知を育む新しいプラットフォーム。
                  AIが会話の奥にある本質的なパターンを発見します。
                </Text>
              </View>
              {/* Feature pills */}
              <View style={styles.featurePills}>
                <Text style={styles.featurePill}>Deep Conversations</Text>
                <Text style={styles.featurePill}>AI Philosophy</Text>
                <Text style={styles.featurePill}>Team Intelligence</Text>
              </View>
              {/* Demo snippet */}
              <View
                style={{
                  ...styles.demoSnippet,
                  maxWidth: isMobile ? mobilePanelWidth : styles.demoSnippet.maxWidth,
                  padding: isMobile ? 8 : styles.demoSnippet.padding,
                }}
              >
                <View style={styles.demoHeader}>
                  <Text style={styles.demoHeaderEmoji}>🧠</Text>
                  <span style={{
                    background: 'linear-gradient(90deg, #00ff88 0%, #64b5f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    display: 'inline-block',
                  }}>LIVE ANALYSIS</span>
                </View>
                <View style={styles.chatLine}><Text style={styles.chatUser}>@designer:</Text><Text style={styles.chatText}>なぜか愛されないプロダクト...</Text></View>
                <View style={styles.chatLine}><Text style={styles.chatUser}>@dev:</Text><Text style={styles.chatText}>機能は完璧なのに</Text></View>
                <View style={styles.aiInsight}>
                  <View style={styles.insightHeader}><Text style={styles.insightHeaderEmoji}>🤖</Text><Text style={styles.insightHeaderText}>AI Insight</Text></View>
                  <Text style={styles.insightText}>
                    "「機能 vs 感情」の根本的なジレンマを検出。人間中心設計のアプローチを提案します。"
                  </Text>
                </View>
              </View>
            </View>

            {/* Right side - Auth forms */}
            <View
              style={{
                ...styles.authPanel,
                maxWidth: isMobile ? 420 : styles.authPanel.maxWidth,
                minWidth: isMobile ? 0 : undefined,
                width: isMobile ? '100%' : undefined,
                padding: isMobile ? 12 : styles.authPanel.padding,
              }}
            >
              {/* Top gradient bar */}
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 2 }} pointerEvents="none">
                <svg width="100%" height="3" style={{ display: 'block' }}>
                  <defs>
                    <linearGradient id="authBarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#64b5f6" />
                      <stop offset="50%" stopColor="#00ff88" />
                      <stop offset="100%" stopColor="#26c6da" />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width="100%" height="3" fill="url(#authBarGradient)" rx="2" />
                </svg>
              </View>
              {typeof window !== 'undefined' && window.document ? (
                <div className="filter-tabs" style={{ marginBottom: 32 }}>
                  <button
                    className={`filter-tab${isLogin ? ' active' : ''}`}
                    type="button"
                    onClick={() => setIsLogin(true)}
                    style={{ flex: 1 }}
                  >
                    LOGIN
                  </button>
                  <button
                    className={`filter-tab${!isLogin ? ' active' : ''}`}
                    type="button"
                    onClick={() => setIsLogin(false)}
                    style={{ flex: 1 }}
                  >
                    SIGN UP
                  </button>
                </div>
              ) : (
                <View style={styles.authTabs}>
                  <TouchableOpacity 
                    style={[styles.authTab, isLogin && styles.authTabActive]} 
                    onPress={() => setIsLogin(true)}
                  >
                    <Text style={[styles.authTabText, isLogin && styles.authTabTextActive]}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.authTab, !isLogin && styles.authTabActive]} 
                    onPress={() => setIsLogin(false)}
                  >
                    <Text style={[styles.authTabText, !isLogin && styles.authTabTextActive]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              )}

              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <View style={styles.authForm}>
                <Text style={styles.formTitle}>
                  {isLogin ? 'システムにアクセス' : '新規アカウント作成'}
                </Text>

                {!isLogin && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Full Name</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="田中 太郎"
                      placeholderTextColor={theme.colors.text.hint}
                      value={displayName}
                      onChangeText={setDisplayName}
                    />
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email Address</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="user@example.com"
                    placeholderTextColor={theme.colors.text.hint}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Password</Text>
                  <View style={styles.passwordField}>
                    <TextInput
                      style={styles.formInput}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.text.hint}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '🙈' : '👁'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {isLogin && (
                  <View style={styles.formCheckbox}>
                    <TouchableOpacity style={styles.checkboxInput}>
                      <Text style={styles.checkmark}>✓</Text>
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>ログイン状態を保持する</Text>
                  </View>
                )}

                {!isLogin && (
                  <View style={styles.formCheckbox}>
                    <TouchableOpacity style={styles.checkboxInput}>
                      <Text style={styles.checkmark}>✓</Text>
                    </TouchableOpacity>
                    <Text style={styles.checkboxLabel}>
                      <Text style={styles.checkboxLink}>利用規約</Text> および <Text style={styles.checkboxLink}>プライバシーポリシー</Text> に同意する
                    </Text>
                  </View>
                )}

                {typeof window !== 'undefined' && window.document ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoading}
                    style={{ width: '100%', marginBottom: 20 }}
                  >
                    {isLoading ? '...' : (isLogin ? 'Sign In' : 'アカウント作成')}
                  </button>
                ) : (
                  <TouchableOpacity 
                    style={[styles.formButton, isLoading && styles.formButtonLoading]} 
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0f0f23" size="small" />
                    ) : (
                      <Text style={styles.formButtonText}>
                        {isLogin ? 'Sign In' : 'アカウント作成'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>または</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Icon name="google" size={18} color={theme.colors.text.secondary} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Icon name="github" size={18} color={theme.colors.text.secondary} style={styles.socialIcon} />
                    <Text style={styles.socialButtonText}>GitHub</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.authFooter}>
                  <Text style={styles.authFooterText}>
                    {isLogin ? 'パスワードを忘れた場合は ' : '既にアカウントをお持ちですか？ '}
                  </Text>
                  <TouchableOpacity onPress={toggleAuthMode}>
                    <Text style={styles.authFooterLink}>
                      {isLogin ? 'こちら' : 'ログイン'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={handleDemoLogin}
                  disabled={isLoading}
                >
                  <Text style={styles.demoButtonText}>デモモードで入る</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  leftSimplePanel: {
    flex: 1.1,
    backgroundColor: 'transparent',
    padding: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 340,
    maxWidth: 480,
    display: 'flex',
    margin: 0,
  },
  brandSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  brandTagline: {
    fontSize: 20,
    color: '#a6adc8',
    fontWeight: '400',
    opacity: 0.9,
    textAlign: 'center',
  },
  keyValue: {
    marginBottom: 16,
    alignItems: 'center',
  },
  kvTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 16,
    fontFamily: 'Space Grotesk',
    lineHeight: 32,
    textAlign: 'center',
  },
  kvHighlight: {
    color: '#00ff88',
    fontWeight: '700',
  },
  kvDescription: {
    fontSize: 16,
    color: '#a6adc8',
    lineHeight: 22,
    maxWidth: 400,
    marginBottom: 8,
    textAlign: 'center',
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  featurePill: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
    marginRight: 2,
  },
  demoSnippet: {
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    textAlign: 'left',
    maxWidth: 380,
    alignSelf: 'center',
    position: 'relative',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 8,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  demoHeaderEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  demoHeaderText: {
    color: '#00ff88',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chatLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatUser: {
    color: '#64b5f6',
    fontWeight: '500',
    fontSize: 12,
    marginRight: 2,
  },
  chatText: {
    color: '#a6adc8',
    fontSize: 12,
  },
  aiInsight: {
    backgroundColor: 'rgba(0,255,136,0.05)',
    borderWidth: 1,
    borderColor: '#00ff88',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    color: '#00ff88',
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 11,
  },
  insightHeaderEmoji: {
    fontSize: 13,
    marginRight: 2,
  },
  insightHeaderText: {
    color: '#00ff88',
    fontWeight: '600',
    fontSize: 11,
  },
  insightText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  authPanel: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 12,
    padding: 28,
    position: 'relative',
    minHeight: 0,
    justifyContent: 'center',
    maxWidth: 420,
  },
  authTabs: {
    flexDirection: 'row',
    marginBottom: 32,
    backgroundColor: '#0f0f23',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 6,
    overflow: 'hidden',
  },
  authTab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: 0,
    background: 'transparent',
    color: 'var(--text-secondary)',
  },
  authTabActive: {
    background: 'var(--primary-green)',
    color: 'var(--text-inverse)',
    borderWidth: 0,
    borderRadius: 0,
  },
  authTabText: {
    color: '#a6adc8',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'JetBrains Mono',
  },
  authTabTextActive: {
    color: '#0f0f23',
  },
  authForm: {
    flex: 1,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 24,
    fontFamily: 'JetBrains Mono',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#a6adc8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: 'JetBrains Mono',
  },
  formInput: {
    width: '100%',
    backgroundColor: '#0f0f23',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 6,
    padding: 12,
    color: '#e2e8f0',
    fontSize: 16,
    fontFamily: 'Space Grotesk',
  },
  passwordField: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  passwordToggleText: {
    color: '#6c7086',
    fontSize: 14,
  },
  formCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxInput: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 3,
    backgroundColor: '#0f0f23',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#0f0f23',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxLabel: {
    color: '#a6adc8',
    fontSize: 14,
  },
  checkboxLink: {
    color: '#00ff88',
  },
  formButton: {
    width: '100%',
    background: 'var(--primary-green)',
    color: 'var(--text-inverse)',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 0,
    boxShadow: 'none',
  },
  formButtonLoading: {
    opacity: 0.7,
  },
  formButtonText: {
    color: 'var(--text-inverse)',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'JetBrains Mono',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333366',
  },
  dividerText: {
    color: '#6c7086',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 16,
    fontFamily: 'JetBrains Mono',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    backgroundColor: '#333366',
    borderWidth: 1,
    borderColor: '#45475a',
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    color: '#a6adc8',
    fontSize: 14,
    fontWeight: '500',
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authFooterText: {
    color: '#6c7086',
    fontSize: 14,
  },
  authFooterLink: {
    color: '#00ff88',
    fontSize: 14,
  },
  demoButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  demoButtonText: {
    color: '#00ff88',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontFamily: 'JetBrains Mono',
  },
});

export default LoginScreen; 