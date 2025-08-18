// Speaker Analysis Service - フロントエンド AI分析機能
import { supabase } from './supabase/client';

export interface SpeakerData {
  id: string;
  speaker_tag: number;
  name: string;
  total_time: string;
  word_count: number;
}

export interface UtteranceData {
  id: string;
  speaker_tag: number;
  word: string;
  start_time: number;
  end_time: number;
  confidence: number;
  start_time_raw: string;
  end_time_raw: string;
}

export interface EmotionAnalysisResult {
  speakerId: number;
  speakerName: string;
  emotionalEvents: {
    timeRange: [number, number];
    emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'neutral' | 'anxiety';
    intensity: number;
    triggerText: string;
    insight: string;
  }[];
  emotionalTimeline: {
    time: number;
    emotion: string;
    intensity: number;
  }[];
  overallEmotionalProfile: {
    dominantEmotion: string;
    emotionalStability: number;
    authenticityScore: number;
    insight: string;
  };
}

export interface PatternAnalysisResult {
  speakerId: number;
  speakerName: string;
  repetitiveExpressions: {
    expression: string;
    frequency: number;
    contexts: string[];
    insight: string;
  }[];
  speechPatterns: {
    averageUtteranceLength: number;
    pauseFrequency: number;
    hesitationMarkers: {
      marker: string;
      frequency: number;
      contexts: string[];
    }[];
  };
  linguisticHabits: {
    fillerWords: string[];
    preferredTransitions: string[];
    emotionalTriggerWords: string[];
  };
  temporalPatterns: {
    speakingRhythm: 'fast' | 'moderate' | 'slow' | 'variable';
    energyLevels: {
      time: number;
      energy: number;
    }[];
  };
}

export interface DiscourseAnalysisResult {
  speakerId: number;
  speakerName: string;
  discourseType: 'master' | 'university' | 'hysteric' | 'analyst';
  discourseAnalysis: {
    dominantPosition: string;
    subjectStructure: string;
    desireDirection: string;
    jouissanceMode: string;
  };
  unconsciousStructure: {
    primaryDesire: string;
    lacanianalySubject: string;
    objectA: string;
    symbolicOrder: string;
    realEncounters: string;
  };
  linguisticAnalysis: {
    signifierChains: string;
    unconsciousFormations: string;
    silenceAndPauses: string;
    rhetoricalStructure: string;
  };
  discourseShifts: {
    time: number;
    fromType: string;
    toType: string;
    triggerEvent: string;
    psychoanalyticSignificance: string;
    subjectiveEffect: string;
  }[];
  clinicalInsights: {
    symptomaticManifestations: string;
    defenseMechanisms: string;
    transferenceDynamics: string;
    therapeuticImplications: string;
  };
}

