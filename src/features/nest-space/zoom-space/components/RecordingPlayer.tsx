import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  useWindowDimensions
} from 'react-native';
import { ZoomMeeting } from '../hooks/useZoomSpace';
import { useRecordings, TranscriptItem } from '../hooks/useRecordings';

// プレーヤーコントロールプロパティの型定義
interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onRateChange: (rate: number) => void;
  onFullscreen: () => void;
}

// トランスクリプトリストプロパティの型定義
interface TranscriptListProps {
  transcript: TranscriptItem[];
  currentTime: number;
  onItemClick: (item: TranscriptItem) => void;
  isLoading: boolean;
}

// 録画プレーヤーコンポーネントのプロパティ定義
interface RecordingPlayerProps {
  meeting?: ZoomMeeting | null;
}

// 時間のフォーマット（秒→MM:SS形式）
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// プログレスバーコンポーネント
const ProgressBar: React.FC<{
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}> = ({ currentTime, duration, onSeek }) => {
  // 進行状況の計算
  const progress = duration > 0 ? currentTime / duration : 0;
  
  // シークハンドラー
  const handleSeek = (e: any) => {
    if (Platform.OS === 'web') {
      const bar = e.currentTarget;
      const rect = bar.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      onSeek(position * duration);
    }
  };
  
  return (
    <View style={styles.progressBarContainer}>
      <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      <View 
        style={styles.progressBar} 
        onTouchStart={handleSeek}
        // @ts-ignore Web環境用のプロパティ
        onClick={handleSeek}
      >
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.timeText}>{formatTime(duration)}</Text>
    </View>
  );
};

// プレーヤーコントロールコンポーネント
const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
  onFullscreen
}) => {
  return (
    <View style={styles.controlsContainer}>
      <View style={styles.playbackControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => onSeek(Math.max(0, currentTime - 10))}
        >
          <Text>-10秒</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.playButton}
          onPress={isPlaying ? onPause : onPlay}
        >
          <Text style={styles.playButtonText}>{isPlaying ? '■' : '▶'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => onSeek(Math.min(duration, currentTime + 10))}
        >
          <Text>+10秒</Text>
        </TouchableOpacity>
      </View>
      
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
      />
      
      <View style={styles.additionalControls}>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => {
            // 再生速度を切り替え（0.5, 1.0, 1.5, 2.0）
            const rates = [0.5, 1.0, 1.5, 2.0];
            const currentIndex = rates.indexOf(playbackRate);
            const nextIndex = (currentIndex + 1) % rates.length;
            onRateChange(rates[nextIndex]);
          }}
        >
          <Text style={styles.rateButtonText}>{playbackRate}x</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={onFullscreen}
        >
          <Text style={styles.fullscreenButtonText}>全画面</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// トランスクリプトリストコンポーネント
