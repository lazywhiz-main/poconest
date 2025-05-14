import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useAnalysisSpace } from '../hooks/useAnalysisSpace';
import InsightGallery from './InsightGallery';
import ActivityTimeline from './ActivityTimeline';
import TrendVisualizer from './TrendVisualizer';

interface TabProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const Tab: React.FC<TabProps> = ({ label, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, isActive && styles.activeTab]}
    onPress={onPress}
  >
    <Text style={[styles.tabText, isActive && styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

interface HeaderProps {
  title: string;
  subtitle?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  isLoading, 
  onRefresh 
}) => (
  <View style={styles.header}>
    <View>
      <Text style={styles.headerTitle}>{title}</Text>
      {subtitle && (
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      )}
    </View>
    {onRefresh && (
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={onRefresh}
        disabled={isLoading}
      >
        <Text>🔄</Text>
      </TouchableOpacity>
    )}
  </View>
);

const AnalysisSpace = () => {
  const { 
    analysisState, 
    generateAnalysisData,
    filteredInsights,
    setViewMode
  } = useAnalysisSpace();
  
  const [activeTab, setActiveTab] = useState('insights');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="分析空間" 
        subtitle="AIによるNEST活動の分析と洞察"
        isLoading={analysisState.isLoading}
        onRefresh={generateAnalysisData}
      />
      
      {/* View Mode Selector */}
      <View style={styles.viewModeSelector}>
        <TouchableOpacity 
          style={[
            styles.viewModeButton, 
            analysisState.viewMode === 'list' && styles.activeViewModeButton
          ]}
          onPress={() => setViewMode('list')}
        >
          <Text style={styles.viewModeButtonText}>リスト</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.viewModeButton, 
            analysisState.viewMode === 'grid' && styles.activeViewModeButton
          ]}
          onPress={() => setViewMode('grid')}
        >
          <Text style={styles.viewModeButtonText}>グリッド</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.viewModeButton, 
            analysisState.viewMode === 'dashboard' && styles.activeViewModeButton
          ]}
          onPress={() => setViewMode('dashboard')}
        >
          <Text style={styles.viewModeButtonText}>ダッシュボード</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabBar}>
        <Tab 
          label="洞察" 
          isActive={activeTab === 'insights'} 
          onPress={() => setActiveTab('insights')} 
        />
        <Tab 
          label="活動タイムライン" 
          isActive={activeTab === 'timeline'} 
          onPress={() => setActiveTab('timeline')} 
        />
        <Tab 
          label="トレンド" 
          isActive={activeTab === 'trends'} 
          onPress={() => setActiveTab('trends')} 
        />
      </View>
      
      {/* Loading indicator or error state */}
      {analysisState.isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>データを分析中...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={
            analysisState.viewMode === 'dashboard' 
              ? styles.dashboardContent 
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'insights' && (
            <InsightGallery 
              insights={filteredInsights}
              viewMode={analysisState.viewMode}
            />
          )}
          
          {activeTab === 'timeline' && (
            <ActivityTimeline 
              activities={analysisState.activities}
              viewMode={analysisState.viewMode}
            />
          )}
          
          {activeTab === 'trends' && (
            <TrendVisualizer 
              trends={analysisState.trends}
              keywordNetwork={analysisState.keywordNetwork}
              viewMode={analysisState.viewMode}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  viewModeSelector: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  viewModeButton: {
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
  },
  activeViewModeButton: {
    backgroundColor: '#4a6da7',
  },
  viewModeButtonText: {
    fontSize: 14,
    color: '#333333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a6da7',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
  },
  activeTabText: {
    color: '#4a6da7',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  dashboardContent: {
    padding: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
  },
});

export default AnalysisSpace; 