import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callOpenAI(prompt: string, model: string = 'gpt-4o', maxTokens: number = 8192) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[speaker-diarization] OpenAI API Error:', errorData);
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(prompt: string, model: string = 'gemini-2.0-flash', maxTokens: number = 200000) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
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
        maxOutputTokens: maxTokens,
        temperature: 0.7
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[speaker-diarization] Gemini API Error:', errorData);
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// 時間形式を数値（秒）に変換する関数（複数フォーマット対応）
function timeStringToSeconds(timeString: string): number {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  // 文字列をトリム
  const trimmed = timeString.trim();
  
  // 既に数値の場合（秒として扱う）
  if (!isNaN(Number(trimmed))) {
    return Math.floor(Number(trimmed));
  }
  
  // コロン区切りの時間形式
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    
    if (parts.length === 2) {
      // mm:ss 形式
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        return minutes * 60 + seconds;
      }
    } else if (parts.length === 3) {
      // hh:mm:ss 形式
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseInt(parts[2], 10);
      if (!isNaN(hours) && !isNaN(minutes) && !isNaN(seconds)) {
        return hours * 3600 + minutes * 60 + seconds;
      }
    }
  }
  
  // "X分Y秒" 形式
  const jpMinSecMatch = trimmed.match(/(\d+)分(\d+)秒/);
  if (jpMinSecMatch) {
    const minutes = parseInt(jpMinSecMatch[1], 10);
    const seconds = parseInt(jpMinSecMatch[2], 10);
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds;
    }
  }
  
  // "Xmin Ysec" 形式
  const engMinSecMatch = trimmed.match(/(\d+)min\s*(\d+)sec/);
  if (engMinSecMatch) {
    const minutes = parseInt(engMinSecMatch[1], 10);
    const seconds = parseInt(engMinSecMatch[2], 10);
    if (!isNaN(minutes) && !isNaN(seconds)) {
      return minutes * 60 + seconds;
    }
  }
  
  // 時間変換失敗時のログを簡潔化
  console.warn(`[speaker-diarization] ⚠️ 時間変換失敗: "${timeString}"`);
  
  return 0;
}

// 数値（秒）を時間形式（"分:秒"）に変換する関数
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// テキストを適切なセグメントに分割する関数
function splitTextIntoSegments(text: string, maxSegmentLength: number = 6000): string[] {
  console.log('[speaker-diarization] 🔪 テキスト分割開始:', {
    totalLength: text.length,
    maxSegmentLength,
    estimatedSegments: Math.ceil(text.length / maxSegmentLength)
  });

  const segments: string[] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    const remainingLength = text.length - currentPosition;
    const segmentLength = Math.min(maxSegmentLength, remainingLength);
    
    let endPosition = currentPosition + segmentLength;
    
    // セグメント境界を話者の発言境界に調整
    if (endPosition < text.length) {
      // 次の話者タグの位置を探す
      const nextSpeakerMatch = text.substring(endPosition - 200, endPosition + 200).match(/話者\d+/);
      if (nextSpeakerMatch) {
        const speakerIndex = text.indexOf(nextSpeakerMatch[0], endPosition - 200);
        if (speakerIndex > currentPosition && speakerIndex < currentPosition + segmentLength + 200) {
          endPosition = speakerIndex;
        }
      }
      
      // 文の境界で調整（句点、改行など）
      const sentenceBoundary = text.lastIndexOf('。', endPosition);
      if (sentenceBoundary > currentPosition + segmentLength * 0.8) {
        endPosition = sentenceBoundary + 1;
      }
    }
    
    const segment = text.substring(currentPosition, endPosition);
    segments.push(segment);
    
    console.log('[speaker-diarization] 🔪 セグメント作成:', {
      segmentIndex: segments.length - 1,
      startPosition: currentPosition,
      endPosition,
      length: segment.length,
      preview: segment.substring(0, 100) + '...',
      endPreview: segment.substring(Math.max(0, segment.length - 100))
    });
    
    currentPosition = endPosition;
  }

  console.log('[speaker-diarization] ✅ テキスト分割完了:', {
    totalSegments: segments.length,
    segmentLengths: segments.map(s => s.length)
  });

  return segments;
}

