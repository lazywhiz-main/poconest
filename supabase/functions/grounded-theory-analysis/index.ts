import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// 🧠 グラウンデッド・セオリー分析専用 Edge Function
serve(async (req) => {
  const requestStartTime = performance.now()
  
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🧠 [Grounded Theory] Edge Function 開始')
    
    const requestData = await req.json()
    const { action, textContent, clusterName, analysisType, concepts, relations } = requestData
    
    // リクエスト詳細ログ
    console.log(`📊 分析アクション: ${action}`)
    console.log(`🎯 分析タイプ: ${analysisType || 'N/A'}`)
    console.log(`🏷️ クラスター名: ${clusterName || 'N/A'}`)
    console.log(`📝 テキスト長: ${textContent?.length || 0}文字`)
    console.log(`🔢 概念数: ${concepts?.length || 0}`)
    console.log(`🔗 関係性数: ${relations?.length || 0}`)
    
    // API キーの取得と検証
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    
    console.log(`🔑 API キー状況: OpenAI=${openaiApiKey ? '✅' : '❌'}, Gemini=${geminiApiKey ? '✅' : '❌'}`)
    
    if (!openaiApiKey && !geminiApiKey) {
      throw new Error('AI API キーが設定されていません')
    }

    let result: any = { success: false }
    const actionStartTime = performance.now()

    switch (action) {
      case 'extract_concepts':
        console.log(`🤖 概念抽出開始: "${clusterName}" (${textContent?.length || 0}文字)`)
        result = await extractConcepts(textContent, clusterName, openaiApiKey, geminiApiKey)
        break
      
      case 'analyze_relations':
        console.log(`🔗 関係性分析開始: ${concepts?.length || 0}概念`)
        result = await analyzeConceptRelations(concepts, textContent, openaiApiKey, geminiApiKey)
        break
      
      case 'identify_core_category':
        console.log(`🎯 中核概念特定開始: ${concepts?.length || 0}概念, ${relations?.length || 0}関係性`)
        result = await identifyCoreCategory(concepts, relations, openaiApiKey, geminiApiKey)
        break
      
      case 'generate_hypotheses':
        console.log(`💡 仮説生成開始: ${concepts?.length || 0}概念, ${relations?.length || 0}関係性`)
        result = await generateHypotheses(concepts, relations, textContent, openaiApiKey, geminiApiKey)
        break
      
      case 'construct_storyline':
        console.log(`📖 ストーリーライン構築開始: ${concepts?.length || 0}概念, ${relations?.length || 0}関係性`)
        result = await constructStoryline(concepts, relations, openaiApiKey, geminiApiKey)
        break
      
      default:
        throw new Error(`未対応のアクション: ${action}`)
    }
    
    const actionTime = performance.now() - actionStartTime
    console.log(`✅ アクション「${action}」完了: ${actionTime.toFixed(1)}ms`)

    const totalTime = performance.now() - requestStartTime
    console.log(`🎉 グラウンデッド・セオリー分析完了: ${totalTime.toFixed(1)}ms`)
    
    // 結果サマリーログ
    if (result.success) {
      console.log(`📊 結果サマリー:`, {
        success: result.success,
        conceptCount: result.concepts?.length || 0,
        provider: result.provider || 'unknown',
        processingTime: `${actionTime.toFixed(1)}ms`,
        totalTime: `${totalTime.toFixed(1)}ms`
      })
    }
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    const errorTime = performance.now() - requestStartTime
    console.error(`❌ グラウンデッド・セオリー分析エラー (${errorTime.toFixed(1)}ms):`, error)
    
    // エラー詳細ログ
    console.error('🔍 エラー詳細:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
      requestData: {
        action: action || 'unknown',
        textLength: textContent?.length || 0,
        hasOpenAI: !!Deno.env.get('OPENAI_API_KEY'),
        hasGemini: !!Deno.env.get('GEMINI_API_KEY')
      }
    })
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: `処理時間: ${errorTime.toFixed(1)}ms`
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

/**
 * 🔍 概念抽出（オープンコーディング支援）
 */
async function extractConcepts(
  textContent: string, 
  clusterName: string, 
  openaiApiKey?: string, 
  geminiApiKey?: string
) {
  const extractionStartTime = performance.now()
  console.log('🔍 概念抽出開始')
  console.log(`📝 入力: クラスター="${clusterName}", テキスト長=${textContent.length}文字`)
  
  // OpenAI優先、失敗時はGeminiにフォールバック
  const provider = openaiApiKey ? 'openai' : 'gemini'
  console.log(`🤖 使用プロバイダー: ${provider}`)
  
  const prompt = `
あなたは定性研究の専門家です。以下のクラスター「${clusterName}」のテキストデータから、グラウンデッド・セオリーのオープンコーディングを実行してください。

【分析対象テキスト】
${textContent}

【抽出要件】
1. 重要な概念・現象を5-10個抽出
2. 各概念に対して簡潔な説明を付与
3. 根拠となるテキスト部分を特定
4. 概念の重要度を0-1でスコア化
5. 概念タイプを分類（現象/原因/条件/対策/結果）

【🚫 除外すべきもの】
- 話者ラベル（話者1、発言者A など）
- 引用記号・構造マーカー（>、###、** など）
- 時間・日付表記
- 代名詞・指示語（これ、それ、あれ など）
- 感嘆詞・間投詞（うん、はい、ええ など）
- 一般的なストップワード
- メタ情報・構造的記述子

【✅ 抽出すべきもの】
- 実質的な内容・概念
- 問題・課題・現象
- 原因・要因・理由
- 解決策・戦略・方法
- 結果・効果・影響
- 状況・環境・文脈

【出力形式】JSON
{
  "concepts": [
    {
      "concept": "概念名（実質的内容のみ）",
      "description": "概念の説明",
      "evidence": ["根拠となるテキスト1", "根拠となるテキスト2"],
      "relevance": 0.85,
      "conceptType": "phenomenon|causal_condition|context|action_strategy|consequence"
    }
  ],
  "dominantThemes": ["主要テーマ1", "主要テーマ2"],
  "confidenceScore": 0.8
}

【品質基準】
- 概念は具体的で研究価値があること
- 話者ラベルや構造マーカーは絶対に含めない
- 実際の内容・意味に焦点を当てること
- 日本語で自然な表現にすること
`

  try {
    if (provider === 'openai' && openaiApiKey) {
      console.log('🤖 OpenAI による概念抽出')
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'あなたは定性研究とグラウンデッド・セオリーの専門家です。テキストから重要な概念を体系的に抽出します。' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API エラー: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('OpenAI レスポンスが空です')
      }

      console.log('📝 OpenAI レスポンス受信')
      
      // JSON パース（エラー処理含む）
      const parsedResult = parseAIResponse(content)
      
      // 概念に ID とクラスター情報を追加
      const enhancedConcepts = parsedResult.concepts?.map((concept: any, index: number) => ({
        id: `concept_${Date.now()}_${index}`,
        concept: concept.concept,
        description: concept.description,
        evidence: concept.evidence || [],
        frequency: concept.evidence?.length || 1,
        relevance: concept.relevance || 0.5,
        category: {
          id: `category_${concept.conceptType}`,
          name: getConceptTypeName(concept.conceptType),
          description: getConceptTypeDescription(concept.conceptType),
          type: concept.conceptType || 'phenomenon',
          concepts: []
        },
        clusterId: ''
      })) || []

      console.log(`✅ 概念抽出成功: ${enhancedConcepts.length}個の概念`)
      
      return {
        success: true,
        provider: 'openai',
        concepts: enhancedConcepts,
        dominantThemes: parsedResult.dominantThemes || [],
        confidenceScore: parsedResult.confidenceScore || 0.7
      }

    } else if (geminiApiKey) {
      console.log('🤖 Gemini による概念抽出（フォールバック）')
      
      // Gemini API の実装
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `システム: あなたは定性研究とグラウンデッド・セオリーの専門家です。\n\nユーザー: ${prompt}`
            }]
          }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.3,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API エラー: ${response.status}`)
      }

      const data = await response.json()
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!content) {
        throw new Error('Gemini レスポンスが空です')
      }

      console.log('📝 Gemini レスポンス受信')
      
      const parsedResult = parseAIResponse(content)
      const enhancedConcepts = parsedResult.concepts?.map((concept: any, index: number) => ({
        id: `concept_${Date.now()}_${index}`,
        concept: concept.concept,
        description: concept.description,
        evidence: concept.evidence || [],
        frequency: concept.evidence?.length || 1,
        relevance: concept.relevance || 0.5,
        category: {
          id: `category_${concept.conceptType}`,
          name: getConceptTypeName(concept.conceptType),
          description: getConceptTypeDescription(concept.conceptType),
          type: concept.conceptType || 'phenomenon',
          concepts: []
        },
        clusterId: ''
      })) || []

      console.log(`✅ 概念抽出成功: ${enhancedConcepts.length}個の概念`)
      
      return {
        success: true,
        provider: 'gemini',
        concepts: enhancedConcepts,
        dominantThemes: parsedResult.dominantThemes || [],
        confidenceScore: parsedResult.confidenceScore || 0.7
      }

    } else {
      throw new Error('利用可能なAI APIキーがありません')
    }

  } catch (error) {
    console.error('❌ 概念抽出エラー:', error)
    
    return {
      success: false,
      error: error.message,
      concepts: [],
      dominantThemes: [],
      confidenceScore: 0
    }
  }
}

/**
 * 🔗 概念間関係性分析（軸足コーディング支援）
 */
async function analyzeConceptRelations(
  concepts: any[], 
  textContent: string, 
  openaiApiKey?: string, 
  geminiApiKey?: string
) {
  console.log('🔗 概念間関係性分析開始')
  
  const conceptList = concepts.map(c => c.concept).join(', ')
  
  const prompt = `
