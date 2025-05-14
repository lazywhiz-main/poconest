import React from 'react';
import { Text, TouchableHighlight } from 'react-native';

/**
 * Vector Icons の createIconSet 関数をシミュレート
 */
const createIconSet = (glyphMap, fontFamily, fontFile) => {
  const IconComponent = (props) => {
    const { name, size = 24, color = 'black', style, ...otherProps } = props;
    
    return (
      <Text 
        selectable={false} 
        style={[
          { 
            fontFamily, 
            fontSize: size, 
            color,
            fontWeight: 'normal',
            fontStyle: 'normal',
          }, 
          style
        ]} 
        {...otherProps}
      >
        {/* グリフの代わりにアイコン名を表示 */}
        {name}
      </Text>
    );
  };
  
  // Button コンポーネント
  IconComponent.Button = ({ 
    name,
    size = 24, 
    color = 'black', 
    backgroundColor = 'transparent',
    borderRadius = 5,
    onPress,
    style,
    iconStyle,
    children,
    ...props
  }) => {
    return (
      <TouchableHighlight
        underlayColor="rgba(0, 0, 0, 0.1)"
        onPress={onPress}
        style={[{
          backgroundColor,
          borderRadius,
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
        }, style]}
        {...props}
      >
        <>
          <IconComponent
            name={name}
            size={size}
            color={color}
            style={[{ marginRight: children ? 8 : 0 }, iconStyle]}
          />
          {children}
        </>
      </TouchableHighlight>
    );
  };
  
  // TabBarItem コンポーネント
  IconComponent.TabBarItem = (props) => null;
  
  // TabBarItemIOS コンポーネント
  IconComponent.TabBarItemIOS = (props) => null;
  
  // 画像ソースの取得（ダミー実装）
  IconComponent.getImageSource = (name, size, color) => {
    return Promise.resolve({ uri: 'dummy://icon' });
  };
  
  // 同期的に画像ソースを取得（ダミー実装）
  IconComponent.getImageSourceSync = (name, size, color) => {
    return { uri: 'dummy://icon' };
  };
  
  // フォントの読み込み（ダミー実装）
  IconComponent.loadFont = () => Promise.resolve();
  
  // アイコンが存在するかチェック
  IconComponent.hasIcon = (name) => !!glyphMap[name];
  
  return IconComponent;
};

export default createIconSet; 