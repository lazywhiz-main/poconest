import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from 'src/types/nestSpace.types';

// Zoom会議の録画データ型
export interface ZoomRecording {
  id: string;
  url: string;
  duration: number; // 秒単位
  fileSize: number; // バイト単位
  format: 'mp4' | 'webm' | 'm4a' | 'other';
  createdAt: string;
  downloadCount: number;
  transcriptionStatus: 'none' | 'in_progress' | 'completed';
  transcriptionUrl?: string;
  googleDriveId?: string;
}

// Zoom会議の参加者データ型
export interface ZoomParticipant {
  id: string;
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  duration: number; // 秒単位
  role: 'host' | 'co-host' | 'participant';
  avatar?: string;
}

// Zoom会議の分析データ型
export interface ZoomAnalysis {
  id: string;
  meetingId: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  speakingTimePercentage: Record<string, number>; // 参加者ごとの発言時間割合
  topicSegments: {
    title: string;
    startTime: number;
    endTime: number;
    keyPoints: string[];
  }[];
  wordFrequency: Record<string, number>;
  aiSummary: string;
  generatedAt: string;
}

// Zoom会議データ型
export interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number; // 分単位
  status: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  zoomMeetingId: string;
  zoomMeetingUrl?: string;
  host: string;
  participants: ZoomParticipant[];
  recording?: ZoomRecording;
  notes?: string;
  tags: string[];
  googleDriveLink?: string;
  calendarEventId?: string;
  analysis?: ZoomAnalysis;
  createdAt: string;
  updatedAt: string;
}

// Zoom空間の状態型
export interface ZoomSpaceState {
  meetings: ZoomMeeting[];
  selectedMeetingId: string | null;
  isPlayingRecording: boolean;
  currentRecordingTime: number;
  isLoading: boolean;
  error: string | null;
  filters: {
    searchQuery: string;
    status: ('scheduled' | 'completed' | 'cancelled' | 'in_progress')[];
    dateRange: { start: Date | null; end: Date | null };
    tags: string[];
  };
  sortBy: 'date' | 'title' | 'duration';
  sortDirection: 'asc' | 'desc';
}