// LLMレスポンスを処理する関数
async function processLLMResponse(result: string, content: string): Promise<any> {
  console.log('[speaker-diarization] 🔍 LLMレスポンス処理開始:', {
    responseLength: result.length,
    contentLength: content.length
  });

  // レスポンスの品質チェックとJSON修復
  console.log('[speaker-diarization] 🔍 レスポンス品質チェック開始');
  
  const hasJsonBlock = result.includes('```json') || result.includes('```');
  const hasSpeakers = result.includes('"speakers"');
  const hasUtterances = result.includes('"utterances"');
  const hasSummary = result.includes('"summary"');
  
  // Geminiは直接JSONを返す場合があるため、```jsonブロックの有無だけでなく、JSONとして解析可能かもチェック
  const trimmedResult = result.trim();
  const isDirectJson = trimmedResult.startsWith('{') && (
    trimmedResult.endsWith('}') || 
    trimmedResult.endsWith(']') ||
    trimmedResult.includes('"speakers"') && trimmedResult.includes('"utterances"')
  );
  
  console.log('[speaker-diarization] 📊 レスポンス品質指標:', {
    hasJsonBlock,
    hasSpeakers,
    hasUtterances,
    hasSummary,
    isDirectJson,
    isComplete: (hasJsonBlock || isDirectJson) && hasSpeakers && hasUtterances && hasSummary,
    responseLength: result.length
  });

  // レスポンスの詳細分析
  console.log('[speaker-diarization] 🔍 レスポンス詳細分析:');
  console.log('[speaker-diarization] 📏 レスポンス長:', result.length);
  console.log('[speaker-diarization] 📋 レスポンス開始100文字:', result.substring(0, 100));
  console.log('[speaker-diarization] 📋 レスポンス終了100文字:', result.substring(Math.max(0, result.length - 100)));
  
  // JSONブロックの抽出と修復
  let jsonContent = '';
  let parsedResult = null;
  
  console.log('[speaker-diarization] 🔍 JSON抽出処理開始');
  console.log('[speaker-diarization] 📏 レスポンス全体長:', result.length);
  console.log('[speaker-diarization] 🔍 ```json開始位置:', result.indexOf('```json'));
  console.log('[speaker-diarization] 🔍 ```終了位置:', result.lastIndexOf('```'));
  
  if (hasJsonBlock || isDirectJson) {
    if (isDirectJson) {
      // 直接JSONとして解析を試行
      console.log('[speaker-diarization] 🔍 直接JSON解析を試行');
      try {
        parsedResult = JSON.parse(result.trim());
        console.log('[speaker-diarization] ✅ 直接JSON解析成功');
        console.log('[speaker-diarization] 🔍 解析結果詳細:', {
          hasSpeakers: !!parsedResult.speakers,
          speakersLength: parsedResult.speakers?.length || 0,
          hasUtterances: !!parsedResult.utterances,
          utterancesLength: parsedResult.utterances?.length || 0,
          hasSummary: !!parsedResult.summary
        });
      } catch (directJsonError) {
        console.warn('[speaker-diarization] ⚠️ 直接JSON解析失敗、```jsonブロック抽出を試行:', directJsonError.message);
        console.log('[speaker-diarization] 🔍 直接JSON解析失敗の詳細:', {
          error: directJsonError.message,
          responseLength: result.length,
          responseStart: result.substring(0, 100),
          responseEnd: result.substring(Math.max(0, result.length - 100)),
          startsWithBrace: result.trim().startsWith('{'),
          endsWithBrace: result.trim().endsWith('}'),
          lastBracePosition: result.lastIndexOf('}'),
          lastBracketPosition: result.lastIndexOf(']')
        });
        
        // 不完全なJSONの修復を試行
        try {
          console.log('[speaker-diarization] 🔧 不完全なJSONの修復を試行');
          const repairedDirectJson = repairTruncatedJson(result.trim());
          console.log('[speaker-diarization] 🔧 修復後の直接JSON長:', repairedDirectJson.length);
          console.log('[speaker-diarization] 🔧 修復後の直接JSON末尾100文字:', repairedDirectJson.substring(Math.max(0, repairedDirectJson.length - 100)));
          
          parsedResult = JSON.parse(repairedDirectJson);
          console.log('[speaker-diarization] ✅ 直接JSON修復成功');
          console.log('[speaker-diarization] 🔍 修復後解析結果詳細:', {
            hasSpeakers: !!parsedResult.speakers,
            speakersLength: parsedResult.speakers?.length || 0,
            hasUtterances: !!parsedResult.utterances,
            utterancesLength: parsedResult.utterances?.length || 0,
            hasSummary: !!parsedResult.summary
          });
        } catch (repairDirectError) {
          console.warn('[speaker-diarization] ⚠️ 直接JSON修復失敗、```jsonブロック抽出を試行:', repairDirectError.message);
          // 修復に失敗した場合は```jsonブロック抽出を試行
        }
      }
      
      // ```jsonブロック抽出処理（直接JSON解析に失敗した場合や```jsonブロックがある場合）
      if (!parsedResult && hasJsonBlock) {
        const jsonStart = result.indexOf('```json');
        const jsonEnd = result.lastIndexOf('```');
        console.log('[speaker-diarization] 📍 JSON抽出範囲:', { jsonStart, jsonEnd, range: jsonEnd - jsonStart });
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonContent = result.substring(jsonStart + 7, jsonEnd).trim();
          console.log('[speaker-diarization] 📋 抽出されたJSON長:', jsonContent.length);
          console.log('[speaker-diarization] 📋 JSONブロック内容（最初200文字）:', jsonContent.substring(0, 200) + '...');
          console.log('[speaker-diarization] 📋 JSONブロック内容（最後200文字）:', jsonContent.substring(Math.max(0, jsonContent.length - 200)) + '...');
          
          // JSON修復処理
          try {
            parsedResult = JSON.parse(jsonContent);
            console.log('[speaker-diarization] ✅ JSON構文チェック成功');
            console.log('[speaker-diarization] 🔍 解析結果詳細:', {
              hasSpeakers: !!parsedResult.speakers,
              speakersLength: parsedResult.speakers?.length || 0,
              hasUtterances: !!parsedResult.utterances,
              utterancesLength: parsedResult.utterances?.length || 0,
              hasSummary: !!parsedResult.summary
            });
          } catch (jsonError) {
            console.warn('[speaker-diarization] ⚠️ JSON構文チェック失敗、修復を試行:', jsonError.message);
            console.log('[speaker-diarization] 🔍 JSONエラー詳細:', jsonError);
            
            // JSON修復処理
            const repairedJson = repairTruncatedJson(jsonContent);
            console.log('[speaker-diarization] 🔧 修復後のJSON長:', repairedJson.length);
            console.log('[speaker-diarization] 🔧 修復後のJSON末尾100文字:', repairedJson.substring(Math.max(0, repairedJson.length - 100)));
            
            try {
              parsedResult = JSON.parse(repairedJson);
              console.log('[speaker-diarization] ✅ JSON修復成功');
              console.log('[speaker-diarization] 🔍 修復後解析結果詳細:', {
                hasSpeakers: !!parsedResult.speakers,
                speakersLength: parsedResult.speakers?.length || 0,
                hasUtterances: !!parsedResult.utterances,
                utterancesLength: parsedResult.utterances?.length || 0,
                hasSummary: !!parsedResult.summary
              });
            } catch (repairError) {
              console.error('[speaker-diarization] ❌ JSON修復失敗:', repairError.message);
              console.log('[speaker-diarization] 🔍 修復エラー詳細:', repairError);
              // 修復に失敗した場合はルールベースにフォールバック
              console.warn('[speaker-diarization] ⚠️ JSON修復失敗、ルールベースにフォールバック');
              parsedResult = diarizeTextWithRules(content);
            }
          }
        }
      }
    }
  }
  
  // JSON解析に失敗した場合でもフォールバックせず、生レスポンスを保存
  console.log('[speaker-diarization] 🔍 最終判定前のparsedResult:', {
    exists: !!parsedResult,
    hasSpeakers: !!parsedResult?.speakers,
    speakersLength: parsedResult?.speakers?.length || 0,
    hasUtterances: !!parsedResult?.utterances,
    utterancesLength: parsedResult?.utterances?.length || 0
  });
  
  // 最後の手段：レスポンス全体を文字列として解析
  if (!parsedResult) {
    console.warn('[speaker-diarization] 🔧 最後の手段：レスポンス全体の文字列解析を試行');
    console.log('[speaker-diarization] 📋 生レスポンス（最初500文字）:', result.substring(0, 500));
    console.log('[speaker-diarization] 📋 生レスポンス（最後500文字）:', result.substring(Math.max(0, result.length - 500)));
    
    // { で始まるJSONを直接抽出する最後の手段
    const trimmedResult = result.trim();
    let jsonStart = trimmedResult.indexOf('{');
    let jsonEnd = trimmedResult.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const extractedJson = trimmedResult.substring(jsonStart, jsonEnd);
      console.log('[speaker-diarization] 🔧 抽出されたJSON:', extractedJson.length, '文字');
      console.log('[speaker-diarization] 🔧 抽出JSON先頭:', extractedJson.substring(0, 200));
      console.log('[speaker-diarization] 🔧 抽出JSON末尾:', extractedJson.substring(Math.max(0, extractedJson.length - 200)));
      
      try {
        parsedResult = JSON.parse(extractedJson);
        console.log('[speaker-diarization] ✅ 最後の手段：JSON解析成功');
      } catch (finalError) {
        console.warn('[speaker-diarization] ⚠️ 最後の手段でも解析失敗:', finalError.message);
        
        // 修復を試行
        try {
          const repairedFinalJson = repairTruncatedJson(extractedJson);
          console.log('[speaker-diarization] 🔧 最終修復JSON:', repairedFinalJson.length, '文字');
          parsedResult = JSON.parse(repairedFinalJson);
          console.log('[speaker-diarization] ✅ 最終修復成功');
        } catch (finalRepairError) {
          console.error('[speaker-diarization] ❌ 最終修復も失敗:', finalRepairError.message);
        }
      }
    }
  }

  // それでも失敗した場合のみ空の結果を作成
  if (!parsedResult || !parsedResult.speakers || !parsedResult.utterances) {
    console.warn('[speaker-diarization] ⚠️ 全ての解析手段が失敗、空の結果を作成');
    console.log('[speaker-diarization] 🔍 最終状態:', {
      noParsedResult: !parsedResult,
      noSpeakers: !parsedResult?.speakers,
      noUtterances: !parsedResult?.utterances,
      speakersIsArray: Array.isArray(parsedResult?.speakers),
      utterancesIsArray: Array.isArray(parsedResult?.utterances),
      speakersLength: parsedResult?.speakers?.length,
      utterancesLength: parsedResult?.utterances?.length
    });
    
    // 空の配列を確実に設定
    if (parsedResult) {
      if (!parsedResult.speakers || !Array.isArray(parsedResult.speakers)) {
        console.log('[speaker-diarization] 🔧 speakers配列を修正');
        parsedResult.speakers = [];
      }
      if (!parsedResult.utterances || !Array.isArray(parsedResult.utterances)) {
        console.log('[speaker-diarization] 🔧 utterances配列を修正');
        parsedResult.utterances = [];
      }
      if (!parsedResult.summary) {
        console.log('[speaker-diarization] 🔧 summary オブジェクトを修正');
        parsedResult.summary = {
          totalSpeakers: 0,
          totalDuration: "0:00",
          averageConfidence: 0
        };
      }
    } else {
      // 完全に空の結果を作成
      parsedResult = {
        speakers: [],
        utterances: [],
        summary: {
          totalSpeakers: 0,
          totalDuration: "0:00",
          averageConfidence: 0
        },
        parse_error: "LLM結果の解析に失敗"
      };
    }
  }
  
  console.log('[speaker-diarization] 🔍 最終 parsedResult 確認:', {
    exists: !!parsedResult,
    hasSpeakers: !!parsedResult?.speakers,
    speakersLength: parsedResult?.speakers?.length || 0,
    hasUtterances: !!parsedResult?.utterances,
    utterancesLength: parsedResult?.utterances?.length || 0,
    hasSummary: !!parsedResult?.summary
  });

  return parsedResult;
}

