import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import { useZoomSpace } from '../hooks/useZoomSpace';
import MeetingList from './MeetingList';
import RecordingPlayer from './RecordingPlayer';
import MeetingInsights from './MeetingInsights';
import MeetingForm from './MeetingForm';
import MeetingDetailPanel from './MeetingDetailPanel';
import { supabase } from '../../../../services/supabase/client';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../../contexts/AuthContext';
import MeetingDetail from './MeetingDetail';
import { Meeting, MeetingUI, toMeetingUI, toMeetingDB } from '../../../meeting-space/types/meeting';
import EmptyState from '../../../../components/ui/EmptyState';
import Input from '../../../../components/ui/Input';
import Tag from '../../../../components/ui/Tag';
import StatusBadge from '../../../../components/ui/StatusBadge';
import Button from '../../../../components/common/Button';
import { Icon } from '../../../../components/Icon';
import { generateMeetingSummary, extractCardsFromMeeting, generateMockSummary, generateMockCards } from '../../../../services/ai/openai';
import { BoardCardUI } from '../../../../types/board';
import { getOrCreateDefaultBoard, addCardsToBoard } from '../../../../services/BoardService';
import { getOrCreateMeetingSource, addCardSource } from '../../../../services/BoardService';
import { getUsersByIds, UserInfo } from '../../../../services/UserService';
import { useBackgroundJobs } from '../../../meeting-space/hooks/useBackgroundJobs';
import { showToast } from '../../../../components/ui/Toast';
import ConfirmModal from '../../../../components/ui/ConfirmModal';

