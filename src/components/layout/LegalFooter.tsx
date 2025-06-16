import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';

const LegalFooter: React.FC = () => {
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;

  const handleTermsPress = () => {
    navigate('/terms-of-service');
  };

  const handlePrivacyPress = () => {
    navigate('/privacy-policy');
  };

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <Text style={styles.copyright}>© 2025 Poconest. All rights reserved.</Text>
      <View style={styles.links}>
        <TouchableOpacity onPress={handleTermsPress}>
          <Text style={styles.link}>利用規約</Text>
        </TouchableOpacity>
        <Text style={styles.separator}>•</Text>
        <TouchableOpacity onPress={handlePrivacyPress}>
          <Text style={styles.link}>プライバシーポリシー</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'var(--border-primary)',
    backgroundColor: 'var(--bg-secondary)',
  },
  containerMobile: {
    flexDirection: 'column',
    gap: 8,
    paddingHorizontal: 16,
  },
  copyright: {
    fontSize: 14,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-family-mono)',
  },
  links: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  link: {
    fontSize: 14,
    color: 'var(--primary-blue)',
    textDecorationLine: 'underline',
    fontFamily: 'var(--font-family-text)',
  },
  separator: {
    fontSize: 14,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-family-mono)',
  },
});

export default LegalFooter; 