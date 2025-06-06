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

interface NestSettingsScreenProps {
  nestId?: string;
  onBack?: () => void;
}

const NestSettingsScreen: React.FC<NestSettingsScreenProps> = ({ 
  nestId: propNestId,
  onBack
}) => {
  const { currentNest, userNests, updateNest, loading } = useNest();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // 使用するNest ID (props経由で指定されるか、現在のNestを使用)
  const nestId = propNestId || currentNest?.id;
  
  const navigate = useNavigate();
  
  // 現在のNestの情報をフォームにセット
  useEffect(() => {
    if (nestId && userNests) {
      const nest = userNests.find(n => n.id === nestId);
      if (nest) {
        setName(nest.name);
        setDescription(nest.description || '');
        setColor(nest.color || '#3498db');
      }
    }
  }, [nestId, userNests]);

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
        </div>
      </div>
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