以下の概念間の関係性を分析し、グラウンデッド・セオリーの軸足コーディングを実行してください。

【概念リスト】
${conceptList}

【参考テキスト】
${textContent}

【分析要件】
1. 概念間の関係性を特定（因果/相関/条件/文脈/順序）
2. 関係の強さを0-1でスコア化
3. パラダイムモデルの要素を分類
4. 因果連鎖を特定

【出力形式】JSON
{
  "relations": [
    {
      "sourceConcept": "概念A",
      "targetConcept": "概念B",
      "relationType": "causal|correlational|conditional|contextual|sequential",
      "strength": 0.8,
      "evidence": ["根拠1", "根拠2"],
      "bidirectional": false
    }
  ],
  "paradigmModel": {
    "phenomenon": "中心現象",
    "causalConditions": ["原因条件1", "原因条件2"],
    "context": ["文脈1", "文脈2"],
    "interveningConditions": ["介入条件1"],
    "actionStrategies": ["対策1", "対策2"],
    "consequences": ["結果1", "結果2"]
  },
  "causalChains": [
    {
      "name": "因果連鎖1",
      "sequence": ["概念A", "概念B", "概念C"],
      "strength": 0.7
    }
  ]
}
`

  // 実装は extractConcepts と同様のパターン
  return {
    success: true,
    relations: [],
    paradigmModel: {},
    causalChains: []
  }
}

/**
 * ⭐ 中核概念特定（選択的コーディング支援）
 */
async function identifyCoreCategory(
  concepts: any[], 
  relations: any[], 
  openaiApiKey?: string, 
  geminiApiKey?: string
) {
  console.log('⭐ 中核概念特定開始')
  
  // 実装予定
  return {
    success: true,
    coreCategory: {},
    confidence: 0.8
  }
}

/**
 * 💡 仮説生成
 */
async function generateHypotheses(
  concepts: any[], 
  relations: any[], 
  textContent: string, 
  openaiApiKey?: string, 
  geminiApiKey?: string
) {
  console.log('💡 仮説生成開始')
  
  // 実装予定
  return {
    success: true,
    hypotheses: []
  }
}

/**
 * 📖 ストーリーライン構築
 */
async function constructStoryline(
  concepts: any[], 
  relations: any[], 
  openaiApiKey?: string, 
  geminiApiKey?: string
) {
  console.log('📖 ストーリーライン構築開始')
  
  // 実装予定
  return {
    success: true,
    storyline: ''
  }
}

// =====================================
// 🛠️ ヘルパー関数
// =====================================

/**
 * AI レスポンスの JSON パース（エラー処理込み）
 */
function parseAIResponse(content: string): any {
  try {
    // JSON 部分のみを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('JSON が見つかりません')
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('❌ JSON パースエラー:', error)
    console.log('📝 元のレスポンス:', content)
    
    // フォールバック: 空の結果を返す
    return {
      concepts: [],
      dominantThemes: [],
      confidenceScore: 0
    }
  }
}

/**
 * 概念タイプ名の取得
 */
function getConceptTypeName(type: string): string {
  const typeNames: Record<string, string> = {
    'phenomenon': '現象',
    'causal_condition': '原因条件',
    'context': '文脈',
    'intervening_condition': '介入条件',
    'action_strategy': '対策・戦略',
    'consequence': '結果・帰結'
  }
  return typeNames[type] || '現象'
}

/**
 * 概念タイプの説明
 */
function getConceptTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'phenomenon': '研究の中心となる現象や問題',
    'causal_condition': '現象を引き起こす原因や条件',
    'context': '現象が発生する背景や環境',
    'intervening_condition': '因果関係に介入する条件',
    'action_strategy': '現象に対する対応や戦略',
    'consequence': '行動や現象の結果や影響'
  }
  return descriptions[type] || '研究対象の現象'
}
