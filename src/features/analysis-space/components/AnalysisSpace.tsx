import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import theme from '../../../styles/theme';

interface AnalysisSpaceProps {
  // 必要に応じてpropsを追加
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
    case 'bar-chart':
      return (
        <>
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
          <line x1="2" y1="20" x2="22" y2="20"></line>
        </>
      );
    case 'pie-chart':
      return (
        <>
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
          <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
        </>
      );
    case 'activity':
      return (
        <>
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
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
    case 'message-square':
      return (
        <>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </>
      );
    case 'video':
      return (
        <>
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
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
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

// モックデータの定義
const getActivityData = () => {
  return {
    dailyStats: [
      { date: '6/1', messages: 15, meetings: 1, activity: 65 },
      { date: '6/2', messages: 23, meetings: 2, activity: 75 },
      { date: '6/3', messages: 18, meetings: 1, activity: 70 },
      { date: '6/4', messages: 10, meetings: 0, activity: 40 },
      { date: '6/5', messages: 5, meetings: 0, activity: 30 },
      { date: '6/6', messages: 8, meetings: 0, activity: 35 },
      { date: '6/7', messages: 30, meetings: 3, activity: 85 },
      { date: '6/8', messages: 22, meetings: 1, activity: 75 },
      { date: '6/9', messages: 20, meetings: 1, activity: 70 },
      { date: '6/10', messages: 25, meetings: 2, activity: 80 },
      { date: '6/11', messages: 18, meetings: 1, activity: 65 },
      { date: '6/12', messages: 12, meetings: 0, activity: 45 },
      { date: '6/13', messages: 10, meetings: 1, activity: 50 },
      { date: '6/14', messages: 28, meetings: 2, activity: 82 },
    ],
    weeklyActivity: {
      chat: 210,
      meetings: 15,
      calls: 8,
      fileShares: 23,
    },
    timeDistribution: {
      chat: 35,
      meetings: 25,
      planning: 15,
      development: 25,
    },
    topContacts: [
      { name: '山田 太郎', interactions: 45, avatar: 'https://i.pravatar.cc/150?img=32' },
      { name: '鈴木 花子', interactions: 32, avatar: 'https://i.pravatar.cc/150?img=44' },
      { name: '佐藤 健', interactions: 28, avatar: 'https://i.pravatar.cc/150?img=67' },
    ],
  };
};

// バーチャートコンポーネント（簡易版）
const SimpleBarChart = ({ data, maxValue, barColor }: { data: { date: string; value: number }[], maxValue: number, barColor: string }) => {
  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 40, 600);
  const barWidth = chartWidth / data.length - 4;
  
  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((item, index) => (
          <View key={index} style={styles.barColumn}>
            <View 
              style={[
                styles.bar, 
                { 
                  height: `${(item.value / maxValue) * 100}%`,
                  width: barWidth,
                  backgroundColor: barColor 
                }
              ]} 
            />
            <Text style={styles.barLabel}>{item.date}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// 円グラフコンポーネント（簡易版）
const SimplePieChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;
  
  return (
    <View style={styles.pieChartContainer}>
      <View style={styles.pieChart}>
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const endAngle = startAngle + angle;
          
          // 円グラフの扇形部分をSVGで表現
          const slice = (
            <View key={index} style={styles.pieSlice}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <path
                  d={`M 50 50 L ${50 + 40 * Math.cos(startAngle * Math.PI / 180)} ${50 + 40 * Math.sin(startAngle * Math.PI / 180)} A 40 40 0 ${angle > 180 ? 1 : 0} 1 ${50 + 40 * Math.cos(endAngle * Math.PI / 180)} ${50 + 40 * Math.sin(endAngle * Math.PI / 180)} Z`}
                  fill={item.color}
                />
              </svg>
            </View>
          );
          
          startAngle = endAngle;
          return slice;
        })}
      </View>
      
      <View style={styles.pieLegend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// 統計カードコンポーネント
const StatCard = ({ icon, title, value, change, positive }: { icon: string, title: string, value: string | number, change?: string, positive?: boolean }) => {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Icon name={icon} size={20} color="white" />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {change && (
        <View style={styles.changeContainer}>
          <Text style={[styles.changeValue, positive ? styles.positiveChange : styles.negativeChange]}>
            {positive ? '↑' : '↓'} {change}
          </Text>
        </View>
      )}
    </View>
  );
};

const AnalysisSpace: React.FC<AnalysisSpaceProps> = () => {
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const activityData = getActivityData();
  
  // アクティビティデータをチャート用にフォーマット
  const activityChartData = activityData.dailyStats.map(day => ({
    date: day.date,
    value: day.activity
  }));
  
  // メッセージデータをチャート用にフォーマット
  const messageChartData = activityData.dailyStats.map(day => ({
    date: day.date,
    value: day.messages
  }));
  
  // 時間配分のデータを円グラフ用にフォーマット
  const timeDistributionData = [
    { label: 'チャット', value: activityData.timeDistribution.chat, color: '#4CAF50' },
    { label: '会議', value: activityData.timeDistribution.meetings, color: '#2196F3' },
    { label: '計画', value: activityData.timeDistribution.planning, color: '#FFC107' },
    { label: '開発', value: activityData.timeDistribution.development, color: '#9C27B0' },
  ];
  
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      {/* <View style={styles.spaceHeader}>
        <View>
          <Text style={styles.title}>分析空間</Text>
          <Text style={styles.subtitle}>活動統計とレポート</Text>
        </View>
        
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, periodFilter === 'daily' && styles.activePeriod]}
            onPress={() => setPeriodFilter('daily')}
          >
            <Text style={[styles.periodButtonText, periodFilter === 'daily' && styles.activePeriodText]}>
              日次
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.periodButton, periodFilter === 'weekly' && styles.activePeriod]}
            onPress={() => setPeriodFilter('weekly')}
          >
            <Text style={[styles.periodButtonText, periodFilter === 'weekly' && styles.activePeriodText]}>
              週次
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.periodButton, periodFilter === 'monthly' && styles.activePeriod]}
            onPress={() => setPeriodFilter('monthly')}
          >
            <Text style={[styles.periodButtonText, periodFilter === 'monthly' && styles.activePeriodText]}>
              月次
            </Text>
          </TouchableOpacity>
        </View>
      </View> */}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 統計カード */}
        <View style={styles.statsRow}>
          <StatCard 
            icon="message-square" 
            title="チャットメッセージ" 
            value={activityData.weeklyActivity.chat} 
            change="12%" 
            positive={true} 
          />
          
          <StatCard 
            icon="video" 
            title="ミーティング" 
            value={activityData.weeklyActivity.meetings} 
            change="5%" 
            positive={true} 
          />
          
          <StatCard 
            icon="download" 
            title="共有ファイル" 
            value={activityData.weeklyActivity.fileShares} 
            change="3%" 
            positive={false} 
          />
        </View>
        
        {/* アクティビティチャート */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>アクティビティの推移</Text>
            <TouchableOpacity style={styles.downloadReportButton}>
              <Icon name="download" size={16} color={theme.colors.primary} style={styles.downloadIcon} />
              <Text style={styles.downloadText}>レポートを保存</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.chartCard}>
            <SimpleBarChart 
              data={activityChartData} 
              maxValue={100} 
              barColor={theme.colors.primary} 
            />
          </View>
        </View>
        
        {/* メッセージチャート */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>メッセージ数の推移</Text>
          <View style={styles.chartCard}>
            <SimpleBarChart 
              data={messageChartData} 
              maxValue={30} 
              barColor="#4CAF50" 
            />
          </View>
        </View>
        
        {/* 時間配分円グラフ */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>コラボレーション時間の配分</Text>
          <View style={styles.chartCard}>
            <SimplePieChart data={timeDistributionData} />
          </View>
        </View>
        
        {/* トップコンタクト */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>トップコンタクト</Text>
          <View style={styles.contactsCard}>
            {activityData.topContacts.map((contact, index) => (
              <View key={index} style={styles.contactItem}>
                <View style={styles.contactRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactInteractions}>{contact.interactions} インタラクション</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
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
    backgroundColor: theme.colors.spaces.analysis.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activePeriod: {
    backgroundColor: 'white',
  },
  periodButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    fontSize: 13,
  },
  activePeriodText: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  changeContainer: {
    marginTop: 8,
  },
  changeValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  chartSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  downloadReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadIcon: {
    marginRight: 4,
  },
  downloadText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartContainer: {
    height: 200,
    width: '100%',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    minHeight: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  pieChart: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  pieSlice: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pieLegend: {
    flex: 1,
    paddingLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  contactSection: {
    marginBottom: 20,
  },
  contactsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  contactRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text.secondary,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  contactInteractions: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  spacer: {
    height: 20,
  },
});

export default AnalysisSpace; 