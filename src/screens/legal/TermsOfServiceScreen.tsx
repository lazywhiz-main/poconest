import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useNavigate } from 'react-router-dom';
import theme from '../../styles/theme';

const TermsOfServiceScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.content, isMobile && styles.contentMobile]}>
          
          {/* Title */}
          <Text style={styles.title}>Poconest 利用規約</Text>
          
          {/* Introduction */}
          <Text style={styles.paragraph}>
            本利用規約（以下「本規約」といいます）は、株式会社[運営会社名]（以下「当社」といいます）が提供する「Poconest」（以下「本サービス」といいます）の利用に関する条件を定めるものです。本サービスをご利用になるすべてのユーザー（以下「利用者」といいます）は、本規約に同意の上、本サービスをご利用ください。
          </Text>

          {/* Article 1 */}
          <Text style={styles.articleTitle}>第1条（本規約への同意）</Text>
          <Text style={styles.articleItem}>1. 利用者は、本規約に従って本サービスを利用するものとします。</Text>
          <Text style={styles.articleItem}>2. 利用者は、本サービスを実際に利用することにより本規約に同意したものとみなされます。</Text>
          <Text style={styles.articleItem}>3. 本規約の内容と、本規約外における本サービスの説明等が異なる場合は、本規約の規定が優先して適用されるものとします。</Text>

          {/* Article 2 */}
          <Text style={styles.articleTitle}>第2条（本サービスの概要）</Text>
          <Text style={styles.paragraph}>
            本サービスは、チャットやミーティングログなどのフロー情報から、AIが意味の塊を抽出し、カードとして構造化・可視化、さらにノードとして関係性を分析・クラスタリングすることで、組織内の知識を体系化・共有するサービスです。
          </Text>

          {/* Article 3 */}
          <Text style={styles.articleTitle}>第3条（利用登録）</Text>
          <Text style={styles.articleItem}>1. 本サービスの利用を希望する者は、本規約を遵守することに同意し、当社の定める方法により利用登録を行うものとします。</Text>
          <Text style={styles.articleItem}>2. 当社は、以下のいずれかの事由があると判断した場合、利用登録の申請を承認しないことがあります。</Text>
          <Text style={styles.subItem}>• 利用登録の申請に際して虚偽の情報を届け出た場合</Text>
          <Text style={styles.subItem}>• 過去に本規約に違反したことがある者からの申請である場合</Text>
          <Text style={styles.subItem}>• その他、当社が利用登録を相当でないと判断した場合</Text>
          <Text style={styles.articleItem}>3. 利用者は、登録情報に変更があった場合、遅滞なく当社所定の方法により変更の届け出を行うものとします。</Text>

          {/* Article 4 */}
          <Text style={styles.articleTitle}>第4条（アカウントの管理）</Text>
          <Text style={styles.articleItem}>1. 利用者は、自己の責任において本サービスのアカウント情報（ID、パスワード等を含みます）を適切に管理するものとします。</Text>
          <Text style={styles.articleItem}>2. 利用者は、アカウント情報を第三者に利用させ、または貸与、譲渡、名義変更、売買等をしてはならないものとします。</Text>
          <Text style={styles.articleItem}>3. アカウント情報の管理不十分、使用上の過誤、第三者の使用等によって生じた損害に関する責任は、利用者が負うものとし、当社は一切の責任を負いません。</Text>

          {/* Article 5 */}
          <Text style={styles.articleTitle}>第5条（利用料金および支払方法）</Text>
          <Text style={styles.articleItem}>1. 利用者は、本サービス利用の対価として、別途当社が定める料金プランに応じた利用料金を、当社が指定する方法により支払うものとします。</Text>
          <Text style={styles.articleItem}>2. 利用者が利用料金の支払いを遅滞した場合、利用者は年14.6%の割合による遅延損害金を当社に支払うものとします。</Text>

          {/* Article 6 */}
          <Text style={styles.articleTitle}>第6条（利用者コンテンツの取り扱い）</Text>
          <Text style={styles.articleItem}>1. 利用者は、本サービスを通じてアップロードまたは生成するコンテンツ（チャットログ、議事録、生成されたカード情報など、以下「利用者コンテンツ」といいます）について、自らが適法な権利を有していること、および利用者コンテンツが第三者の権利を侵害していないことを当社に対し保証するものとします。</Text>
          <Text style={styles.articleItem}>2. 利用者は、当社が本サービスの運営、改善、品質向上、新規サービス開発、および統計データの作成のために、利用者コンテンツ（ただし、個人を特定できない形に匿名化されたものに限ります）を利用することに同意するものとします。</Text>
          <Text style={styles.articleItem}>3. 当社は、利用者コンテンツの適法性、正確性、完全性等について、いかなる保証も行いません。</Text>
          <Text style={styles.articleItem}>4. 当社は、利用者コンテンツが本規約に違反する場合、またはそのおそれがある場合、その他当社が必要と判断した場合、事前に利用者に通知することなく、当該利用者コンテンツの削除、公開範囲の変更その他の必要な措置を講じることができるものとします。</Text>

          {/* Article 7 */}
          <Text style={styles.articleTitle}>第7条（禁止事項）</Text>
          <Text style={styles.paragraph}>利用者は、本サービスの利用にあたり、以下の行為を行ってはならないものとします。</Text>
          <Text style={styles.articleItem}>1. 法令または公序良俗に違反する行為</Text>
          <Text style={styles.articleItem}>2. 犯罪行為に関連する行為</Text>
          <Text style={styles.articleItem}>3. 当社または第三者の知的財産権、肖像権、プライバシーの権利、名誉その他の権利または利益を侵害する行為</Text>
          <Text style={styles.articleItem}>4. 本サービスの運営を妨害するおそれのある行為</Text>
          <Text style={styles.articleItem}>5. 本サービスを商業目的で利用する行為（当社が事前に承諾した場合を除きます）</Text>
          <Text style={styles.articleItem}>6. 虚偽の情報を登録する行為</Text>
          <Text style={styles.articleItem}>7. 不正アクセスまたはこれを試みる行為</Text>
          <Text style={styles.articleItem}>8. 他の利用者に関する個人情報等を収集または蓄積する行為</Text>
          <Text style={styles.articleItem}>9. 本サービスを通じて入手した情報を、本サービスの利用目的の範囲を超えて利用する行為</Text>
          <Text style={styles.articleItem}>10. コンピューター・ウィルスその他の有害なプログラムを含む情報を送信する行為</Text>
          <Text style={styles.articleItem}>11. 本サービスを、差別、ハラスメント、虚偽情報の拡散、他者の権利侵害、その他社会的に不適切なコンテンツ生成に利用する行為</Text>
          <Text style={styles.articleItem}>12. 本サービスのAIモデル、学習データ、または本サービスに利用されている技術について、リバースエンジニアリング、逆コンパイル、逆アセンブル等を行う行為、その他解析、複製、二次利用を試みる行為</Text>
          <Text style={styles.articleItem}>13. 本規約に違反する行為</Text>
          <Text style={styles.articleItem}>14. その他、当社が不適切と判断する行為</Text>

          {/* Article 8 */}
          <Text style={styles.articleTitle}>第8条（本サービスの提供の停止等）</Text>
          <Text style={styles.articleItem}>1. 当社は、以下のいずれかの事由があると判断した場合、利用者に事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。</Text>
          <Text style={styles.subItem}>• 本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</Text>
          <Text style={styles.subItem}>• 地震、落雷、火災、風水害、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</Text>
          <Text style={styles.subItem}>• コンピュータまたは通信回線等が事故により停止した場合、サイバー攻撃、予期せぬシステム障害その他緊急の必要が生じた場合</Text>
          <Text style={styles.subItem}>• その他、当社が本サービスの提供が困難と判断した場合</Text>
          <Text style={styles.articleItem}>2. 当社は、本条に基づき当社が行った措置により利用者に生じた損害について、一切の責任を負いません。</Text>

          {/* Continue with remaining articles... */}
          <Text style={styles.articleTitle}>第9条（著作権、商標権等）</Text>
          <Text style={styles.articleItem}>1. 本サービスに関する著作権、特許権、商標権その他一切の知的財産権は、当社または当社にライセンスを許諾している者に帰属します。</Text>
          <Text style={styles.articleItem}>2. 本規約に基づく本サービスの利用許諾は、本サービスに関する当社の知的財産権の利用許諾を意味するものではありません。</Text>

          <Text style={styles.articleTitle}>第10条（保証の否認および免責事項）</Text>
          <Text style={styles.articleItem}>1. 当社は、本サービスが利用者の特定の目的に適合すること、期待する機能・正確性・有用性・完全性を有すること、利用者に不具合が生じないこと、および本サービスの継続的運用について、何ら保証するものではありません。</Text>
          <Text style={styles.articleItem}>2. 当社は、本サービスに関連して利用者に生じた損害について、当社の故意または重大な過失による場合を除き、一切の責任を負いません。</Text>
          <Text style={styles.articleItem}>3. 当社は、本サービスに関して、利用者と他の利用者または第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</Text>
          <Text style={styles.articleItem}>4. 当社が責任を負う場合であっても、当社の責任は、損害発生の直近12ヶ月間に利用者が当社に支払った利用料金の総額を上限とします。</Text>
          <Text style={styles.articleItem}>5. 当社は、本サービスにより生成されるカード情報、分析結果、クラスタリング結果その他AIによる出力内容について、その正確性、完全性、有用性、利用結果の適切性等を保証するものではなく、利用者はこれらの情報を自己の責任と判断において利用するものとします。</Text>

          <Text style={styles.articleTitle}>第11条（サービス内容の変更等）</Text>
          <Text style={styles.paragraph}>
            当社は、利用者に通知することなく、本サービスの内容を変更し、または本サービスの提供を中止することができるものとし、これによって利用者に生じた損害について一切の責任を負いません。
          </Text>

          <Text style={styles.articleTitle}>第12条（サービス終了時のデータ取り扱い）</Text>
          <Text style={styles.articleItem}>1. 利用者が本サービスの利用を終了した場合、または当社が本サービスの提供を終了した場合、利用者は当社が利用者コンテンツを保持する義務を負わないことに同意するものとします。</Text>
          <Text style={styles.articleItem}>2. 当社は、利用者が本サービスの利用を終了した時点から、当社の定める一定期間経過後に利用者コンテンツを削除できるものとし、利用者は予めこれに同意するものとします。ただし、法令に基づく義務がある場合を除きます。</Text>

          <Text style={styles.articleTitle}>第13条（利用規約の変更）</Text>
          <Text style={styles.paragraph}>
            当社は、必要と判断した場合には、利用者に通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本ウェブサイトに掲載された時点から効力を生じるものとします。利用者は、本規約変更後も本サービスを利用し続けることにより、変更後の本規約に同意したものとみなされます。
          </Text>

          <Text style={styles.articleTitle}>第14条（準拠法・裁判管轄）</Text>
          <Text style={styles.articleItem}>1. 本規約の解釈にあたっては、日本法を準拠法とします。</Text>
          <Text style={styles.articleItem}>2. 本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する地方裁判所を第一審の専属的合意管轄裁判所とします。</Text>

          <Text style={styles.articleTitle}>第15条（連絡方法）</Text>
          <Text style={styles.paragraph}>
            本サービスに関するお問い合わせその他利用者から当社への連絡、および当社から利用者への連絡は、当社のウェブサイトに設けるお問い合わせフォーム、または別途当社が指定するメールアドレスにより行うものとします。
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerDate}>2025年6月12日 制定</Text>
            <Text style={styles.footerCompany}>株式会社[運営会社名]</Text>
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
  articleTitle: {
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
  articleItem: {
    fontSize: 16,
    lineHeight: 26,
    color: 'var(--text-secondary)',
    marginBottom: 12,
    fontFamily: 'var(--font-family-text)',
  },
  subItem: {
    fontSize: 15,
    lineHeight: 24,
    color: 'var(--text-muted)',
    marginLeft: 16,
    marginBottom: 8,
    fontFamily: 'var(--font-family-text)',
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
  footerCompany: {
    fontSize: 14,
    color: 'var(--text-muted)',
    fontWeight: '500',
    fontFamily: 'var(--font-family-mono)',
  },
});

export default TermsOfServiceScreen; 