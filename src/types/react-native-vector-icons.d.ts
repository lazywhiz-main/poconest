declare module 'react-native-vector-icons/lib/create-icon-set' {
  import React from 'react';
  import { TextProps } from 'react-native';
  
  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }
  
  export default function createIconSet(
    glyphMap: Record<string, number | string>,
    fontFamily: string,
    fontFile: string
  ): {
    (props: IconProps): React.ReactElement;
    Button: React.ComponentType<any>;
    TabBarItem: React.ComponentType<any>;
    TabBarItemIOS: React.ComponentType<any>;
    getImageSource: (name: string, size?: number, color?: string) => Promise<any>;
    getImageSourceSync: (name: string, size?: number, color?: string) => any;
    loadFont: (file?: string) => Promise<void>;
    hasIcon: (name: string) => boolean;
  };
}

declare module 'react-native-vector-icons/lib/icon-button' {
  import React from 'react';
  import { TouchableHighlightProps } from 'react-native';
  
  export interface IconButtonProps extends TouchableHighlightProps {
    name: string;
    size?: number;
    color?: string;
    iconStyle?: any;
  }
  
  const IconButton: React.ComponentType<IconButtonProps>;
  export default IconButton;
}

declare module 'react-native-vector-icons/lib/NativeRNVectorIcons' {
  interface TurboModule {
    getConstants: () => Record<string, any>;
  }
  
  const NativeRNVectorIcons: TurboModule;
  export default NativeRNVectorIcons;
} 