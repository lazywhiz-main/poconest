import { useCallback, useMemo } from 'react';
import { useAnalysisSpace, AIInsight, TrendData, KeywordNetwork, ActivityEvent } from './useAnalysisSpace';

// Types for visualization
export type ChartType = 'bar' | 'line' | 'pie' | 'radar' | 'scatter' | 'heatmap' | 'network';

export interface VisualizationOptions {
  type: ChartType;
  showLegend: boolean;
  enableAnimation: boolean;
  colorScheme: 'default' | 'sequential' | 'diverging' | 'categorical';
  showDataLabels: boolean;
  interactivityLevel: 'none' | 'basic' | 'detailed';
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export const useDataVisualization = () => {
  const { 
    analysisState: _analysisState, 
    filteredInsights: _filteredInsights
  } = useAnalysisSpace();
  
  // Default visualization options
  const defaultVisualizationOptions: VisualizationOptions = useMemo(() => ({
    type: 'bar',
    showLegend: true,
    enableAnimation: true,
    colorScheme: 'default',
    showDataLabels: false,
    interactivityLevel: 'basic'
  }), []);
  
  // Convert trend data to chart data
  const prepareChartData = useCallback((trend: TrendData, options?: Partial<VisualizationOptions>): ChartData => {
    // Format dates for display
    const formattedLabels = trend.dataPoints.map(point => {
      const date = new Date(point.timestamp);
      return point.label || `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    // Get values from data points
    const values = trend.dataPoints.map(point => point.value);
    
    // Create a color based on the trend type
    let color = '#4a6da7'; // default blue
    switch (trend.trend) {
      case 'increasing':
        color = '#4CAF50'; // green
        break;
      case 'decreasing':
        color = '#F44336'; // red
        break;
      case 'fluctuating':
        color = '#FFC107'; // amber
        break;
      case 'stable':
        color = '#607D8B'; // blue-grey
        break;
    }
    
    return {
      labels: formattedLabels,
      datasets: [
        {
          label: trend.title,
          data: values,
          backgroundColor: options?.type === 'line' ? 'rgba(74, 109, 167, 0.2)' : color,
          borderColor: color
        }
      ]
    };
  }, []);
  
  // Prepare network visualization data
  const prepareNetworkData = useCallback((keywordNetwork: KeywordNetwork) => {
    // Transform to format needed by visualization library
    const nodes = keywordNetwork.nodes.map(node => ({
      id: node.id,
      label: node.label,
      value: node.count,
      group: node.category
    }));
    
    const edges = keywordNetwork.links.map(link => ({
      from: link.source,
      to: link.target,
      value: link.strength * 10, // Scale up for better visibility
      title: `${link.source} → ${link.target} (${link.count}回)`
    }));
    
    return { nodes, edges };
  }, []);
  
  // Prepare timeline visualization data from activities
  const prepareTimelineData = useCallback((activities: ActivityEvent[]) => {
    // Group by day
    const groupedByDay: Record<string, ActivityEvent[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = [];
      }
      
      groupedByDay[dateKey].push(activity);
    });
    
    // Format for timeline visualization
    return Object.entries(groupedByDay)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([dateStr, activities]) => {
        const date = new Date(dateStr);
        const formattedDate = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        
        return {
          date: formattedDate,
          activities: activities.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        };
      });
  }, []);
  
  // Prepare calendar heatmap data
  const prepareCalendarData = useCallback((activities: ActivityEvent[], startDate: Date, endDate: Date) => {
    // Create array of dates
    const dateArray: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Count activities per day
    const activityCounts = dateArray.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      
      const count = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate.toISOString().split('T')[0] === dateStr;
      }).length;
      
      return {
        date: dateStr,
        count
      };
    });
    
    return activityCounts;
  }, []);
  
  // Generate a word cloud data from insights
  const prepareWordCloudData = useCallback((insights: AIInsight[]) => {
    const keywordCounts: Record<string, number> = {};
    
    insights.forEach(insight => {
      insight.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCounts).map(([text, value]) => ({
      text,
      value
    }));
  }, []);
  
  // Generate insight distribution by type
  const prepareInsightDistributionData = useCallback((insights: AIInsight[]) => {
    const typeCounts: Record<string, number> = {};
    
    insights.forEach(insight => {
      typeCounts[insight.type] = (typeCounts[insight.type] || 0) + 1;
    });
    
    const typeLabels: Record<string, string> = {
      'communication': 'コミュニケーション',
      'trend': 'トレンド',
      'topic': 'トピック',
      'activity': 'アクティビティ',
      'relationship': '関係性'
    };
    
    return {
      labels: Object.keys(typeCounts).map(type => typeLabels[type] || type),
      datasets: [{
        label: '洞察タイプ',
        data: Object.values(typeCounts),
        backgroundColor: [
          '#4a6da7', // blue
          '#4CAF50', // green
          '#FFC107', // amber
          '#F44336', // red
          '#9C27B0'  // purple
        ]
      }]
    };
  }, []);
  
  // Generate confidence distribution data
  const prepareConfidenceDistributionData = useCallback((insights: AIInsight[]) => {
    // Group by confidence ranges
    const confidenceRanges = [
      { min: 0.0, max: 0.2, label: '非常に低い' },
      { min: 0.2, max: 0.4, label: '低い' },
      { min: 0.4, max: 0.6, label: '中程度' },
      { min: 0.6, max: 0.8, label: '高い' },
      { min: 0.8, max: 1.0, label: '非常に高い' }
    ];
    
    const confidenceCounts = confidenceRanges.map(range => {
      const count = insights.filter(
        insight => insight.confidence >= range.min && insight.confidence <= range.max
      ).length;
      
      return {
        label: range.label,
        count
      };
    });
    
    return {
      labels: confidenceCounts.map(item => item.label),
      datasets: [{
        label: '確信度',
        data: confidenceCounts.map(item => item.count),
        backgroundColor: '#4a6da7'
      }]
    };
  }, []);
  
  return {
    // Default options
    defaultVisualizationOptions,
    
    // Preparation functions
    prepareChartData,
    prepareNetworkData,
    prepareTimelineData,
    prepareCalendarData,
    prepareWordCloudData,
    prepareInsightDistributionData,
    prepareConfidenceDistributionData
  };
}; 