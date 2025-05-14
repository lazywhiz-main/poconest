import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import PocoLogo from '../components/PocoLogo';

type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const { signIn, loading, error, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ユーザーがすでにログインしている場合、Mainに遷移
  useEffect(() => {
    if (user) {
      console.log('LoginScreen: ユーザーが既にログイン済み、Mainに遷移');
      navigation.replace('Main');
    }
  }, [user, navigation]);

  const validateInputs = (): boolean => {
    if (!email.trim()) {
      setLocalError('メールアドレスを入力してください');
      return false;
    }
    
    if (!email.includes('@')) {
      setLocalError('有効なメールアドレスを入力してください');
      return false;
    }
    
    if (!password) {
      setLocalError('パスワードを入力してください');
      return false;
    }
    
    return true;
  };

  const handleLogin = async () => {
    try {
      // キーボードを閉じる
      Keyboard.dismiss();
      
      // 入力検証
      if (!validateInputs()) {
        return;
      }
      
      // 送信中フラグをセット
      setIsSubmitting(true);
      setLocalError(null);
      
      console.log('LoginScreen: ログイン処理開始');
      const { error } = await signIn(email.trim(), password);
      
      if (error) {
        console.log('LoginScreen: ログインエラー', error.message);
        setLocalError(error.message || 'ログインに失敗しました。もう一度お試しください。');
        return;
      }
      
      console.log('LoginScreen: ログイン成功');
      // ログイン成功の場合、useEffectのuser監視でMainに遷移するため、
      // ここでは特に何もしない
    } catch (err: any) {
      console.error('LoginScreen: 予期せぬエラー', err);
      setLocalError(err?.message || '予期せぬエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // エラーメッセージの表示
  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <PocoLogo size={120} />
            <Text style={styles.appName}>PocoNest</Text>
            <Text style={styles.tagline}>仲間と学び合おう</Text>
          </View>
          
          {displayError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={BrandColors.error} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setLocalError(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
            </View>
            
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setLocalError(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor="#999"
                editable={!isSubmitting}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={[
              styles.loginButton, 
              (loading || isSubmitting) && styles.loginButtonDisabled
            ]}
            onPress={handleLogin}
            disabled={loading || isSubmitting}
          >
            {(loading || isSubmitting) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>ログイン</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            disabled={isSubmitting}
          >
            <Text style={styles.registerButtonText}>
              アカウントをお持ちでない方はこちら
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BrandColors.primary,
    marginBottom: 8,
    // fontFamily: 'Pacifico',
  },
  tagline: {
    fontSize: 16,
    color: BrandColors.text.secondary,
    // fontFamily: 'InterRounded',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: BrandColors.error,
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  showPasswordButton: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: BrandColors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#FFB8B8',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    alignItems: 'center',
  },
  registerButtonText: {
    color: BrandColors.secondary,
    fontSize: 14,
  },
});

export default LoginScreen; 