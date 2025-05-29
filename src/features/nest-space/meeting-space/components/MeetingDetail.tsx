import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Button, ScrollView, Dimensions } from 'react-native';

const MeetingDetail = ({ meeting }: any) => {
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [summary, setSummary] = useState(meeting?.summary || '本日の会議ではAプロジェクトの進捗確認と次回タスクの割り振りを行いました。詳細は議事録全文をご覧ください。');
  const [fullText, setFullText] = useState(meeting?.fullText || '（ここに議事録全文が入ります。ダミーテキスト...）');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択時の処理
  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setFullText(text);
        setSummary(text.slice(0, 60) + (text.length > 60 ? '...' : ''));
        setUploadModalVisible(false);
      };
      reader.readAsText(file, 'utf-8');
    } else {
      alert('テキストファイル（.txt）のみ対応しています');
    }
  };

  return (
    <View style={styles.detailContainer}>
      {/* タイトル */}
      <Text style={styles.title}>{meeting?.title || 'ミーティングタイトル'}</Text>

      {/* アップロードボタン */}
      <TouchableOpacity style={styles.uploadButton} onPress={() => setUploadModalVisible(true)}>
        <Text style={styles.uploadButtonText}>アップロード</Text>
      </TouchableOpacity>
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>テキストファイルをアップロード</Text>
            {/* input type="file" for web only */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              style={{ marginBottom: 16 }}
              onChange={handleFileChange}
            />
            <Button title="キャンセル" onPress={() => setUploadModalVisible(false)} color="#aaa" />
          </View>
        </View>
      </Modal>

      {/* 概要カード */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>日時</Text>
        <Text style={styles.cardValue}>{meeting?.date || '2025-05-29 17:33'}</Text>
        <Text style={styles.cardLabel}>参加者</Text>
        <Text style={styles.cardValue}>{meeting?.members || '山田太郎, 佐藤花子'}</Text>
      </View>

      {/* 要約セクション */}
      <View style={styles.summaryBox}>
        <Text style={styles.sectionLabel}>ミーティング要約</Text>
        <View style={styles.summaryTextBox}>
          <Text style={styles.summaryText} numberOfLines={3}>{summary}</Text>
        </View>
        <TouchableOpacity style={styles.fullTextButton} onPress={() => setDrawerVisible(true)}>
          <Text style={styles.fullTextButtonText}>全文表示</Text>
        </TouchableOpacity>
      </View>

      {/* サイドパネル（Drawer風） */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={styles.drawerPanel}>
            <Text style={styles.drawerTitle}>議事録全文</Text>
            <ScrollView style={styles.drawerScroll}>
              <Text style={styles.drawerText}>{fullText}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.drawerCloseButton} onPress={() => setDrawerVisible(false)}>
              <Text style={styles.drawerCloseButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  detailContainer: {
    flex: 1,
    padding: 28,
    backgroundColor: '#f7fafd',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#223a5e',
    marginBottom: 18,
    letterSpacing: 0.5,
  },
  uploadButton: {
    backgroundColor: '#4a6da7',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  cardLabel: {
    fontSize: 13,
    color: '#4a6da7',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    color: '#222',
    marginBottom: 8,
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionLabel: {
    fontSize: 14,
    color: '#4a6da7',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryTextBox: {
    backgroundColor: '#f4f6fa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 15,
    color: '#222',
  },
  fullTextButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3eafc',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  fullTextButtonText: {
    color: '#4a6da7',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 28,
    width: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#223a5e',
    marginBottom: 18,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  drawerPanel: {
    width: width > 600 ? 480 : width * 0.9,
    height: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: -2, height: 0 },
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#223a5e',
    marginBottom: 16,
  },
  drawerScroll: {
    flex: 1,
    marginBottom: 16,
  },
  drawerText: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
  },
  drawerCloseButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3eafc',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  drawerCloseButtonText: {
    color: '#4a6da7',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default MeetingDetail; 