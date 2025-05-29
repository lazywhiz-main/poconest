import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SpaceType } from '../types/nestSpace.types';
import NestSpaceContainer from '../components/NestSpaceContainer';
import AppLayout from '../../../components/layout/AppLayout';
import theme from '../../../styles/theme';
import { useNest } from '../../../features/nest/contexts/NestContext';
import { useBoardContext } from '../../board-space/contexts/BoardContext';
import { supabase } from '../../../services/supabase/client';
import { NestSpaceProvider } from '../../../contexts/NestSpaceContext';

/**
 * NestSpaceIntegrationDemoコンポーネント
 * 
 * NestSpaceContainerをAppLayoutと統合したデモ画面
 * スペース切り替えとマルチタスク設定をテスト可能
 */
const NestSpaceIntegrationDemo: React.FC = () => {
  const { currentNest } = useNest();
  const { boardNotFound, loadNestData } = useBoardContext();
  const [activeSpace, setActiveSpace] = useState<SpaceType>(SpaceType.CHAT);
  const [enableMultitasking, setEnableMultitasking] = useState(true);
  const [preloadAll, setPreloadAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NESTが切り替わったときにローディング状態をリセット
  useEffect(() => {
    if (!currentNest) return;
    
    setIsLoading(true);
    // データの読み込みをシミュレート
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentNest?.id]);

  // モックの未読カウント（0の値は含めない）
  const unreadCounts: Partial<Record<SpaceType, number>> = {
    [SpaceType.CHAT]: 3,
    [SpaceType.MEETING]: 1,
  };
  
  // 空間選択ハンドラー
  const handleSelectSpace = (space: SpaceType) => {
    setActiveSpace(space);
    // loadNestDataはuseEffectでactiveSpaceがBOARDになったときに呼ぶ
  };

  useEffect(() => {
    if (activeSpace === SpaceType.BOARD && currentNest) {
      loadNestData(currentNest.id);
    }
  }, [activeSpace, currentNest, loadNestData]);

  const handleOpenBoard = () => {
    setShowCreateModal(true);
  };

  const handleCreateBoard = async () => {
    if (!currentNest || !boardName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      // Supabaseでボード作成
      const { data, error: insertError } = await supabase
        .from('boards')
        .insert({
          nest_id: currentNest.id,
          name: boardName.trim(),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setShowCreateModal(false);
      setBoardName('');
      await loadNestData(currentNest.id); // 作成後にリロード
    } catch (e: any) {
      setError(e.message || 'ボード作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  const handleSpaceChange = (spaceType: SpaceType) => {
    switch (spaceType) {
      case SpaceType.CHAT:
        setActiveSpace(SpaceType.CHAT);
        break;
      case SpaceType.BOARD:
        setActiveSpace(SpaceType.BOARD);
        break;
      case SpaceType.MEETING:
        setActiveSpace(SpaceType.MEETING);
        break;
      case SpaceType.ANALYSIS:
        setActiveSpace(SpaceType.ANALYSIS);
        break;
      default:
        setActiveSpace(SpaceType.CHAT);
    }
  };

  if (!currentNest || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>データを読み込み中...</Text>
        </View>
      </View>
    );
  }

  return (
    <AppLayout
      activeSpace={activeSpace}
      onSelectSpace={handleSelectSpace}
      unreadCounts={unreadCounts}
    >
      <NestSpaceProvider>
        <View style={styles.spaceContainer}>
          {boardNotFound ? (
            <View style={styles.noBoardContainer}>
              <Text style={styles.noBoardText}>このNESTにはまだボードがありません。</Text>
              <TouchableOpacity style={styles.openBoardButton} onPress={handleOpenBoard}>
                <Text style={styles.openBoardButtonText}>ボードをオープン</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <NestSpaceContainer
              key={currentNest.id}
              initialSpace={activeSpace}
              enableMultitasking={enableMultitasking}
              preloadAll={preloadAll}
            />
          )}
          {/* ボード作成モーダル */}
          <Modal
            visible={showCreateModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCreateModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>新しいボードを作成</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ボード名"
                  value={boardName}
                  onChangeText={setBoardName}
                  editable={!creating}
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
                <View style={{ flexDirection: 'row', marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#ccc', marginRight: 8 }]}
                    onPress={() => setShowCreateModal(false)}
                    disabled={creating}
                  >
                    <Text style={styles.modalButtonText}>キャンセル</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleCreateBoard}
                    disabled={creating || !boardName.trim()}
                  >
                    <Text style={styles.modalButtonText}>{creating ? '作成中...' : '作成'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </NestSpaceProvider>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  spaceContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFAF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  noBoardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFAF0',
  },
  noBoardText: {
    fontSize: 18,
    color: '#718096',
    marginBottom: 24,
  },
  openBoardButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  openBoardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 4,
  },
});

export default NestSpaceIntegrationDemo; 