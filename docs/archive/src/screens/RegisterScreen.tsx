import React, { useState } from 'react';
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

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
  const { signUp, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async () => {
    try {
      setSuccessMessage(null);
      console.log('登録開始: ', { email, displayName });
      
      if (!email || !password) {
        setLocalError('メールアドレスとパスワードを入力してください');
        return;
      }
      
      if (!displayName) {
        setLocalError('表示名を入力してください');
        return;
      }
      
      if (password !== confirmPassword) {
        setLocalError('パスワードが一致しません');
        return;
      }
      
      if (password.length < 6) {
        setLocalError('パスワードは6文字以上で設定してください');
        return;
      }
      
      console.log('入力検証完了');
      setLocalError(null);
      const { error, user } = await signUp(email, password, displayName);
      
      console.log('サインアップ結果: ', { error, userId: user?.id });
      
      if (error) {
        setLocalError(error.message || '登録に失敗しました。もう一度お試しください。');
        return;
      }
      
      setSuccessMessage(`
        登録が完了しました！
        
        確認メールが ${email} に送信されました。
        メール内のリンクをクリックして、アカウントを有効化してください。
        
        ※メールが届かない場合は、迷惑メールフォルダをご確認ください。
      `);
      
      console.log('登録完了、ログイン画面へ遷移予定');
      
      setTimeout(() => {
        navigation.navigate('Login');
      }, 5000);
    } catch (err: any) {
      console.error('登録エラー: ', err);
      setLocalError(err?.message || '予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

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
            <Text style={styles.tagline}>新規登録</Text>
          </View>
          
          {displayError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={BrandColors.error} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}
          
          {successMessage && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color={BrandColors.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          )}
          
          {!successMessage && (
            <>
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="メールアドレス"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="表示名"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                </View>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="パスワード"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="パスワード（確認）"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholderTextColor="#999"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity
                style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerButtonText}>登録</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>
              既にアカウントをお持ちの方はこちら
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E5FFE9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    color: BrandColors.success,
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
  registerButton: {
    backgroundColor: BrandColors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  registerButtonDisabled: {
    backgroundColor: '#FFB8B8',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginButton: {
    alignItems: 'center',
  },
  loginButtonText: {
    color: BrandColors.secondary,
    fontSize: 14,
  },
});

export default RegisterScreen; 