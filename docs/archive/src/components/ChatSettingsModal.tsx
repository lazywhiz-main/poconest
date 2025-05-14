import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { useTheme } from '../contexts/ThemeContext';
import { useInsight } from '../contexts/InsightContext';
import { useBoard } from '../contexts/BoardContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BoardColumnType } from '../types/board';

type RootStackParamList = {
  Board: { initialTab?: BoardColumnType };
  // 他の画面も必要に応じて追加
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ChatSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  chatId: string;
  messages: any[];
}

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  visible,
  onClose,
  chatId,
  messages
}) => {
  const { theme } = useTheme();
  const { insightService } = useInsight();
  const { saveInsightToBoard } = useBoard();
  const navigation = useNavigation<NavigationProp>();
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateInsights = async () => {
    try {
      if (messages.length < 5) {
        Alert.alert(
          'メッセージ数が不足しています',
          'インサイトを生成するには、少なくとも5件のメッセージが必要です。',
          [{ text: 'OK' }]
        );
        return;
      }

      setIsGenerating(true);
      const insights = await insightService.generateInsightsFromChat(chatId, messages);
      console.log('生成されたインサイト:', insights);
      
      if (insights.length > 0) {
        // 生成されたインサイトをボードに保存
        for (const insight of insights) {
          await saveInsightToBoard(insight);
        }
        
        Alert.alert(
          'インサイト生成完了',
          `${insights.length}件のインサイトが生成され、ボードに保存されました。`,
          [
            {
              text: 'インサイトを確認',
              onPress: () => {
                onClose();
                navigation.navigate('Board', { initialTab: BoardColumnType.INSIGHTS });
              }
            },
            {
              text: '閉じる',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert(
          'インサイト生成完了',
          'インサイトは生成されませんでした。',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('インサイト生成エラー:', error);
      Alert.alert(
        'エラー',
        'インサイトの生成中にエラーが発生しました。もう一度お試しください。',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>チャット設定</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={BrandColors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={[styles.settingOption, { borderBottomColor: theme.colors.border }]}
              onPress={handleGenerateInsights}
              disabled={isGenerating}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="bulb-outline" size={24} color={BrandColors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>インサイト生成</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.text }]}>
                  {messages.length < 5 
                    ? `メッセージ数が不足しています（${messages.length}/5件）`
                    : 'AIを使用して会話から重要なポイントを抽出します'}
                </Text>
              </View>
              {isGenerating ? (
                <ActivityIndicator size="small" color={BrandColors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingOption}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="save-outline" size={24} color={BrandColors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>会話をエクスポート</Text>
                <Text style={styles.settingDescription}>この会話をテキストファイルとしてエクスポート</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingOption}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>会話を削除</Text>
                <Text style={styles.settingDescription}>この会話の履歴を完全に削除します</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#AAAAAA" />
            </TouchableOpacity>
          </View>
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
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 16,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
});

export default ChatSettingsModal; 