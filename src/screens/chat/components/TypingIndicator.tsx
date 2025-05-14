import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, SPACING } from '@constants/config';

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
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>ポ</Text>
      </View>
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
    paddingLeft: SPACING.md,
    paddingBottom: SPACING.md,
  },
  avatarContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  typingDots: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginLeft: SPACING.xs,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lightText,
    marginHorizontal: 2,
  },
});

export default TypingIndicator; 