const TranscriptList: React.FC<TranscriptListProps> = ({
  transcript,
  currentTime,
  onItemClick,
  isLoading
}) => {
  // 現在再生中の発言を特定
  const currentTranscript = transcript.find(
    item => currentTime >= item.startTime && currentTime <= item.endTime
  );
  
  // ローディング表示
  if (isLoading) {
    return (
      <View style={styles.transcriptLoadingContainer}>
        <ActivityIndicator size="small" color="#4a6da7" />
        <Text style={styles.transcriptLoadingText}>トランスクリプトを読み込み中...</Text>
      </View>
    );
  }
  
  // トランスクリプトが空の場合
  if (transcript.length === 0) {
    return (
      <View style={styles.emptyTranscriptContainer}>
        <Text style={styles.emptyTranscriptText}>
          この録画にはトランスクリプトがありません
        </Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.transcriptList}>
      {transcript.map((item, index) => (
        <TouchableOpacity
          key={item.id || index}
          style={[
            styles.transcriptItem,
            currentTranscript?.id === item.id && styles.activeTranscriptItem
          ]}
          onPress={() => onItemClick(item)}
        >
          <View style={styles.transcriptItemHeader}>
            <Text style={styles.transcriptSpeaker}>{item.speaker}</Text>
            <Text style={styles.transcriptTime}>{formatTime(item.startTime)}</Text>
          </View>
          <Text style={styles.transcriptText}>{item.text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// 録画プレーヤーメインコンポーネント
const RecordingPlayer: React.FC<RecordingPlayerProps> = ({ meeting }) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    playbackState,
    transcript,
    isLoadingTranscript,
    playRecording,
    pauseRecording,
    seekTo,
    setPlaybackRate,
    toggleFullscreen,
    jumpToTranscriptItem
  } = useRecordings(meeting);
  
  // 検索クエリ状態
  const [searchQuery, setSearchQuery] = useState('');
  
  // フィルタリングされたトランスクリプト
  const filteredTranscript = searchQuery
    ? transcript.filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.speaker.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transcript;
  
  // コンポーネントがマウントされたときの処理
  useEffect(() => {
    // この例では、実際のビデオプレーヤーの代わりにステート更新をシミュレート
    const simulateTimeUpdate = () => {
      if (playbackState.isPlaying && playbackState.currentTime < playbackState.duration) {
        seekTo(playbackState.currentTime + 0.25);
      }
    };
    
    let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;
    
    if (playbackState.isPlaying) {
      timeUpdateInterval = setInterval(simulateTimeUpdate, 250);
    }
    
    return () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, [playbackState.isPlaying, playbackState.currentTime, playbackState.duration, seekTo]);
  
  // 録画がない場合の表示
  if (!meeting || !meeting.recording) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyRecordingContainer}>
          <Text style={styles.emptyRecordingTitle}>録画がありません</Text>
          <Text style={styles.emptyRecordingText}>
            このミーティングには録画が存在しないか、まだアップロードされていません。
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>録画プレーヤー</Text>
        <Text style={styles.headerSubtitle}>{meeting.title}</Text>
      </View>
      
      <View style={[styles.content, isLargeScreen && styles.largeScreenContent]}>
        {/* ビデオプレーヤー部分 */}
        <View style={[styles.playerContainer, isLargeScreen && styles.largePlayerContainer]}>
          <View style={styles.videoContainer}>
            {playbackState.isLoading ? (
              <View style={styles.videoLoadingContainer}>
                <ActivityIndicator size="large" color="#4a6da7" />
                <Text style={styles.videoLoadingText}>ビデオを読み込み中...</Text>
              </View>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>
                  ここにビデオプレーヤーが表示されます
                </Text>
                <Text style={styles.videoPlaceholderSubtext}>
                  (実際の実装では、Reactビデオプレーヤーコンポーネントを使用)
                </Text>
              </View>
            )}
          </View>
          
          <PlayerControls
            isPlaying={playbackState.isPlaying}
            currentTime={playbackState.currentTime}
            duration={playbackState.duration}
            playbackRate={playbackState.playbackRate}
            onPlay={playRecording}
            onPause={pauseRecording}
            onSeek={seekTo}
            onRateChange={setPlaybackRate}
            onFullscreen={toggleFullscreen}
          />
          
          {/* エラー表示 */}
          {playbackState.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{playbackState.error}</Text>
            </View>
          )}
          
          {/* ビデオ情報 */}
          <View style={styles.videoInfoContainer}>
            <View style={styles.videoMetadata}>
              <Text style={styles.metadataLabel}>長さ:</Text>
              <Text style={styles.metadataValue}>
                {formatTime(meeting.recording.duration)}
              </Text>
            </View>
            <View style={styles.videoMetadata}>
              <Text style={styles.metadataLabel}>ファイルサイズ:</Text>
              <Text style={styles.metadataValue}>
                {Math.round(meeting.recording.fileSize / (1024 * 1024))} MB
              </Text>
            </View>
            <View style={styles.videoMetadata}>
              <Text style={styles.metadataLabel}>形式:</Text>
              <Text style={styles.metadataValue}>{meeting.recording.format}</Text>
            </View>
          </View>
        </View>
        
        {/* トランスクリプト部分 */}
        <View style={[styles.transcriptContainer, isLargeScreen && styles.largeTranscriptContainer]}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.transcriptTitle}>トランスクリプト</Text>
            <View style={styles.transcriptSearchContainer}>
              <TextInput
                style={styles.transcriptSearchInput}
                placeholder="トランスクリプトを検索..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
          
          <TranscriptList
            transcript={filteredTranscript}
            currentTime={playbackState.currentTime}
            onItemClick={jumpToTranscriptItem}
            isLoading={isLoadingTranscript}
          />
          
          {/* トランスクリプトがない場合は生成ボタンを表示 */}
          {transcript.length === 0 && !isLoadingTranscript && meeting.recording.transcriptionStatus === 'none' && (
            <View style={styles.generateTranscriptContainer}>
              <TouchableOpacity
                style={styles.generateTranscriptButton}
                onPress={() => {/* TODO: トランスクリプション開始処理 */}}
              >
                <Text style={styles.generateTranscriptButtonText}>
                  トランスクリプトを生成
                </Text>
              </TouchableOpacity>
              <Text style={styles.generateTranscriptText}>
                AIによる自動文字起こしを生成します。数分かかる場合があります。
              </Text>
            </View>
          )}
          
          {/* 処理中の場合 */}
          {transcript.length === 0 && !isLoadingTranscript && meeting.recording.transcriptionStatus === 'in_progress' && (
            <View style={styles.transcriptProcessingContainer}>
              <ActivityIndicator size="small" color="#4a6da7" />
              <Text style={styles.transcriptProcessingText}>
                トランスクリプト生成中...
              </Text>
              <Text style={styles.transcriptProcessingSubtext}>
                処理が完了するまでお待ちください。数分かかる場合があります。
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  largeScreenContent: {
    flexDirection: 'row',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  largePlayerContainer: {
    flex: 2,
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  videoLoadingText: {
    color: '#ffffff',
    marginTop: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1c',
  },
  videoPlaceholderText: {
    color: '#ffffff',
    fontSize: 16,
  },
  videoPlaceholderSubtext: {
    color: '#aaaaaa',
    fontSize: 12,
    marginTop: 8,
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: '#f8f8f8',
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4a6da7',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  playButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
    width: 40,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a6da7',
  },
  additionalControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  rateButtonText: {
    fontSize: 12,
    color: '#757575',
  },
  fullscreenButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  fullscreenButtonText: {
    fontSize: 12,
    color: '#757575',
  },
  errorContainer: {
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  videoInfoContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  videoMetadata: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 12,
    color: '#757575',
    width: 80,
  },
  metadataValue: {
    fontSize: 12,
    color: '#333333',
  },
  transcriptContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 8,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  largeTranscriptContainer: {
    flex: 1,
  },
  transcriptHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  transcriptSearchContainer: {
    marginTop: 8,
  },
  transcriptSearchInput: {
    height: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  transcriptList: {
    flex: 1,
    padding: 8,
  },
  transcriptItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeTranscriptItem: {
    backgroundColor: '#e8f0fe',
  },
  transcriptItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transcriptSpeaker: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  transcriptTime: {
    fontSize: 12,
    color: '#9e9e9e',
  },
  transcriptText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  transcriptLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  transcriptLoadingText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
  },
  emptyTranscriptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTranscriptText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  generateTranscriptContainer: {
    padding: 20,
    alignItems: 'center',
  },
  generateTranscriptButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4a6da7',
    borderRadius: 4,
    marginBottom: 12,
  },
  generateTranscriptButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  generateTranscriptText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  transcriptProcessingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  transcriptProcessingText: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 8,
  },
  transcriptProcessingSubtext: {
    fontSize: 12,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  emptyRecordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyRecordingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  emptyRecordingText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
  },
});

export default RecordingPlayer; 