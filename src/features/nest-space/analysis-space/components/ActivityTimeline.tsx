import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { ActivityEvent } from '../hooks/useAnalysisSpace';
import { useAnalysisSpace } from '../hooks/useAnalysisSpace';

const windowWidth = Dimensions.get('window').width;
const isTabletOrDesktop = windowWidth > 768;

interface ActivityItemProps {
  activity: ActivityEvent;
  onPress: (activity: ActivityEvent) => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onPress }) => {
  // Format date
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Get activity icon based on type
  const getActivityIcon = () => {
    switch(activity.type) {
      case 'message':
        return '💬';
      case 'card_created':
        return '📝';
      case 'card_moved':
        return '↗️';
      case 'insight_generated':
        return '💡';
      case 'meeting':
        return '👥';
      default:
        return '•';
    }
  };

  // Get activity color based on importance
  const getActivityColor = () => {
    if (activity.importance >= 0.8) return '#F44336'; // red - highest importance
    if (activity.importance >= 0.6) return '#FF9800'; // orange - high importance
    if (activity.importance >= 0.4) return '#2196F3'; // blue - medium importance
    if (activity.importance >= 0.2) return '#4CAF50'; // green - low importance
    return '#9E9E9E'; // grey - lowest importance
  };
  
  return (
    <TouchableOpacity 
      style={styles.activityItem} 
      onPress={() => onPress(activity)}
    >
      <View style={[styles.activityIconContainer, { backgroundColor: getActivityColor() }]}>
        <Text style={styles.activityIcon}>{getActivityIcon()}</Text>
      </View>
      
      <View style={styles.activityContent}>
        <Text style={styles.activityDescription}>{activity.description}</Text>
        
        <View style={styles.activityMeta}>
          <Text style={styles.activityUser}>{activity.userName}</Text>
          <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface ActivityGroupProps {
  date: string;
  activities: ActivityEvent[];
  onActivityPress: (activity: ActivityEvent) => void;
}

const ActivityGroup: React.FC<ActivityGroupProps> = ({ date, activities, onActivityPress }) => {
  // Add localized day of week
  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };
  
  // Format date
  const formatGroupDate = (dateStr: string) => {
    const date = new Date(dateStr);
    
    // If it's today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return '今日';
    }
    
    // If it's yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨日';
    }
    
    // Otherwise, format the date
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric' 
    }) + ` (${getDayOfWeek(dateStr)})`;
  };
  
  return (
    <View style={styles.activityGroup}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatGroupDate(date)}</Text>
        <View style={styles.dateLine} />
      </View>
      
      <View style={styles.activitiesList}>
        {activities.map((activity, index) => (
          <ActivityItem 
            key={activity.id || index} 
            activity={activity} 
            onPress={onActivityPress} 
          />
        ))}
      </View>
    </View>
  );
};

interface ActivityDetailProps {
  activity: ActivityEvent;
  onClose: () => void;
}

const ActivityDetail: React.FC<ActivityDetailProps> = ({ activity, onClose }) => {
  const { navigateToRelatedContent } = useAnalysisSpace();
  
  // Format date
  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Navigate to related content
  const handleNavigateToSource = () => {
    if (activity.sourceId && activity.sourceType) {
      navigateToRelatedContent(activity.sourceId, activity.sourceType);
    }
  };
  
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>
          アクティビティ詳細
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.detailContent}>
        <Text style={styles.detailDescription}>{activity.description}</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>タイプ:</Text>
          <Text style={styles.detailValue}>
            {activity.type === 'message' && 'メッセージ'}
            {activity.type === 'card_created' && 'カード作成'}
            {activity.type === 'card_moved' && 'カード移動'}
            {activity.type === 'insight_generated' && '洞察生成'}
            {activity.type === 'meeting' && 'ミーティング'}
          </Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>ユーザー:</Text>
          <Text style={styles.detailValue}>{activity.userName}</Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>日時:</Text>
          <Text style={styles.detailValue}>{formatDateTime(activity.timestamp)}</Text>
        </View>
        
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>重要度:</Text>
          <View style={styles.importanceBar}>
            <View 
              style={[
                styles.importanceFill, 
                { width: `${activity.importance * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.importanceText}>{Math.round(activity.importance * 100)}%</Text>
        </View>
        
        {activity.sourceId && activity.sourceType && (
          <TouchableOpacity style={styles.navigateButton} onPress={handleNavigateToSource}>
            <Text style={styles.navigateButtonText}>
              {activity.sourceType === 'chat' && 'チャットを表示'}
              {activity.sourceType === 'board' && 'ボードを表示'}
              {activity.sourceType === 'analysis' && '分析を表示'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface ActivityTimelineProps {
  activities: ActivityEvent[];
  viewMode: 'list' | 'grid' | 'dashboard';
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities, viewMode }) => {
  const [selectedActivity, setSelectedActivity] = useState<ActivityEvent | null>(null);
  
  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(activity);
    });
    
    // Sort dates and activities
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, activities]) => ({
        date,
        activities: activities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      }));
  }, [activities]);
  
  const handleActivityPress = (activity: ActivityEvent) => {
    setSelectedActivity(activity);
  };
  
  const handleCloseDetail = () => {
    setSelectedActivity(null);
  };
  
  // Empty state
  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>アクティビティがありません</Text>
        <Text style={styles.emptyDescription}>
          まだアクティビティが記録されていません。
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        data={groupedActivities}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <ActivityGroup 
            date={item.date} 
            activities={item.activities} 
            onActivityPress={handleActivityPress}
          />
        )}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      />
      
      {selectedActivity && (
        <View style={styles.modalOverlay}>
          <ActivityDetail 
            activity={selectedActivity}
            onClose={handleCloseDetail}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  timelineContent: {
    padding: 16,
  },
  activityGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    marginRight: 8,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  activitiesList: {
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4a6da7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityUser: {
    fontSize: 12,
    color: '#666666',
  },
  activityTime: {
    fontSize: 12,
    color: '#999999',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: isTabletOrDesktop ? '50%' : '90%',
    maxWidth: 500,
    maxHeight: isTabletOrDesktop ? 'auto' : '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    padding: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#757575',
  },
  detailContent: {
    padding: 16,
  },
  detailDescription: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
  },
  importanceBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  importanceFill: {
    height: '100%',
    backgroundColor: '#4a6da7',
    borderRadius: 4,
  },
  importanceText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  navigateButton: {
    backgroundColor: '#4a6da7',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  }
});

export default ActivityTimeline; 