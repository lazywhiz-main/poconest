export type TargetType = 'ux-researcher' | 'product-manager' | 'startup-founder' | 'default';

export interface TargetContent {
  hero: {
    headline: string;
    subtext: string;
    ctaText: string;
  };
  problems: string[];
  solutions: string[];
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  socialProof: {
    testimonial: string;
    author: string;
    company: string;
  }[];
  pricing: {
    emphasis: string;
    ctaText: string;
  };
}

export const targetingConfig: Record<TargetType, TargetContent> = {
  'ux-researcher': {
    hero: {
      headline: '散らばったユーザーの声を、データドリブンな洞察に',
      subtext: 'UXリサーチの価値を最大化する、AI支援プラットフォーム。インタビューやフィードバックから、組織全体で活用できる構造化された洞察を自動生成。',
      ctaText: 'リサーチデモを見る'
    },
    problems: [
      'ユーザーインタビューの分析に膨大な時間がかかる',
      'ステークホルダーへの説得力のある報告資料作成が困難',
      '過去のリサーチ資産が埋もれて活用されていない',
      '定性データからの洞察抽出が属人的になっている'
    ],
    solutions: [
      'AIが自動でインタビューデータを構造化・パターン抽出',
      '洞察の可視化機能で説得力の高いレポート自動生成',
      '過去のリサーチ資産を検索・関連付けできる知識ベース',
      'チーム全体でリサーチ洞察を蓄積・共有できるプラットフォーム'
    ],
    features: [
      {
        title: '自動洞察抽出',
        description: 'ユーザーインタビューやフィードバックから、AIが重要なパターンや洞察を自動抽出',
        icon: '🧠'
      },
      {
        title: '関係性可視化',
        description: 'ユーザーニーズ間の関係性や優先度を視覚的に整理・分析',
        icon: '🔗'
      },
      {
        title: '洞察ライブラリ',
        description: '組織全体でリサーチ洞察を蓄積・検索・再利用できる知識ベース',
        icon: '📚'
      }
    ],
    socialProof: [
      {
        testimonial: '3時間かかっていたインタビュー分析が30分に短縮。しかも洞察の質が向上しました。',
        author: '田中 美咲',
        company: 'TechCorp UXリサーチャー'
      },
      {
        testimonial: 'ステークホルダーへの報告で、データに基づいた説得力のある提案ができるようになりました。',
        author: '佐藤 健二',
        company: 'StartupXYZ シニアUXR'
      }
    ],
    pricing: {
      emphasis: 'リサーチ効率を10倍に',
      ctaText: '無料トライアルを開始'
    }
  },
  'product-manager': {
    hero: {
      headline: '顧客の真のニーズを、戦略に変える',
      subtext: 'プロダクト判断の精度を高める洞察プラットフォーム。顧客フィードバックから戦略的示唆を抽出し、データドリブンなロードマップ策定を支援。',
      ctaText: 'プロダクトデモを見る'
    },
    problems: [
      '機能要求の背景にある本質的ニーズが見えない',
      'ロードマップの優先順位付けが属人的になっている',
      'ステークホルダーとの合意形成に時間がかかりすぎる',
      '顧客フィードバックの戦略的活用ができていない'
    ],
    solutions: [
      'AIが顧客の声から真のニーズとビジネス価値を抽出',
      'データに基づく機能優先順位付けと影響度分析',
      '洞察の可視化による迅速な合意形成支援',
      '戦略レベルでの示唆を自動生成するインサイトエンジン'
    ],
    features: [
      {
        title: 'ニーズ分析',
        description: '顧客フィードバックから本質的なニーズとビジネス価値を自動抽出',
        icon: '🎯'
      },
      {
        title: '優先度分析',
        description: '機能要求の影響度とROIを分析し、データドリブンな優先順位付けを支援',
        icon: '📊'
      },
      {
        title: '戦略ダッシュボード',
        description: 'プロダクト戦略に直結する洞察を集約したエグゼクティブビュー',
        icon: '🎛️'
      }
    ],
    socialProof: [
      {
        testimonial: 'ロードマップの意思決定スピードが3倍向上。しかも精度も格段に上がりました。',
        author: '山田 直樹',
        company: 'GrowthCorp プロダクトマネージャー'
      }
    ],
    pricing: {
      emphasis: 'プロダクト成功率を向上',
      ctaText: '戦略デモを体験'
    }
  },
  'startup-founder': {
    hero: {
      headline: 'チームの知恵を、成長の原動力に',
      subtext: 'スケールしても失わない洞察力。組織の集合知を可視化し、迅速かつ質の高い意思決定を支援するプラットフォーム。',
      ctaText: '成長デモを見る'
    },
    problems: [
      '組織拡大に伴い知識・文化が希薄化している',
      '意思決定スピードと質のバランスが取れない',
      '投資家・ボードへの報告で洞察の言語化が困難',
      'チームの暗黙知が属人化してリスクになっている'
    ],
    solutions: [
      '組織の集合知を可視化・体系化するプラットフォーム',
      'AIによる迅速かつ質の高い意思決定支援',
      '投資家向け洞察レポートの自動生成機能',
      'スケーラブルな知識共有・継承システム'
    ],
    features: [
      {
        title: '組織知可視化',
        description: 'チーム全体の知識・経験を構造化し、組織の集合知として活用',
        icon: '🏢'
      },
      {
        title: '意思決定支援',
        description: '過去の経験と現在のデータを組み合わせた戦略的示唆を提供',
        icon: '⚡'
      },
      {
        title: '成長分析',
        description: '組織の成長パターンと成功要因を分析・予測するダッシュボード',
        icon: '📈'
      }
    ],
    socialProof: [
      {
        testimonial: 'チームが30名に拡大しても、創業期の洞察力を維持できています。',
        author: '鈴木 太郎',
        company: 'InnovateJP CEO'
      }
    ],
    pricing: {
      emphasis: '組織の成長を加速',
      ctaText: 'エンタープライズ相談'
    }
  },
  'default': {
    hero: {
      headline: '散らばったユーザーの声を、データドリブンな洞察に',
      subtext: 'UXリサーチの価値を最大化する、AI支援プラットフォーム。インタビューやフィードバックから、組織全体で活用できる構造化された洞察を自動生成。',
      ctaText: 'デモを体験'
    },
    problems: [
      'ユーザーインタビューの分析に膨大な時間がかかる',
      'ステークホルダーへの説得力のある報告資料作成が困難',
      '過去のリサーチ資産が埋もれて活用されていない',
      '定性データからの洞察抽出が属人的になっている'
    ],
    solutions: [
      'AIが自動でインタビューデータを構造化・パターン抽出',
      '洞察の可視化機能で説得力の高いレポート自動生成',
      '過去のリサーチ資産を検索・関連付けできる知識ベース',
      'チーム全体でリサーチ洞察を蓄積・共有できるプラットフォーム'
    ],
    features: [
      {
        title: '自動洞察抽出',
        description: 'ユーザーインタビューやフィードバックから、AIが重要なパターンや洞察を自動抽出',
        icon: '🧠'
      },
      {
        title: '関係性可視化',
        description: 'ユーザーニーズ間の関係性や優先度を視覚的に整理・分析',
        icon: '🔗'
      },
      {
        title: '洞察ライブラリ',
        description: '組織全体でリサーチ洞察を蓄積・検索・再利用できる知識ベース',
        icon: '📚'
      }
    ],
    socialProof: [
      {
        testimonial: '3時間かかっていたインタビュー分析が30分に短縮。しかも洞察の質が向上しました。',
        author: '田中 美咲',
        company: 'TechCorp UXリサーチャー'
      }
    ],
    pricing: {
      emphasis: 'リサーチ効率を10倍に',
      ctaText: '無料トライアルを開始'
    }
  }
}; 