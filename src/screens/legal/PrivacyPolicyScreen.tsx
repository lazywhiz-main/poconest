import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import theme from '../../styles/theme';

const PrivacyPolicyScreen: React.FC = () => {
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width <= 768;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          
          {/* Title */}
          <Text style={styles.title}>Poconest プライバシーポリシー</Text>
          
          {/* Introduction */}
          <Text style={styles.paragraph}>
            株式会社[運営会社名]（以下「当社」といいます）は、当社が提供する「Poconest」（以下「本サービス」といいます）における、利用者の個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
          </Text>

          {/* Section 1 */}
          <Text style={styles.sectionTitle}>1. 収集する個人情報および収集方法</Text>
          <Text style={styles.paragraph}>
            本ポリシーにおいて「個人情報」とは、個人情報保護法に定める個人情報を指すものとします。当社は、本サービスの提供にあたり、以下の個人情報を収集することがあります。
          </Text>

          <Text style={styles.subSectionTitle}>利用者からご提供いただく情報</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>アカウント情報:</Text> 氏名、メールアドレス、パスワード、所属組織名など、利用登録の際にご提供いただく情報</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>利用者コンテンツ:</Text> 本サービスにアップロードされるチャットログ、ミーティングログ、その他生成されるカード情報などのデータ。これには、個人情報が含まれる可能性があります。</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>お問い合わせ情報:</Text> お問い合わせフォームやメールなどにより当社にご連絡いただく際に、ご提供いただく情報</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>支払い情報:</Text> 有料プランをご利用の場合、クレジットカード情報や銀行口座情報など（ただし、当社が直接保持せず、決済代行サービスを通じて処理される場合があります）</Text>

          <Text style={styles.subSectionTitle}>本サービス利用時に収集する情報</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>アクセス情報:</Text> IPアドレス、ブラウザの種類、OSの種類、アクセス日時、滞在時間、参照元URLなど</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>利用状況に関する情報:</Text> 本サービスの利用履歴、機能の利用状況、クリックデータなど</Text>
          <Text style={styles.listItem}>• <Text style={styles.listItemBold}>Cookie情報:</Text> ウェブサイトの利用状況を分析し、サービス改善や利用者ごとのカスタマイズに利用するため、Cookieおよび類似技術を使用する場合があります。</Text>

          {/* Section 2 */}
          <Text style={styles.sectionTitle}>2. 個人情報を収集・利用する目的</Text>
          <Text style={styles.paragraph}>当社が個人情報を収集・利用する目的は以下のとおりです。</Text>
          <Text style={styles.listItem}>1. 本サービスの提供、運営、維持のため</Text>
          <Text style={styles.listItem}>2. 利用者の本人確認、利用登録の受付、アカウント管理のため</Text>
          <Text style={styles.listItem}>3. 利用料金の請求、支払い確認のため</Text>
          <Text style={styles.listItem}>4. 本サービスの機能改善、新機能開発、品質向上のため</Text>
          <Text style={styles.listItem}>5. 利用者からのお問い合わせに対応するため</Text>
          <Text style={styles.listItem}>6. 本サービスに関する重要な通知（規約変更、サービス停止など）を行うため</Text>
          <Text style={styles.listItem}>7. 本サービスの利用状況を分析し、統計データとして利用するため（個人を特定できない形に加工します）</Text>
          <Text style={styles.listItem}>8. 本サービスの不正利用防止、セキュリティ確保のため</Text>
          <Text style={styles.listItem}>9. 当社または第三者の広告配信のため</Text>
          <Text style={styles.listItem}>10. その他、上記利用目的に付随する目的</Text>

          {/* Section 3 */}
          <Text style={styles.sectionTitle}>3. 個人情報の第三者提供</Text>
          <Text style={styles.paragraph}>
            当社は、次に掲げる場合を除いて、あらかじめ利用者の同意を得ることなく、個人情報を第三者に提供することはありません。
          </Text>
          <Text style={styles.listItem}>1. 法令に基づく場合</Text>
          <Text style={styles.listItem}>2. 人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難である場合</Text>
          <Text style={styles.listItem}>3. 公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難である場合</Text>
          <Text style={styles.listItem}>4. 国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがある場合</Text>
          <Text style={styles.listItem}>5. 業務遂行上必要な範囲で、秘密保持義務を負う業務委託先に開示する場合</Text>
          <Text style={styles.listItem}>6. 合併、会社分割、事業譲渡その他の事由による事業の承継に伴って個人情報が提供される場合</Text>

          {/* Section 4 */}
          <Text style={styles.sectionTitle}>4. 個人情報の共同利用</Text>
          <Text style={styles.paragraph}>
            当社は、本サービスに関連して取得した個人情報を、特定の範囲で共同利用することがあります。共同利用する個人情報の項目、共同利用者の範囲、共同利用の目的、管理責任者については、別途公表または個別の通知にて明確化いたします。
          </Text>

          {/* Section 5 */}
          <Text style={styles.sectionTitle}>5. 個人情報の安全管理</Text>
          <Text style={styles.paragraph}>
            当社は、収集した個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
          </Text>

          {/* Section 6 */}
          <Text style={styles.sectionTitle}>6. 個人情報の開示、訂正、利用停止等</Text>
          <Text style={styles.paragraph}>
            利用者は、当社が保有する自己の個人情報について、開示、訂正、追加、削除、利用停止、消去、第三者提供の停止等の請求をすることができます。
          </Text>
          <Text style={styles.paragraph}>
            これらの請求を行う場合は、第9条に記載の問い合わせ窓口までご連絡ください。請求が利用ご本人からであることを確認できた場合に限り、法令の定めに従って適切に対応いたします。
          </Text>

          {/* Section 7 */}
          <Text style={styles.sectionTitle}>7. Cookie（クッキー）その他の技術の利用</Text>
          <Text style={styles.paragraph}>
            本サービスは、Cookieおよびこれに類する技術を利用することがあります。これらの技術は、利用者の利便性向上、サービス改善、統計データ取得などに役立ちます。利用者は、ブラウザの設定によりCookieの受け入れを拒否することも可能ですが、その場合、本サービスの一部機能が利用できなくなる場合があります。
          </Text>

          {/* Section 8 */}
          <Text style={styles.sectionTitle}>8. プライバシーポリシーの変更</Text>
          <Text style={styles.paragraph}>
            当社は、必要に応じて本ポリシーの内容を改定する場合があります。変更後の本ポリシーは、当社ウェブサイトに掲載された時点から効力を生じるものとします。変更後の本ポリシーが適用される前に、利用者に適切な方法で通知または公表するものとします。
          </Text>

          {/* Section 9 */}
          <Text style={styles.sectionTitle}>9. お問い合わせ窓口</Text>
          <Text style={styles.paragraph}>
            本ポリシーに関するお問い合わせ、個人情報の取扱いに関するご相談は、以下の窓口までご連絡ください。
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>株式会社[運営会社名]</Text>
            <Text style={styles.contactItem}>Poconest 個人情報保護担当</Text>
            <Text style={styles.contactItem}>メールアドレス：[サポートメールアドレス]</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerDate}>2025年6月12日 制定</Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'var(--bg-secondary)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border-primary)',
    zIndex: 10,
  },
  headerMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'var(--bg-tertiary)',
  },
  backButtonText: {
    fontSize: 14,
    color: 'var(--text-primary)',
    fontWeight: '500',
    fontFamily: 'var(--font-family-text)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'var(--text-primary)',
    textAlign: 'center',
    fontFamily: 'var(--font-family-text)',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
  },
  contentContainer: {
    paddingBottom: 80,
  },
  content: {
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  contentMobile: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'var(--text-primary)',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'var(--font-family-text)',
    background: 'linear-gradient(135deg, var(--primary-green) 0%, var(--primary-blue) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  } as any,
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: 'var(--text-secondary)',
    marginBottom: 24,
    fontFamily: 'var(--font-family-text)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'var(--primary-green)',
    marginTop: 32,
    marginBottom: 16,
    fontFamily: 'var(--font-family-text)',
    borderBottomWidth: 1,
    borderBottomColor: 'var(--border-primary)',
    paddingBottom: 8,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'var(--primary-blue)',
    marginTop: 20,
    marginBottom: 12,
    fontFamily: 'var(--font-family-text)',
  },
  listItem: {
    fontSize: 16,
    lineHeight: 26,
    color: 'var(--text-secondary)',
    marginBottom: 12,
    paddingLeft: 4,
    fontFamily: 'var(--font-family-text)',
  },
  listItemBold: {
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  contactInfo: {
    backgroundColor: 'var(--bg-secondary)',
    padding: 20,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'var(--primary-green)',
    borderWidth: 1,
    borderColor: 'var(--border-primary)',
  },
  contactItem: {
    fontSize: 16,
    color: 'var(--text-secondary)',
    marginBottom: 8,
    fontFamily: 'var(--font-family-mono)',
  },
  footer: {
    marginTop: 60,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'var(--border-primary)',
    alignItems: 'center',
  },
  footerDate: {
    fontSize: 14,
    color: 'var(--text-muted)',
    marginBottom: 8,
    fontFamily: 'var(--font-family-mono)',
  },
});

export default PrivacyPolicyScreen; 