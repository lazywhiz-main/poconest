import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, Platform, TouchableOpacity } from 'react-native';
import { useAuth } from '@contexts/AuthContext';
import Screen from '@components/layout/Screen';
import Button from '@components/common/Button';
import { SPACING } from '@constants/config';
import theme from '../../styles/theme';

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
    case 'logo':
      return (
        <>
          <circle cx="12" cy="12" r="9" fill="#FF7A7A" stroke="none" />
          <path d="M12 7c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="white" stroke="none" />
          <path d="M12 4v2M12 18v2M4 12h2M18 12h2" stroke="white" strokeWidth="2" />
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLogin, setIsLogin] = useState(true); // ログイン/登録の切り替え
  const [displayName, setDisplayName] = useState('');
  const { login, register, user, session } = useAuth();

  // 認証状態の変化を検知
  useEffect(() => {
    console.log('LoginScreen: 認証状態の変化を監視中');
    console.log('ユーザー情報:', user ? '存在します' : '存在しません');
    console.log('セッション情報:', session ? '存在します' : '存在しません');
    
    if (user && session) {
      console.log('認証成功:', user.email);
      Alert.alert('ログイン成功', `ようこそ、${user.email}さん！`);
    }
  }, [user, session]);

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
      } else {
        if (!displayName) {
          Alert.alert('エラー', '表示名を入力してください');
          setIsLoading(false);
          return;
        }
        await register(email, password, displayName);
      }
    } catch (error) {
      setErrorMessage('ログインに失敗しました。メールアドレスとパスワードを確認してください');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // デモ用のクイックログイン
  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      console.log('デモログインを実行します');
      const demoEmail = 'demo@example.com';
      const demoPassword = 'password123';
      
      const { error } = await login(demoEmail, demoPassword);
      if (error) {
        // デモログインが失敗した場合はモック認証を実行
        console.log('デモログイン失敗、モック認証を試みます');
        
        // AppContext側で認証済み状態にする代わりに、
        // ページをリロードして開発モードでは常にログイン状態にする
        if (Platform.OS === 'web') {
          localStorage.setItem('demo_mode', 'true');
          window.location.reload();
        }
      } else {
        console.log('デモログイン成功');
      }
    } catch (err) {
      console.error('デモログインエラー:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ログイン/登録の切り替え
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
  };

  return (
    <Screen scrollable={false} statusBarStyle="dark-content">
      <View style={styles.container}>
        <View style={styles.card}>
        <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="logo" size={48} color="#FF7A7A" style={styles.logoIcon} />
              <Text style={styles.logoText}>ポコの巣</Text>
            </View>
            <Text style={styles.title}>{isLogin ? 'ログイン' : '新規登録'}</Text>
        </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputContainer}>
          {!isLogin && (
              <View style={styles.inputRow}>
                <Icon name="user" size={18} color={theme.colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="表示名"
                  placeholderTextColor={theme.colors.text.hint}
                  autoCapitalize="words"
              value={displayName}
              onChangeText={setDisplayName}
                />
              </View>
            )}
            
            <View style={styles.inputRow}>
              <Icon name="mail" size={18} color={theme.colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor={theme.colors.text.hint}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
            />
            </View>
            
            <View style={styles.inputRow}>
              <Icon name="lock" size={18} color={theme.colors.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="パスワード"
                placeholderTextColor={theme.colors.text.hint}
                secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showPasswordButton}
              >
                <Icon 
                  name={showPassword ? 'eye-off' : 'eye'} 
                  size={18} 
                  color={theme.colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isLogin ? 'ログイン' : '登録する'}
              </Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.switchModeContainer}>
            <Text style={styles.switchModeText}>
              {isLogin ? 'アカウントをお持ちでない場合は' : 'すでにアカウントをお持ちの場合は'}
            </Text>
            <TouchableOpacity
            onPress={toggleAuthMode}
              style={styles.switchModeLink}
            >
              <Text style={styles.switchModeLinkText}>
                {isLogin ? '新規登録' : 'ログイン'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* 開発用のクイックログインボタン */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <Text style={styles.demoButtonText}>デモモードで入る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background.default,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoIcon: {
    marginBottom: theme.spacing.sm,
  },
  logoText: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.bold as any,
    color: 'white',
  },
  title: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.medium as any,
    color: 'white',
    marginTop: theme.spacing.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 122, 122, 0.1)',
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
      },
  errorText: {
    color: theme.colors.status.error,
    fontSize: theme.fontSizes.sm,
  },
  inputContainer: {
    padding: theme.spacing.lg,
      },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    backgroundColor: 'white',
  },
  inputIcon: {
    padding: theme.spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.primary,
  },
  showPasswordButton: {
    padding: theme.spacing.md,
  },
  loginButton: {
    backgroundColor: theme.colors.secondary,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  loginButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
  },
  switchModeText: {
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
    fontSize: theme.fontSizes.sm,
  },
  switchModeLink: {
    padding: theme.spacing.xs,
  },
  switchModeLinkText: {
    color: theme.colors.primary,
    fontWeight: theme.fontWeights.medium as any,
    fontSize: theme.fontSizes.sm,
  },
  demoButton: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(80, 208, 200, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  demoButtonText: {
    color: theme.colors.secondary,
    fontWeight: theme.fontWeights.medium as any,
    fontSize: theme.fontSizes.sm,
  },
});

export default LoginScreen; 