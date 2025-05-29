import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
  Modal
} from 'react-native';
import { useChatSpace } from '../hooks/useChatSpace';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpacePersonalization } from '../../types/nestSpace.types';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, description, children }) => (
  <View style={styles.settingsRow}>
    <View style={styles.settingsRowText}>
      <Text style={styles.settingsLabel}>{label}</Text>
      {description && <Text style={styles.settingsDescription}>{description}</Text>}
    </View>
    <View style={styles.settingsControl}>
      {children}
    </View>
  </View>
);

interface ChatSpaceSettingsProps {
  visible: boolean;
  onClose: () => void;
}

const ChatSpaceSettings: React.FC<ChatSpaceSettingsProps> = ({ visible, onClose }) => {
  const { chatSpaceState, togglePin } = useChatSpace();
  const { spaceState, updatePersonalization } = useNestSpace();
  
  // Local state for settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [compactMode, setCompactMode] = useState(spaceState.personalization.compactMode || false);
  const [darkMode, setDarkMode] = useState(spaceState.personalization.theme === 'dark');
  
  // Handle theme change
  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
    const newTheme = isDark ? 'dark' : 'light';
    updatePersonalization({ theme: newTheme });
  };
  
  // Handle compact mode change
  const handleCompactModeChange = (isCompact: boolean) => {
    setCompactMode(isCompact);
    updatePersonalization({ compactMode: isCompact });
  };
  
  // Handle other settings changes
  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    // In a real implementation, save to user preferences
  };
  
  const handleSoundChange = (enabled: boolean) => {
    setSoundEnabled(enabled);
    // In a real implementation, save to user preferences
  };
  
  const handleAutoTranslateChange = (enabled: boolean) => {
    setAutoTranslate(enabled);
    // In a real implementation, save to user preferences
  };
  
  const handleAIInsightsChange = (enabled: boolean) => {
    setShowAIInsights(enabled);
    // In a real implementation, save to user preferences
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>チャット空間の設定</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.settingsContainer}>
            <SettingsSection title="表示設定">
              <SettingsRow 
                label="ダークモード" 
                description="暗いテーマを使用します"
              >
                <Switch 
                  value={darkMode} 
                  onValueChange={handleThemeChange}
                />
              </SettingsRow>
              
              <SettingsRow 
                label="コンパクトモード" 
                description="メッセージの表示間隔を狭くします"
              >
                <Switch 
                  value={compactMode} 
                  onValueChange={handleCompactModeChange}
                />
              </SettingsRow>
              
              <SettingsRow 
                label="ピン留め" 
                description="このチャット空間をメイン画面に固定します"
              >
                <Switch 
                  value={chatSpaceState.isPinned} 
                  onValueChange={togglePin}
                />
              </SettingsRow>
            </SettingsSection>
            
            <SettingsSection title="通知設定">
              <SettingsRow 
                label="通知" 
                description="新しいメッセージの通知を受け取ります"
              >
                <Switch 
                  value={notificationsEnabled} 
                  onValueChange={handleNotificationsChange}
                />
              </SettingsRow>
              
              <SettingsRow 
                label="サウンド" 
                description="新しいメッセージ時に音を鳴らします"
              >
                <Switch 
                  value={soundEnabled} 
                  onValueChange={handleSoundChange}
                />
              </SettingsRow>
            </SettingsSection>
            
            <SettingsSection title="AI機能">
              <SettingsRow 
                label="自動翻訳" 
                description="メッセージを自動的に翻訳します"
              >
                <Switch 
                  value={autoTranslate} 
                  onValueChange={handleAutoTranslateChange}
                />
              </SettingsRow>
              
              <SettingsRow 
                label="AIインサイト" 
                description="会話の洞察と要約を表示します"
              >
                <Switch 
                  value={showAIInsights} 
                  onValueChange={handleAIInsightsChange}
                />
              </SettingsRow>
            </SettingsSection>
            
            <SettingsSection title="ストレージと履歴">
              <SettingsRow label="メッセージ履歴をクリア" description="">
                <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>クリア</Text>
                </TouchableOpacity>
              </SettingsRow>
              
              <SettingsRow label="会話をエクスポート" description="">
                <TouchableOpacity style={styles.button}>
                  <Text style={styles.buttonText}>エクスポート</Text>
                </TouchableOpacity>
              </SettingsRow>
            </SettingsSection>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
  },
  settingsContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#616161',
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingsRowText: {
    flex: 1,
    paddingRight: 16,
  },
  settingsLabel: {
    fontSize: 16,
  },
  settingsDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  settingsControl: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  button: {
    backgroundColor: '#1E88E5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default ChatSpaceSettings; 