import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';
import { useNestSpace } from '../../../contexts/NestSpaceContext';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

type SettingSection = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'advanced';

const UserProfileSpace: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingSection>('profile');
  const [darkMode, setDarkMode] = useState(false);
  const [enableMultitasking, setEnableMultitasking] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const nestSpace = useNestSpace();
  
  // ダミーユーザーデータ
  const user = {
    name: 'ポコ',
    email: 'poko@example.com',
    avatar: 'https://i.pravatar.cc/150?img=32',
    joinDate: '2023年4月1日',
  };
  
  const handleLogout = () => {
    // ログアウト処理
    console.log('Logging out...');
    // 実際にはAuthContextなどでログアウト処理を行う
  };
  
  const renderProfileSection = () => (
    <View style={styles.sectionContent}>
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: user.avatar }} 
          style={styles.avatar}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.joinDate}>登録: {user.joinDate}</Text>
        </View>
      </View>
      
      <Card style={styles.profileCard}>
        <Text style={styles.sectionSubtitle}>アカウント情報</Text>
        <View style={styles.formGroup}>
          <Text style={styles.label}>表示名</Text>
          <Text style={styles.value}>{user.name}</Text>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.label}>メールアドレス</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
        <Button 
          onPress={() => console.log('Edit profile')} 
          title="プロフィールを編集"
          style={styles.editButton}
        />
      </Card>
      
      <Button 
        onPress={handleLogout} 
        title="ログアウト" 
        style={styles.logoutButton}
        variant="outline"
      />
    </View>
  );
  
  const renderAppearanceSection = () => (
    <View style={styles.sectionContent}>
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>テーマ設定</Text>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>ダークモード</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>システムテーマに合わせる</Text>
          <Switch
            value={false}
            onValueChange={() => {}}
          />
        </View>
      </Card>
      
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>フォント設定</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={styles.radioItem}>
            <View style={[styles.radioButton, styles.radioButtonSelected]} />
            <Text style={styles.radioLabel}>システムフォント（デフォルト）</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioItem}>
            <View style={styles.radioButton} />
            <Text style={styles.radioLabel}>Noto Sans JP</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.radioItem}>
            <View style={styles.radioButton} />
            <Text style={styles.radioLabel}>Montserrat + Noto Sans JP</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
  
  const renderNotificationsSection = () => (
    <View style={styles.sectionContent}>
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>通知設定</Text>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>すべての通知</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>メッセージ通知</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={() => {}}
            disabled={!notificationsEnabled}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>ボード更新通知</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={() => {}}
            disabled={!notificationsEnabled}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>Zoom会議通知</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={() => {}}
            disabled={!notificationsEnabled}
          />
        </View>
      </Card>
    </View>
  );
  
  const renderPrivacySection = () => (
    <View style={styles.sectionContent}>
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>プライバシー設定</Text>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>オンライン状態を表示</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
          />
        </View>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>既読通知を送信</Text>
          <Switch
            value={true}
            onValueChange={() => {}}
          />
        </View>
      </Card>
      
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>データ</Text>
        <Button 
          onPress={() => console.log('Download data')} 
          title="自分のデータをダウンロード"
          style={styles.dataButton}
          variant="outline"
        />
      </Card>
    </View>
  );
  
  const renderAdvancedSection = () => (
    <View style={styles.sectionContent}>
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>詳細設定</Text>
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>マルチタスク機能を有効化</Text>
          <Switch
            value={enableMultitasking}
            onValueChange={setEnableMultitasking}
          />
        </View>
        <Text style={styles.helperText}>
          マルチタスク機能を有効にすると、デスクトップとタブレットで画面分割やPiP表示が可能になります。
        </Text>
        
        <View style={styles.switchItem}>
          <Text style={styles.settingLabel}>開発者モード</Text>
          <Switch
            value={false}
            onValueChange={() => {}}
          />
        </View>
      </Card>
      
      <Card style={styles.settingCard}>
        <Text style={styles.sectionSubtitle}>アプリ情報</Text>
        <Text style={styles.infoText}>ポコの巣 v1.0.0</Text>
        <Text style={styles.infoText}>© 2023 Poko Team</Text>
      </Card>
    </View>
  );
  
  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'privacy':
        return renderPrivacySection();
      case 'advanced':
        return renderAdvancedSection();
      default:
        return renderProfileSection();
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'profile' && styles.activeNavItem]} 
          onPress={() => setActiveSection('profile')}
        >
          <Text style={[styles.navText, activeSection === 'profile' && styles.activeNavText]}>プロフィール</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'appearance' && styles.activeNavItem]} 
          onPress={() => setActiveSection('appearance')}
        >
          <Text style={[styles.navText, activeSection === 'appearance' && styles.activeNavText]}>外観</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'notifications' && styles.activeNavItem]} 
          onPress={() => setActiveSection('notifications')}
        >
          <Text style={[styles.navText, activeSection === 'notifications' && styles.activeNavText]}>通知</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'privacy' && styles.activeNavItem]} 
          onPress={() => setActiveSection('privacy')}
        >
          <Text style={[styles.navText, activeSection === 'privacy' && styles.activeNavText]}>プライバシー</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.navItem, activeSection === 'advanced' && styles.activeNavItem]} 
          onPress={() => setActiveSection('advanced')}
        >
          <Text style={[styles.navText, activeSection === 'advanced' && styles.activeNavText]}>詳細設定</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content}>
        {/* <Text style={styles.sectionTitle}>
          {activeSection === 'profile' ? 'プロフィール' : 
           activeSection === 'appearance' ? '外観設定' :
           activeSection === 'notifications' ? '通知設定' :
           activeSection === 'privacy' ? 'プライバシーと安全性' : '詳細設定'}
        </Text> */}
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f7fa',
  },
  sidebar: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 20,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  activeNavItem: {
    backgroundColor: '#f0f5ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
  },
  navText: {
    fontSize: 15,
    color: '#555555',
  },
  activeNavText: {
    color: '#4a6da7',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333333',
  },
  sectionContent: {
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: '#888888',
  },
  profileCard: {
    marginBottom: 16,
    padding: 16,
  },
  settingCard: {
    marginBottom: 16,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333333',
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333333',
  },
  editButton: {
    marginTop: 12,
  },
  logoutButton: {
    marginTop: 12,
  },
  dataButton: {
    marginTop: 12,
  },
  radioGroup: {
    marginTop: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4a6da7',
    marginRight: 12,
  },
  radioButtonSelected: {
    backgroundColor: '#4a6da7',
  },
  radioLabel: {
    fontSize: 16,
    color: '#333333',
  },
  helperText: {
    fontSize: 14,
    color: '#666666',
    marginTop: -4,
    marginBottom: 12,
    paddingLeft: 4,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
});

export default UserProfileSpace; 