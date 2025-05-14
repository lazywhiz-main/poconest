import React from 'react';
import { View, StyleSheet, ScrollView, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from '@platform/web/SafeAreaProvider';
import { COLORS } from '@constants/config';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  backgroundColor?: string;
  statusBarColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
  safeArea?: boolean;
  style?: any;
  contentContainerStyle?: any;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = true,
  backgroundColor = COLORS.background,
  statusBarColor = COLORS.background,
  statusBarStyle = 'dark-content',
  safeArea = true,
  style,
  contentContainerStyle,
}) => {
  // Base container styles
  const containerStyle = [
    styles.container,
    { backgroundColor },
    Platform.OS === 'web' ? { height: '100vh' as any } : {},
    style,
  ];

  // ScrollView content container styles
  const scrollViewContentStyle = [
    styles.contentContainer,
    contentContainerStyle,
  ];

  // Conditionally render with ScrollView or View based on scrollable prop
  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={scrollViewContentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      );
    } else {
      return (
        <View style={[styles.contentContainer, contentContainerStyle]}>
          {children}
        </View>
      );
    }
  };

  // Conditional rendering based on platform and safeArea prop
  if (Platform.OS === 'web') {
    // Web platform - SafeAreaView is not needed
    return (
      <View style={containerStyle}>
        {renderContent()}
      </View>
    );
  } else {
    // Native platforms - use StatusBar and conditionally use SafeAreaView
    return (
      <>
        <StatusBar
          backgroundColor={statusBarColor}
          barStyle={statusBarStyle}
          translucent={false}
        />
        {safeArea ? (
          <SafeAreaView style={containerStyle}>
            {renderContent()}
          </SafeAreaView>
        ) : (
          <View style={containerStyle}>
            {renderContent()}
          </View>
        )}
      </>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%', // Native height
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    flexGrow: 1,
    width: '100%',
    padding: 16,
  },
});

export default Screen; 