// 複数のセグメント結果を統合する関数
function mergeSegmentResults(segmentResults: any[]): any {
  console.log('[speaker-diarization] 🔗 セグメント結果統合開始:', {
    segmentCount: segmentResults.length
  });

  if (segmentResults.length === 0) {
    return { speakers: [], utterances: [], summary: { totalSpeakers: 0, totalDuration: "0:00", averageConfidence: 0 } };
  }

  if (segmentResults.length === 1) {
    return segmentResults[0];
  }

  // 話者情報の統合
  const allSpeakers = new Map();
  let speakerCounter = 1;

  // 発言の統合
  const allUtterances: any[] = [];
  let timeOffset = 0;

  for (let i = 0; i < segmentResults.length; i++) {
    const segmentResult = segmentResults[i];
    
    if (segmentResult.speakers) {
      segmentResult.speakers.forEach((speaker: any) => {
        const speakerKey = speaker.name || `話者${speaker.speakerTag}`;
        if (!allSpeakers.has(speakerKey)) {
          allSpeakers.set(speakerKey, {
            ...speaker,
            speakerTag: speakerCounter.toString(),
            originalTag: speaker.speakerTag
          });
          speakerCounter++;
        }
      });
    }

    if (segmentResult.utterances) {
      segmentResult.utterances.forEach((utterance: any) => {
        // 時間の調整（セグメント間の連続性を保つ）
        const adjustedUtterance = {
          ...utterance,
          speakerTag: allSpeakers.get(utterance.speakerTag)?.speakerTag || utterance.speakerTag,
          startTime: formatDuration(timeStringToSeconds(utterance.startTime) + timeOffset),
          endTime: formatDuration(timeStringToSeconds(utterance.endTime) + timeOffset)
        };
        allUtterances.push(adjustedUtterance);
      });
    }

    // 次のセグメントの時間オフセットを計算
    if (segmentResult.summary?.totalDuration) {
      timeOffset += timeStringToSeconds(segmentResult.summary.totalDuration);
    }
  }

  // 統合結果の作成
  const mergedResult = {
    speakers: Array.from(allSpeakers.values()),
    utterances: allUtterances.sort((a, b) => timeStringToSeconds(a.startTime) - timeStringToSeconds(b.startTime)),
    summary: {
      totalSpeakers: allSpeakers.size,
      totalDuration: formatDuration(timeOffset),
      averageConfidence: allUtterances.length > 0 ? 
        allUtterances.reduce((sum, u) => sum + (u.confidence || 0), 0) / allUtterances.length : 0
    }
  };

  console.log('[speaker-diarization] ✅ セグメント結果統合完了:', {
    totalSpeakers: mergedResult.speakers.length,
    totalUtterances: mergedResult.utterances.length,
    totalDuration: mergedResult.summary.totalDuration
  });

  return mergedResult;
}