// モックデータ生成のためのヘルパー関数
const generateMockMeetings = (): ZoomMeeting[] => {
  const now = new Date();
  
  return [
    {
      id: '1',
      title: 'プロジェクト計画会議',
      description: '四半期のプロジェクト計画と予算配分についての会議',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間前
      duration: 60,
      status: 'completed',
      zoomMeetingId: '123456789',
      zoomMeetingUrl: 'https://zoom.us/j/123456789',
      host: '山田太郎',
      participants: [
        {
          id: 'p1',
          name: '山田太郎',
          email: 'yamada@example.com',
          joinTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          leaveTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          duration: 3600,
          role: 'host'
        },
        {
          id: 'p2',
          name: '佐藤花子',
          email: 'sato@example.com',
          joinTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
          leaveTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          duration: 3300,
          role: 'participant'
        }
      ],
      recording: {
        id: 'r1',
        url: 'https://example.com/recordings/123',
        duration: 3600,
        fileSize: 256000000,
        format: 'mp4',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        downloadCount: 3,
        transcriptionStatus: 'completed',
        transcriptionUrl: 'https://example.com/transcriptions/123',
        googleDriveId: 'gdrive123'
      },
      notes: '予算についての議論が主な内容。マーケティング部門への予算増額が決定。',
      tags: ['予算', '計画', '四半期'],
      googleDriveLink: 'https://drive.google.com/folders/abc123',
      analysis: {
        id: 'a1',
        meetingId: '1',
        keyPoints: [
          'マーケティング予算を20%増額',
          '新製品開発の優先順位付け',
          '人材採用計画の見直し'
        ],
        actionItems: [
          '佐藤: 改訂予算案の作成 (期限: 7/15)',
          '山田: 採用計画の更新 (期限: 7/20)'
        ],
        sentiment: 'positive',
        speakingTimePercentage: {
          '山田太郎': 60,
          '佐藤花子': 40
        },
        topicSegments: [
          {
            title: '前回議事録の確認',
            startTime: 0,
            endTime: 300,
            keyPoints: ['前回の決定事項を確認']
          },
          {
            title: '予算討議',
            startTime: 300,
            endTime: 1800,
            keyPoints: ['マーケティング予算増額の必要性']
          },
          {
            title: '採用計画',
            startTime: 1800,
            endTime: 3300,
            keyPoints: ['エンジニア2名採用の承認']
          }
        ],
        wordFrequency: {
          '予算': 24,
          'マーケティング': 18,
          '採用': 15,
          '計画': 12
        },
        aiSummary: 'この会議では、主に予算配分と人材採用について議論されました。マーケティング部門への予算を20%増額することが決定され、また新たにエンジニアを2名採用することが承認されました。',
        generatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
      },
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      title: '週次進捗ミーティング',
      description: 'チームの週次進捗確認と課題共有',
      date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日前
      duration: 30,
      status: 'completed',
      zoomMeetingId: '987654321',
      zoomMeetingUrl: 'https://zoom.us/j/987654321',
      host: '鈴木一郎',
      participants: [
        {
          id: 'p3',
          name: '鈴木一郎',
          email: 'suzuki@example.com',
          joinTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          leaveTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          duration: 1800,
          role: 'host'
        },
        {
          id: 'p4',
          name: '田中二郎',
          email: 'tanaka@example.com',
          joinTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          leaveTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000).toISOString(),
          duration: 1500,
          role: 'participant'
        }
      ],
      recording: {
        id: 'r2',
        url: 'https://example.com/recordings/456',
        duration: 1800,
        fileSize: 128000000,
        format: 'mp4',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        downloadCount: 2,
        transcriptionStatus: 'completed',
        transcriptionUrl: 'https://example.com/transcriptions/456'
      },
      notes: 'フロントエンドの実装が予定通り進行中。バックエンドAPIに一部遅延あり。',
      tags: ['進捗', '週次', '開発'],
      analysis: {
        id: 'a2',
        meetingId: '2',
        keyPoints: [
          'フロントエンド実装は予定通り',
          'バックエンドAPIに遅延あり',
          'テスト環境の準備が必要'
        ],
        actionItems: [
          '田中: テスト環境のセットアップ (期限: 7/10)',
          '鈴木: バックエンド開発リソース追加を検討 (期限: 7/11)'
        ],
        sentiment: 'neutral',
        speakingTimePercentage: {
          '鈴木一郎': 55,
          '田中二郎': 45
        },
        topicSegments: [
          {
            title: '進捗確認',
            startTime: 0,
            endTime: 900,
            keyPoints: ['各担当の進捗状況を確認']
          },
          {
            title: '課題共有',
            startTime: 900,
            endTime: 1800,
            keyPoints: ['バックエンドAPI開発の遅延']
          }
        ],
        wordFrequency: {
          '進捗': 15,
          'API': 12,
          '開発': 10,
          'テスト': 8
        },
        aiSummary: 'フロントエンド開発は予定通り進んでいるが、バックエンドAPIの開発に遅延が生じている。テスト環境のセットアップが次の重要なマイルストーン。',
        generatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString()
      },
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      title: 'デザインレビュー',
      description: '新UIデザインのレビューと承認',
      date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日後（予定）
      duration: 45,
      status: 'scheduled',
      zoomMeetingId: '555666777',
      zoomMeetingUrl: 'https://zoom.us/j/555666777',
      host: '高橋三郎',
      participants: [
        {
          id: 'p5',
          name: '高橋三郎',
          email: 'takahashi@example.com',
          joinTime: '',
          leaveTime: '',
          duration: 0,
          role: 'host'
        },
        {
          id: 'p6',
          name: '伊藤四郎',
          email: 'ito@example.com',
          joinTime: '',
          leaveTime: '',
          duration: 0,
          role: 'co-host'
        }
      ],
      notes: 'モバイル向けUIデザインの最終レビュー',
      tags: ['デザイン', 'UI', 'レビュー'],
      calendarEventId: 'cal_123456',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
};

// Zoom空間フック
export const useZoomSpace = () => {
  const { isSpaceActive, navigateToSpace } = useNestSpace();
  const [zoomSpaceState, setZoomSpaceState] = useState<ZoomSpaceState>({
    meetings: [],
    selectedMeetingId: null,
    isPlayingRecording: false,
    currentRecordingTime: 0,
    isLoading: false,
    error: null,
    filters: {
      searchQuery: '',
      status: ['scheduled', 'completed', 'cancelled', 'in_progress'],
      dateRange: { start: null, end: null },
      tags: [],
    },
    sortBy: 'date',
    sortDirection: 'desc',
  });

  // Zoom空間が表示されたときに、データをロードする
  useEffect(() => {
    if (isSpaceActive(SpaceType.MEETING)) {
      loadMeetings();
    }
  }, [isSpaceActive]);

  // ミーティングデータを読み込む（モックデータ）
  const loadMeetings = useCallback(async () => {
    setZoomSpaceState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 実際の実装では、APIからデータを取得する
      // ここではモックデータを使用
      const mockMeetings = generateMockMeetings();
      
      // データ取得の遅延をシミュレート
      setTimeout(() => {
        setZoomSpaceState(prev => ({
          ...prev,
          meetings: mockMeetings,
          isLoading: false
        }));
      }, 800);
    } catch (error) {
      setZoomSpaceState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : '予期せぬエラーが発生しました' 
      }));
    }
  }, []);

  // ミーティングを選択する
  const selectMeeting = useCallback((meetingId: string | null) => {
    setZoomSpaceState(prev => ({ ...prev, selectedMeetingId: meetingId }));
  }, []);

  // 新しいミーティングを追加する
  const addMeeting = useCallback((meeting: Omit<ZoomMeeting, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newMeeting: ZoomMeeting = {
      ...meeting,
      id: `meeting_${Date.now()}`,
      createdAt: now,
      updatedAt: now
    };
    
    setZoomSpaceState(prev => ({
      ...prev,
      meetings: [newMeeting, ...prev.meetings]
    }));
    
    return newMeeting;
  }, []);

  // ミーティングを更新する
  const updateMeeting = useCallback((meetingId: string, updates: Partial<ZoomMeeting>) => {
    setZoomSpaceState(prev => ({
      ...prev,
      meetings: prev.meetings.map(meeting => 
        meeting.id === meetingId
          ? { ...meeting, ...updates, updatedAt: new Date().toISOString() }
          : meeting
      )
    }));
  }, []);

  // ミーティングを削除する
  const deleteMeeting = useCallback((meetingId: string) => {
    setZoomSpaceState(prev => ({
      ...prev,
      meetings: prev.meetings.filter(meeting => meeting.id !== meetingId),
      selectedMeetingId: prev.selectedMeetingId === meetingId ? null : prev.selectedMeetingId
    }));
  }, []);

  // 録画の再生を開始する
  const playRecording = useCallback((recordingUrl: string) => {
    setZoomSpaceState(prev => ({
      ...prev,
      isPlayingRecording: true,
      currentRecordingTime: 0
    }));
    
    // 実際の実装では、ビデオプレーヤーの制御ロジックを追加
  }, []);

  // 録画の再生を停止する
  const stopRecording = useCallback(() => {
    setZoomSpaceState(prev => ({
      ...prev,
      isPlayingRecording: false
    }));
    
    // 実際の実装では、ビデオプレーヤーの制御ロジックを追加
  }, []);

  // フィルターを更新する
  const updateFilters = useCallback((newFilters: Partial<ZoomSpaceState['filters']>) => {
    setZoomSpaceState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  // ソート設定を更新する
  const updateSorting = useCallback((sortBy: ZoomSpaceState['sortBy'], sortDirection: ZoomSpaceState['sortDirection']) => {
    setZoomSpaceState(prev => ({
      ...prev,
      sortBy,
      sortDirection
    }));
  }, []);

  // フィルタリングされたミーティングリストを取得する
  const filteredMeetings = useMemo(() => {
    const { filters, sortBy, sortDirection } = zoomSpaceState;
    let result = [...zoomSpaceState.meetings];
    
    // ステータスでフィルタリング
    if (filters.status.length > 0) {
      result = result.filter(meeting => filters.status.includes(meeting.status));
    }
    
    // 日付範囲でフィルタリング
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(meeting => {
        const meetingDate = new Date(meeting.date).getTime();
        const startDateValid = filters.dateRange.start
          ? meetingDate >= filters.dateRange.start.getTime()
          : true;
        const endDateValid = filters.dateRange.end
          ? meetingDate <= filters.dateRange.end.getTime()
          : true;
        return startDateValid && endDateValid;
      });
    }
    
    // タグでフィルタリング
    if (filters.tags.length > 0) {
      result = result.filter(meeting => 
        filters.tags.some(tag => meeting.tags.includes(tag))
      );
    }
    
    // 検索クエリでフィルタリング
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(meeting => 
        meeting.title.toLowerCase().includes(query) ||
        (meeting.description || '').toLowerCase().includes(query) ||
        meeting.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // ソート
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [zoomSpaceState.meetings, zoomSpaceState.filters, zoomSpaceState.sortBy, zoomSpaceState.sortDirection]);

  // 選択されているミーティングを取得する
  const selectedMeeting = useMemo(() => {
    if (!zoomSpaceState.selectedMeetingId) return null;
    return zoomSpaceState.meetings.find(m => m.id === zoomSpaceState.selectedMeetingId) || null;
  }, [zoomSpaceState.meetings, zoomSpaceState.selectedMeetingId]);

  // 全てのタグを取得する（重複なし）
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    zoomSpaceState.meetings.forEach(meeting => {
      meeting.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [zoomSpaceState.meetings]);

  return {
    // 状態
    zoomSpaceState,
    filteredMeetings,
    selectedMeeting,
    allTags,
    
    // アクション
    loadMeetings,
    selectMeeting,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    playRecording,
    stopRecording,
    updateFilters,
    updateSorting
  };
}; 