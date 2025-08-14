/**
 * Relations生成パラメータ管理サービス
 * ハードコードされた値を集約管理し、動的調整を可能にする
 */

export interface RelationsParameters {
  ai: {
    minSimilarity: number;
    maxSuggestions: number;
    confidence: number;
  };
  tagSimilarity: {
    minCommonTags: number;
    minSimilarity: number;
    maxSuggestions: number;
  };
  derived: {
    temporalProximityHours: number;
    maxSameCreatorPairs: number;
    contentSimilarityThreshold: number;
  };
  unified: {
    minOverallScore: number;
    minConfidence: number;
    minSemanticScore: number;
    maxRelationsPerBoard: number;
  };
  quality: {
    strengthThreshold: number;
    confidenceThreshold: number;
    diversityWeight: number;
  };
}

export type AnalysisMode = 'conservative' | 'balanced' | 'aggressive' | 'custom';

export class RelationsParameterManager {
  
  /**
   * Auto Layout用の固定配置領域サイズ
   * 初期表示と Auto Layout で一貫した広がりを確保
   */
  static readonly LAYOUT_AREA = {
    width: 6000,
    height: 4500
  } as const;
  
  /**
   * 事前定義されたパラメータプリセット
   */
  private static readonly PRESETS: Record<AnalysisMode, RelationsParameters> = {
    conservative: {
      ai: {
        minSimilarity: 0.7,
        maxSuggestions: 10,
        confidence: 0.8
      },
      tagSimilarity: {
        minCommonTags: 2,
        minSimilarity: 0.6,
        maxSuggestions: 15
      },
      derived: {
        temporalProximityHours: 24,
        maxSameCreatorPairs: 5,
        contentSimilarityThreshold: 0.7
      },
      unified: {
        minOverallScore: 0.4,
        minConfidence: 0.8,
        minSemanticScore: 0.3,
        maxRelationsPerBoard: 50
      },
      quality: {
        strengthThreshold: 0.6,
        confidenceThreshold: 0.7,
        diversityWeight: 0.3
      }
    },
    
    balanced: {
      ai: {
        minSimilarity: 0.5,
        maxSuggestions: 25,
        confidence: 0.7
      },
      tagSimilarity: {
        minCommonTags: 1,
        minSimilarity: 0.4,
        maxSuggestions: 30
      },
      derived: {
        temporalProximityHours: 48,
        maxSameCreatorPairs: 10,
        contentSimilarityThreshold: 0.5
      },
      unified: {
        minOverallScore: 0.25,
        minConfidence: 0.7,
        minSemanticScore: 0.2,
        maxRelationsPerBoard: 100
      },
      quality: {
        strengthThreshold: 0.4,
        confidenceThreshold: 0.6,
        diversityWeight: 0.4
      }
    },
    
    aggressive: {
      ai: {
        minSimilarity: 0.3,
        maxSuggestions: 50,
        confidence: 0.6
      },
      tagSimilarity: {
        minCommonTags: 1,
        minSimilarity: 0.3,
        maxSuggestions: 50
      },
      derived: {
        temporalProximityHours: 72,
        maxSameCreatorPairs: 20,
        contentSimilarityThreshold: 0.3
      },
      unified: {
        minOverallScore: 0.15,
        minConfidence: 0.6,
        minSemanticScore: 0.1,
        maxRelationsPerBoard: 200
      },
      quality: {
        strengthThreshold: 0.3,
        confidenceThreshold: 0.5,
        diversityWeight: 0.5
      }
    },
    
    custom: {
      ai: {
        minSimilarity: 0.2,  // 現在のUnified設定
        maxSuggestions: 100,
        confidence: 0.7
      },
      tagSimilarity: {
        minCommonTags: 1,
        minSimilarity: 0.4,
        maxSuggestions: 30
      },
      derived: {
        temporalProximityHours: 48,
        maxSameCreatorPairs: 10,
        contentSimilarityThreshold: 0.5
      },
      unified: {
        minOverallScore: 0.2,  // 現在の設定
        minConfidence: 0.7,
        minSemanticScore: 0.12,
        maxRelationsPerBoard: 1000  // 事実上無制限
      },
      quality: {
        strengthThreshold: 0.4,
        confidenceThreshold: 0.6,
        diversityWeight: 0.4
      }
    }
  };

  /**
   * 現在のパラメータ設定（デフォルト：balanced）
   */
  private static currentParameters: RelationsParameters = this.PRESETS.balanced;
  private static currentMode: AnalysisMode = 'balanced';

  /**
   * パラメータモードを設定
   */
  static setMode(mode: AnalysisMode): void {
    this.currentMode = mode;
    this.currentParameters = { ...this.PRESETS[mode] };
    console.log(`🎛️ [RelationsParameterManager] Mode set to: ${mode}`, this.currentParameters);
  }

  /**
   * 現在のパラメータを取得
   */
  static getParameters(): RelationsParameters {
    return { ...this.currentParameters };
  }

  /**
   * 現在のモードを取得
   */
  static getCurrentMode(): AnalysisMode {
    return this.currentMode;
  }

