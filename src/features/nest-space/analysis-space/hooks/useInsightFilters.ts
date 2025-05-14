import { useState, useCallback, useMemo } from 'react';
import { useAnalysisSpace, AIInsight } from './useAnalysisSpace';

interface FilterState {
  timeRange: {
    start: Date | null;
    end: Date | null;
  };
  types: string[];
  keywords: string[];
  confidence: number;
  searchQuery: string;
}

export const useInsightFilters = () => {
  const { 
    analysisState, 
    updateFilters, 
    resetFilters,
    availableKeywords,
    availableTypes
  } = useAnalysisSpace();
  
  // Get the current filter state
  const filterState = useMemo(() => analysisState.filters, [analysisState.filters]);
  
  // Update time range filter
  const setTimeRange = useCallback((start: Date | null, end: Date | null) => {
    updateFilters({
      timeRange: { start, end }
    });
  }, [updateFilters]);
  
  // Update type filter
  const toggleTypeFilter = useCallback((type: string) => {
    updateFilters({
      types: filterState.types.includes(type)
        ? filterState.types.filter(t => t !== type)
        : [...filterState.types, type]
    });
  }, [filterState.types, updateFilters]);
  
  // Set multiple types at once
  const setTypeFilters = useCallback((types: string[]) => {
    updateFilters({ types });
  }, [updateFilters]);
  
  // Update keyword filter
  const toggleKeywordFilter = useCallback((keyword: string) => {
    updateFilters({
      keywords: filterState.keywords.includes(keyword)
        ? filterState.keywords.filter(k => k !== keyword)
        : [...filterState.keywords, keyword]
    });
  }, [filterState.keywords, updateFilters]);
  
  // Set multiple keywords at once
  const setKeywordFilters = useCallback((keywords: string[]) => {
    updateFilters({ keywords });
  }, [updateFilters]);
  
  // Update confidence threshold
  const setConfidenceThreshold = useCallback((confidence: number) => {
    updateFilters({ confidence });
  }, [updateFilters]);
  
  // Update search query
  const setSearchQuery = useCallback((searchQuery: string) => {
    updateFilters({ searchQuery });
  }, [updateFilters]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);
  
  // Get timeframe presets
  const timeframePresets = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    
    return {
      today: {
        label: '今日',
        start: today,
        end: now
      },
      yesterday: {
        label: '昨日',
        start: yesterday,
        end: today
      },
      thisWeek: {
        label: '今週',
        start: thisWeekStart,
        end: now
      },
      lastWeek: {
        label: '先週',
        start: lastWeekStart,
        end: lastWeekEnd
      },
      thisMonth: {
        label: '今月',
        start: thisMonthStart,
        end: now
      },
      lastMonth: {
        label: '先月',
        start: lastMonthStart,
        end: lastMonthEnd
      },
      all: {
        label: 'すべて',
        start: null,
        end: null
      }
    };
  }, []);
  
  // Apply timeframe preset
  const applyTimeframePreset = useCallback((presetKey: keyof typeof timeframePresets) => {
    const preset = timeframePresets[presetKey];
    setTimeRange(preset.start, preset.end);
  }, [timeframePresets, setTimeRange]);
  
  // Get insights by importance/popularity
  const getTopInsights = useCallback((insights: AIInsight[], count: number = 5) => {
    return [...insights]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, count);
  }, []);
  
  // Get trending keywords based on current data
  const getTrendingKeywords = useCallback((insights: AIInsight[], count: number = 10) => {
    const keywordCounts: Record<string, number> = {};
    
    insights.forEach(insight => {
      insight.keywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
    });
    
    return Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([keyword, count]) => ({
        keyword,
        count
      }));
  }, []);
  
  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filterState.timeRange.start !== null ||
      filterState.timeRange.end !== null ||
      filterState.types.length > 0 ||
      filterState.keywords.length > 0 ||
      filterState.confidence > 0.5 ||
      filterState.searchQuery !== ''
    );
  }, [filterState]);
  
  return {
    // Filter state
    filterState,
    hasActiveFilters,
    availableKeywords,
    availableTypes,
    
    // Filter actions
    setTimeRange,
    toggleTypeFilter,
    setTypeFilters,
    toggleKeywordFilter,
    setKeywordFilters,
    setConfidenceThreshold,
    setSearchQuery,
    clearAllFilters,
    
    // Timeframe presets
    timeframePresets,
    applyTimeframePreset,
    
    // Utility functions
    getTopInsights,
    getTrendingKeywords
  };
}; 