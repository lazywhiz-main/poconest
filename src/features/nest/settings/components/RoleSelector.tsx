import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import { NestRole } from '../types/permissions.types';

interface RoleInfo {
  role: NestRole;
  label: string;
  description: string;
  permissions: string[];
  color: string;
  icon: string;
}

interface RoleSelectorProps {
  selectedRole: NestRole;
  onRoleSelect: (role: NestRole) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

/**
 * ロール選択コンポーネント
 */
const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onRoleSelect,
  disabled = false,
  showDetails = true
}) => {
  const [expandedRole, setExpandedRole] = useState<NestRole | null>(null);

  // ロール情報の定義
  const roles: RoleInfo[] = [
    {
      role: NestRole.OWNER,
      label: 'オーナー',
      description: 'NESTの完全な管理権限を持ちます',
      permissions: [
        'すべての設定の変更',
        'メンバーの招待と削除',
        'ロールの割り当て',
        'コンテンツの完全な管理',
        'NEST削除の実行',
        'プライバシー設定の変更'
      ],
      color: '#FFD700',
      icon: '👑'
    },
    {
      role: NestRole.ADMIN,
      label: '管理者',
      description: 'NESTの管理権限を持ちますが、一部の重要な設定は変更できません',
      permissions: [
        'メンバーの招待と管理',
        '他のメンバーのロール変更（オーナー除く）',
        'すべてのコンテンツの編集と削除',
        'アクティビティの管理',
        '共有設定の管理'
      ],
      color: '#4169E1',
      icon: '🛡️'
    },
    {
      role: NestRole.MEMBER,
      label: 'メンバー',
      description: 'NESTに参加して共同作業を行うための基本的な権限を持ちます',
      permissions: [
        'コンテンツの作成',
        '自分のコンテンツの編集と削除',
        'メッセージの投稿',
        'コメントとリアクションの追加',
        'NESTの閲覧'
      ],
      color: '#2E8B57',
      icon: '👤'
    },
    {
      role: NestRole.GUEST,
      label: 'ゲスト',
      description: '閲覧と最小限の対話のみを許可された限定的な権限です',
      permissions: [
        'コンテンツの閲覧',
        'リアクションの追加',
        'アクティビティの閲覧'
      ],
      color: '#A9A9A9',
      icon: '👁️'
    }
  ];

  /**
   * ロール詳細の表示/非表示を切り替える
   */
  const toggleRoleDetails = (role: NestRole) => {
    if (expandedRole === role) {
      setExpandedRole(null);
    } else {
      setExpandedRole(role);
    }
  };

  /**
   * ロールを選択する
   */
  const handleRoleSelect = (role: NestRole) => {
    if (!disabled) {
      onRoleSelect(role);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>ロールの選択</Text>
      
      <View style={styles.description}>
        <Text style={styles.descriptionText}>
          ロールによってNEST内で実行できるアクションが異なります。
          適切な権限バランスのためにロールを選択してください。
        </Text>
      </View>
      
      <View style={styles.roleList}>
        {roles.map((roleInfo) => (
          <View key={roleInfo.role} style={styles.roleSection}>
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === roleInfo.role && styles.selectedRoleCard,
                { borderLeftColor: roleInfo.color, borderLeftWidth: 4 }
              ]}
              onPress={() => handleRoleSelect(roleInfo.role)}
              disabled={disabled}
            >
              <View style={styles.roleHeader}>
                <View style={styles.roleIconContainer}>
                  <Text style={styles.roleIcon}>{roleInfo.icon}</Text>
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleLabel}>{roleInfo.label}</Text>
                  <Text style={styles.roleDescription}>{roleInfo.description}</Text>
                </View>
                {showDetails && (
                  <TouchableOpacity 
                    style={styles.detailsButton}
                    onPress={() => toggleRoleDetails(roleInfo.role)}
                  >
                    <Text style={styles.detailsButtonText}>
                      {expandedRole === roleInfo.role ? '閉じる' : '詳細'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {showDetails && expandedRole === roleInfo.role && (
                <View style={styles.permissionList}>
                  <Text style={styles.permissionTitle}>権限：</Text>
                  {roleInfo.permissions.map((permission, index) => (
                    <View key={index} style={styles.permissionItem}>
                      <Text style={styles.permissionIcon}>•</Text>
                      <Text style={styles.permissionText}>{permission}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        maxWidth: 800,
        margin: 'auto',
      },
      default: {},
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
  },
  roleList: {
    marginBottom: 16,
  },
  roleSection: {
    marginBottom: 12,
  },
  roleCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  selectedRoleCard: {
    backgroundColor: '#fafafa',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 2px rgba(0, 102, 204, 0.2)',
      },
      default: {
        shadowColor: '#0066cc',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
      },
    }),
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleIcon: {
    fontSize: 18,
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roleDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  permissionList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  permissionItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  permissionIcon: {
    color: '#0066cc',
    marginRight: 8,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
});

export default RoleSelector; 