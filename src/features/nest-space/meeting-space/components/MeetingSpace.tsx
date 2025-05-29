import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  Button,
  TextInput,
  FlatList
} from 'react-native';
import { useZoomSpace } from '../hooks/useZoomSpace';
import MeetingList from './MeetingList';
import RecordingPlayer from './RecordingPlayer';
import MeetingInsights from './MeetingInsights';
import MeetingForm from './MeetingForm';
import { supabase } from '../../../../services/supabase/client';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../../contexts/AuthContext';
import MeetingDetail from './MeetingDetail';

interface MeetingSpaceProps {
  nestId: string;
}

// ZoomSpaceコンポーネント
const MeetingSpace: React.FC<MeetingSpaceProps> = ({ nestId }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 1024;
  const isTablet = width > 768 && width <= 1024;
  
  const { 
    zoomSpaceState, 
    filteredMeetings, 
    selectedMeeting,
    loadMeetings,
    selectMeeting
  } = useZoomSpace();
  
  const { currentNest } = useNest();
  const { user } = useAuth();
  
  const [showForm, setShowForm] = useState(false);
  
  const [meetingSpace, setMeetingSpace] = useState<any>(null);
  const [checkingSpace, setCheckingSpace] = useState(true);
  const [creatingSpace, setCreatingSpace] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadResult, setUploadResult] = useState('');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [extracting, setExtracting] = useState(false);
  
  // コンポーネントがマウントされたときに会議データをロード
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);
  
  // 画面サイズが変わったときに分割ビューを調整
  useEffect(() => {
    if (selectedMeeting && !isDesktop) {
      selectMeeting(null);
    }
  }, [selectedMeeting, isDesktop]);
  
  // ミーティング空間の存在チェック
  useEffect(() => {
    if (!currentNest?.id) return;
    const checkMeetingSpace = async () => {
      setCheckingSpace(true);
      const { data, error } = await supabase
        .from('spaces')
        .select('*')
        .eq('type', 'meeting')
        .eq('nest_id', currentNest.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      if (data) setMeetingSpace(data);
      setCheckingSpace(false);
    };
    checkMeetingSpace();
  }, [currentNest?.id]);
  
  // 初期表示時に最新の完了ミーティングを選択
  useEffect(() => {
    if (!selectedMeeting && filteredMeetings.length > 0) {
      const completed = filteredMeetings.filter(m => m.status === 'completed');
      if (completed.length > 0) {
        // 日付降順でソートし最新を選択
        const latest = completed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        selectMeeting(latest.id);
      }
    }
  }, [filteredMeetings, selectedMeeting, selectMeeting]);
  
  // ミーティング空間作成
  const handleCreateMeetingSpace = async () => {
    if (!currentNest?.id || !user?.id) return;
    setCreatingSpace(true);
    const { data, error } = await supabase
      .from('spaces')
      .insert([
        {
          nest_id: currentNest.id,
          type: 'meeting',
          name: 'ミーティング',
          created_by: user.id,
          is_active: true,
        },
      ])
      .select()
      .single();
    if (data) setMeetingSpace(data);
    setCreatingSpace(false);
  };
  
  // ミーティング登録ハンドラー
  const handleCreateMeeting = (meetingData: any) => {
    setShowForm(false);
    alert('ミーティングを登録: ' + JSON.stringify(meetingData, null, 2));
    // TODO: 実際の登録処理を実装
  };
  
  // ミーティング詳細のアップロード
  const handleUpload = async (data: any) => {
    // TODO: 実際のアップロード処理を実装
    setUploadResult('アップロード成功');
  };
  
  // ミーティング詳細の結果描画
  const handleExtractInsight = async () => {
    // TODO: 実際の結果描画処理を実装
    setExtracting(true);
    // 仮の結果を設定
    setSummary('これは要約です');
    setExtracting(false);
  };
  
  // ミーティングリスト1件の描画
  const renderMeetingItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => selectMeeting(item)} style={{ padding: 14, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{item.title}</Text>
        <Text style={{ color: '#888', fontSize: 12 }}>{item.date}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 12, color: item.status === 'completed' ? '#4caf50' : item.status === 'インサイト済み' ? '#2196f3' : '#ff9800', fontWeight: 'bold', marginLeft: 8 }}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  // レイアウトのレンダリング（デスクトップ、タブレット、モバイルで分岐）
  const renderLayout = () => {
    // デスクトップレイアウト（分割ビュー）
    if (isDesktop) {
      return (
        <View style={styles.container}>
          {/* ヘッダー */}
          {/* <View style={styles.header}>
            <Text style={styles.headerTitle}>ミーティング</Text>
          </View> */}
          <View style={styles.splitContainer}>
            {/* 左カラム：ミーティングリスト＋新規追加 */}
            <View style={styles.leftColumn}>
              <View style={{ marginBottom: 16 }}>
                <Button title="+ 新規ミーティング作成" onPress={handleCreateMeeting} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="ミーティングを検索..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={filteredMeetings}
                renderItem={renderMeetingItem}
                keyExtractor={item => item.id}
                style={{ backgroundColor: '#fff', borderRadius: 8, marginTop: 8 }}
              />
            </View>
            {/* 右カラム：ミーティング詳細 */}
            <View style={styles.rightColumn}>
              {selectedMeeting ? (
                <MeetingDetail
                  meeting={selectedMeeting}
                  onUpload={handleUpload}
                  uploadResult={uploadResult}
                  transcript={transcript}
                  summary={summary}
                  onExtractInsight={handleExtractInsight}
                  extracting={extracting}
                />
              ) : (
                <Text style={styles.placeholderText}>ミーティングを選択してください</Text>
              )}
            </View>
          </View>
        </View>
      );
    }
    
    // タブレット/デスクトップの全画面レイアウト
    if ((isTablet || isDesktop)) {
      return (
        <View style={styles.container}>
          {/* ヘッダー */}
          {/* <View style={styles.header}>
            <Text style={styles.headerTitle}>ミーティング</Text>
          </View> */}
          <View style={styles.splitContainer}>
            {/* 左カラム：ミーティングリスト＋新規追加 */}
            <View style={styles.leftColumn}>
              <View style={{ marginBottom: 16 }}>
                <Button title="+ 新規ミーティング作成" onPress={handleCreateMeeting} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="ミーティングを検索..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <FlatList
                data={filteredMeetings}
                renderItem={renderMeetingItem}
                keyExtractor={item => item.id}
                style={{ backgroundColor: '#fff', borderRadius: 8, marginTop: 8 }}
              />
            </View>
            {/* 右カラム：ミーティング詳細 */}
            <View style={styles.rightColumn}>
              {selectedMeeting ? (
                <MeetingDetail
                  meeting={selectedMeeting}
                  onUpload={handleUpload}
                  uploadResult={uploadResult}
                  transcript={transcript}
                  summary={summary}
                  onExtractInsight={handleExtractInsight}
                  extracting={extracting}
                />
              ) : (
                <Text style={styles.placeholderText}>ミーティングを選択してください</Text>
              )}
            </View>
          </View>
        </View>
      );
    }
    
    // モバイルレイアウト
    return (
      <View style={styles.container}>
        {/* ヘッダー */}
        {/* <View style={styles.header}>
          <Text style={styles.headerTitle}>ミーティング</Text>
        </View> */}
        <View style={styles.splitContainer}>
          {/* 左カラム：ミーティングリスト＋新規追加 */}
          <View style={styles.leftColumn}>
            <View style={{ marginBottom: 16 }}>
              <Button title="+ 新規ミーティング作成" onPress={handleCreateMeeting} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="ミーティングを検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <FlatList
              data={filteredMeetings}
              renderItem={renderMeetingItem}
              keyExtractor={item => item.id}
              style={{ backgroundColor: '#fff', borderRadius: 8, marginTop: 8 }}
            />
          </View>
          {/* 右カラム：ミーティング詳細 */}
          <View style={styles.rightColumn}>
            {selectedMeeting ? (
              <MeetingDetail
                meeting={selectedMeeting}
                onUpload={handleUpload}
                uploadResult={uploadResult}
                transcript={transcript}
                summary={summary}
                onExtractInsight={handleExtractInsight}
                extracting={extracting}
              />
            ) : (
              <Text style={styles.placeholderText}>ミーティングを選択してください</Text>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // ミーティング空間がなければ作成ボタンを表示
  if (checkingSpace) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>ミーティング空間を確認中...</Text>
      </SafeAreaView>
    );
  }
  if (!meetingSpace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>ミーティング空間がまだ作成されていません。</Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateMeetingSpace} disabled={creatingSpace}>
            <Text style={styles.createButtonText}>{creatingSpace ? '作成中...' : 'ミーティング空間を作成'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // ローディング状態の表示
  if (zoomSpaceState.isLoading && filteredMeetings.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a6da7" />
        <Text style={styles.loadingText}>ミーティングデータを読み込み中...</Text>
      </SafeAreaView>
    );
  }
  
  // エラー状態の表示
  if (zoomSpaceState.error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorText}>{zoomSpaceState.error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadMeetings}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {renderLayout()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: 320,
    padding: 16,
  },
  rightColumn: {
    flex: 1,
    padding: 24,
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: '#4a6da7',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  createButton: {
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4a6da7',
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});

export default MeetingSpace; 