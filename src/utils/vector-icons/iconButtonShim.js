import React from 'react';
import { TouchableHighlight, Text, View, StyleSheet } from 'react-native';

/**
 * Vector Icons の icon-button シムレーション
 */
const IconButton = ({
  backgroundColor = 'transparent',
  borderRadius = 5,
  color = 'black',
  size = 24,
  iconStyle,
  style,
  onPress,
  name,
  children,
  ...props
}) => {
  return (
    <TouchableHighlight
      underlayColor="rgba(0, 0, 0, 0.1)"
      onPress={onPress}
      style={[
        {
          backgroundColor,
          borderRadius,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
        },
        style,
      ]}
      {...props}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text 
          style={[
            { 
              fontSize: size, 
              color,
              marginRight: children ? 8 : 0,
            }, 
            iconStyle
          ]}
        >
          {name || '■'}
        </Text>
        {children}
      </View>
    </TouchableHighlight>
  );
};

export default IconButton; 