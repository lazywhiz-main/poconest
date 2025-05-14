import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import PocoLogo from './PocoLogo';

type PocoAnimationProps = {
  size?: number;
  state?: 'idle' | 'listening' | 'thinking' | 'talking' | 'happy';
  style?: any;
  onAnimationComplete?: () => void;
};

const PocoAnimation: React.FC<PocoAnimationProps> = ({ 
  size = 60, 
  state = 'idle', 
  style,
  onAnimationComplete
}) => {
  // アニメーション用の値
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // アニメーションの参照を保持
  const activeAnimations = useRef<Animated.CompositeAnimation[]>([]);

  // 回転のアニメーション値を補間
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg']
  });

  // バウンスのアニメーション値を補間
  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -5, 0]
  });

  // すべてのアニメーションを停止
  const stopAllAnimations = () => {
    activeAnimations.current.forEach(anim => {
      anim.stop();
    });
    activeAnimations.current = [];
  };

  // アイドル時のアニメーション（軽く揺れる）
  const startIdleAnimation = () => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    activeAnimations.current.push(anim);
    anim.start();
  };

  // リスニング時のアニメーション（頭を傾ける）
  const startListeningAnimation = () => {
    const anim = Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true
    });
    activeAnimations.current.push(anim);
    anim.start();
  };

  // 思考中のアニメーション（小さくなったり大きくなったり）
  const startThinkingAnimation = () => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    activeAnimations.current.push(anim);
    anim.start();
  };

  // 話す時のアニメーション（上下に動く）
  const startTalkingAnimation = () => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    activeAnimations.current.push(anim);
    anim.start();
  };

  // 喜ぶアニメーション（ジャンプする）
  const startHappyAnimation = () => {
    const anim = Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(bounceAnim, {
        toValue: 0.8,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(bounceAnim, {
        toValue: 0,
        duration: 150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]);
    activeAnimations.current.push(anim);
    anim.start(({ finished }) => {
      if (finished && onAnimationComplete) {
        onAnimationComplete();
      }
    });
  };

  // 状態が変わったときにアニメーションをリセットして新しいアニメーションを開始
  useEffect(() => {
    // すべてのアニメーションをリセット
    stopAllAnimations();
    bounceAnim.setValue(0);
    rotateAnim.setValue(0);
    scaleAnim.setValue(1);

    // 状態に応じたアニメーションを開始
    switch (state) {
      case 'idle':
        startIdleAnimation();
        break;
      case 'listening':
        startListeningAnimation();
        break;
      case 'thinking':
        startThinkingAnimation();
        break;
      case 'talking':
        startTalkingAnimation();
        break;
      case 'happy':
        startHappyAnimation();
        break;
      default:
        startIdleAnimation();
        break;
    }

    // コンポーネントのアンマウント時にアニメーションをクリア
    return () => {
      stopAllAnimations();
    };
  }, [state]);

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size,
          transform: [
            { translateY },
            { rotate: rotation },
            { scale: scaleAnim }
          ]
        }, 
        style
      ]}
    >
      <View style={styles.logoContainer}>
        <PocoLogo size={size} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default PocoAnimation; 