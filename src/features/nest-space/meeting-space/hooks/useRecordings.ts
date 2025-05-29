import { useState, useCallback, useEffect } from 'react';
import { ZoomRecording, ZoomMeeting } from './useZoomSpace';

// 録画再生状態の型定義
interface RecordingPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  isLoading: boolean;
  error: string | null;
}

// 録画のプレイリスト項目の型定義
interface PlaylistItem {
  id: string;
  meetingId: string;
  meetingTitle: string;
  recordingId: string;
  url: string;
  duration: number;
  dateCreated: string;
  thumbnailUrl?: string;
}

// トランスクリプトの項目の型定義
export interface TranscriptItem {
  id: string;
  startTime: number;
  endTime: number;
  speaker: string;
  text: string;
  confidence: number;
}

// 録画管理フックのインターフェース
export const useRecordings = (selectedMeeting?: ZoomMeeting | null) => {
  // 録画再生の状態
  const [playbackState, setPlaybackState] = useState<RecordingPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: selectedMeeting?.recording?.duration || 0,
    volume: 1.0,
    playbackRate: 1.0,
    isFullscreen: false,
    isLoading: false,
    error: null
  });

  // プレイリスト
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  
  // 字幕・トランスクリプト
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  
  // トランスクリプトの読み込み状態
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  
  // ダウンロード状態
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 選択された会議が変更されたら、ステートを更新
  useEffect(() => {
    if (selectedMeeting?.recording) {
      setPlaybackState(prev => ({
        ...prev,
        duration: selectedMeeting.recording?.duration || 0,
        currentTime: 0,
        isPlaying: false
      }));
      
      // 選択された会議の録画がプレイリストに含まれていなければ追加
      if (selectedMeeting.recording && !playlist.some(item => item.recordingId === selectedMeeting.recording?.id)) {
        addToPlaylist(selectedMeeting);
      }
      
      // トランスクリプトを読み込む
      if (selectedMeeting.recording.transcriptionStatus === 'completed' && selectedMeeting.recording.transcriptionUrl) {
        loadTranscript(selectedMeeting.recording.transcriptionUrl);
      } else {
        setTranscript([]);
      }
    }
  }, [selectedMeeting]);
  
  // 録画をプレイリストに追加
  const addToPlaylist = useCallback((meeting: ZoomMeeting) => {
    if (!meeting.recording) return;
    
    const newItem: PlaylistItem = {
      id: `playlist_${Date.now()}`,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      recordingId: meeting.recording.id,
      url: meeting.recording.url,
      duration: meeting.recording.duration,
      dateCreated: meeting.recording.createdAt,
      thumbnailUrl: undefined // サムネイルはここでは未実装
    };
    
    setPlaylist(prev => {
      // 重複を避ける
      if (prev.some(item => item.recordingId === meeting.recording?.id)) {
        return prev;
      }
      return [...prev, newItem];
    });
  }, []);
  
  // プレイリストから削除
  const removeFromPlaylist = useCallback((itemId: string) => {
    setPlaylist(prev => prev.filter(item => item.id !== itemId));
  }, []);
  
  // クリアプレイリスト
  const clearPlaylist = useCallback(() => {
    setPlaylist([]);
  }, []);
  
  // 録画の再生
  const playRecording = useCallback((recordingUrl?: string) => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: true,
      isLoading: true,
      error: null
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
    setTimeout(() => {
      setPlaybackState(prev => ({
        ...prev,
        isLoading: false
      }));
    }, 500);
  }, []);
  
  // 録画の一時停止
  const pauseRecording = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
  }, []);
  
  // 指定時間にシーク
  const seekTo = useCallback((timeInSeconds: number) => {
    setPlaybackState(prev => ({
      ...prev,
      currentTime: Math.max(0, Math.min(timeInSeconds, prev.duration))
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
  }, []);
  
  // ボリューム調整
  const setVolume = useCallback((volume: number) => {
    setPlaybackState(prev => ({
      ...prev,
      volume: Math.max(0, Math.min(volume, 1))
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
  }, []);
  
  // 再生速度調整
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackState(prev => ({
      ...prev,
      playbackRate: Math.max(0.25, Math.min(rate, 2))
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
  }, []);
  
  // フルスクリーン切替
  const toggleFullscreen = useCallback(() => {
    setPlaybackState(prev => ({
      ...prev,
      isFullscreen: !prev.isFullscreen
    }));
    
    // 実際の実装では、ビデオプレーヤーのAPIを呼び出すロジックを追加
  }, []);
  
  // 録画のダウンロード
  const downloadRecording = useCallback(async (recordingUrl: string, filename?: string) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Tauriでの実装例
      // Tauri APIを使用してファイルをダウンロードし、ローカルに保存する
      /* 
      const { save } = await import('@tauri-apps/api/dialog');
      const { downloadFile } = await import('@tauri-apps/api/http');
      
      const savePath = await save({
        defaultPath: filename || 'zoom_recording.mp4',
        filters: [{
          name: 'Video Files',
          extensions: ['mp4', 'webm']
        }]
      });
      
      if (savePath) {
        await downloadFile(recordingUrl, savePath, {
          onProgress: (progress) => {
            setDownloadProgress(progress.percentage);
          }
        });
      }
      */
      
      // モックのダウンロード進行をシミュレート
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setDownloadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
        }
      }, 200);
      
    } catch (error) {
      console.error('Download error:', error);
      setPlaybackState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : '録画のダウンロード中にエラーが発生しました'
      }));
      setIsDownloading(false);
    }
  }, []);
  
  // 録画のGoogleドライブへのエクスポート
  const exportToGoogleDrive = useCallback(async (recording: ZoomRecording) => {
    try {
      // Google Drive APIを使用して録画をエクスポートする
      // 実際の実装はGoogleのOAuth認証とAPIクライアントが必要
      
      // モック実装
      setPlaybackState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));
      
      // アップロード進行をシミュレート
      setTimeout(() => {
        setPlaybackState(prev => ({
          ...prev,
          isLoading: false
        }));
        
        // 成功したと仮定して録画のGoogleドライブIDを返す
        return 'google_drive_file_id_123';
      }, 2000);
      
    } catch (error) {
      setPlaybackState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Google Driveへのエクスポート中にエラーが発生しました'
      }));
      return null;
    }
  }, []);
  
  // 録画の共有リンク生成
  const generateSharingLink = useCallback((recording: ZoomRecording) => {
    // 実際の実装では、バックエンドAPIを呼び出して共有可能なリンクを生成
    return `https://example.com/share-recording/${recording.id}`;
  }, []);
  
  // トランスクリプトの読み込み
  const loadTranscript = useCallback(async (transcriptionUrl: string) => {
    setIsLoadingTranscript(true);
    
    try {
      // 実際の実装では、APIからトランスクリプトを取得する
      // ここではモックデータを使用
      setTimeout(() => {
        const mockTranscript: TranscriptItem[] = [
          {
            id: 't1',
            startTime: 0,
            endTime: 10,
            speaker: '山田太郎',
            text: 'おはようございます。今日の会議を始めましょう。',
            confidence: 0.92
          },
          {
            id: 't2',
            startTime: 12,
            endTime: 20,
            speaker: '佐藤花子',
            text: 'はい、よろしくお願いします。先週の進捗から報告します。',
            confidence: 0.88
          },
          {
            id: 't3',
            startTime: 22,
            endTime: 35,
            speaker: '山田太郎',
            text: 'ありがとうございます。では、佐藤さんからお願いします。',
            confidence: 0.95
          },
          // さらにトランスクリプトデータが続く…
        ];
        
        setTranscript(mockTranscript);
        setIsLoadingTranscript(false);
      }, 1000);
      
    } catch (error) {
      console.error('Transcript loading error:', error);
      setIsLoadingTranscript(false);
    }
  }, []);
  
  // 自動トランスクリプション作成開始
  const startTranscription = useCallback(async (recordingId: string) => {
    try {
      // 実際の実装では、APIを呼び出してトランスクリプション処理を開始
      
      // モック実装
      return {
        success: true,
        message: 'トランスクリプション処理を開始しました。完了までに数分かかることがあります。'
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'トランスクリプション処理の開始に失敗しました'
      };
    }
  }, []);
  
  // 特定の発言にジャンプ
  const jumpToTranscriptItem = useCallback((item: TranscriptItem) => {
    seekTo(item.startTime);
    playRecording();
  }, [seekTo, playRecording]);
  
  // 時間をフォーマット（秒→MM:SS形式）
  const formatTime = useCallback((timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    // 状態
    playbackState,
    playlist,
    transcript,
    isLoadingTranscript,
    downloadProgress,
    isDownloading,
    
    // プレイリスト管理
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    
    // 再生コントロール
    playRecording,
    pauseRecording,
    seekTo,
    setVolume,
    setPlaybackRate,
    toggleFullscreen,
    
    // ファイル操作
    downloadRecording,
    exportToGoogleDrive,
    generateSharingLink,
    
    // トランスクリプト操作
    loadTranscript,
    startTranscription,
    jumpToTranscriptItem,
    
    // ユーティリティ
    formatTime
  };
}; 