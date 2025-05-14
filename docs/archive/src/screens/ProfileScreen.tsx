import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon as any} size={24} color={BrandColors.text.primary} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={20} color={BrandColors.text.tertiary} />
  </TouchableOpacity>
);

export const ProfileScreen = () => {
  const { signOut, user } = useAuth();
  const navigation = useNavigation();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('サインアウトに失敗しました:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="プロフィール"
        showEmoji={true}
        emoji="👤"
      />

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.username}>{user?.email?.split('@')[0] || 'ゲストユーザー'}</Text>
          <Text style={styles.email}>{user?.email || 'guest@example.com'}</Text>
        </View>

        <View style={styles.settingsSection}>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="person-outline" size={24} color={BrandColors.text.primary} style={styles.settingIcon} />
            <Text style={styles.settingText}>プロフィールを編集</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={24} color={BrandColors.text.primary} style={styles.settingIcon} />
            <Text style={styles.settingText}>通知設定</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="lock-closed-outline" size={24} color={BrandColors.text.primary} style={styles.settingIcon} />
            <Text style={styles.settingText}>プライバシー設定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BrandColors.backgroundVariants.medium,
    marginBottom: 15,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: BrandColors.text.secondary,
  },
  settingsSection: {
    marginTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BrandColors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: BrandColors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    color: BrandColors.error,
    marginLeft: 8,
  },
});

export default ProfileScreen; 