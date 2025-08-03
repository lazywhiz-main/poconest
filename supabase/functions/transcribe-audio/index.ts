import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// import { Muxer, Demuxer } from 'https://esm.sh/@scenespacelabs/mp4-muxer@1.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { fileUrl, fileName, fileType, meetingId, nestId } = await req.json()

    if (!fileUrl || !fileName || !fileType || !meetingId) {
      throw new Error('必要なパラメータが不足しています')
    }

    // OpenAI APIキーを取得
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI APIキーが設定されていません')
    }

    console.log(`🔧 [Edge Function] 文字起こし開始: ${fileName}`)

    // ファイルをダウンロード
    const fileResponse = await fetch(fileUrl)
    if (!fileResponse.ok) {
      throw new Error(`ファイルのダウンロードに失敗しました: ${fileResponse.statusText}`)
    }

    const fileBuffer = await fileResponse.arrayBuffer()
    const fileSize = fileBuffer.byteLength
    const maxSize = 25 * 1024 * 1024 // 25MB

    console.log(`🔧 [Edge Function] ファイルサイズ: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    console.log(`🔧 [Edge Function] ファイル形式: ${fileType}`)

    // ファイル形式チェック
    const supportedFormats = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/webm', 'audio/x-m4a'];
    if (!supportedFormats.includes(fileType)) {
      throw new Error(`サポートされていないファイル形式です: ${fileType}`);
    }

    // ファイルサイズチェック（最小サイズ）
    if (fileSize < 1024) {
      throw new Error('ファイルサイズが小さすぎます（1KB未満）');
    }

    // ファイルサイズに基づいて処理方法を選択
    let transcript: string;
    
    if (fileBuffer.byteLength > 25 * 1024 * 1024) {
      console.log('🔧 [Edge Function] 大きなファイルのため、分割処理を使用します');
      transcript = await transcribeLargeFile(fileBuffer, fileName, fileType, Deno.env.get('OPENAI_API_KEY') || '', Deno.env.get('GEMINI_API_KEY') || '', supabaseClient);
    } else {
      console.log('🔧 [Edge Function] 小さなファイルのため、OpenAI Whisperで処理します');
      transcript = await transcribeSingleFile(fileBuffer, fileName, fileType, Deno.env.get('OPENAI_API_KEY') || '');
    }

    // データベースに結果を保存
    const { error: updateError } = await supabaseClient
      .from('meetings')
      .update({ 
        transcript: transcript,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (updateError) {
      throw new Error(`データベース更新エラー: ${updateError.message}`)
    }

    // NESTのupdated_atを更新
    if (nestId) {
      await supabaseClient
        .from('nests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', nestId)
    }

    console.log('🔧 [Edge Function] 文字起こし完了')

    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: transcript.substring(0, 100) + '...', // 最初の100文字のみ返す
        wordCount: transcript.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('🔧 [Edge Function] エラー:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

/**
 * 単一ファイルの文字起こし
 */
async function transcribeSingleFile(
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  apiKey: string
): Promise<string> {
  const formData = new FormData()
  const blob = new Blob([fileBuffer], { type: fileType })
  formData.append('file', blob, fileName)
  formData.append('model', 'whisper-1')
  formData.append('language', 'ja')
  formData.append('response_format', 'verbose_json')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API エラー: ${response.status} - ${errorData.error?.message || response.statusText}`)
  }

  const result = await response.json()
  return result.text
}

// 音声ファイル分割用のヘルパー関数
function splitAudioFile(buffer: ArrayBuffer, maxChunkSize: number = 10 * 1024 * 1024): ArrayBuffer[] {
  console.log('🔧 [Edge Function] 単純なバイナリ分割を実行します');
  
  const chunks: ArrayBuffer[] = [];
  let offset = 0;
  
  while (offset < buffer.byteLength) {
    const chunkSize = Math.min(maxChunkSize, buffer.byteLength - offset);
    const chunk = buffer.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }
  
  console.log(`🔧 [Edge Function] ${chunks.length}個のチャンクに分割完了`);
  return chunks;
}

