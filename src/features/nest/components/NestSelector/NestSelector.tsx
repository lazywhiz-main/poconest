import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useNest } from '../../contexts/NestContext';
import { COLORS } from '@constants/config';

const NestSelector: React.FC = () => {
  const { userNests, currentNest, setCurrentNestById } = useNest();
  const [showNestModal, setShowNestModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<{top: number, left: number}>({top: 60, left: 24});
  const anchorRef = useRef<any>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!showNestModal) return;
    const handleClick = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target)) {
        setShowNestModal(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showNestModal]);

  // NEST名押下時に座標取得
  const handleAnchorClick = (e: any) => {
    if (Platform.OS === 'web') {
      const rect = e.currentTarget.getBoundingClientRect();
      setModalPosition({ top: rect.bottom, left: rect.left });
    }
    setShowNestModal((prev) => !prev);
  };

  return (
    <View style={{ padding: 16 }}>
      <TouchableOpacity
        ref={anchorRef}
        style={styles.anchor}
        onPress={handleAnchorClick}
      >
        <Text style={styles.anchorText}>{currentNest ? currentNest.name : 'NESTを選択'}</Text>
      </TouchableOpacity>
      {showNestModal && Platform.OS === 'web' && (
        <div
          style={{
            position: 'fixed',
            top: modalPosition.top,
            left: modalPosition.left,
            width: 320,
            zIndex: 9999,
            maxHeight: '60vh',
            overflowY: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            borderRadius: 12,
            background: '#fff',
            padding: 12,
          }}
        >
          <Text style={styles.modalTitle}>巣を切り替え</Text>
          {userNests.map(nest => (
            <TouchableOpacity
              key={nest.id}
              style={[
                styles.nestItem,
                currentNest?.id === nest.id && styles.nestItemActive
              ]}
              onPress={() => {
                setCurrentNestById(nest.id);
                setShowNestModal(false);
              }}
            >
              <Text style={styles.nestName}>{nest.name}</Text>
              <Text style={styles.nestDesc}>{nest.description}</Text>
            </TouchableOpacity>
          ))}
        </div>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  anchor: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#f5f6fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ececec',
    alignSelf: 'flex-start',
  },
  anchorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 12,
  },
  nestItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#f9f9f9',
  },
  nestItemActive: {
    backgroundColor: '#e3f2fd',
  },
  nestName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#222',
  },
  nestDesc: {
    fontSize: 13,
    color: '#888',
  },
});

export default NestSelector; 