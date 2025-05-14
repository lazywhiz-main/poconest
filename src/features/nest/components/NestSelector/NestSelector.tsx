import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useNest } from '../../contexts/NestContext';
import { COLORS, BREAKPOINTS } from '@constants/config';
import NestBadge from './NestBadge';
import NestPopoverMenu from './NestPopoverMenu';

interface NestSelectorProps {
  onCreateNest?: () => void;
}

const NestSelector: React.FC<NestSelectorProps> = ({ onCreateNest }) => {
  const { userNests, currentNest, setCurrentNestById } = useNest();
  const [isOpen, setIsOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  
  const dropdownRef = useRef<View>(null);
  const popoverRef = useRef<View>(null);

  // UI表示モードの設定
  const displayMode = isDesktop ? 'sidebar' : (isTablet ? 'compact' : 'mobile');
  
  // ドロップダウンを閉じるためのイベントリスナー（Web用）
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current && 
          popoverRef.current && 
          !(dropdownRef.current as any).contains(event.target) && 
          !(popoverRef.current as any).contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, []);

  // キーボードショートカットのハンドラー（Web用）
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Alt + N でNest選択を開く/閉じる
        if (event.altKey && event.key === 'n') {
          setIsOpen(prev => !prev);
          event.preventDefault();
        }
        
        // Escでドロップダウンを閉じる
        if (event.key === 'Escape' && isOpen) {
          setIsOpen(false);
          event.preventDefault();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  // Nestを選択
  const handleSelectNest = (nest: import('../../contexts/NestContext').Nest) => {
    setCurrentNestById(nest.id);
    setIsOpen(false);
  };

  // 新規Nest作成
  const handleCreateNest = () => {
    setIsOpen(false);
    if (onCreateNest) {
      onCreateNest();
    }
  };

  // モバイル表示
  if (displayMode === 'mobile') {
    return (
      <View style={styles.mobileContainer} ref={dropdownRef}>
        <TouchableOpacity 
          style={styles.mobileSelector} 
          onPress={() => setIsOpen(!isOpen)}
          accessibilityRole="button"
          accessibilityLabel="NESTを選択"
          accessibilityHint="タップするとNESTリストを表示します"
        >
          {currentNest ? (
            <NestBadge nest={currentNest} size="medium" />
          ) : (
            <Text style={styles.placeholderText}>NESTを選択</Text>
          )}
          <Text style={styles.dropdownIcon}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {isOpen && (
          <View style={styles.mobilePopoverContainer} ref={popoverRef}>
            <NestPopoverMenu
              nests={userNests}
              currentNestId={currentNest?.id || null}
              onSelectNest={handleSelectNest}
              onCreateNest={handleCreateNest}
            />
          </View>
        )}
      </View>
    );
  }

  // タブレット表示（コンパクト）
  if (displayMode === 'compact') {
    return (
      <View style={styles.compactContainer} ref={dropdownRef}>
        <TouchableOpacity
          style={styles.compactSelector}
          onPress={() => setIsOpen(!isOpen)}
          accessibilityRole="button"
          accessibilityLabel="NESTを選択"
        >
          {currentNest ? (
            <NestBadge nest={currentNest} size="medium" />
          ) : (
            <Text style={styles.placeholderText}>NESTを選択</Text>
          )}
          <Text style={styles.dropdownIcon}>{isOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.compactPopoverContainer} ref={popoverRef}>
            <NestPopoverMenu
              nests={userNests}
              currentNestId={currentNest?.id || null}
              onSelectNest={handleSelectNest}
              onCreateNest={handleCreateNest}
            />
          </View>
        )}
      </View>
    );
  }

  // デスクトップ表示（サイドバー）
  return (
    <View style={styles.sidebarContainer}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>NESTを選択</Text>
        <Text style={styles.shortcutHint}>Alt+N</Text>
      </View>
      
      <View style={styles.sidebarContent}>
        {userNests.map(nest => (
          <View key={nest.id} style={styles.sidebarNestItem}>
            <NestBadge
              nest={nest}
              isActive={currentNest?.id === nest.id}
              onPress={() => handleSelectNest(nest)}
              size="medium"
            />
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.sidebarCreateButton}
          onPress={handleCreateNest}
          accessibilityRole="button"
        >
          <Text style={styles.sidebarCreateButtonText}>+ 新規作成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // モバイル用スタイル
  mobileContainer: {
    zIndex: 100,
    width: '100%',
  },
  mobileSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  mobilePopoverContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    zIndex: 101,
  },
  
  // タブレット用スタイル
  compactContainer: {
    zIndex: 100,
    width: 'auto',
  },
  compactSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    minWidth: 180,
  },
  compactPopoverContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    zIndex: 101,
  },
  
  // 共通スタイル
  placeholderText: {
    fontSize: 16,
    color: COLORS.lightText,
  },
  dropdownIcon: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  
  // デスクトップ用スタイル
  sidebarContainer: {
    width: 240,
    backgroundColor: COLORS.lightGray,
    borderRightWidth: 1,
    borderRightColor: COLORS.lightGray,
    height: '100%',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  shortcutHint: {
    fontSize: 12,
    color: COLORS.lightText,
  },
  sidebarContent: {
    padding: 8,
  },
  sidebarNestItem: {
    marginVertical: 4,
  },
  sidebarCreateButton: {
    margin: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  sidebarCreateButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default NestSelector; 