  /**
   * AI分析用パラメータを取得
   */
  static getAIParameters(): { minSimilarity: number; maxSuggestions: number; confidence: number } {
    return { ...this.currentParameters.ai };
  }

  /**
   * 統合分析用パラメータを取得
   */
  static getUnifiedParameters(): {
    minOverallScore: number;
    minConfidence: number;
    minSemanticScore: number;
    maxRelationsPerBoard: number;
  } {
    return { ...this.currentParameters.unified };
  }

  /**
   * タグ類似性用パラメータを取得
   */
  static getTagSimilarityParameters(): {
    minCommonTags: number;
    minSimilarity: number;
    maxSuggestions: number;
  } {
    return { ...this.currentParameters.tagSimilarity };
  }

  /**
   * 推論関係性用パラメータを取得
   */
  static getDerivedParameters(): {
    temporalProximityHours: number;
    maxSameCreatorPairs: number;
    contentSimilarityThreshold: number;
  } {
    return { ...this.currentParameters.derived };
  }

  /**
   * 動的パラメータ調整（ネットワーク特性に基づく）
   */
  static adjustParametersForNetwork(networkStats: {
    nodeCount: number;
    connectionRatio: number;
    averageConnections: number;
    density: number;
  }): RelationsParameters {
    const base = { ...this.currentParameters };
    
    // ノード数に応じた調整
    if (networkStats.nodeCount > 200) {
      // 大規模ネットワーク：より厳格に
      base.ai.minSimilarity = Math.min(base.ai.minSimilarity + 0.1, 0.8);
      base.unified.minOverallScore = Math.min(base.unified.minOverallScore + 0.05, 0.5);
    } else if (networkStats.nodeCount < 50) {
      // 小規模ネットワーク：より寛容に
      base.ai.minSimilarity = Math.max(base.ai.minSimilarity - 0.1, 0.2);
      base.unified.minOverallScore = Math.max(base.unified.minOverallScore - 0.05, 0.15);
    }
    
    // 接続密度に応じた調整
    if (networkStats.connectionRatio > 0.8) {
      // 高密度：新規関係性を制限
      base.ai.maxSuggestions = Math.floor(base.ai.maxSuggestions * 0.7);
      base.unified.maxRelationsPerBoard = Math.floor(base.unified.maxRelationsPerBoard * 0.8);
    } else if (networkStats.connectionRatio < 0.3) {
      // 低密度：より多くの関係性を推奨
      base.ai.maxSuggestions = Math.floor(base.ai.maxSuggestions * 1.5);
      base.unified.maxRelationsPerBoard = Math.floor(base.unified.maxRelationsPerBoard * 1.2);
    }
    
    console.log(`🎯 [RelationsParameterManager] Network-adjusted parameters:`, {
      original: this.currentParameters,
      adjusted: base,
      reason: `nodes: ${networkStats.nodeCount}, connection: ${(networkStats.connectionRatio * 100).toFixed(1)}%`
    });
    
    return base;
  }

  /**
   * カスタムパラメータを個別設定
   */
  static updateParameter<T extends keyof RelationsParameters, K extends keyof RelationsParameters[T]>(
    category: T,
    key: K,
    value: RelationsParameters[T][K]
  ): void {
    this.currentParameters[category][key] = value;
    this.currentMode = 'custom';
    console.log(`🔧 [RelationsParameterManager] Updated ${category}.${String(key)} = ${value}`);
  }

  /**
   * パラメータをリセット
   */
  static reset(mode: AnalysisMode = 'balanced'): void {
    this.setMode(mode);
  }

  /**
   * 現在の設定を保存
   */
  static saveToLocalStorage(): void {
    try {
      localStorage.setItem('poconest_relations_parameters', JSON.stringify({
        mode: this.currentMode,
        parameters: this.currentParameters
      }));
      console.log(`💾 [RelationsParameterManager] Parameters saved to localStorage`);
    } catch (error) {
      console.warn(`⚠️ [RelationsParameterManager] Failed to save parameters:`, error);
    }
  }

  /**
   * 保存された設定を読み込み
   */
  static loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('poconest_relations_parameters');
      if (saved) {
        const { mode, parameters } = JSON.parse(saved);
        this.currentMode = mode;
        this.currentParameters = parameters;
        console.log(`📂 [RelationsParameterManager] Parameters loaded from localStorage:`, mode);
      }
    } catch (error) {
      console.warn(`⚠️ [RelationsParameterManager] Failed to load parameters, using defaults:`, error);
      this.reset();
    }
  }

  /**
   * 設定の妥当性チェック
   */
  static validateParameters(params: RelationsParameters): boolean {
    try {
      // 基本的な範囲チェック
      if (params.ai.minSimilarity < 0 || params.ai.minSimilarity > 1) return false;
      if (params.ai.maxSuggestions < 1 || params.ai.maxSuggestions > 1000) return false;
      if (params.unified.minOverallScore < 0 || params.unified.minOverallScore > 1) return false;
      
      return true;
    } catch (error) {
      console.error(`❌ [RelationsParameterManager] Parameter validation failed:`, error);
      return false;
    }
  }
}
