import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Text,
  Platform,
  Dimensions
} from 'react-native';
import PocoAnimation from './PocoAnimation';
import { BrandColors } from '../constants/Colors';

type PocoChatAssistantProps = {
  onAssistanceRequest?: () => void;
  onInsightShare?: () => void;
};

const PocoChatAssistant: React.FC<PocoChatAssistantProps> = ({
  onAssistanceRequest,
  onInsightShare
}) => {
  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'talking' | 'happy'>('idle');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipMessage, setTooltipMessage] = useState('こんにちは！話しかけてくださいね');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [isMobileView, setIsMobileView] = useState(Platform.OS !== 'web' || Dimensions.get('window').width < 768);

  useEffect(() => {
    const updateLayout = () => {
      const width = Dimensions.get('window').width;
      setIsMobileView(Platform.OS !== 'web' || width < 768);
    };

    updateLayout();
    const dimensionsSubscription = Dimensions.addEventListener('change', updateLayout);

    // ウェルカムトースト表示
    setTimeout(() => {
      handleShowTooltip('こんにちは！話しかけてくださいね');
    }, 1000);

    return () => {
      dimensionsSubscription.remove();
    };
  }, []);

  // トーストメッセージを表示
  const handleShowTooltip = (message: string) => {
    setTooltipMessage(message);
    setShowTooltip(true);
    
    fadeAnim.setValue(1);
    
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowTooltip(false);
      });
    }, 3000);
  };

  // Pocoがタップされたときの処理
  const handlePress = () => {
    switch (state) {
      case 'idle':
        setState('listening');
        handleShowTooltip('どんなことをお手伝いしましょうか？');
        if (onAssistanceRequest) {
          setTimeout(() => {
            onAssistanceRequest();
          }, 500);
        }
        break;
      case 'listening':
        setState('thinking');
        handleShowTooltip('考えています...');
        setTimeout(() => {
          setState('talking');
          handleShowTooltip('こんな話はどうですか？');
        }, 2000);
        break;
      case 'talking':
        setState('happy');
        handleShowTooltip('役に立ってよかったです！');
        setTimeout(() => {
          setState('idle');
        }, 2000);
        break;
      case 'happy':
      case 'thinking':
        setState('idle');
        break;
    }
  };

  return (
    <View style={[
      styles.container, 
      isMobileView ? styles.mobileContainer : null
    ]}>
      {showTooltip && (
        <Animated.View style={[styles.tooltip, { opacity: fadeAnim }]}>
          <Text style={styles.tooltipText}>
            {tooltipMessage}
          </Text>
        </Animated.View>
      )}
      <TouchableOpacity
        onPress={handlePress}
        style={styles.animationContainer}
      >
        <PocoAnimation 
          state={state} 
          size={isMobileView ? 50 : 60} 
          onAnimationComplete={() => {
            if (state === 'happy') {
              setState('idle');
            }
          }}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    alignItems: 'center',
    zIndex: 100,
  },
  mobileContainer: {
    right: 10,
    bottom: 70,
  },
  animationContainer: {
    backgroundColor: BrandColors.background,
    borderRadius: 30,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  tooltip: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 10,
    marginBottom: 10,
    maxWidth: 200,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PocoChatAssistant; 