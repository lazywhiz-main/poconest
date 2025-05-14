import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import PocoLogo from './PocoLogo';
import { BrandColors } from '../constants/Colors';

const TypingIndicator: React.FC = () => {
  const dot1Opacity = useRef(new Animated.Value(0.4)).current;
  const dot2Opacity = useRef(new Animated.Value(0.4)).current;
  const dot3Opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.timing(dot, {
          toValue: 1,
          duration: 300,
          delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dot, {
          toValue: 0.4,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
    };

    const loopAnimation = () => {
      Animated.loop(
        Animated.parallel([
          animateDot(dot1Opacity, 0),
          animateDot(dot2Opacity, 150),
          animateDot(dot3Opacity, 300),
        ])
      ).start();
    };

    loopAnimation();

    return () => {
      dot1Opacity.stopAnimation();
      dot2Opacity.stopAnimation();
      dot3Opacity.stopAnimation();
    };
  }, [dot1Opacity, dot2Opacity, dot3Opacity]);

  return (
    <View style={styles.typingIndicator}>
      <PocoLogo size={30} />
      <View style={styles.typingDots}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 16,
    marginBottom: 16,
  },
  typingDots: {
    flexDirection: 'row',
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.text.secondary,
    marginHorizontal: 2,
  },
});

export default TypingIndicator; 