import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { BoardColumnType, Card } from '../types/board';
import LottieView from 'lottie-react-native';
import { useBoard } from '../contexts/BoardContext';

const windowWidth = Dimensions.get('window').width;

interface CardDetailModalProps {
  visible: boolean;
  onClose: () => void;
  card: Card | null;
  onUpdate: (cardId: string, updates: Partial<Card>) => Promise<Card | null>;
  onDelete: (cardId: string) => Promise<void>;
  onPromoteToInsight?: (cardId: string) => Promise<Card | null>;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({
  visible,
  onClose,
  card,
  onUpdate,
  onDelete,
  onPromoteToInsight
}) => {
  const board = useBoard();
  const { findRelatedCards } = board;
  
  console.log('CardDetailModal rendered with card:', card ? `ID: ${card.id}, Title: ${card.title}` : 'null', 'visible:', visible);
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [showPromoteAnimation, setShowPromoteAnimation] = useState(false);
  const [relatedCards, setRelatedCards] = useState<Card[]>([]);

  // カードデータの初期化
  useEffect(() => {
    console.log('useEffect triggered with card:', card ? `ID: ${card.id}` : 'null');
    if (card) {
      console.log('カード詳細データを設定:', card);
      setTitle(card.title || '');
      setContent(card.content || '');
      setTags(card.tags || []);
      
      // 関連カードを取得
      if (findRelatedCards && !isEditing) {
        try {
          const related = findRelatedCards(card.id);
          console.log('関連カード取得結果:', related ? `${related.length}件` : 'null');
          setRelatedCards(related && related.length > 0 ? related.slice(0, 3) : []); // 最大3枚まで表示
        } catch (error) {
          console.error('関連カード取得エラー:', error);
          setRelatedCards([]);
        }
      }
    }
  }, [card, findRelatedCards, isEditing]);

  // カードがない場合は最小限の表示
  if (!card) {
    console.log('Card is null, rendering empty modal');
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="arrow-back" size={24} color={BrandColors.text.secondary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>カード詳細</Text>
              </View>
            </View>
            <View style={styles.emptyCardMessage}>
              <Text>カードデータの読み込みに失敗しました</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // 編集モードの切り替え
  const toggleEditMode = () => {
    if (isEditing) {
      // 編集モードを終了する場合、変更をキャンセル
      setTitle(card.title);
      setContent(card.content);
      setTags(card.tags || []);
    }
    setIsEditing(!isEditing);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="arrow-back" size={24} color={BrandColors.text.secondary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>カード詳細</Text>
            </View>
            <View style={styles.headerRight}>
              {!isEditing ? (
                <>
                  <TouchableOpacity 
                    style={styles.headerButton}
                    onPress={toggleEditMode}
                    disabled={isSaving || isPromoting}
                  >
                    <Ionicons name="create-outline" size={22} color={BrandColors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.headerButton, styles.deleteButton]}
                    onPress={() => onDelete(card.id)}
                    disabled={isSaving || isPromoting}
                  >
                    <Ionicons name="trash-outline" size={22} color="#e53935" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={styles.headerButton}
                  onPress={toggleEditMode}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelText}>キャンセル</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 明示的な高さを持つコンテンツコンテナ */}
          <View style={styles.contentWrapper}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {/* 昇格ボタン */}
              {!isEditing && card.column === BoardColumnType.INBOX && onPromoteToInsight && (
                <TouchableOpacity 
                  style={styles.promoteButton}
                  onPress={() => onPromoteToInsight(card.id)}
                  disabled={isPromoting}
                >
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
                  <Text style={styles.promoteButtonText}>洞察に昇格</Text>
                </TouchableOpacity>
              )}

              {/* タイトル */}
              {isEditing ? (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>タイトル</Text>
                  <TextInput
                    style={styles.titleInput}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="タイトルを入力..."
                    placeholderTextColor={BrandColors.text.tertiary}
                  />
                </View>
              ) : (
                <Text style={styles.title}>{title}</Text>
              )}

              {/* 内容 */}
              {isEditing ? (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>内容</Text>
                  <TextInput
                    style={styles.contentInput}
                    value={content}
                    onChangeText={setContent}
                    placeholder="内容を入力..."
                    placeholderTextColor={BrandColors.text.tertiary}
                    multiline
                    numberOfLines={8}
                  />
                </View>
              ) : (
                <Text style={styles.contentText}>{content}</Text>
              )}

              {/* タグ */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>タグ</Text>
                {isEditing && (
                  <View style={styles.tagInputContainer}>
                    <TextInput
                      style={styles.tagInput}
                      placeholder="タグを入力..."
                      value={tagInput}
                      onChangeText={setTagInput}
                      placeholderTextColor={BrandColors.text.tertiary}
                      onSubmitEditing={() => {
                        if (tagInput.trim()) {
                          setTags([...tags, tagInput.trim()]);
                          setTagInput('');
                        }
                      }}
                    />
                    <TouchableOpacity 
                      style={styles.addTagButton}
                      onPress={() => {
                        if (tagInput.trim()) {
                          setTags([...tags, tagInput.trim()]);
                          setTagInput('');
                        }
                      }}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {tags.length > 0 ? (
                  <View style={styles.tagsContainer}>
                    {tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                        {isEditing && (
                          <TouchableOpacity
                            style={styles.removeTagButton}
                            onPress={() => setTags(tags.filter((_, i) => i !== index))}
                          >
                            <Ionicons name="close" size={14} color={BrandColors.secondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noTags}>タグはありません</Text>
                )}
              </View>

              {/* メタデータ */}
              <View style={styles.metadataContainer}>
                <View style={styles.metadataItem}>
                  <Ionicons 
                    name={card.sourceType === 'chat' ? 'chatbubble-outline' : 
                         card.sourceType === 'zoom' ? 'videocam-outline' : 
                         'document-text-outline'} 
                    size={16} 
                    color={BrandColors.text.secondary} 
                  />
                  <Text style={styles.metadataText}>
                    {card.sourceType === 'chat' ? 'チャットから保存' :
                     card.sourceType === 'zoom' ? 'Zoom会議から保存' :
                     '手動作成'}
                  </Text>
                </View>
                <View style={styles.metadataItem}>
                  <Ionicons name="time-outline" size={16} color={BrandColors.text.secondary} />
                  <Text style={styles.metadataText}>
                    作成: {new Date(card.createdAt).toLocaleDateString('ja-JP')}
                  </Text>
                </View>
                {card.createdAt !== card.updatedAt && (
                  <View style={styles.metadataItem}>
                    <Ionicons name="refresh-outline" size={16} color={BrandColors.text.secondary} />
                    <Text style={styles.metadataText}>
                      更新: {new Date(card.updatedAt).toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* 保存ボタン */}
          {isEditing && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  (!title.trim() || !content.trim() || isSaving) && styles.disabledButton
                ]}
                onPress={async () => {
                  if (!title.trim() || !content.trim() || isSaving) return;
                  setIsSaving(true);
                  try {
                    await onUpdate(card.id, {
                      title: title.trim(),
                      content: content.trim(),
                      tags
                    });
                    setIsEditing(false);
                  } catch (error) {
                    console.error('保存エラー:', error);
                    Alert.alert('エラー', 'カードの更新に失敗しました');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={!title.trim() || !content.trim() || isSaving}
              >
                {isSaving ? (
                  <Text style={styles.saveButtonText}>保存中...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 20,
    overflow: 'hidden',
    height: 500, // 高さは維持
    width: '100%',
    maxWidth: 500, // 最大幅を設定
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${BrandColors.text.tertiary}20`,
    height: 60, // 高さは維持
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
    height: 40,
  },
  closeButton: {
    padding: 4,
  },
  headerButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 10,
  },
  cancelText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    textAlign: 'center',
    width: 70,
  },
  contentWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    color: BrandColors.text.primary,
    lineHeight: 24,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.secondary,
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  contentInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.text.primary,
  },
  addTagButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: `${BrandColors.secondary}15`,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    color: BrandColors.secondary,
    marginRight: 4,
  },
  noTags: {
    fontSize: 14,
    color: BrandColors.text.tertiary,
    fontStyle: 'italic',
  },
  removeTagButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metadataContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${BrandColors.text.tertiary}15`,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
    color: BrandColors.text.secondary,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: `${BrandColors.text.tertiary}20`,
    height: 70, // 高さは維持
  },
  saveButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  disabledButton: {
    backgroundColor: `${BrandColors.text.tertiary}60`,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCardMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  promoteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});

export default CardDetailModal;