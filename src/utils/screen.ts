import { Dimensions } from 'react-native';

export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const;

export const getScreenType = () => {
  const { width } = Dimensions.get('window');
  if (width < BREAKPOINTS.mobile) return 'small';
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
}; 