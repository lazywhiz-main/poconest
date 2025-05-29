import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import { ZoomMeeting } from '../hooks/useZoomSpace';
import theme from '../../../../styles/theme';

// 会議ステータスのラベルマッピング
const statusLabels: Record<string, string> = {
  scheduled: '予定',
  completed: '完了',
  cancelled: 'キャンセル',
  in_progress: '進行中'
};

// 会議ステータスの色マッピング
const statusColors: Record<string, string> = {
  scheduled: '#4a6da7',
  completed: '#4caf50',
  cancelled: '#f44336',
  in_progress: '#ff9800'
};

// MeetingListコンポーネントのプロパティ定義
interface MeetingListProps {
  meetings: ZoomMeeting[];
  selectedMeetingId: string | null | undefined;
  onSelectMeeting: (meetingId: string | null) => void;
  loading?: boolean;
  compact?: boolean;
}

// MeetingListコンポーネント
const MeetingList: React.FC<MeetingListProps> = ({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  loading = false,
  compact = false
}) => {
  // 検索クエリ状態
  const [searchQuery, setSearchQuery] = useState('');
  
  // ソート方法状態
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');
  
  // ステータスフィルター状態
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  // フィルター状態
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all');
  
  // 検索クエリによるフィルタリング
  const filteredMeetings = meetings.filter(meeting => {
    // 検索クエリがあれば、タイトルと説明で検索
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const titleMatch = meeting.title.toLowerCase().includes(query);
      const descMatch = meeting.description?.toLowerCase().includes(query) || false;
      const hostMatch = meeting.host.toLowerCase().includes(query);
      
      if (!(titleMatch || descMatch || hostMatch)) {
        return false;
      }
    }
    
    // ステータスフィルターがあれば、対象のステータスのみ表示
    if (statusFilter.length > 0) {
      if (!statusFilter.includes(meeting.status)) {
        return false;
      }
    }
    
    return true;
  });
  
  // ソートされたミーティングリスト
  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });
  
  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // ステータスフィルターの切り替え
  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };
  
  const getStatusColor = (status: ZoomMeeting['status']) => {
    switch (status) {
      case 'scheduled':
        return theme.colors.status.info;
      case 'completed':
        return theme.colors.status.success;
      case 'cancelled':
        return theme.colors.status.error;
      case 'in_progress':
        return theme.colors.status.warning;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusText = (status: ZoomMeeting['status']) => {
    switch (status) {
      case 'scheduled':
        return '予定';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      case 'in_progress':
        return '進行中';
      default:
        return '';
    }
  };
  
  // 会議アイテムのレンダリング
  const renderMeetingItem = ({ item }: { item: ZoomMeeting }) => {
    const isSelected = selectedMeetingId === item.id;
    
    // コンパクトモード用のスタイルと詳細モード用のスタイルを分ける
    return (
      <TouchableOpacity
        style={[
          styles.meetingItem,
          isSelected && styles.selectedMeetingItem,
          compact && styles.compactMeetingItem
        ]}
        onPress={() => onSelectMeeting(isSelected ? null : item.id)}
      >
        <View style={styles.meetingHeader}>
          <View style={styles.meetingTitle}>
            <Text 
              style={[
                styles.meetingTitleText,
                compact && styles.compactMeetingTitleText
              ]}
              numberOfLines={compact ? 1 : 2}
            >
              {item.title}
            </Text>
          </View>
          <View 
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>
        
        <View style={styles.meetingInfo}>
          <Text 
            style={[
              styles.meetingDateText,
              compact && styles.compactMeetingInfoText
            ]}
          >
            {formatDate(item.date)}
          </Text>
          <Text 
            style={[
              styles.meetingDurationText,
              compact && styles.compactMeetingInfoText
            ]}
          >
            {item.duration}分
          </Text>
        </View>
        
        {!compact && (
          <>
            <View style={styles.meetingHost}>
              <Text style={styles.meetingHostLabel}>主催者:</Text>
              <Text style={styles.meetingHostText}>{item.host}</Text>
            </View>
            
            <View style={styles.meetingDetails}>
              <View style={styles.participantsInfo}>
                <Text style={styles.participantsCount}>
                  {item.participants.length}人の参加者
                </Text>
              </View>
              
              {item.recording && (
                <View style={styles.recordingBadge}>
                  <Text style={styles.recordingText}>録画あり</Text>
                </View>
              )}
              
              {item.analysis && (
                <View 
                  style={[
                    styles.recordingBadge,
                    { backgroundColor: '#8e24aa' }
                  ]}
                >
                  <Text style={styles.recordingText}>分析あり</Text>
                </View>
              )}
            </View>
            
            {item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={styles.tagBadge}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
                )}
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };
  
  // 会議リストが空の場合の表示
  const renderEmptyList = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color="#4a6da7" />
          <Text style={styles.emptyText}>ミーティングを読み込み中...</Text>
        </View>
      );
    }
    
    if (searchQuery.trim() !== '' || statusFilter.length > 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>条件に一致するミーティングがありません</Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSearchQuery('');
              setStatusFilter([]);
            }}
          >
            <Text style={styles.resetButtonText}>フィルターをリセット</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>ミーティングがありません</Text>
        <Text style={styles.emptySubText}>新しいミーティングを作成するか、既存の会議を同期してください</Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* 検索バーとフィルター */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="ミーティングを検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>
      
      {/* ソートとフィルターオプション */}
      {!compact && (
        <View style={styles.filterBar}>
          <View style={styles.sortOptions}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'date' && styles.activeSortButton
              ]}
              onPress={() => setSortBy('date')}
            >
              <Text 
                style={[
                  styles.sortButtonText,
                  sortBy === 'date' && styles.activeSortButtonText
                ]}
              >
                日付順
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortBy === 'title' && styles.activeSortButton
              ]}
              onPress={() => setSortBy('title')}
            >
              <Text 
                style={[
                  styles.sortButtonText,
                  sortBy === 'title' && styles.activeSortButtonText
                ]}
              >
                名前順
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterButtonText]}>
                すべて
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'scheduled' && styles.activeFilterButton]}
              onPress={() => setFilter('scheduled')}
            >
              <Text style={[styles.filterButtonText, filter === 'scheduled' && styles.activeFilterButtonText]}>
                予定
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterButtonText, filter === 'completed' && styles.activeFilterButtonText]}>
                完了
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* 会議リスト */}
      <FlatList
        data={sortedMeetings}
        renderItem={renderMeetingItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  filterBar: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sortOptions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeSortButton: {
    backgroundColor: '#4a6da7',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#757575',
  },
  activeSortButtonText: {
    color: '#ffffff',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilterButton: {
    backgroundColor: '#4a6da7',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#757575',
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  listContent: {
    padding: 8,
    paddingBottom: 20,
  },
  meetingItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedMeetingItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
  },
  compactMeetingItem: {
    padding: 12,
    marginBottom: 4,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  meetingTitle: {
    flex: 1,
    marginRight: 8,
  },
  meetingTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  compactMeetingTitleText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  meetingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingDateText: {
    fontSize: 14,
    color: '#757575',
    marginRight: 16,
  },
  meetingDurationText: {
    fontSize: 14,
    color: '#757575',
  },
  compactMeetingInfoText: {
    fontSize: 12,
  },
  meetingHost: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetingHostLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 4,
  },
  meetingHostText: {
    fontSize: 14,
    color: '#333333',
  },
  meetingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantsInfo: {
    marginRight: 8,
  },
  participantsCount: {
    fontSize: 12,
    color: '#757575',
  },
  recordingBadge: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 10,
    color: '#ffffff',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tagBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#757575',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#757575',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginVertical: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#4a6da7',
  },
});

export default MeetingList; 