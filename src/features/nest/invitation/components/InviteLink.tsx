import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  TextInput, 
  ActivityIndicator, 
  Share,
  useWindowDimensions,
  Clipboard,
  Alert
} from 'react-native';
import { BRAND_COLORS } from '@constants/Colors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, COMPONENT_STYLES } from '@constants/Styles';
import responsive from '@utils/responsive';
import { useNest } from '../../../contexts/NestContext';
import invitationService from '../services/invitationService';

// Tauriが利用可能か確認するためのヘルパー関数
const isTauriAvailable = () => {
  return responsive.isTauriWindow();
};

interface InviteLinkProps {
  expirationHours?: number;
  onLinkGenerated?: (link: string) => void;
}

const InviteLink: React.FC<InviteLinkProps> = ({ 
  expirationHours = 72, 
  onLinkGenerated 
}) => {
  const [inviteLink, setInviteLink] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [customHours, setCustomHours] = useState(expirationHours.toString());
  const [showCustomHours, setShowCustomHours] = useState(false);
  
  const { currentNest } = useNest();
  const { width } = useWindowDimensions();
  
  // モバイル/デスクトップ判定
  const isMobile = responsive.mediaQuery.isMobile(width);
  
  // 招待リンクの生成
  const generateLink = async (hours: number = expirationHours) => {
    if (!currentNest) {
      setError('NESTが選択されていません');
      return;
    }
    
    setLoading(true);
    setError(null);
    setLinkCopied(false);
    
    try {
      const result = await invitationService.generateInviteLink(currentNest.id, hours);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        setInviteLink(result.link);
        setExpiresAt(result.expiresAt);
        
        if (onLinkGenerated) {
          onLinkGenerated(result.link);
        }
        
        // デスクトップの場合は自動でクリップボードにコピー
        if (!isMobile) {
          copyToClipboard(result.link);
        }
      }
    } catch (err: any) {
      setError(err.message || '招待リンクの生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // クリップボードにコピー（プラットフォーム別実装）
  const copyToClipboard = async (link: string) => {
    try {
      // Tauriアプリの場合
      if (isTauriAvailable()) {
        // @ts-ignore - Tauriの型が見つからない場合のエラー回避
        const { writeText } = window.__TAURI__?.clipboard || {};
        if (writeText) {
          await writeText(link);
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 3000);
          return;
        }
      }
      
      // React Native Web/モバイルの場合
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(link);
      } else if (Clipboard?.setString) {
        Clipboard.setString(link);
      }
      
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (err) {
      console.error('クリップボードへのコピーに失敗しました', err);
      setError('リンクのコピーに失敗しました');
    }
  };
  
  // 共有（モバイル用）
  const shareLink = async () => {
    if (!inviteLink) return;
    
    if (Platform.OS === 'web') {
      // WebならNavigator Share APIを使用
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${currentNest?.name || 'NEST'} への招待`,
            text: `${currentNest?.name || 'NEST'} に参加するよう招待します`,
            url: inviteLink
          });
        } catch (err) {
          console.error('共有に失敗しました', err);
        }
      } else {
        // Share API非対応なら単にクリップボードにコピー
        copyToClipboard(inviteLink);
      }
    } else if (Share?.share) {
      // ネイティブでの共有
      try {
        await Share.share({
          message: `${currentNest?.name || 'NEST'} に参加するよう招待します: ${inviteLink}`,
          url: inviteLink // iOS用
        });
      } catch (err) {
        console.error('共有に失敗しました', err);
      }
    }
  };
  
  // 有効期限のカスタム設定
  const handleGenerateWithCustomHours = () => {
    const hours = parseInt(customHours, 10);
    if (isNaN(hours) || hours <= 0 || hours > 720) { // 最大30日
      setError('有効な時間を入力してください（1〜720時間）');
      return;
    }
    generateLink(hours);
    setShowCustomHours(false);
  };
  
  // エラーダイアログの表示（モバイル用）
  const showErrorAlert = () => {
    if (Platform.OS !== 'web' && error) {
      Alert.alert('エラー', error, [{ text: 'OK', onPress: () => setError(null) }]);
    }
  };
  
  if (error && Platform.OS !== 'web') {
    showErrorAlert();
  }
  
  // 有効期限の表示フォーマット
  const formatExpiresAt = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <View style={[
      styles.container,
      isMobile ? styles.containerMobile : styles.containerDesktop
    ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>招待リンクを作成</Text>
        <Text style={styles.subtitle}>
          時間制限のある招待リンクを生成して共有します
        </Text>
      </View>
      
      {inviteLink ? (
        // リンク生成済みの表示
        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>招待リンク:</Text>
          <View style={styles.linkRow}>
            <TextInput
              style={styles.linkInput}
              value={inviteLink}
              editable={false}
              selectTextOnFocus
              accessibilityLabel="生成された招待リンク"
            />
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => copyToClipboard(inviteLink)}
              accessibilityLabel="リンクをコピー"
            >
              <Text style={styles.actionButtonText}>
                {linkCopied ? '✓ コピー済' : 'コピー'}
              </Text>
            </TouchableOpacity>
            
            {(isMobile || responsive.mediaQuery.isTablet()) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={shareLink}
                accessibilityLabel="リンクを共有"
              >
                <Text style={styles.actionButtonText}>共有</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {expiresAt && (
            <Text style={styles.expiresText}>
              有効期限: {formatExpiresAt(expiresAt)}
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.newLinkButton}
            onPress={() => setInviteLink('')}
            accessibilityLabel="新しいリンクを作成"
          >
            <Text style={styles.newLinkButtonText}>新しいリンクを作成</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // リンク生成前の表示
        <View style={styles.generateContainer}>
          {showCustomHours ? (
            // カスタム時間設定UI
            <View style={styles.customHoursContainer}>
              <Text style={styles.customHoursLabel}>
                有効期限を設定（時間）:
              </Text>
              <TextInput
                style={styles.customHoursInput}
                value={customHours}
                onChangeText={setCustomHours}
                keyboardType="number-pad"
                maxLength={3}
                accessibilityLabel="有効期限（時間）"
              />
              <View style={styles.customHoursActions}>
                <TouchableOpacity
                  style={[styles.customHoursButton, styles.cancelButton]}
                  onPress={() => setShowCustomHours(false)}
                >
                  <Text style={styles.cancelButtonText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.customHoursButton}
                  onPress={handleGenerateWithCustomHours}
                >
                  <Text style={styles.buttonText}>設定して生成</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // 標準のリンク生成オプション
            <>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => generateLink(24)}
                  disabled={loading}
                >
                  <Text style={styles.optionButtonText}>24時間</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => generateLink(72)}
                  disabled={loading}
                >
                  <Text style={styles.optionButtonText}>3日間</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => generateLink(168)}
                  disabled={loading}
                >
                  <Text style={styles.optionButtonText}>1週間</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.optionButton}
                  onPress={() => setShowCustomHours(true)}
                  disabled={loading}
                >
                  <Text style={styles.optionButtonText}>カスタム</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  loading && styles.buttonDisabled
                ]}
                onPress={() => generateLink()}
                disabled={loading}
                accessibilityLabel="招待リンクを生成"
              >
                {loading ? (
                  <ActivityIndicator color={BRAND_COLORS.white} size="small" />
                ) : (
                  <Text style={styles.buttonText}>招待リンクを生成</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          
          {/* エラーメッセージ（Webのみ） */}
          {error && Platform.OS === 'web' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          招待リンクは有効期限が切れるまで何度でも使えます。
          NESTのセキュリティのために、有効期限が短いリンクを使用することをお勧めします。
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...COMPONENT_STYLES.card,
    marginVertical: SPACING.md,
  },
  containerMobile: {
    padding: SPACING.md,
  },
  containerDesktop: {
    padding: SPACING.lg,
    maxWidth: 600,
    alignSelf: 'center',
  },
  headerContainer: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.secondary,
  },
  generateContainer: {
    marginBottom: SPACING.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  optionButton: {
    backgroundColor: BRAND_COLORS.background.medium,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionButtonText: {
    color: BRAND_COLORS.text.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  button: {
    ...COMPONENT_STYLES.button,
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: BRAND_COLORS.gray,
  },
  buttonText: {
    color: BRAND_COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.md,
  },
  linkContainer: {
    marginBottom: SPACING.md,
  },
  linkLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  linkInput: {
    ...COMPONENT_STYLES.input,
    flex: 1,
    backgroundColor: BRAND_COLORS.background.light,
    marginRight: SPACING.sm,
    color: BRAND_COLORS.text.primary,
  },
  actionButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.xs,
  },
  shareButton: {
    backgroundColor: BRAND_COLORS.secondary,
  },
  actionButtonText: {
    color: BRAND_COLORS.white,
    fontWeight: '500',
    fontSize: FONT_SIZE.sm,
  },
  expiresText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
  newLinkButton: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: BRAND_COLORS.primary,
  },
  newLinkButtonText: {
    color: BRAND_COLORS.primary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: BRAND_COLORS.error,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.md,
  },
  errorText: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.sm,
  },
  infoContainer: {
    padding: SPACING.sm,
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: BORDER_RADIUS.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.secondary,
  },
  customHoursContainer: {
    marginBottom: SPACING.md,
  },
  customHoursLabel: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  customHoursInput: {
    ...COMPONENT_STYLES.input,
    marginBottom: SPACING.sm,
  },
  customHoursActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  customHoursButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.sm,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND_COLORS.text.tertiary,
  },
  cancelButtonText: {
    color: BRAND_COLORS.text.primary,
    fontWeight: '500',
    fontSize: FONT_SIZE.sm,
  },
});

export default InviteLink; 