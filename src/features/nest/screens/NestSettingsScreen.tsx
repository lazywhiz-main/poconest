import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { useNest } from '../contexts/NestContext';
import NestMemberList from '../components/NestMemberList';
import InvitationForm from '../components/InvitationForm';
import PrivacySettingsForm from '../components/PrivacySettingsForm';

import theme from '../../../styles/theme';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FormGroup from '../../../components/ui/FormGroup';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import Modal from '../../../components/ui/Modal';
import { nestAIProviderService, NestAIProviderSettings } from '../../../services/ai/NestAIProviderService';

interface NestSettingsScreenProps {
  nestId?: string;
  onBack?: () => void;
}

const NestSettingsScreen: React.FC<NestSettingsScreenProps> = ({ 
  nestId: propNestId,
  onBack
}) => {
  const { currentNest, userNests, updateNest, deleteNest, loading } = useNest();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // AI Provider settings
  const [aiSettings, setAiSettings] = useState<NestAIProviderSettings>({
    primaryProvider: 'openai',
    enableFallback: true,
    fallbackProviders: ['gemini'],
    providerConfigs: {
      openai: { model: 'gpt-4o', embeddingModel: 'text-embedding-3-small' },
      gemini: { model: 'gemini-2.0-flash', embeddingModel: 'gemini-embedding-exp-03-07' }
    }
  });
  const [providerStatus, setProviderStatus] = useState<{
    openai: 'available' | 'unavailable' | 'checking';
    gemini: 'available' | 'unavailable' | 'checking';
  }>({ openai: 'checking', gemini: 'checking' });
  const [updatingAiSettings, setUpdatingAiSettings] = useState(false);
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // 使用するNest ID (props経由で指定されるか、現在のNestを使用)
  const nestId = propNestId || currentNest?.id;
  
  const navigate = useNavigate();
  
  // 現在のNestの情報をフォームにセット
  useEffect(() => {
    if (nestId && userNests && user) {
      const nest = userNests.find(n => n.id === nestId);
      if (nest) {
        setName(nest.name);
        setDescription(nest.description || '');
        setColor(nest.color || '#3498db');
        setIsOwner(nest.owner_id === user.id);
      }
    }
  }, [nestId, userNests, user]);

  // AIプロバイダー設定の読み込み
  useEffect(() => {
    if (nestId) {
      loadAIProviderSettings();
      checkProviderAvailability();
    }
  }, [nestId]);

  const loadAIProviderSettings = async () => {
    if (!nestId) return;
    
    try {
      const settings = await nestAIProviderService.getNestAIProviderSettings(nestId);
      setAiSettings(settings);
    } catch (error) {
      console.error('Failed to load AI provider settings:', error);
    }
  };

  const checkProviderAvailability = async () => {
    try {
      setProviderStatus({ openai: 'checking', gemini: 'checking' });
      
      const [openaiAvailable, geminiAvailable] = await Promise.all([
        nestAIProviderService.checkProviderAvailability('openai'),
        nestAIProviderService.checkProviderAvailability('gemini')
      ]);

      setProviderStatus({
        openai: openaiAvailable ? 'available' : 'unavailable',
        gemini: geminiAvailable ? 'available' : 'unavailable'
      });
    } catch (error) {
      console.error('Failed to check provider availability:', error);
      setProviderStatus({ openai: 'unavailable', gemini: 'unavailable' });
    }
  };

  const handleProviderSelect = async (provider: 'openai' | 'gemini') => {
    if (!nestId || updatingAiSettings) return;
    
    setUpdatingAiSettings(true);
    try {
      const updatedSettings = {
        ...aiSettings,
        primaryProvider: provider
      };
      
      await nestAIProviderService.updateNestAIProviderSettings(nestId, updatedSettings);
      setAiSettings(updatedSettings);
      Alert.alert('成功', `プライマリプロバイダーを${provider === 'openai' ? 'OpenAI' : 'Gemini'}に変更しました`);
    } catch (error) {
      console.error('Failed to update AI provider settings:', error);
      Alert.alert('エラー', 'プロバイダーの設定更新に失敗しました');
    }
    setUpdatingAiSettings(false);
  };

  const handleFallbackToggle = async () => {
    if (!nestId || updatingAiSettings) return;
    
    setUpdatingAiSettings(true);
    try {
      const updatedSettings = {
        ...aiSettings,
        enableFallback: !aiSettings.enableFallback
      };
      
      await nestAIProviderService.updateNestAIProviderSettings(nestId, updatedSettings);
      setAiSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update fallback setting:', error);
      Alert.alert('エラー', 'フォールバック設定の更新に失敗しました');
    }
    setUpdatingAiSettings(false);
  };

  // プロバイダー状態に応じた色を取得
  const getStatusColor = (status: 'available' | 'unavailable' | 'checking') => {
    switch (status) {
      case 'available': return '#00ff88';
      case 'unavailable': return '#e74c3c';
      case 'checking': return '#f39c12';
      default: return '#6c7086';
    }
  };

  // プロバイダー状態に応じたテキスト色を取得
  const getStatusTextColor = (status: 'available' | 'unavailable' | 'checking') => {
    switch (status) {
      case 'available': return '#0a0a0a';
      case 'unavailable': return '#ffffff';
      case 'checking': return '#0a0a0a';
      default: return '#ffffff';
    }
  };

  // プロバイダー状態に応じたテキストを取得
  const getStatusText = (status: 'available' | 'unavailable' | 'checking') => {
    switch (status) {
      case 'available': return '利用可能';
      case 'unavailable': return '利用不可';
      case 'checking': return '確認中';
      default: return '不明';
    }
  };

  // 基本情報保存
  const handleSaveBasicInfo = async () => {
    if (!nestId) return;
    
    if (!name.trim()) {
      Alert.alert('エラー', 'NESTの名前を入力してください');
      return;
    }
    
    setSavingBasicInfo(true);
    
    const { error } = await updateNest(nestId, {
      name,
      description,
      color
    });
    
    setSavingBasicInfo(false);
    
    if (error) {
      Alert.alert('エラー', error.message || '設定の保存に失敗しました');
    } else {
      Alert.alert('成功', '設定を保存しました');
    }
  };

  // NESTの削除（モーダルから呼ばれる）
  const handleDeleteNestConfirmed = async () => {
    if (!nestId) return;
    console.log('handleDeleteNestConfirmed called', nestId);
    setDeleting(true);
    try {
      await deleteNest(nestId);
      setDeleting(false);
      setShowDeleteModal(false);
      navigate('/nests');
    } catch (error: any) {
      setDeleting(false);
      console.error('Nest削除エラー:', error);
      alert(error.message || 'NESTの削除に失敗しました');
    }
  };

  // NESTの削除（ボタン押下時: モーダルを開く）
  const handleDeleteNest = () => {
    setShowDeleteModal(true);
  };

  // キーボードショートカット設定 (デスクトップ用)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Save with Alt+S
        if (event.altKey && event.key === 's') {
          event.preventDefault();
          handleSaveBasicInfo();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleSaveBasicInfo]);

  // 色選択オプション
  const colorOptions = [
    { value: '#3498db', label: 'ブルー' },
    { value: '#2ecc71', label: 'グリーン' },
    { value: '#e74c3c', label: 'レッド' },
    { value: '#f39c12', label: 'オレンジ' },
    { value: '#9b59b6', label: 'パープル' },
    { value: '#1abc9c', label: 'ターコイズ' },
    { value: '#34495e', label: 'ダークブルー' }
  ];

  if (!nestId || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <div style={{ 
      backgroundColor: '#0f0f23',
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <div style={{ 
        maxWidth: 900, 
        margin: '0 auto', 
        padding: '20px 24px',
        minHeight: 'calc(100vh - 80px)'
      }}>
        <div style={{ marginBottom: 40 }}>
          {/* 基本情報セクション */}
          <div style={{ 
            marginBottom: 60,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 30
          }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#00ff88', 
              marginBottom: 20,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderBottom: '1px solid #333366',
              paddingBottom: '10px'
            }}>
              BASIC INFORMATION
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block',
                fontSize: 11, 
                fontWeight: 600, 
                color: '#a6adc8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 6
              }}>
                NEST NAME
              </label>
              <Input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="NESTの名前を入力"
                maxLength={50}
                disabled={savingBasicInfo}
                style={{ marginBottom: 8 }}
              />
              <div style={{ textAlign: 'right', color: '#6c7086', fontSize: 12 }}>
                {name.length}/50
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block',
                fontSize: 11, 
                fontWeight: 600, 
                color: '#a6adc8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 6
              }}>
                DESCRIPTION
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="NESTの説明を入力"
                maxLength={200}
                rows={4}
                disabled={savingBasicInfo}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#0f0f23',
                  border: '1px solid #313244',
                  borderRadius: 2,
                  color: '#e2e8f0',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  marginBottom: 8,
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={e => e.target.style.borderColor = '#00ff88'}
                onBlur={e => e.target.style.borderColor = '#313244'}
              />
              <div style={{ textAlign: 'right', color: '#6c7086', fontSize: 12 }}>
                {description.length}/200
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ 
                display: 'block',
                fontSize: 11, 
                fontWeight: 600, 
                color: '#a6adc8',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: 6
              }}>
                COLOR
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {colorOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      border: color === option.value ? '3px solid #00ff88' : '1px solid #333366',
                      background: option.value,
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: color === option.value ? '0 0 0 2px #00ff88' : 'none'
                    }}
                    onClick={() => setColor(option.value)}
                    aria-checked={color === option.value}
                  />
                ))}
              </div>
            </div>
      
            <Button
              title="保存"
              onPress={handleSaveBasicInfo}
              variant="primary"
              size="md"
              disabled={savingBasicInfo}
              loading={savingBasicInfo}
              style={{ width: '100%', marginTop: 16 }}
            />
          </div>

          {/* 招待管理セクション */}
          <div style={{ 
            marginBottom: 60,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 30
          }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#00ff88', 
              marginBottom: 20,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderBottom: '1px solid #333366',
              paddingBottom: '10px'
            }}>
              INVITATION MANAGEMENT
            </div>
            <InvitationForm nestId={nestId} />
          </div>

          {/* メンバー管理セクション */}
          <div style={{ 
            marginBottom: 60,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 30
          }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#00ff88', 
              marginBottom: 20,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderBottom: '1px solid #333366',
              paddingBottom: '10px'
            }}>
              MEMBER MANAGEMENT
            </div>
            <NestMemberList nestId={nestId} />
          </div>

          {/* プライバシー設定セクション */}
          <div style={{ 
            marginBottom: 60,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 30
          }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#00ff88', 
              marginBottom: 20,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderBottom: '1px solid #333366',
              paddingBottom: '10px'
            }}>
              PRIVACY SETTINGS
            </div>
            <PrivacySettingsForm nestId={nestId} />
          </div>

          {/* AI Provider settings section */}
          <div style={{ 
            marginBottom: 60,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 30
          }}>
            <div style={{ 
              fontSize: 18, 
              fontWeight: 600, 
              color: '#00ff88', 
              marginBottom: 20,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              borderBottom: '1px solid #333366',
              paddingBottom: '10px'
            }}>
              AI PROVIDER SETTINGS
            </div>
            
            <div style={{ color: '#a6adc8', fontSize: 13, marginBottom: 16, lineHeight: '1.5' }}>
              このNestで使用するAIプロバイダーを設定できます。プライマリプロバイダーを選択し、フォールバック機能を設定してください。
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              {/* OpenAI Provider Card */}
              <button
                onClick={() => handleProviderSelect('openai')}
                disabled={updatingAiSettings}
                style={{
                  backgroundColor: aiSettings.primaryProvider === 'openai' ? '#1e2a4a' : '#1a1a2e',
                  border: aiSettings.primaryProvider === 'openai' ? '2px solid #00ff88' : '1px solid #333366',
                  borderRadius: 6,
                  padding: 18,
                  cursor: updatingAiSettings ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  opacity: updatingAiSettings ? 0.7 : 1,
                  position: 'relative'
                }}
              >
                {aiSettings.primaryProvider === 'openai' && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#00ff88'
                  }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: '600', color: '#e2e8f0' }}>OpenAI</span>
                  <div style={{
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 2,
                    paddingBottom: 2,
                    borderRadius: 4,
                    minWidth: 60,
                    backgroundColor: getStatusColor(providerStatus.openai),
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: 10, fontWeight: '600', color: getStatusTextColor(providerStatus.openai) }}>
                      {getStatusText(providerStatus.openai)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6c7086', lineHeight: '1.4' }}>
                  GPT-4o, text-embedding-3-small
                </div>
              </button>

              {/* Gemini Provider Card */}
              <button
                onClick={() => handleProviderSelect('gemini')}
                disabled={updatingAiSettings}
                style={{
                  backgroundColor: aiSettings.primaryProvider === 'gemini' ? '#1e2a4a' : '#1a1a2e',
                  border: aiSettings.primaryProvider === 'gemini' ? '2px solid #00ff88' : '1px solid #333366',
                  borderRadius: 6,
                  padding: 18,
                  cursor: updatingAiSettings ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  opacity: updatingAiSettings ? 0.7 : 1,
                  position: 'relative'
                }}
              >
                {aiSettings.primaryProvider === 'gemini' && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#00ff88'
                  }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: '600', color: '#e2e8f0' }}>Gemini</span>
                  <div style={{
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingTop: 2,
                    paddingBottom: 2,
                    borderRadius: 4,
                    minWidth: 60,
                    backgroundColor: getStatusColor(providerStatus.gemini),
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: 10, fontWeight: '600', color: getStatusTextColor(providerStatus.gemini) }}>
                      {getStatusText(providerStatus.gemini)}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6c7086', lineHeight: '1.4' }}>
                  Gemini 2.0 Flash, gemini-embedding-exp-03-07
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: '600', color: '#e2e8f0', marginBottom: 4 }}>
                  フォールバック機能
                </div>
                <div style={{ fontSize: 12, color: '#6c7086', lineHeight: '1.4' }}>
                  プライマリプロバイダーが利用できない場合、自動的に他のプロバイダーを使用
                </div>
              </div>
              <button
                onClick={handleFallbackToggle}
                disabled={updatingAiSettings}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  position: 'relative',
                  cursor: updatingAiSettings ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: aiSettings.enableFallback ? '#00ff88' : '#333366',
                  opacity: updatingAiSettings ? 0.7 : 1
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: '#ffffff',
                  position: 'absolute',
                  top: 2,
                  left: aiSettings.enableFallback ? 22 : 2,
                  transition: 'transform 0.2s ease',
                }} />
              </button>
            </div>

            <button
              onClick={checkProviderAvailability}
              disabled={providerStatus.openai === 'checking' || providerStatus.gemini === 'checking'}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #333366',
                borderRadius: 4,
                color: '#a6adc8',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              プロバイダー状態を再確認
            </button>

            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#16213e', borderRadius: 4, border: '1px solid #2a3f5f' }}>
              <div style={{ fontSize: 12, fontWeight: '600', color: '#00ff88', marginBottom: 8 }}>
                ℹ️ プロバイダーが利用不可になる場合
              </div>
              <div style={{ fontSize: 11, color: '#a6adc8', lineHeight: '1.4' }}>
                • APIキーが無効または期限切れ<br/>
                • APIレート制限に達している<br/>
                • プロバイダーサービスがメンテナンス中<br/>
                • ネットワーク接続の問題
              </div>
            </div>
          </div>

          {/* 危険な操作セクション - オーナーのみ表示 */}
          {isOwner && (
            <div style={{ 
              marginBottom: 60,
              background: '#1a1a2e',
              border: '1px solid #e74c3c',
              borderRadius: 4,
              padding: 30
            }}>
              <div style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#e74c3c', 
                marginBottom: 20,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                borderBottom: '1px solid #e74c3c',
                paddingBottom: '10px'
              }}>
                DANGEROUS ACTIONS
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ 
                  color: '#e74c3c',
                  fontSize: 14,
                  marginBottom: 16,
                  lineHeight: 1.5
                }}>
                  このセクションには取り消しのできない危険な操作が含まれています。
                  これらの操作は慎重に行ってください。
                </p>
                <Button
                  title="NESTを削除する"
                  onPress={handleDeleteNest}
                  variant="danger"
                  size="md"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 削除確認モーダル */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="NESTの削除確認">
        <div style={{ color: '#e74c3c', fontWeight: 600, marginBottom: 16 }}>
          本当にこのNESTを削除しますか？<br />この操作は取り消せません。
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Button
            title="キャンセル"
            onPress={() => setShowDeleteModal(false)}
            variant="default"
            size="md"
            style={{ minWidth: 100 }}
            disabled={deleting}
          />
          <Button
            title={deleting ? '削除中...' : '削除する'}
            onPress={() => {
              console.log('削除ボタンonPress発火');
              handleDeleteNestConfirmed();
            }}
            variant="danger"
            size="md"
            style={{ minWidth: 120 }}
            disabled={deleting}
            loading={deleting}
          />
        </div>
      </Modal>
    </div>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: '#0f0f23',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: '#6c7086',
  }
});

export default NestSettingsScreen; 