// Waveファイルの構造を理解して適切に分割する関数
function splitWaveFile(buffer: ArrayBuffer, maxChunkSize: number = 15 * 1024 * 1024): ArrayBuffer[] {
  const view = new DataView(buffer);
  
  // RIFFヘッダーを確認
  const riff = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (riff !== 'RIFF') {
    console.log('🔧 [Edge Function] RIFFヘッダーが見つかりません。通常の分割を使用します。');
    return splitAudioFile(buffer, maxChunkSize);
  }
  
  // WAVEヘッダーを確認
  const wave = String.fromCharCode(...new Uint8Array(buffer, 8, 4));
  if (wave !== 'WAVE') {
    console.log('🔧 [Edge Function] WAVEヘッダーが見つかりません。通常の分割を使用します。');
    return splitAudioFile(buffer, maxChunkSize);
  }
  
  console.log('🔧 [Edge Function] Waveファイルを検出しました。適切な分割を実行します。');
  
  // フォーマット情報を取得
  let fmtOffset = 12;
  let fmtSize = 0;
  let channels = 1;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  
  // fmtチャンクを探す
  while (fmtOffset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(...new Uint8Array(buffer, fmtOffset, 4));
    const chunkSize = view.getUint32(fmtOffset + 4, true);
    
    if (chunkId === 'fmt ') {
      fmtSize = chunkSize;
      const fmtData = new DataView(buffer, fmtOffset + 8, chunkSize);
      channels = fmtData.getUint16(2, true);
      sampleRate = fmtData.getUint32(4, true);
      bitsPerSample = fmtData.getUint16(14, true);
      break;
    }
    
    fmtOffset += 8 + chunkSize;
  }
  
  // データチャンクの位置を探す
  let dataOffset = 12;
  let dataSize = 0;
  
  while (dataOffset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(...new Uint8Array(buffer, dataOffset, 4));
    const chunkSize = view.getUint32(dataOffset + 4, true);
    
    if (chunkId === 'data') {
      dataSize = chunkSize;
      dataOffset += 8; // チャンクヘッダーをスキップ
      break;
    }
    
    dataOffset += 8 + chunkSize;
  }
  
  if (dataSize === 0) {
    console.log('🔧 [Edge Function] データチャンクが見つかりません。通常の分割を使用します。');
    return splitAudioFile(buffer, maxChunkSize);
  }
  
  // データ部分を適切に分割
  const chunks: ArrayBuffer[] = [];
  let currentOffset = dataOffset;
  const bytesPerSample = channels * (bitsPerSample / 8);
  const samplesPerChunk = Math.floor((maxChunkSize - 44) / bytesPerSample); // 44バイトはWAVヘッダーサイズ
  const bytesPerChunk = samplesPerChunk * bytesPerSample;
  
  console.log(`🔧 [Edge Function] 分割情報: チャンネル数=${channels}, サンプルレート=${sampleRate}, ビット深度=${bitsPerSample}`);
  console.log(`🔧 [Edge Function] チャンクあたりのサンプル数: ${samplesPerChunk}, バイト数: ${bytesPerChunk}`);
  
  while (currentOffset < dataOffset + dataSize) {
    const remainingData = dataOffset + dataSize - currentOffset;
    const chunkDataSize = Math.min(bytesPerChunk, remainingData);
    
    // 新しいWAVファイルを作成
    const newChunkSize = 44 + chunkDataSize; // WAVヘッダー(44バイト) + データ
    const newChunk = new ArrayBuffer(newChunkSize);
    const newChunkView = new Uint8Array(newChunk);
    const newChunkDataView = new DataView(newChunk);
    
    // WAVヘッダーを作成
    // RIFFヘッダー
    newChunkView.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    newChunkDataView.setUint32(4, newChunkSize - 8, true); // ファイルサイズ - 8
    newChunkView.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
    
    // fmtチャンク
    newChunkView.set([0x66, 0x6D, 0x74, 0x20], 12); // "fmt "
    newChunkDataView.setUint32(16, 16, true); // fmtチャンクサイズ
    newChunkDataView.setUint16(20, 1, true); // PCMフォーマット
    newChunkDataView.setUint16(22, channels, true); // チャンネル数
    newChunkDataView.setUint32(24, sampleRate, true); // サンプルレート
    newChunkDataView.setUint32(28, sampleRate * channels * (bitsPerSample / 8), true); // バイトレート
    newChunkDataView.setUint16(32, channels * (bitsPerSample / 8), true); // ブロックサイズ
    newChunkDataView.setUint16(34, bitsPerSample, true); // ビット深度
    
    // dataチャンク
    newChunkView.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    newChunkDataView.setUint32(40, chunkDataSize, true); // データサイズ
    
    // データ部分をコピー
    newChunkView.set(new Uint8Array(buffer, currentOffset, chunkDataSize), 44);
    
    chunks.push(newChunk);
    currentOffset += chunkDataSize;
  }
  
  console.log(`🔧 [Edge Function] Waveファイルを${chunks.length}個のチャンクに分割しました。`);
  return chunks;
}

