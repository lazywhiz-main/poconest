import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, FlatList } from 'react-native';
import theme from '../../../styles/theme';

interface ZoomSpaceProps {
  // 必要に応じてpropsを追加
}

interface ZoomMeeting {
  id: string;
  title: string;
  hostName: string;
  scheduledTime: string;
  duration: number; // 分単位
  participants: number;
  joinUrl: string;
  isRecurring: boolean;
  status: 'scheduled' | 'live' | 'completed';
  recordings?: {
    date: string;
    duration: number;
    size: string;
    url: string;
  }[];
}

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'video':
      return (
        <>
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </>
      );
    case 'calendar':
      return (
        <>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </>
      );
    case 'users':
      return (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </>
      );
    case 'link':
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </>
      );
    case 'download':
      return (
        <>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

const ZoomSpace: React.FC<ZoomSpaceProps> = () => {
  // タブ状態
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'recordings'>('upcoming');

  // サンプルデータ：Zoom会議一覧
  const zoomMeetings: ZoomMeeting[] = [
    {
      id: 'meeting1',
      title: '週次進捗報告ミーティング',
      hostName: '山田 太郎',
      scheduledTime: '2023/06/15 10:00',
      duration: 60,
      participants: 8,
      joinUrl: 'https://zoom.us/j/1234567890',
      isRecurring: true,
      status: 'scheduled',
    },
    {
      id: 'meeting2',
      title: 'プロジェクトAキックオフ',
      hostName: '鈴木 花子',
      scheduledTime: '2023/06/16 14:00',
      duration: 90,
      participants: 12,
      joinUrl: 'https://zoom.us/j/0987654321',
      isRecurring: false,
      status: 'scheduled',
    },
    {
      id: 'meeting3',
      title: 'デザインレビュー',
      hostName: '佐藤 健',
      scheduledTime: '2023/06/14 15:30',
      duration: 45,
      participants: 5,
      joinUrl: 'https://zoom.us/j/5678901234',
      isRecurring: false,
      status: 'live',
    },
    {
      id: 'meeting4',
      title: '顧客ミーティング',
      hostName: '田中 美咲',
      scheduledTime: '2023/06/10 11:00',
      duration: 60,
      participants: 6,
      joinUrl: 'https://zoom.us/j/6789012345',
      isRecurring: false,
      status: 'completed',
      recordings: [
        {
          date: '2023/06/10',
          duration: 58,
          size: '245.8 MB',
          url: 'https://zoom.us/rec/share/abcdef123456',
        }
      ]
    },
    {
      id: 'meeting5',
      title: '開発チームミーティング',
      hostName: '山田 太郎',
      scheduledTime: '2023/06/08 13:00',
      duration: 45,
      participants: 10,
      joinUrl: 'https://zoom.us/j/7890123456',
      isRecurring: true,
      status: 'completed',
      recordings: [
        {
          date: '2023/06/08',
          duration: 43,
          size: '198.2 MB',
          url: 'https://zoom.us/rec/share/ghijkl654321',
        }
      ]
    },
  ];

  // フィルタリングされたミーティングリスト
  const filteredMeetings = zoomMeetings.filter(meeting => {
    if (activeTab === 'upcoming') return meeting.status === 'scheduled';
    if (activeTab === 'live') return meeting.status === 'live';
    if (activeTab === 'recordings') return meeting.status === 'completed' && meeting.recordings;
    return false;
  });

  // 会議カードレンダリング
  const renderMeetingCard = ({ item }: { item: ZoomMeeting }) => {
    return (
      <View style={styles.meetingCard}>
        <View style={styles.meetingHeader}>
          <View style={styles.meetingTitleContainer}>
            <Text style={styles.meetingTitle}>{item.title}</Text>
            {item.isRecurring && <Text style={styles.recurringBadge}>定期</Text>}
          </View>
          {activeTab === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>ライブ</Text>
            </View>
          )}
        </View>
        
        <View style={styles.meetingDetails}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={theme.colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.scheduledTime} ({item.duration}分)</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="users" size={16} color={theme.colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>参加者: {item.participants}人</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Icon name="video" size={16} color={theme.colors.primary} style={styles.detailIcon} />
            <Text style={styles.detailText}>ホスト: {item.hostName}</Text>
          </View>
        </View>
        
        {activeTab === 'recordings' && item.recordings && (
          <View style={styles.recordingsContainer}>
            <Text style={styles.recordingsTitle}>録画</Text>
            {item.recordings.map((recording, index) => (
              <View key={index} style={styles.recordingItem}>
                <View>
                  <Text style={styles.recordingDate}>{recording.date}</Text>
                  <Text style={styles.recordingInfo}>{recording.duration}分 • {recording.size}</Text>
                </View>
                <TouchableOpacity style={styles.downloadButton}>
                  <Icon name="download" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.actionButtons}>
          {activeTab !== 'recordings' ? (
            <TouchableOpacity style={styles.joinButton}>
              <Icon name="link" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.joinButtonText}>参加する</Text>
            </TouchableOpacity>
          ) : (
            <View style={{flex: 1}} />
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.spaceHeader}>
        <View style={styles.headerLeft}>
      <Text style={styles.title}>Zoom空間</Text>
          <Text style={styles.subtitle}>会議の管理、参加、録画の閲覧</Text>
        </View>
        <TouchableOpacity style={styles.createButton}>
          <Icon name="plus" size={16} color="white" style={styles.buttonIcon} />
          <Text style={styles.createButtonText}>新規会議</Text>
        </TouchableOpacity>
      </View>
      
      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            予定された会議
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.activeTab]}
          onPress={() => setActiveTab('live')}
        >
          <Text style={[styles.tabText, activeTab === 'live' && styles.activeTabText]}>
            ライブ中
          </Text>
          {zoomMeetings.filter(m => m.status === 'live').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {zoomMeetings.filter(m => m.status === 'live').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recordings' && styles.activeTab]}
          onPress={() => setActiveTab('recordings')}
        >
          <Text style={[styles.tabText, activeTab === 'recordings' && styles.activeTabText]}>
            録画
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* ミーティングリスト */}
      {filteredMeetings.length > 0 ? (
        <FlatList
          data={filteredMeetings}
          renderItem={renderMeetingCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {activeTab === 'upcoming' && '予定されている会議はありません'}
            {activeTab === 'live' && '現在ライブ中の会議はありません'}
            {activeTab === 'recordings' && '録画されたミーティングはありません'}
      </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  spaceHeader: {
    padding: 16,
    backgroundColor: theme.colors.spaces.meeting.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  meetingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meetingTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: 8,
  },
  recurringBadge: {
    fontSize: 12,
    color: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadge: {
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  meetingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  recordingsContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  recordingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginBottom: 8,
  },
  recordingDate: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  recordingInfo: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  joinButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default ZoomSpace; 