// 途中で切れたJSONを修復する関数
function repairTruncatedJson(jsonText: string): string {
  console.log('[speaker-diarization] 🔧 途中で切れたJSONの修復開始');
  let repairedJson = jsonText;
  
  // 末尾のカンマを削除
  repairedJson = repairedJson
    .replace(/,\s*$/g, '')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .trim();
  
  // 括弧の数をカウント
  let openBraceCount = 0;
  let closeBraceCount = 0;
  let openBracketCount = 0;
  let closeBracketCount = 0;
  
  for (const char of repairedJson) {
    if (char === '{') openBraceCount++;
    else if (char === '}') closeBraceCount++;
    else if (char === '[') openBracketCount++;
    else if (char === ']') closeBracketCount++;
  }
  
  // 不足している閉じ括弧を追加
  while (openBracketCount > closeBracketCount) {
    repairedJson += ']';
    closeBracketCount++;
    console.log('[speaker-diarization] 🔧 ] を追加');
  }
  
  while (openBraceCount > closeBraceCount) {
    repairedJson += '}';
    closeBraceCount++;
    console.log('[speaker-diarization] 🔧 } を追加');
  }
  
  console.log('[speaker-diarization] ✅ 途中で切れたJSONの修復完了');
  console.log('[speaker-diarization] 🔍 修復後のJSON長:', repairedJson.length);
  console.log('[speaker-diarization] 🔍 修復後のJSON末尾100文字:', repairedJson.substring(Math.max(0, repairedJson.length - 100)));
  
  return repairedJson;
}