// m4aファイルの適切な分割処理 (改善版)
function splitM4AFile(buffer: ArrayBuffer, maxChunkSize: number = 9 * 1024 * 1024): ArrayBuffer[] {
  console.log('🔧 [Edge Function] m4aファイルの改善された分割処理を開始します');
  
  const view = new DataView(buffer);
  const chunks: ArrayBuffer[] = [];
  let offset = 0;
  let currentChunk: ArrayBuffer[] = [];
  let currentChunkSize = 0;
  
  // MPEG-4ボックスを解析して適切な分割点を見つける
  while (offset < buffer.byteLength - 8) {
    // ボックスサイズを読み取り（ビッグエンディアン）
    const boxSize = view.getUint32(offset, false);
    const boxType = String.fromCharCode(...new Uint8Array(buffer, offset + 4, 4));
    
    // ボックスサイズの妥当性チェック（より厳密に）
    if (boxSize === 0 || boxSize > buffer.byteLength || boxSize < 8 || offset + boxSize > buffer.byteLength) {
      console.log(`🔧 [Edge Function] 無効なボックスサイズ: ${boxSize}, オフセット: ${offset}, 残りバッファ: ${buffer.byteLength - offset}`);
      break;
    }
    
    // 重要なボックスを特定（ftyp, moov, mdat等）
    const isImportantBox = ['ftyp', 'moov', 'mdat', 'trak', 'mdia', 'minf', 'stbl'].includes(boxType);
    console.log(`🔧 [Edge Function] ボックス: ${boxType}, サイズ: ${boxSize}, 重要: ${isImportantBox}, オフセット: ${offset}`);
    
    // 現在のチャンクにこのボックスを追加するとmaxChunkSizeを超える場合
    if (currentChunkSize + boxSize > maxChunkSize && currentChunk.length > 0) {
      // 現在のチャンクを完成させる
      const totalSize = currentChunk.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const completedChunk = new ArrayBuffer(totalSize);
      const completedView = new Uint8Array(completedChunk);
      
      let writeOffset = 0;
      for (const chunk of currentChunk) {
        completedView.set(new Uint8Array(chunk), writeOffset);
        writeOffset += chunk.byteLength;
      }
      
      chunks.push(completedChunk);
      console.log(`🔧 [Edge Function] チャンク ${chunks.length} 完了 (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
      
      // 新しいチャンクを開始
      currentChunk = [];
      currentChunkSize = 0;
    }
    
    // ボックスデータを取得
    const boxData = buffer.slice(offset, offset + boxSize);
    currentChunk.push(boxData);
    currentChunkSize += boxSize;
    
    offset += boxSize;
  }
  
  // 最後のチャンクを追加
  if (currentChunk.length > 0) {
    const totalSize = currentChunk.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const completedChunk = new ArrayBuffer(totalSize);
    const completedView = new Uint8Array(completedChunk);
    
    let writeOffset = 0;
    for (const chunk of currentChunk) {
      completedView.set(new Uint8Array(chunk), writeOffset);
      writeOffset += chunk.byteLength;
    }
    
    chunks.push(completedChunk);
    console.log(`🔧 [Edge Function] 最終チャンク ${chunks.length} 完了 (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
  }
  
  // チャンクサイズの妥当性チェック（より厳密に）
  const validChunks = chunks.filter(chunk => chunk.byteLength >= 1024 * 1024); // 1MB以上
  if (validChunks.length === 0) {
    console.log('🔧 [Edge Function] 有効なチャンクがありません。単純なバイナリ分割を使用します。');
    return splitAudioFile(buffer, maxChunkSize);
  }
  
  console.log(`🔧 [Edge Function] m4aファイルを${validChunks.length}個のチャンクに適切に分割しました`);
  return validChunks;
}

// チャンクをStorageに保存する関数
async function saveChunkToStorage(chunk: ArrayBuffer, fileName: string, chunkIndex: number, fileType: string, supabaseClient: any): Promise<string> {
  const extension = getFileExtension(fileType);
  const chunkFileName = `${fileName}_chunk_${chunkIndex + 1}.${extension}`;
  const storagePath = `meeting-audio-chunks/${chunkFileName}`;
  
  console.log(`🔧 [Edge Function] チャンク ${chunkIndex + 1} をStorageに保存中: ${storagePath} (${(chunk.byteLength / 1024 / 1024).toFixed(2)}MB)`);
  
  try {
    const { data, error } = await supabaseClient.storage
      .from('meeting-files')
      .upload(storagePath, chunk, {
        contentType: fileType,
        upsert: true
      });
    
    if (error) {
      throw new Error(`Storage保存エラー: ${error.message}`);
    }
    
    console.log(`🔧 [Edge Function] チャンク ${chunkIndex + 1} の保存完了: ${storagePath}`);
    return storagePath;
  } catch (error) {
    console.error(`🔧 [Edge Function] チャンク ${chunkIndex + 1} の保存に失敗:`, error);
    throw error;
  }
}

// Storageからチャンクを削除する関数
async function cleanupChunks(chunkPaths: string[], supabaseClient: any): Promise<void> {
  console.log('🔧 [Edge Function] チャンクファイルのクリーンアップを開始');
  
  try {
    const { error } = await supabaseClient.storage
      .from('meeting-files')
      .remove(chunkPaths);
    
    if (error) {
      console.error('🔧 [Edge Function] チャンククリーンアップエラー:', error);
    } else {
      console.log('🔧 [Edge Function] チャンクファイルのクリーンアップ完了');
    }
  } catch (error) {
    console.error('🔧 [Edge Function] チャンククリーンアップに失敗:', error);
  }
}

// 大きなファイルの処理を改善
async function transcribeLargeFile(buffer: ArrayBuffer, fileName: string, fileType: string, openaiApiKey: string, geminiApiKey: string, supabaseClient: any): Promise<string> {
  console.log(`🔧 [Edge Function] 大きなファイルの処理を開始: ${fileName} (${(buffer.byteLength / 1024 / 1024).toFixed(2)}MB)`);
  console.log(`🔧 [Edge Function] ファイル形式: ${fileType}`);
  
  // ファイルサイズに基づいて分割サイズを決定（より小さく設定）
  const fileSizeMB = buffer.byteLength / 1024 / 1024;
  let maxChunkSize = 10 * 1024 * 1024; // 10MBに制限
  
  if (fileSizeMB > 50) {
    maxChunkSize = 8 * 1024 * 1024; // 50MB以上は8MBに制限
  } else if (fileSizeMB > 30) {
    maxChunkSize = 9 * 1024 * 1024; // 30MB以上は9MBに制限
  }
  
  console.log(`🔧 [Edge Function] 分割サイズ: ${(maxChunkSize / 1024 / 1024).toFixed(2)}MB`);
  
  // ファイルタイプに基づいて適切な分割方法を選択
  let chunks: ArrayBuffer[];
  if (fileType.includes('wav') || fileType.includes('wave')) {
    chunks = splitWaveFile(buffer, maxChunkSize);
  } else if (fileType.includes('m4a') || fileType.includes('mp4')) {
    chunks = splitM4AFile(buffer, maxChunkSize);
  } else {
    // その他の形式（mp3, webm, ogg等）は単純分割
    chunks = splitAudioFile(buffer, maxChunkSize);
  }
  
  console.log(`🔧 [Edge Function] ${chunks.length}個のチャンクに分割完了`);
  
  // 各チャンクをStorageに保存してから処理
  const transcriptions: string[] = [];
  const chunkPaths: string[] = [];
  
  try {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔧 [Edge Function] チャンク ${i + 1}/${chunks.length} を処理中... (${(chunk.byteLength / 1024 / 1024).toFixed(2)}MB)`);
      
      try {
        // チャンクをStorageに保存
        const storagePath = await saveChunkToStorage(chunk, fileName, i, fileType, supabaseClient);
        chunkPaths.push(storagePath);
        
        // チャンクサイズが25MB以下の場合はWhisperを使用
        if (chunk.byteLength <= 25 * 1024 * 1024) {
          console.log(`🔧 [Edge Function] チャンク ${i + 1} をWhisperで処理中...`);
          // 適切な拡張子を付けたファイル名を使用
          const extension = getFileExtension(fileType);
          const chunkFileName = `${fileName}_chunk_${i + 1}.${extension}`;
          const transcription = await transcribeSingleFile(chunk, chunkFileName, fileType, openaiApiKey);
          transcriptions.push(transcription);
        } else {
          console.log(`🔧 [Edge Function] チャンク ${i + 1} をGeminiで処理中...`);
          // 適切な拡張子を付けたファイル名を使用
          const extension = getFileExtension(fileType);
          const chunkFileName = `${fileName}_chunk_${i + 1}.${extension}`;
          const transcription = await transcribeWithGemini(chunk, chunkFileName, fileType, geminiApiKey);
          transcriptions.push(transcription);
        }
        
        console.log(`🔧 [Edge Function] チャンク ${i + 1} の処理完了`);
      } catch (error) {
        console.error(`🔧 [Edge Function] チャンク ${i + 1} の処理に失敗:`, error);
        throw new Error(`チャンク ${i + 1} の処理に失敗: ${error.message}`);
      }
    }
    
    // 全ての文字起こし結果を結合
    const fullTranscription = transcriptions.join('\n\n--- チャンク区切り ---\n\n');
    console.log(`🔧 [Edge Function] 全てのチャンクの処理が完了しました。`);
    
    return fullTranscription;
    
  } finally {
    // 処理完了後、チャンクファイルをクリーンアップ
    await cleanupChunks(chunkPaths, supabaseClient);
  }
} 

/**
 * ファイル形式から拡張子を取得
 */
function getFileExtension(fileType: string): string {
  const extensionMap: Record<string, string> = {
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/m4a': 'm4a',
    'audio/mp4': 'mp4',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac',
    'audio/mpeg': 'mpeg',
    'audio/mpga': 'mpga',
    'audio/oga': 'oga'
  }
  
  return extensionMap[fileType] || 'mp3' // デフォルトはmp3
}

/**
 * 時間をフォーマット
 */
function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
} 

/**
 * Gemini APIを使用して音声ファイルを文字起こしする
 */
async function transcribeWithGemini(
  fileBuffer: ArrayBuffer,
  fileName: string,
  fileType: string,
  apiKey: string
): Promise<string> {
  console.log('🔧 [Edge Function] Gemini API経由で文字起こし開始:', fileName);
  
  try {
    // Base64エンコード
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'この音声ファイルを文字起こししてください。日本語で出力してください。'
          }, {
            inline_data: {
              mime_type: fileType,
              data: base64Data
            }
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API エラー: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const transcript = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('🔧 [Edge Function] Gemini API文字起こし完了');
    return transcript;
    
  } catch (error) {
    console.error('🔧 [Edge Function] Gemini API文字起こしエラー:', error);
    throw error;
  }
} 