import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, G } from 'react-native-svg';
import { BrandColors } from '../constants/Colors';

type PocoLogoProps = {
  size?: number;
  style?: any;
};

const PocoLogo: React.FC<PocoLogoProps> = ({ size = 120, style }) => {
  // サイズに基づいてスケーリング
  const scale = size / 240;
  
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 240 240">
        <Circle cx="120" cy="120" r="110" fill={BrandColors.background} />
        <Ellipse cx="120" cy="130" rx="70" ry="80" fill="#FF8E3C" />
        <Path 
          d="M180 100C180 100 200 70 190 40C190 40 150 60 160 100" 
          fill="#FF8E3C" 
        />
        <Path 
          d="M180 100C180 100 200 70 190 40C190 40 150 60 160 100" 
          stroke={BrandColors.primary} 
          strokeWidth="4" 
          strokeLinecap="round" 
        />
        <Circle cx="120" cy="90" r="40" fill="#FF8E3C" />
        <Circle cx="90" cy="60" r="15" fill="#FF8E3C" />
        <Circle cx="150" cy="60" r="15" fill="#FF8E3C" />
        <Circle cx="90" cy="60" r="8" fill="#FFC0B0" />
        <Circle cx="150" cy="60" r="8" fill="#FFC0B0" />
        <Circle cx="105" cy="85" r="6" fill="#333333" />
        <Circle cx="135" cy="85" r="6" fill="#333333" />
        <Ellipse cx="120" cy="100" rx="8" ry="5" fill="#333333" />
        <Path 
          d="M105 115Q120 125 135 115" 
          stroke="#333333" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        <Circle cx="90" cy="100" r="10" fill="#FFB8B8" fillOpacity="0.7" />
        <Circle cx="150" cy="100" r="10" fill="#FFB8B8" fillOpacity="0.7" />
        <G transform="rotate(-15, 95, 160)">
          <Ellipse 
            cx="95" 
            cy="160" 
            rx="20" 
            ry="12" 
            fill="#FFE0A3" 
            stroke="#CC9966" 
            strokeWidth="2" 
          />
        </G>
        <G transform="rotate(15, 145, 160)">
          <Ellipse 
            cx="145" 
            cy="160" 
            rx="20" 
            ry="12" 
            fill="#FFE0A3" 
            stroke="#CC9966" 
            strokeWidth="2" 
          />
        </G>
        <Circle cx="120" cy="180" r="15" fill={BrandColors.secondary} />
        <Path d="M115 175L120 170L125 175L120 180L115 175Z" fill={BrandColors.background} />
        <Path 
          d="M70 210C70 210 90 230 120 230C150 230 170 210 170 210" 
          stroke={BrandColors.primary} 
          strokeWidth="6" 
          strokeLinecap="round" 
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PocoLogo; 