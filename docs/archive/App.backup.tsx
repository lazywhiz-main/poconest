import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { 
  StyleSheet, 
  View, 
  Text, 
  Button, 
  ActivityIndicator, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { BrandColors } from './src/constants/Colors';

// 型定義
type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

// ログイン画面
function AppLoginScreen({ navigation }: LoginScreenProps) {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    try {
      if (!email || !password) {
        setLocalError('メールアドレスとパスワードを入力してください');
        return;
      }
      
      setLocalError(null);
      console.log('Attempting to sign in with:', email);
      
      const { error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        if (error.message) {
          setLocalError(error.message);
        } else {
          setLocalError('ログインに失敗しました。もう一度お試しください。');
        }
        return;
      }
      
      console.log('Sign in successful');
      navigation.navigate('Main');
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      setLocalError(err?.message || '予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  // 表示するエラーメッセージを決定
  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>ログイン</Text>
          
          {displayError && <Text style={styles.errorText}>{displayError}</Text>}
          
          <TextInput
            style={styles.input}
            placeholder="メールアドレス"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            clearButtonMode="while-editing"
            testID="email-input"
          />
          
          <TextInput
            style={styles.input}
            placeholder="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            testID="password-input"
          />
          
          <Button 
            title={loading ? "処理中..." : "ログイン"} 
            onPress={handleLogin}
            disabled={loading} 
          />
          
          <View style={styles.linkContainer}>
            <Button 
              title="アカウントをお持ちでない方" 
              onPress={() => navigation.navigate('Register')} 
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// 登録画面
function AppRegisterScreen({ navigation }: RegisterScreenProps) {
  const { signUp, loading, error } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleRegister = async () => {
    try {
      setSuccessMessage(null);
      
      if (!email || !password) {
        setLocalError('メールアドレスとパスワードを入力してください');
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
      
      setLocalError(null);
      console.log('Attempting to sign up with:', email);
      
      const { error } = await signUp(email, password);
      
      if (error) {
        console.error('Sign up error:', error);
        if (error.message) {
          setLocalError(error.message);
        } else {
          setLocalError('登録に失敗しました。もう一度お試しください。');
        }
        return;
      }
      
      console.log('Sign up successful');
      setSuccessMessage(`
        登録が完了しました！
        
        確認メールが ${email} に送信されました。
        メール内のリンクをクリックして、アカウントを有効化してください。
        
        ※メールが届かない場合は、迷惑メールフォルダをご確認ください。
        また、メールサーバーの混雑状況によっては、届くまで数分かかる場合があります。
      `);
      
      // 3秒後にログイン画面に遷移
      setTimeout(() => {
        navigation.navigate('Login');
      }, 5000);
    } catch (err: any) {
      console.error('Unexpected register error:', err);
      setLocalError(err?.message || '予期せぬエラーが発生しました。もう一度お試しください。');
    }
  };

  // 表示するエラーメッセージを決定
  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>新規登録</Text>
          
          {displayError && <Text style={styles.errorText}>{displayError}</Text>}
          {successMessage && <Text style={styles.successText}>{successMessage}</Text>}
          
          {!successMessage && (
            <>
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                clearButtonMode="while-editing"
                testID="email-input"
                editable={!loading}
              />
              
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                testID="password-input"
                editable={!loading}
              />
              
              <TextInput
                style={styles.input}
                placeholder="パスワード（確認）"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
                testID="confirm-password-input"
                editable={!loading}
              />
              
              <Button 
                title={loading ? "処理中..." : "登録"} 
                onPress={handleRegister}
                disabled={loading} 
              />
            </>
          )}
          
          <View style={styles.linkContainer}>
            <Button 
              title="既にアカウントをお持ちの方" 
              onPress={() => navigation.navigate('Login')} 
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// メインコンテンツ
function MainContent() {
  const { user, loading } = useAuth();

  // ロード中
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // ログイン状態に応じたナビゲーション
  return (
    <NavigationContainer>
      {user ? (
        // ログイン済み：メインのタブナビゲーション
        <MainTabNavigator />
      ) : (
        // 未ログイン：認証画面のスタックナビゲーション
        <Stack.Navigator
          screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={AppLoginScreen} />
          <Stack.Screen name="Register" component={AppRegisterScreen} />
        </Stack.Navigator>
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

// ナビゲーション
const Stack = createNativeStackNavigator<RootStackParamList>();

// アプリのルートコンポーネント
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

// スタイル
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  linkContainer: {
    marginTop: 20,
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
    textAlign: 'center',
  },
  successText: {
    color: '#34C759',
    marginBottom: 15,
    lineHeight: 20,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#F0FFF0',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  profileInfo: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
}); 