const MeetingSpace: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 768;
  const zoomSpace = useZoomSpace();
  const { currentNest } = useNest();
  const { user } = useAuth();

  const [meetings, setMeetings] = useState<MeetingUI[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<MeetingUI | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [userCache, setUserCache] = useState<Record<string, UserInfo>>({});
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    visible: boolean;
    meetingId: string | null;
    meetingTitle: string;
  }>({
    visible: false,
    meetingId: null,
    meetingTitle: ''
  });

  const { createJob } = useBackgroundJobs();

  // ミーティング一覧の取得
  const fetchMeetings = useCallback(async () => {
    if (!currentNest) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('nest_id', currentNest.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const meetingUIs = data ? data.map(toMeetingUI) : [];
      setMeetings(meetingUIs);

      // ユーザー情報をキャッシュ
      const allUserIds = [...new Set(meetingUIs.flatMap(m => m.participants))];
      if (allUserIds.length > 0) {
        const userInfos = await Promise.all(
          allUserIds.map(async (userId) => {
            const userInfo = await getUsersByIds([userId]);
            return { userId, info: userInfo[userId] };
          })
        );
        const userMap = userInfos.reduce((acc, { userId, info }) => {
          if (info) acc[userId] = info;
          return acc;
        }, {} as Record<string, UserInfo>);
        setUserCache(prev => ({ ...prev, ...userMap }));
      }
    } catch (error) {
      console.error('ミーティング取得エラー:', error);
      showToast('ミーティングの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [currentNest, showToast]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // フィルター処理
  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         meeting.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 選択された会議の取得
  const selectedMeeting = selectedMeetingId 
    ? meetings.find(m => m.id === selectedMeetingId) 
    : null;

  // ミーティング保存
  const handleSaveMeeting = async (meetingData: Partial<MeetingUI>) => {
    if (!currentNest || !user) return;

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      
      if (editingMeeting) {
        // 更新
        const updatedMeeting = {
          ...editingMeeting,
          ...meetingData,
          updated_at: now
        };

        const { error } = await supabase
          .from('meetings')
          .update(toMeetingDB(updatedMeeting))
          .eq('id', editingMeeting.id);

        if (error) throw error;
        
        showToast('ミーティングを更新しました');
      } else {
        // 新規作成
        const newMeeting: Partial<MeetingUI> = {
          ...meetingData,
          nestId: currentNest.id,
          createdBy: user.id,
          created_at: now,
          updated_at: now,
          status: 'scheduled'
        };

        const { data, error } = await supabase
          .from('meetings')
          .insert([toMeetingDB(newMeeting as MeetingUI)])
          .select()
          .single();

        if (error) throw error;
        
        showToast('ミーティングを作成しました');
      }

      await fetchMeetings();
      setShowForm(false);
      setEditingMeeting(null);
    } catch (error) {
      console.error('ミーティング保存エラー:', error);
      showToast('ミーティングの保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ミーティング削除の確認
  const confirmDeleteMeeting = (meeting: MeetingUI) => {
    setDeleteConfirmModal({
      visible: true,
      meetingId: meeting.id,
      meetingTitle: meeting.title
    });
  };

  // ミーティング削除
  const handleDeleteMeeting = async () => {
    const { meetingId } = deleteConfirmModal;
    if (!meetingId) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      
      setMeetings(prev => prev.filter(m => m.id !== meetingId));
      
      if (selectedMeetingId === meetingId) {
        setSelectedMeetingId(null);
      }
      
      showToast('ミーティングを削除しました');
    } catch (error) {
      console.error('ミーティング削除エラー:', error);
      showToast('ミーティングの削除に失敗しました');
    } finally {
      setDeleteConfirmModal({
        visible: false,
        meetingId: null,
        meetingTitle: ''
      });
    }
  };

  // AIカード生成
  const generateAICards = async (meeting: MeetingUI) => {
    if (!currentNest || !user) return;

    setIsGeneratingCards(true);

    try {
      // バックグラウンドジョブを作成
      const job = await createJob('card_extraction', meeting.id);
      
      if (job) {
        showToast('AIカード生成を開始しました');
      } else {
        throw new Error('ジョブの作成に失敗しました');
      }
    } catch (error) {
      console.error('AIカード生成エラー:', error);
      showToast('AIカードの生成に失敗しました');
    } finally {
      setIsGeneratingCards(false);
    }
  };

  // AI要約生成
  const generateAISummary = async (meeting: MeetingUI) => {
    if (!meeting.id) return;

    setIsGeneratingSummary(true);

    try {
      // バックグラウンドジョブを作成
      const job = await createJob('ai_summary', meeting.id);
      
      if (job) {
        showToast('AI要約生成を開始しました');
      } else {
        throw new Error('ジョブの作成に失敗しました');
      }
    } catch (error) {
      console.error('AI要約生成エラー:', error);
      showToast('AI要約の生成に失敗しました');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // StatusBadgeの状態をマッピング
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'warning';
      case 'completed':
        return 'active';
      case 'cancelled':
        return 'error';
      default:
        return 'inactive';
    }
  };

  // モバイル版レンダリング
  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ミーティング</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Icon name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {!selectedMeetingId ? (
          <View style={styles.content}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="ミーティングを検索..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.filterContainer} horizontal showsHorizontalScrollIndicator={false}>
              {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    statusFilter === status && styles.filterButtonActive
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    statusFilter === status && styles.filterButtonTextActive
                  ]}>
                    {status === 'all' ? 'すべて' :
                     status === 'scheduled' ? '予定' :
                     status === 'completed' ? '完了' : 'キャンセル'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : filteredMeetings.length === 0 ? (
              <EmptyState
                title="ミーティングがありません"
                description="新しいミーティングを作成してください"
              />
            ) : (
              <FlatList
                data={filteredMeetings}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.meetingCard}
                    onPress={() => setSelectedMeetingId(item.id)}
                  >
                    <View style={styles.meetingCardHeader}>
                      <Text style={styles.meetingTitle}>{item.title}</Text>
                      <StatusBadge status={getStatusBadgeVariant(item.status)} />
                    </View>
                    <Text style={styles.meetingTime}>
                      {new Date(item.start_time).toLocaleString('ja-JP')}
                    </Text>
                    {item.description && (
                      <Text style={styles.meetingDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <View style={styles.meetingFooter}>
                      <Text style={styles.participantCount}>
                        参加者: {item.participants.length}名
                      </Text>
                      {item.tags && item.tags.length > 0 && (
                        <View style={styles.tagContainer}>
                          {item.tags.slice(0, 2).map((tag, index) => (
                            <Tag
                              key={index}
                              variant="default"
                              text={tag}
                            />
                          ))}
                          {item.tags.length > 2 && (
                            <Text style={styles.moreTagsText}>
                              +{item.tags.length - 2}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        ) : (
          <MeetingDetailPanel
            meeting={selectedMeeting}
            onClose={() => setSelectedMeetingId(null)}
            onEdit={(meeting) => {
              setEditingMeeting(meeting);
              setShowForm(true);
            }}
            onDelete={confirmDeleteMeeting}
            onGenerateCards={generateAICards}
            onGenerateSummary={generateAISummary}
            userCache={userCache}
            isGeneratingCards={isGeneratingCards}
            isGeneratingSummary={isGeneratingSummary}
          />
        )}

        {showForm && (
          <Modal
            visible={showForm}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <MeetingForm
              meeting={editingMeeting}
              onSave={handleSaveMeeting}
              onCancel={() => {
                setShowForm(false);
                setEditingMeeting(null);
              }}
              nestId={currentNest?.id || ''}
            />
          </Modal>
        )}

        <ConfirmModal
          visible={deleteConfirmModal.visible}
          title="ミーティングを削除"
          message={`「${deleteConfirmModal.meetingTitle}」を削除しますか？この操作は取り消せません。`}
          confirmText="削除"
          confirmVariant="danger"
          onConfirm={handleDeleteMeeting}
          onCancel={() => setDeleteConfirmModal({
            visible: false,
            meetingId: null,
            meetingTitle: ''
          })}
        />
      </SafeAreaView>
    );
  }

  // デスクトップ版レンダリング
  return (
    <View style={styles.container}>
      <View style={styles.desktopLayout}>
        {/* 左カラム：ミーティングリスト＋新規追加 */}
        <View style={styles.leftColumn}>
          <View style={styles.leftHeader}>
            <Text style={styles.sectionTitle}>ミーティング</Text>
            <TouchableOpacity
              style={styles.addButtonDesktop}
              onPress={() => setShowForm(true)}
            >
              <Icon name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInputDesktop}
              placeholder="ミーティングを検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.filterContainerDesktop}>
            {(['all', 'scheduled', 'completed', 'cancelled'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButtonDesktop,
                  statusFilter === status && styles.filterButtonActiveDesktop
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[
                  styles.filterButtonTextDesktop,
                  statusFilter === status && styles.filterButtonTextActiveDesktop
                ]}>
                  {status === 'all' ? 'すべて' :
                   status === 'scheduled' ? '予定' :
                   status === 'completed' ? '完了' : 'キャンセル'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.meetingList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : filteredMeetings.length === 0 ? (
              <EmptyState
                title="ミーティングがありません"
                description="新しいミーティングを作成してください"
              />
            ) : (
              filteredMeetings.map((meeting) => (
                <TouchableOpacity
                  key={meeting.id}
                  style={[
                    styles.meetingCardDesktop,
                    selectedMeetingId === meeting.id && styles.meetingCardSelectedDesktop
                  ]}
                  onPress={() => setSelectedMeetingId(meeting.id)}
                >
                  <View style={styles.meetingCardHeader}>
                    <Text style={styles.meetingTitleDesktop}>{meeting.title}</Text>
                    <StatusBadge status={getStatusBadgeVariant(meeting.status)} />
                  </View>
                  <Text style={styles.meetingTimeDesktop}>
                    {new Date(meeting.start_time).toLocaleString('ja-JP')}
                  </Text>
                  {meeting.description && (
                    <Text style={styles.meetingDescriptionDesktop} numberOfLines={2}>
                      {meeting.description}
                    </Text>
                  )}
                  <View style={styles.meetingFooterDesktop}>
                    <Text style={styles.participantCountDesktop}>
                      参加者: {meeting.participants.length}名
                    </Text>
                    {meeting.tags && meeting.tags.length > 0 && (
                      <View style={styles.tagContainer}>
                        {meeting.tags.slice(0, 1).map((tag, index) => (
                          <Tag
                            key={index}
                            variant="default"
                            text={tag}
                          />
                        ))}
                        {meeting.tags.length > 1 && (
                          <Text style={styles.moreTagsTextDesktop}>
                            +{meeting.tags.length - 1}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* 右カラム：詳細表示 */}
        <View style={styles.rightColumn}>
          {selectedMeeting ? (
            <MeetingDetailPanel
              meeting={selectedMeeting}
              onClose={() => setSelectedMeetingId(null)}
              onEdit={(meeting) => {
                setEditingMeeting(meeting);
                setShowForm(true);
              }}
              onDelete={confirmDeleteMeeting}
              onGenerateCards={generateAICards}
              onGenerateSummary={generateAISummary}
              userCache={userCache}
              isGeneratingCards={isGeneratingCards}
              isGeneratingSummary={isGeneratingSummary}
            />
          ) : (
            <View style={styles.emptyDetailPanel}>
              <EmptyState
                title="ミーティングを選択してください"
                description="左側のリストからミーティングを選択すると詳細が表示されます"
              />
            </View>
          )}
        </View>
      </View>

      {showForm && (
        <Modal
          visible={showForm}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <MeetingForm
            meeting={editingMeeting}
            onSave={handleSaveMeeting}
            onCancel={() => {
              setShowForm(false);
              setEditingMeeting(null);
            }}
            nestId={currentNest?.id || ''}
          />
        </Modal>
      )}

      <ConfirmModal
        visible={deleteConfirmModal.visible}
        title="ミーティングを削除"
        message={`「${deleteConfirmModal.meetingTitle}」を削除しますか？この操作は取り消せません。`}
        confirmText="削除"
        confirmVariant="danger"
        onConfirm={handleDeleteMeeting}
        onCancel={() => setDeleteConfirmModal({
          visible: false,
          meetingId: null,
          meetingTitle: ''
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  meetingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  meetingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meetingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  meetingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 12,
    color: '#666',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  // デスクトップスタイル
  desktopLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: 320,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e1e5e9',
  },
  leftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButtonDesktop: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInputDesktop: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    margin: 16,
  },
  filterContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterButtonDesktop: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  filterButtonActiveDesktop: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonTextDesktop: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActiveDesktop: {
    color: '#fff',
  },
  meetingList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  meetingCardDesktop: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    cursor: 'pointer',
  },
  meetingCardSelectedDesktop: {
    backgroundColor: '#f0f7ff',
    borderColor: '#007AFF',
  },
  meetingTitleDesktop: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  meetingTimeDesktop: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  meetingDescriptionDesktop: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  meetingFooterDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantCountDesktop: {
    fontSize: 11,
    color: '#666',
  },
  moreTagsTextDesktop: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyDetailPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});

export default MeetingSpace;