export interface SpeakerAnalysisStoredResult {
  id: string;
  meeting_id: string;
  analysis_type: 'emotion' | 'pattern' | 'discourse' | 'insights';
  speaker_id?: number;
  analysis_data: any;
  metadata: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SpeakerInsightNote {
  id: string;
  meeting_id: string;
  speaker_id?: number;
  note_title?: string;
  note_content: string;
  note_tags: string[];
  is_hypothesis: boolean;
  confidence_level?: number;
  related_timerange?: [number, number];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export class SpeakerAnalysisService {
  private static readonly AI_CONFIG = {
    openai: {
      model: 'gpt-4',
      maxTokens: 4000
    },
    gemini: {
      model: 'gemini-2.0-flash',
      maxTokens: 8000
    }
  };

  /**
   * 話者データと発言データを取得
   */
  static async getSpeakerAndUtteranceData(meetingId: string): Promise<{
    speakers: SpeakerData[];
    utterances: UtteranceData[];
  }> {
    try {
      // 話者データを取得
      const { data: speakers, error: speakersError } = await supabase
        .from('meeting_speakers')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('speaker_tag');

      if (speakersError) {
        throw new Error(`話者データ取得エラー: ${speakersError.message}`);
      }

      // 発言データを取得
      const { data: utterances, error: utterancesError } = await supabase
        .from('meeting_utterances')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('start_time');

      if (utterancesError) {
        throw new Error(`発言データ取得エラー: ${utterancesError.message}`);
      }

      return {
        speakers: speakers || [],
        utterances: utterances || []
      };
    } catch (error) {
      console.error('データ取得エラー:', error);
      throw error;
    }
  }

  /**
   * AI設定を取得
   */
  private static async getAISettings(nestId?: string): Promise<{
    provider: 'openai' | 'gemini';
    apiKey: string;
    model: string;
  }> {
    // 環境変数から設定を取得（複数の環境変数形式をサポート）
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || 
                      process.env.REACT_APP_OPENAI_API_KEY || 
                      process.env.OPENAI_API_KEY;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || 
                      process.env.REACT_APP_GEMINI_API_KEY || 
                      process.env.GEMINI_API_KEY;

    console.log(`[SpeakerAnalysisService] APIキー確認 - OpenAI: ${!!openaiKey} (${openaiKey?.length || 0}文字), Gemini: ${!!geminiKey} (${geminiKey?.length || 0}文字)`);

    if (geminiKey) {
      return {
        provider: 'gemini',
        apiKey: geminiKey,
        model: this.AI_CONFIG.gemini.model
      };
    } else if (openaiKey) {
      return {
        provider: 'openai',
        apiKey: openaiKey,
        model: this.AI_CONFIG.openai.model
      };
    } else {
      // デバッグ用環境変数情報（ビルド時エラー回避のため詳細ログを簡略化）
      console.error('[SpeakerAnalysisService] AI APIキーが見つかりません');
      throw new Error('AI APIキーが設定されていません。VITE_OPENAI_API_KEY または VITE_GEMINI_API_KEY を設定してください。');
    }
  }

  /**
   * OpenAI API呼び出し
   */
  private static async callOpenAI(prompt: string, apiKey: string, model: string = 'gpt-4'): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'あなたは心理学とディスクール分析の専門家です。話者の発言から深層心理を分析してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.AI_CONFIG.openai.maxTokens,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API エラー: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Gemini API呼び出し
   */
  private static async callGemini(prompt: string, apiKey: string, model: string = 'gemini-2.0-flash'): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: this.AI_CONFIG.gemini.maxTokens,
          temperature: 0.7
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API エラー: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * パターン分析の実行
   */
  static async performPatternAnalysis(
    meetingId: string,
    speakerId?: number,
    nestId?: string
  ): Promise<PatternAnalysisResult[]> {
    try {
      console.log('[SpeakerAnalysisService] パターン分析開始:', { meetingId, speakerId });

      // データ取得
      const { speakers, utterances } = await this.getSpeakerAndUtteranceData(meetingId);
      
      // AI設定取得
      const aiSettings = await this.getAISettings(nestId);

      // 分析対象の話者を決定
      const targetSpeakers = speakerId 
        ? speakers.filter(s => s.speaker_tag === speakerId)
        : speakers;

      const results: PatternAnalysisResult[] = [];

      for (const speaker of targetSpeakers) {
        // 該当話者の発言を取得
        const speakerUtterances = utterances.filter(u => u.speaker_tag === speaker.speaker_tag);
        
        if (speakerUtterances.length === 0) continue;

        // プロンプト作成
        const prompt = this.createPatternAnalysisPrompt(speaker, speakerUtterances);

        // AI分析実行
        let response: string;
        if (aiSettings.provider === 'openai') {
          response = await this.callOpenAI(prompt, aiSettings.apiKey, aiSettings.model);
        } else {
          response = await this.callGemini(prompt, aiSettings.apiKey, aiSettings.model);
        }

        // 結果を解析してデータ構造に変換
        const analysisResult = this.parsePatternAnalysisResponse(response, speaker);
        results.push(analysisResult);
      }

      console.log('[SpeakerAnalysisService] パターン分析完了:', results.length, '名の話者');
      return results;

    } catch (error) {
      console.error('[SpeakerAnalysisService] パターン分析エラー:', error);
      throw error;
    }
  }

  /**
   * ディスクール分析の実行
   */
  static async performDiscourseAnalysis(
    meetingId: string,
    speakerId?: number,
    nestId?: string
  ): Promise<DiscourseAnalysisResult[]> {
    try {
      console.log('[SpeakerAnalysisService] ディスクール分析開始:', { meetingId, speakerId });

      // データ取得
      const { speakers, utterances } = await this.getSpeakerAndUtteranceData(meetingId);
      
      // AI設定取得
      const aiSettings = await this.getAISettings(nestId);

      // 分析対象の話者を決定
      const targetSpeakers = speakerId 
        ? speakers.filter(s => s.speaker_tag === speakerId)
        : speakers;

      const results: DiscourseAnalysisResult[] = [];

      for (const speaker of targetSpeakers) {
        // 該当話者の発言を取得
        const speakerUtterances = utterances.filter(u => u.speaker_tag === speaker.speaker_tag);
        
        if (speakerUtterances.length === 0) continue;

        // プロンプト作成（他の話者との関係性も考慮）
        const prompt = this.createDiscourseAnalysisPrompt(speaker, speakerUtterances, speakers, utterances);

        // AI分析実行
        let response: string;
        if (aiSettings.provider === 'openai') {
          response = await this.callOpenAI(prompt, aiSettings.apiKey, aiSettings.model);
        } else {
          response = await this.callGemini(prompt, aiSettings.apiKey, aiSettings.model);
        }

        // 結果を解析してデータ構造に変換
        const analysisResult = this.parseDiscourseAnalysisResponse(response, speaker);
        results.push(analysisResult);
      }

      console.log('[SpeakerAnalysisService] ディスクール分析完了:', results.length, '名の話者');
      return results;

    } catch (error) {
      console.error('[SpeakerAnalysisService] ディスクール分析エラー:', error);
      throw error;
    }
  }

  /**
   * 感情分析の実行
   */
  static async performEmotionAnalysis(
    meetingId: string,
    speakerId?: number,
    nestId?: string
  ): Promise<EmotionAnalysisResult[]> {
    try {
      console.log('[SpeakerAnalysisService] 感情分析開始:', { meetingId, speakerId });

      // データ取得
      const { speakers, utterances } = await this.getSpeakerAndUtteranceData(meetingId);
      
      // AI設定取得
      const aiSettings = await this.getAISettings(nestId);

      // 分析対象の話者を決定
      const targetSpeakers = speakerId 
        ? speakers.filter(s => s.speaker_tag === speakerId)
        : speakers;

      const results: EmotionAnalysisResult[] = [];

      for (const speaker of targetSpeakers) {
        // 該当話者の発言を取得
        const speakerUtterances = utterances.filter(u => u.speaker_tag === speaker.speaker_tag);
        
        if (speakerUtterances.length === 0) continue;

        // プロンプト作成
        const prompt = this.createEmotionAnalysisPrompt(speaker, speakerUtterances);

        // AI分析実行
        let response: string;
        if (aiSettings.provider === 'openai') {
          response = await this.callOpenAI(prompt, aiSettings.apiKey, aiSettings.model);
        } else {
          response = await this.callGemini(prompt, aiSettings.apiKey, aiSettings.model);
        }

        // 結果を解析してデータ構造に変換
        const analysisResult = this.parseEmotionAnalysisResponse(response, speaker);
        results.push(analysisResult);
      }

      console.log('[SpeakerAnalysisService] 感情分析完了:', results.length, '名の話者');
      return results;

    } catch (error) {
      console.error('[SpeakerAnalysisService] 感情分析エラー:', error);
      throw error;
    }
  }

  /**
   * 感情分析用プロンプト作成
   */
  private static createEmotionAnalysisPrompt(speaker: SpeakerData, utterances: UtteranceData[]): string {
    const utteranceTexts = utterances.map(u => 
      `${Math.floor(u.start_time / 60)}:${String(u.start_time % 60).padStart(2, '0')} - ${u.word}`
    ).join('\n');

    return `
以下は話者${speaker.speaker_tag}（${speaker.name}）の発言データです。この話者の感情分析を実行してください。

【発言データ】
${utteranceTexts}

【分析観点】
1. 感情の変化パターン（時系列での感情の起伏）
2. 感情的な瞬間の特定（喜び、悲しみ、怒り、不安など）
3. 表面的な発言と真の感情のギャップ
4. 感情の抑制や投影のパターン
5. 全体的な感情プロファイル

【出力形式】
以下のJSON形式で回答してください：

{
  "emotionalEvents": [
    {
      "timeRange": [開始秒, 終了秒],
      "emotion": "joy|sadness|anger|fear|neutral|anxiety",
      "intensity": 0.8,
      "triggerText": "該当する発言テキスト",
      "insight": "この感情変化の心理的背景"
    }
  ],
  "emotionalTimeline": [
    {
      "time": 秒数,
      "emotion": "感情名",
      "intensity": 0.7
    }
  ],
  "overallEmotionalProfile": {
    "dominantEmotion": "主要な感情",
    "emotionalStability": 0.6,
    "authenticityScore": 0.8,
    "insight": "全体的な感情的特徴の洞察"
  }
}
`;
  }

  /**
   * パターン分析用プロンプト作成
   */
  private static createPatternAnalysisPrompt(speaker: SpeakerData, utterances: UtteranceData[]): string {
    const utteranceTexts = utterances.map(u => 
      `${Math.floor(u.start_time / 60)}:${String(u.start_time % 60).padStart(2, '0')} - ${u.word}`
    ).join('\n');

    return `
以下は話者${speaker.speaker_tag}（${speaker.name}）の発言データです。この話者の言語パターン分析を実行してください。

【発言データ】
${utteranceTexts}

【分析観点】
1. 反復表現・口癖の特定
2. 発言パターン（長さ、間隔、リズム）
3. 言語的癖・習慣の分析
4. ためらい・フィラーワードの使用傾向
5. 時間的なエネルギーレベルの変化

【出力形式】
以下のJSON形式で回答してください：

{
  "repetitiveExpressions": [
    {
      "expression": "よく使う表現",
      "frequency": 回数,
      "contexts": ["使用される文脈1", "文脈2"],
      "insight": "この表現が示す心理的背景"
    }
  ],
  "speechPatterns": {
    "averageUtteranceLength": 平均発言長,
    "pauseFrequency": 間の頻度,
    "hesitationMarkers": [
      {
        "marker": "えー",
        "frequency": 回数,
        "contexts": ["使用される文脈"]
      }
    ]
  },
  "linguisticHabits": {
    "fillerWords": ["えー", "あの", "まあ"],
    "preferredTransitions": ["それで", "でも", "だから"],
    "emotionalTriggerWords": ["不安を示す単語", "興奮を示す単語"]
  },
  "temporalPatterns": {
    "speakingRhythm": "fast|moderate|slow|variable",
    "energyLevels": [
      {
        "time": 分単位の時刻,
        "energy": 0.0-1.0のエネルギーレベル
      }
    ]
  }
}
`;
  }

  /**
   * ディスクール分析用プロンプト作成（ラカン理論に基づく深層分析）
   */
  private static createDiscourseAnalysisPrompt(
    speaker: SpeakerData, 
    utterances: UtteranceData[], 
    allSpeakers: SpeakerData[], 
    allUtterances: UtteranceData[]
  ): string {
    const speakerTexts = utterances.map(u => 
      `${Math.floor(u.start_time / 60)}:${String(u.start_time % 60).padStart(2, '0')} - ${u.word}`
    ).join('\n');

    // 会話の構造的な流れを分析用に構築
    const conversationFlow = allUtterances
      .sort((a, b) => a.start_time - b.start_time)
      .slice(0, 100) // より多くの文脈を提供
      .map(u => {
        const speakerName = allSpeakers.find(s => s.speaker_tag === u.speaker_tag)?.name || `話者${u.speaker_tag}`;
        return `${speakerName}: ${u.word}`;
      }).join('\n');

    return `
あなたはラカン派精神分析の専門家です。以下の会話データから話者${speaker.speaker_tag}（${speaker.name}）の無意識の構造を分析してください。

【重要な理論的背景】
ラカンによれば「無意識は言語のように構造化されている」「欲望とは他者の欲望である」です。
ディスクールは単なる言葉ではなく、主体の欲望と享楽の構造、他者との関係性を規定する象徴的秩序です。

【対象話者の全発言】
${speakerTexts}

【会話全体の流れ（他者との関係性理解用）】
${conversationFlow}

【ラカンの四つのディスクール構造】

1. **主人のディスクール** (S1 → S2)
   - 特徴: 権威的命令、支配的立場、「私が決める」
   - 主体位置: 支配者、決定者
   - 他者への要求: 従属、実行
   - 享楽の位置: 権力の行使
   - 言語的特徴: 断定的、命令調、責任の所在の明確化

2. **大学のディスクール** (S2 → a)
   - 特徴: 知識の伝達、教育的態度、「これが正しい」
   - 主体位置: 教える者、専門家
   - 他者への要求: 学習、理解
   - 享楽の位置: 知識の独占
   - 言語的特徴: 説明調、論理的、客観性の装い

3. **ヒステリーのディスクール** ($ → S1)
   - 特徴: 質問、疑問、欲望の表出、「本当はどうなの？」
   - 主体位置: 分裂した主体、探求者
   - 他者への要求: 答え、承認、愛
   - 享楽の位置: 満たされない欲望
   - 言語的特徴: 疑問文、感情的、不満の表出

4. **分析家のディスクール** (a → $)
   - 特徴: 聞き手、促進、気づきの誘発、「あなたはどう思う？」
   - 主体位置: 対象aの位置、欲望の原因
   - 他者への要求: 自己分析、主体化
   - 享楽の位置: 抑制された享楽
   - 言語的特徴: 質問調、間接的、沈黙の活用

【分析の観点】

**1. 象徴的位置の特定**
- この話者は会話においてどの象徴的位置を占めているか？
- 他者をどの位置に置こうとしているか？

**2. 欲望の構造**
- 話者の欲望は何に向けられているか？（他者の欲望としての欲望）
- 欲望の原因（対象a）は何か？
- どのような欠如（$）を埋めようとしているか？

**3. 享楽の様式**
- どのような享楽を求めているか？
- 享楽の禁止や制限はどこに現れているか？

**4. 言語の使用法**
- シニフィアンの連鎖はどのように機能しているか？
- 沈黙、言い淀み、反復はどこに現れるか？
- 無意識の形成物（症状、夢、失言）の痕跡はあるか？

**5. 他者との関係性**
- 大他者（象徴的秩序）との関係はどうか？
- 小他者（具体的な他者）との関係はどうか？
- 転移の構造は見られるか？

【出力形式】
以下のJSON形式で分析結果を出力してください：

{
  "discourseType": "master|university|hysteric|analyst",
  "discourseAnalysis": {
    "dominantPosition": "この話者の主要な象徴的位置",
    "subjectStructure": "主体の構造（統一的/分裂的/神経症的など）",
    "desireDirection": "欲望の方向性と対象",
    "jouissanceMode": "享楽の様式と特徴"
  },
  "unconsciousStructure": {
    "primaryDesire": "根本的欲望（他者の欲望として）",
    "lacanianalySubject": "ラカン的主体の状態（$の現れ方）",
    "objectA": "対象aの機能（欲望の原因）",
    "symbolicOrder": "象徴的秩序との関係",
    "realEncounters": "現実界との遭遇（享楽、トラウマ等）"
  },
  "linguisticAnalysis": {
    "signifierChains": "重要なシニフィアンの連鎖",
    "unconsciousFormations": "無意識の形成物（反復、言い間違い等）",
    "silenceAndPauses": "沈黙と間の意味",
    "rhetoricalStructure": "修辞的構造の特徴"
  },
  "discourseShifts": [
    {
      "time": 変化時刻（分）,
      "fromType": "変化前のディスクール",
      "toType": "変化後のディスクール",
      "triggerEvent": "変化のきっかけとなった他者の発言や状況",
      "psychoanalyticSignificance": "この変化のラカン的意味（欲望・享楽の観点から）",
      "subjectiveEffect": "主体に与えた効果"
    }
  ],
  "clinicalInsights": {
    "symptomaticManifestations": "症状的現れ",
    "defenseMechanisms": "防衛機制",
    "transferenceDynamics": "転移の力動",
    "therapeuticImplications": "治療的含意"
  }
}

【注意事項】
- 表面的な言葉ではなく、言語に構造化された無意識を読み取ってください
- 欲望は常に「他者の欲望」として現れることを念頭に置いてください
- ディスクールの変化は、主体の無意識的構造の変化を示します
- 症状は無意識の真理の現れとして捉えてください
`;
  }

  /**
   * パターン分析レスポンスの解析
   */
  private static parsePatternAnalysisResponse(response: string, speaker: SpeakerData): PatternAnalysisResult {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);
      
      if (!jsonMatch) {
        throw new Error('JSON形式のレスポンスが見つかりません');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        repetitiveExpressions: parsed.repetitiveExpressions || [],
        speechPatterns: parsed.speechPatterns || {
          averageUtteranceLength: 0,
          pauseFrequency: 0,
          hesitationMarkers: []
        },
        linguisticHabits: parsed.linguisticHabits || {
          fillerWords: [],
          preferredTransitions: [],
          emotionalTriggerWords: []
        },
        temporalPatterns: parsed.temporalPatterns || {
          speakingRhythm: 'moderate',
          energyLevels: []
        }
      };
    } catch (error) {
      console.error('パターン分析レスポンス解析エラー:', error);
      
      // フォールバック結果
      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        repetitiveExpressions: [],
        speechPatterns: {
          averageUtteranceLength: 0,
          pauseFrequency: 0,
          hesitationMarkers: []
        },
        linguisticHabits: {
          fillerWords: [],
          preferredTransitions: [],
          emotionalTriggerWords: []
        },
        temporalPatterns: {
          speakingRhythm: 'moderate',
          energyLevels: []
        }
      };
    }
  }

  /**
   * ディスクール分析レスポンスの解析（改良版）
   */
  private static parseDiscourseAnalysisResponse(response: string, speaker: SpeakerData): DiscourseAnalysisResult {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);
      
      if (!jsonMatch) {
        throw new Error('JSON形式のレスポンスが見つかりません');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        discourseType: parsed.discourseType || 'university',
        discourseAnalysis: parsed.discourseAnalysis || {
          dominantPosition: '分析データ不足',
          subjectStructure: '特定困難',
          desireDirection: '不明',
          jouissanceMode: '分析失敗'
        },
        unconsciousStructure: parsed.unconsciousStructure || {
          primaryDesire: '特定困難',
          lacanianalySubject: '分析データ不足',
          objectA: '不明',
          symbolicOrder: '分析失敗',
          realEncounters: '検出されず'
        },
        linguisticAnalysis: parsed.linguisticAnalysis || {
          signifierChains: '分析データ不足',
          unconsciousFormations: '検出されず',
          silenceAndPauses: '分析失敗',
          rhetoricalStructure: '特定困難'
        },
        discourseShifts: parsed.discourseShifts || [],
        clinicalInsights: parsed.clinicalInsights || {
          symptomaticManifestations: '特定困難',
          defenseMechanisms: '分析データ不足',
          transferenceDynamics: '検出されず',
          therapeuticImplications: '分析失敗'
        }
      };
    } catch (error) {
      console.error('ディスクール分析レスポンス解析エラー:', error);
      
      // フォールバック結果
      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        discourseType: 'university',
        discourseAnalysis: {
          dominantPosition: '分析に失敗しました',
          subjectStructure: 'エラー',
          desireDirection: 'エラー',
          jouissanceMode: 'エラー'
        },
        unconsciousStructure: {
          primaryDesire: '分析失敗',
          lacanianalySubject: 'エラー',
          objectA: 'エラー',
          symbolicOrder: 'エラー',
          realEncounters: 'エラー'
        },
        linguisticAnalysis: {
          signifierChains: 'エラー',
          unconsciousFormations: 'エラー',
          silenceAndPauses: 'エラー',
          rhetoricalStructure: 'エラー'
        },
        discourseShifts: [],
        clinicalInsights: {
          symptomaticManifestations: 'エラー',
          defenseMechanisms: 'エラー',
          transferenceDynamics: 'エラー',
          therapeuticImplications: 'エラー'
        }
      };
    }
  }

  /**
   * 感情分析レスポンスの解析
   */
  private static parseEmotionAnalysisResponse(response: string, speaker: SpeakerData): EmotionAnalysisResult {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/(\{[\s\S]*\})/);
      
      if (!jsonMatch) {
        throw new Error('JSON形式のレスポンスが見つかりません');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        emotionalEvents: parsed.emotionalEvents || [],
        emotionalTimeline: parsed.emotionalTimeline || [],
        overallEmotionalProfile: parsed.overallEmotionalProfile || {
          dominantEmotion: 'neutral',
          emotionalStability: 0.5,
          authenticityScore: 0.5,
          insight: '分析データ不足'
        }
      };
    } catch (error) {
      console.error('感情分析レスポンス解析エラー:', error);
      
      // フォールバック結果
      return {
        speakerId: speaker.speaker_tag,
        speakerName: speaker.name,
        emotionalEvents: [],
        emotionalTimeline: [],
        overallEmotionalProfile: {
          dominantEmotion: 'neutral',
          emotionalStability: 0.5,
          authenticityScore: 0.5,
          insight: '分析に失敗しました'
        }
      };
    }
  }

  /**
   * 分析結果を保存
   */
  static async saveAnalysisResult(
    meetingId: string,
    analysisType: 'emotion' | 'pattern' | 'discourse' | 'insights',
    analysisData: any,
    speakerId?: number,
    metadata?: any
  ): Promise<SpeakerAnalysisStoredResult> {
    try {
      console.log('[SpeakerAnalysisService] 分析結果保存開始:', { meetingId, analysisType, speakerId });

      const { data, error } = await supabase
        .from('speaker_analysis_results')
        .upsert({
          meeting_id: meetingId,
          analysis_type: analysisType,
          speaker_id: speakerId,
          analysis_data: analysisData,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) {
        throw new Error(`分析結果保存エラー: ${error.message}`);
      }

      console.log('[SpeakerAnalysisService] 分析結果保存完了:', data.id);
      return data;
    } catch (error) {
      console.error('[SpeakerAnalysisService] 分析結果保存エラー:', error);
      throw error;
    }
  }

  /**
   * 保存済み分析結果を取得
   */
  static async getStoredAnalysisResults(
    meetingId: string,
    analysisType?: 'emotion' | 'pattern' | 'discourse' | 'insights',
    speakerId?: number
  ): Promise<SpeakerAnalysisStoredResult[]> {
    try {
      let query = supabase
        .from('speaker_analysis_results')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (analysisType) {
        query = query.eq('analysis_type', analysisType);
      }

      if (speakerId !== undefined) {
        query = query.eq('speaker_id', speakerId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`分析結果取得エラー: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[SpeakerAnalysisService] 分析結果取得エラー:', error);
      throw error;
    }
  }

  /**
   * 洞察メモを保存
   */
  static async saveInsightNote(
    meetingId: string,
    noteContent: string,
    options: {
      speakerId?: number;
      noteTitle?: string;
      noteTags?: string[];
      isHypothesis?: boolean;
      confidenceLevel?: number;
      relatedTimerange?: [number, number];
    } = {}
  ): Promise<SpeakerInsightNote> {
    try {
      console.log('[SpeakerAnalysisService] 洞察メモ保存開始:', { meetingId, noteContent: noteContent.slice(0, 50) + '...' });

      const { data, error } = await supabase
        .from('speaker_insights_notes')
        .insert({
          meeting_id: meetingId,
          speaker_id: options.speakerId,
          note_title: options.noteTitle,
          note_content: noteContent,
          note_tags: options.noteTags || [],
          is_hypothesis: options.isHypothesis || false,
          confidence_level: options.confidenceLevel,
          related_timerange: options.relatedTimerange
        })
        .select()
        .single();

      if (error) {
        throw new Error(`洞察メモ保存エラー: ${error.message}`);
      }

      console.log('[SpeakerAnalysisService] 洞察メモ保存完了:', data.id);
      return data;
    } catch (error) {
      console.error('[SpeakerAnalysisService] 洞察メモ保存エラー:', error);
      throw error;
    }
  }

  /**
   * 洞察メモを取得
   */
  static async getInsightNotes(
    meetingId: string,
    speakerId?: number
  ): Promise<SpeakerInsightNote[]> {
    try {
      let query = supabase
        .from('speaker_insights_notes')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (speakerId !== undefined) {
        query = query.eq('speaker_id', speakerId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`洞察メモ取得エラー: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('[SpeakerAnalysisService] 洞察メモ取得エラー:', error);
      throw error;
    }
  }

  /**
   * 洞察メモを更新
   */
  static async updateInsightNote(
    noteId: string,
    updates: {
      noteTitle?: string;
      noteContent?: string;
      noteTags?: string[];
      isHypothesis?: boolean;
      confidenceLevel?: number;
      relatedTimerange?: [number, number];
    }
  ): Promise<SpeakerInsightNote> {
    try {
      const updateData: any = {};
      
      if (updates.noteTitle !== undefined) updateData.note_title = updates.noteTitle;
      if (updates.noteContent !== undefined) updateData.note_content = updates.noteContent;
      if (updates.noteTags !== undefined) updateData.note_tags = updates.noteTags;
      if (updates.isHypothesis !== undefined) updateData.is_hypothesis = updates.isHypothesis;
      if (updates.confidenceLevel !== undefined) updateData.confidence_level = updates.confidenceLevel;
      if (updates.relatedTimerange !== undefined) updateData.related_timerange = updates.relatedTimerange;

      const { data, error } = await supabase
        .from('speaker_insights_notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) {
        throw new Error(`洞察メモ更新エラー: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('[SpeakerAnalysisService] 洞察メモ更新エラー:', error);
      throw error;
    }
  }

  /**
   * 洞察メモを削除
   */
  static async deleteInsightNote(noteId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('speaker_insights_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        throw new Error(`洞察メモ削除エラー: ${error.message}`);
      }

      console.log('[SpeakerAnalysisService] 洞察メモ削除完了:', noteId);
    } catch (error) {
      console.error('[SpeakerAnalysisService] 洞察メモ削除エラー:', error);
      throw error;
    }
  }
}

export default SpeakerAnalysisService;
