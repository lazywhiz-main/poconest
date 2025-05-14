import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BrandColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export type CardType = 'inbox' | 'insights' | 'themes' | 'zoom';
export type IndicatorStyle = 'line' | 'badge' | 'header' | 'tag';

interface CardTypeIndicatorProps {
  type: CardType;
  style?: IndicatorStyle;
}

const CardTypeIndicator: React.FC<CardTypeIndicatorProps> = ({ 
  type,
  style = 'line'
}) => {
  const getTypeColor = () => {
    return BrandColors.columns[type];
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'inbox':
        return 'mail-outline';
      case 'insights':
        return 'bulb-outline';
      case 'themes':
        return 'library-outline';
      case 'zoom':
        return 'scan-outline';
    }
  };

  const renderIndicator = () => {
    switch (style) {
      case 'line':
        return (
          <View style={[
            styles.indicator,
            { backgroundColor: getTypeColor() }
          ]} />
        );
      
      case 'badge':
        return (
          <View style={[
            styles.badge,
            { backgroundColor: `${getTypeColor()}15` }
          ]}>
            <Ionicons 
              name={getTypeIcon()} 
              size={16} 
              color={getTypeColor()} 
            />
            <View style={[
              styles.badgeDot,
              { backgroundColor: getTypeColor() }
            ]} />
          </View>
        );
      
      case 'header':
        return (
          <View style={[
            styles.header,
            { backgroundColor: `${getTypeColor()}60` }
          ]}>
            <View style={styles.headerContent}>
              <Ionicons 
                name={getTypeIcon()} 
                size={16} 
                color={getTypeColor()} 
                style={styles.headerIcon}
              />
            </View>
          </View>
        );
      
      case 'tag':
        return (
          <View style={[
            styles.tag,
            { backgroundColor: `${getTypeColor()}20` }
          ]}>
            <Ionicons 
              name={getTypeIcon()} 
              size={12} 
              color={getTypeColor()} 
              style={styles.tagIcon} 
            />
          </View>
        );
    }
  };

  return renderIndicator();
};

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    opacity: 0.8,
  },
  badge: {
    position: 'absolute',
    left: 12,
    top: 44,
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'white',
  },
  header: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerContent: {
    position: 'absolute',
    right: 8,
    top: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    opacity: 1.0,
  },
  tag: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagIcon: {
    marginRight: 4,
  },
});

export default CardTypeIndicator; 