// ルールベースの話者分離（フォールバック用）
function diarizeTextWithRules(content: string): any {
  console.log('[speaker-diarization] 🔧 ルールベース話者分離開始');
  
  const lines = content.split('\n').filter(line => line.trim());
  const utterances: any[] = [];
  let currentSpeaker = '1';
  let currentTime = 0;
  
  lines.forEach((line, index) => {
    if (line.includes('話者') || line.includes('Speaker')) {
      const speakerMatch = line.match(/話者(\d+)/) || line.match(/Speaker\s*(\d+)/);
      if (speakerMatch) {
        currentSpeaker = speakerMatch[1];
      }
    }
    
    utterances.push({
      speakerTag: currentSpeaker,
      text: line,
      startTime: formatDuration(currentTime),
      endTime: formatDuration(currentTime + 30),
      confidence: 0.8
    });
    
    currentTime += 30;
  });
  
  const speakers = [
    {
      speakerTag: '1',
      name: '話者1',
      totalTime: formatDuration(currentTime),
      wordCount: content.split(/\s+/).length
    }
  ];
  
  return {
    speakers,
    utterances,
    summary: {
      totalSpeakers: speakers.length,
      totalDuration: formatDuration(currentTime),
      averageConfidence: 0.8
    }
  };
}

// データベース保存機能
async function saveDiarizationResults(content: string, result: any, provider: string, model: string, meetingId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables are not set');
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('[speaker-diarization] 💾 データベース保存開始:', {
      meetingId,
      speakersCount: result.speakers?.length || 0,
      utterancesCount: result.utterances?.length || 0,
      provider,
      model
    });

    // 既存データの削除（再実行時の重複防止）
    console.log('[speaker-diarization] 🗑️ 既存データ削除開始');
    
    // 既存の話者データを削除
    const { error: deleteSpeakersError } = await supabase
      .from('meeting_speakers')
      .delete()
      .eq('meeting_id', meetingId);
    
    if (deleteSpeakersError) {
      console.warn('[speaker-diarization] ⚠️ 既存話者データ削除エラー:', deleteSpeakersError);
    } else {
      console.log('[speaker-diarization] ✅ 既存話者データ削除完了');
    }
    
    // 既存の発言データを削除
    const { error: deleteUtterancesError } = await supabase
      .from('meeting_utterances')
      .delete()
      .eq('meeting_id', meetingId);
    
    if (deleteUtterancesError) {
      console.warn('[speaker-diarization] ⚠️ 既存発言データ削除エラー:', deleteUtterancesError);
    } else {
      console.log('[speaker-diarization] ✅ 既存発言データ削除完了');
    }

    // 話者データを挿入
    if (result.speakers && result.speakers.length > 0) {
      console.log('[speaker-diarization] 👥 話者データ挿入開始:', result.speakers.length, '件');
      
      const speakerInserts = result.speakers.map((speaker: any) => ({
        meeting_id: meetingId,
        speaker_tag: parseInt(speaker.speakerTag) || 1,
        name: speaker.name || `話者${speaker.speakerTag}`,
        total_time: speaker.totalTime || "0:00",
        word_count: speaker.wordCount || 0
      }));
      
      const { error: speakerError } = await supabase
        .from('meeting_speakers')
        .insert(speakerInserts);
      
      if (speakerError) {
        console.error('[speaker-diarization] ❌ 話者データ保存エラー:', speakerError);
        throw new Error(`話者データ保存エラー: ${speakerError.message}`);
      }
      
      console.log('[speaker-diarization] ✅ 話者データ保存完了:', speakerInserts.length, '件');
    }

    // 発言データを挿入
    if (result.utterances && result.utterances.length > 0) {
      console.log('[speaker-diarization] 💬 発言データ挿入開始:', result.utterances.length, '件');
      
      const utteranceInserts = result.utterances.map((utterance: any, index: number) => {
        const rawStartTime = utterance.startTime || '';
        const rawEndTime = utterance.endTime || '';
        const convertedStartTime = timeStringToSeconds(rawStartTime);
        const convertedEndTime = timeStringToSeconds(rawEndTime);
        
        // 時間フォーマットの検出
        let detectedFormat = 'unknown';
        if (rawStartTime && typeof rawStartTime === 'string') {
          if (rawStartTime.includes(':')) {
            const parts = rawStartTime.split(':');
            if (parts.length === 2) detectedFormat = 'mm:ss';
            else if (parts.length === 3) detectedFormat = 'hh:mm:ss';
          } else if (!isNaN(Number(rawStartTime))) {
            detectedFormat = 'seconds_number';
          }
        }
        
        // 変換方法の記録
        let conversionMethod = 'timeStringToSeconds';
        if (convertedStartTime === 0 && rawStartTime !== '0:00' && rawStartTime !== '') {
          conversionMethod = 'fallback_to_zero';
        }
        
        // 時間変換の詳細ログは削除（データベースに保存されるため）
        
        return {
          meeting_id: meetingId,
          speaker_tag: parseInt(utterance.speakerTag) || 1,
          word: utterance.text || '',
          start_time: convertedStartTime,
          end_time: convertedEndTime,
          confidence: utterance.confidence || 0.8,
          start_time_raw: rawStartTime,
          end_time_raw: rawEndTime,
          time_format_detected: detectedFormat,
          conversion_method: conversionMethod
        };
      });
      
      const { error: utteranceError } = await supabase
        .from('meeting_utterances')
        .insert(utteranceInserts);
      
      if (utteranceError) {
        console.error('[speaker-diarization] ❌ 発言データ保存エラー:', utteranceError);
        throw new Error(`発言データ保存エラー: ${utteranceError.message}`);
      }
      
      console.log('[speaker-diarization] ✅ 発言データ保存完了:', utteranceInserts.length, '件');
      
      // 時間変換サマリー
      const formatCounts = utteranceInserts.reduce((acc, item) => {
        acc[item.time_format_detected] = (acc[item.time_format_detected] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('[speaker-diarization] 📊 時間フォーマット分布:', formatCounts);
    }

    const savedResult = {
      success: true,
      meetingId,
      speakersCount: result.speakers?.length || 0,
      utterancesCount: result.utterances?.length || 0,
      provider,
      model,
      summary: result.summary || {},
      savedAt: new Date().toISOString()
    };
    
    console.log('[speaker-diarization] ✅ データベース保存完了:', savedResult);
    return savedResult;
    
  } catch (error) {
    console.error('[speaker-diarization] ❌ データベース保存処理エラー:', error);
    throw error;
  }
}

serve(async (req) => {
  console.log('[speaker-diarization] 🚀 リクエスト受信開始');
  
  // CORSヘッダー設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    console.log('[speaker-diarization] 📋 OPTIONSリクエスト処理');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[speaker-diarization] 📥 リクエストボディ解析開始');
    const { content, provider, model, maxTokens, meetingId } = await req.json();

    console.log('[speaker-diarization] 🔍 リクエストパラメータ詳細:', {
      contentLength: content?.length || 0,
      contentPreview: content ? content.substring(0, 200) + '...' : 'undefined...',
      meetingId: meetingId || 'not provided',
      provider: provider || 'openai',
      model: model || 'default',
      maxTokens: maxTokens || 8192,
      hasContent: !!content,
      contentType: typeof content
    });

    // meetingIdのUUID形式バリデーションを追加
    if (!meetingId) {
      console.error('[speaker-diarization] ❌ meetingIdが提供されていません');
      throw new Error('meetingId is required for speaker diarization');
    }

    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(meetingId)) {
      console.error('[speaker-diarization] ❌ meetingIdが無効なUUID形式です:', meetingId);
      throw new Error(`Invalid meetingId format: ${meetingId}. Expected UUID format.`);
    }

    console.log('[speaker-diarization] ✅ meetingIdバリデーション完了:', meetingId);

    // contentが提供されていない場合、meetingIdからtranscriptを取得
    let finalContent = content;
    if (!content || content.trim() === '') {
      console.log('[speaker-diarization] 📊 meetingIdからtranscriptを取得中:', meetingId);
      
      // Supabaseクライアントの初期化
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // ミーティングデータを取得
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('transcript')
        .eq('id', meetingId)
        .single();

      if (meetingError) {
        console.error('[speaker-diarization] ❌ ミーティングデータ取得エラー:', meetingError);
        throw new Error(`Failed to fetch meeting: ${meetingError.message}`);
      }

      if (!meeting || !meeting.transcript || meeting.transcript.trim() === '') {
        console.error('[speaker-diarization] ❌ ミーティングのtranscriptが空です');
        throw new Error('Meeting transcript is required for speaker diarization');
      }

      finalContent = meeting.transcript;
      console.log('[speaker-diarization] ✅ transcript取得完了:', {
        transcriptLength: finalContent.length,
        transcriptPreview: finalContent.substring(0, 200) + '...'
      });
    }

    if (!finalContent || finalContent.trim() === '') {
      console.error('[speaker-diarization] ❌ 最終的なコンテンツが空です');
      throw new Error('Content is required for speaker diarization');
    }

    const finalProvider = provider || 'openai';
    const finalModel = model || (finalProvider === 'openai' ? 'gpt-4o' : 'gemini-2.0-flash');
    // Geminiの場合はより大きなトークン数を設定（長時間発話対応）
    const finalMaxTokens = maxTokens || (finalProvider === 'openai' ? 16384 : 200000);

    console.log('[speaker-diarization] ⚙️ 最終設定:', {
      provider: finalProvider,
      model: finalModel,
      maxTokens: finalMaxTokens,
      contentLength: finalContent.length,
      estimatedTokens: Math.ceil(finalContent.length / 4)
    });

    // テキストが長い場合は分割処理を使用（20分問題対応で分割を有効化）
    const maxSegmentLength = 4000; // 20分問題対応で小さめの分割サイズ
    const shouldSplit = finalContent.length > maxSegmentLength;
    const startTime = Date.now();
    let parsedResult: any;
    
    if (shouldSplit) {
      console.log('[speaker-diarization] 🔪 長いテキストを分割処理します:', {
        contentLength: finalContent.length,
        maxSegmentLength,
        estimatedSegments: Math.ceil(finalContent.length / maxSegmentLength)
      });
      
      // テキストをセグメントに分割
      const segments = splitTextIntoSegments(finalContent, maxSegmentLength);
      
      // 各セグメントを個別に処理
      const segmentResults: any[] = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        console.log(`[speaker-diarization] 🔄 セグメント ${i + 1}/${segments.length} 処理開始:`, {
          segmentLength: segment.length,
          preview: segment.substring(0, 100) + '...'
        });
        
        // セグメント用のプロンプトを構築
        const segmentPrompt = `文字起こしテキストを話者別に分離してください。以下のJSONフォーマットで返答してください：

\`\`\`json
{
  "speakers": [
    {
      "speakerTag": "1",
      "name": "話者1",
      "totalTime": "2:30",
      "wordCount": 150
    }
  ],
  "utterances": [
    {
      "speakerTag": "1",
      "text": "発言内容",
      "startTime": "0:00",
      "endTime": "0:15",
      "confidence": 0.9
    }
  ],
  "summary": {
    "totalSpeakers": 2,
    "totalDuration": "5:00",
    "averageConfidence": 0.85
  }
}
\`\`\`

重要: 
- JSONフォーマットのみ返答し、説明は不要です
- 最低2人の話者を作成してください
- 各フィールドは必ず完全な値を設定してください
- 不完全なフィールドや途中で切れた値は絶対に返さないでください
- 各utteranceのconfidenceは0.0から1.0の間の数値で設定してください
- 時間は"分:秒"形式（例："1:30"）で設定してください
- 文字列フィールド内で引用符を使用する場合は、必ず適切にエスケープしてください
- 各オブジェクトと配列は必ず完全に閉じてください
- 最後の要素の後にカンマを付けないでください
- 各フィールドの値は必ず有効なJSON値として完成させてください
- 文字列が途中で切れている場合は、適切な値（空文字列など）で補完してください
- 配列やオブジェクトの構造が不完全な場合は、必ず閉じ括弧を追加してください

文字起こし内容（セグメント ${i + 1}/${segments.length}）:
${segment}`;

        try {
          // セグメントを処理
          let segmentResult: any;
          if (finalProvider === 'openai') {
            const llmResult = await callOpenAI(segmentPrompt, finalModel, finalMaxTokens);
            segmentResult = await processLLMResponse(llmResult, segment);
          } else if (finalProvider === 'gemini') {
            const llmResult = await callGemini(segmentPrompt, finalModel, finalMaxTokens);
            segmentResult = await processLLMResponse(llmResult, segment);
          }
          
          if (segmentResult) {
            segmentResults.push(segmentResult);
            console.log(`[speaker-diarization] ✅ セグメント ${i + 1} 処理完了:`, {
              speakersCount: segmentResult.speakers?.length || 0,
              utterancesCount: segmentResult.utterances?.length || 0
            });
          }
        } catch (segmentError) {
          console.error(`[speaker-diarization] ❌ セグメント ${i + 1} 処理エラー:`, segmentError);
          // エラーが発生したセグメントは空の結果として扱う
          segmentResults.push({
            speakers: [],
            utterances: [],
            summary: { totalSpeakers: 0, totalDuration: "0:00", averageConfidence: 0 }
          });
        }
      }
      
      // セグメント結果を統合
      console.log('[speaker-diarization] 🔗 全セグメント処理完了、統合開始');
      parsedResult = mergeSegmentResults(segmentResults);
      
    } else {
      // 短いテキストは通常処理
      console.log('[speaker-diarization] 📝 短いテキストのため通常処理を使用');
      
      const prompt = `文字起こしテキストを話者別に分離してください。以下のJSONフォーマットで返答してください：

\`\`\`json
{
  "speakers": [
    {
      "speakerTag": "1",
      "name": "話者1",
      "totalTime": "2:30",
      "wordCount": 150
    }
  ],
  "utterances": [
    {
      "speakerTag": "1",
      "text": "発言内容",
      "startTime": "0:00",
      "endTime": "0:15",
      "confidence": 0.9
    }
  ],
  "summary": {
    "totalSpeakers": 2,
    "totalDuration": "5:00",
    "averageConfidence": 0.85
  }
}
\`\`\`

重要: 
- JSONフォーマットのみ返答し、説明は不要です
- 最低2人の話者を作成してください
- 各フィールドは必ず完全な値を設定してください
- 不完全なフィールドや途中で切れた値は絶対に返さないでください
- 各utteranceのconfidenceは0.0から1.0の間の数値で設定してください
- 時間は"分:秒"形式（例："1:30"）で設定してください
- 文字列フィールド内で引用符を使用する場合は、必ず適切にエスケープしてください
- 各オブジェクトと配列は必ず完全に閉じてください
- 最後の要素の後にカンマを付けないでください
- 各フィールドの値は必ず有効なJSON値として完成させてください
- 文字列が途中で切れている場合は、適切な値（空文字列など）で補完してください
- 配列やオブジェクトの構造が不完全な場合は、必ず閉じ括弧を追加してください

文字起こし内容:
${finalContent}`;

      // LLM呼び出し
      let result: any;
      
      console.log(`[speaker-diarization] 🚀 ${finalProvider.toUpperCase()} API呼び出し開始`);

      let llmResult;
      try {
        if (finalProvider === 'openai') {
          llmResult = await callOpenAI(prompt, finalModel, finalMaxTokens);
        } else if (finalProvider === 'gemini') {
          llmResult = await callGemini(prompt, finalModel, finalMaxTokens);
        } else {
          console.error(`[speaker-diarization] ❌ サポートされていないプロバイダー: ${finalProvider}`);
          throw new Error(`Unsupported provider: ${finalProvider}`);
        }
        
        // LLM結果の解析
        result = llmResult;
      } catch (llmError) {
        console.warn('[speaker-diarization] ⚠️ LLM処理失敗、ルールベースにフォールバック:', llmError);
        
        // ルールベース処理にフォールバック
        result = diarizeTextWithRules(content);
        console.log('[speaker-diarization] ✅ ルールベース処理完了');
      }

      console.log('[speaker-diarization] ⏱️ LLM処理時間:', Date.now() - startTime, 'ms');

      // LLM結果を処理
      console.log('[speaker-diarization] 🔍 JSON解析処理開始');
      try {
        parsedResult = await processLLMResponse(result, finalContent);
        console.log('[speaker-diarization] ✅ JSON解析処理完了:', {
          hasSpeakers: !!parsedResult?.speakers,
          speakersCount: parsedResult?.speakers?.length || 0,
          hasUtterances: !!parsedResult?.utterances,
          utterancesCount: parsedResult?.utterances?.length || 0
        });
      } catch (processError) {
        console.error('[speaker-diarization] ❌ JSON解析処理エラー:', {
          error: processError.message,
          stack: processError.stack?.substring(0, 500),
          llmResultType: typeof result,
          llmResultLength: result?.length || 0,
          llmResultPreview: typeof result === 'string' ? result.substring(0, 200) + '...' : 'Not string'
        });
        
        // フォールバック：空の結果を作成
        parsedResult = {
          speakers: [],
          utterances: [],
          summary: {
            totalSpeakers: 0,
            totalDuration: "0:00",
            averageConfidence: 0
          },
          error: `JSON解析エラー: ${processError.message}`
        };
        console.log('[speaker-diarization] 🔧 フォールバック結果を作成しました');
      }
    }

    // 処理時間の計算
    const processingTime = Date.now() - startTime;

    console.log('[speaker-diarization] 🎯 成功レスポンス返却準備完了');

    // データベース保存
    let savedResult;
    try {
      savedResult = await saveDiarizationResults(finalContent, parsedResult, finalProvider, finalModel, meetingId);
      console.log('[speaker-diarization] ✅ データベース保存完了');
    } catch (saveError) {
      console.error('[speaker-diarization] ❌ データベース保存エラー:', saveError);
      // データベース保存に失敗した場合はエラーとして返す
      throw new Error(`データベース保存エラー: ${saveError.message}`);
    }

    // 詳細な処理情報を構築
    const detailedMetadata = {
      processing: {
        provider: finalProvider,
        model: finalModel,
        processingTimeMs: processingTime,
        savedToDatabase: !!savedResult,
        textSegmentation: {
          wasSegmented: shouldSplit,
          segmentCount: shouldSplit ? (typeof segments !== 'undefined' ? segments.length : 0) : 1,
          maxSegmentLength
        }
      },
      result: {
        hasSpeakers: !!parsedResult?.speakers,
        speakersLength: parsedResult?.speakers?.length || 0,
        hasUtterances: !!parsedResult?.utterances,
        utterancesLength: parsedResult?.utterances?.length || 0,
        hasSummary: !!parsedResult?.summary,
        totalDuration: parsedResult?.summary?.totalDuration || "0:00"
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        result: savedResult || parsedResult,
        provider: finalProvider,
        model: finalModel,
        processingTimeMs: processingTime,
        metadata: detailedMetadata,
        savedToDatabase: !!savedResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[speaker-diarization] ❌ エラー発生:', {
      error: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
