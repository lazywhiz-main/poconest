const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const speech = require('@google-cloud/speech');
const speechV2 = require('@google-cloud/speech').v2;
const { Storage } = require('@google-cloud/storage');
// const { CloudSchedulerClient } = require('@google-cloud/scheduler');
// const { PubSub } = require('@google-cloud/pubsub');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// CORS設定
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Google Cloud Speech-to-Text クライアント
const speechClient = new speech.SpeechClient(); // v1 for legacy
const speechV2Client = new speechV2.SpeechClient(); // v2 for batchRecognize

// Google Cloud Storage クライアント
const storage = new Storage();

// Cloud Scheduler, Pub/Sub クライアント (一時的にコメントアウト)
// const scheduler = new CloudSchedulerClient();
// const pubsub = new PubSub();

// 一時ファイル保存用ディレクトリ
const TEMP_DIR = '/tmp';

// 音声変換関数
async function convertAudioToFlac(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('flac')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// Google Cloud Speech-to-Text で文字起こし
async function transcribeWithGoogleCloud(audioPath) {
  const audioBytes = fs.readFileSync(audioPath).toString('base64');
  
  const audio = {
    content: audioBytes,
  };
  
  const config = {
    encoding: 'FLAC',
    sampleRateHertz: 16000,
    languageCode: 'ja-JP',
    enableSpeakerDiarization: true,
    diarizationSpeakerCount: 0,
    enableAutomaticPunctuation: true,
    enableWordTimeOffsets: true,
    model: 'latest_long',
    useEnhanced: true,
  };
  
  const request = {
    audio: audio,
    config: config,
  };
  
  const [operation] = await speechClient.longRunningRecognize(request);
  const [response] = await operation.promise();
  
  return response;
}

// 署名付きURL生成関数
async function generateSignedUrl(bucketName, fileName, contentType) {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);
  
  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 60 * 60 * 1000, // 1時間
    contentType: contentType,
    conditions: [
      ['content-length-range', 0, 524288000] // 最大500MB
    ]
  });
  
  return signedUrl;
}

// 結果を整形
function formatTranscriptionResult(apiResult) {
  const speakers = new Map();
  const utterances = [];
  let fullTranscript = '';
  
  for (const result of apiResult.results) {
    fullTranscript += result.alternatives[0].transcript + ' ';
    
    if (result.alternatives[0].words) {
      for (const word of result.alternatives[0].words) {
        const speakerTag = word.speakerTag || 1;
        
        utterances.push({
          word: word.word,
          startTime: parseFloat(word.startTime.replace('s', '')),
          endTime: parseFloat(word.endTime.replace('s', '')),
          speakerTag,
          confidence: word.confidence || 0,
        });
        
        if (!speakers.has(speakerTag)) {
          speakers.set(speakerTag, {
            speakerTag,
            name: `話者${speakerTag}`,
            totalTime: 0,
            wordCount: 0,
          });
        }
        
        const speaker = speakers.get(speakerTag);
        speaker.totalTime += parseFloat(word.endTime.replace('s', '')) - parseFloat(word.startTime.replace('s', ''));
        speaker.wordCount++;
      }
    }
  }
  
  return {
    transcript: fullTranscript.trim(),
    speakers: Array.from(speakers.values()),
    utterances,
    confidence: apiResult.results[0]?.alternatives[0]?.confidence || 0,
    languageCode: 'ja-JP',
  };
}

// コールバック送信
async function sendCallback(callbackUrl, data) {
  try {
    // Supabase Edge Functionへの認証ヘッダーを追加
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    await axios.post(callbackUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      timeout: 30000, // 30秒に延長
    });
    console.log('✅ コールバック送信成功');
  } catch (error) {
    console.error('❌ コールバック送信エラー:', error.message);
    if (error.response) {
      console.error('❌ レスポンス詳細:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  }
}

// API キー認証ミドルウェア
function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid API key'
    });
  }
  
  next();
}



// メイン処理エンドポイント
app.post('/transcribe', authenticateApiKey, async (req, res) => {
  const { fileUrl, meetingId, nestId, useGoogleCloud, callbackUrl } = req.body;
  
  if (!fileUrl || !meetingId || !nestId) {
    return res.status(400).json({
      error: 'MISSING_PARAMETERS',
      message: '必要なパラメータが不足しています'
    });
  }
  
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🔧 [Cloud Run] 文字起こし開始: ${jobId}`);
  console.log(`🔧 [Cloud Run] ファイルURL: ${fileUrl}`);
  
  // 非同期処理を開始
  processTranscriptionAsync(jobId, fileUrl, meetingId, nestId, useGoogleCloud, callbackUrl);
  
  res.json({
    success: true,
    jobId: jobId,
    message: '文字起こし処理を開始しました'
  });
});

// 非同期処理関数
async function processTranscriptionAsync(jobId, fileUrl, meetingId, nestId, useGoogleCloud, callbackUrl) {
  try {
    console.log(`🔧 [Cloud Run] 処理開始: ${jobId}`);
    
    // ファイルをダウンロード
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5分
    });
    
    const audioBuffer = Buffer.from(response.data);
    const inputPath = path.join(TEMP_DIR, `input_${jobId}.audio`);
    const outputPath = path.join(TEMP_DIR, `output_${jobId}.flac`);
    
    // ファイルを保存
    fs.writeFileSync(inputPath, audioBuffer);
    console.log(`🔧 [Cloud Run] ファイル保存完了: ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // 音声変換
    console.log(`🔧 [Cloud Run] 音声変換開始`);
    await convertAudioToFlac(inputPath, outputPath);
    console.log(`🔧 [Cloud Run] 音声変換完了`);
    
    // 文字起こし
    console.log(`🔧 [Cloud Run] 文字起こし開始`);
    const transcriptionResult = await transcribeWithGoogleCloud(outputPath);
    console.log(`🔧 [Cloud Run] 文字起こし完了`);
    
    // 結果を整形
    const formattedResult = formatTranscriptionResult(transcriptionResult);
    
    // コールバック送信（データサイズを削減）
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'success',
      transcript: formattedResult.transcript,
      // speakersとutterancesは後で別途処理
      speakers: [], // 空配列に変更
      utterances: [], // 空配列に変更
    });
    
    console.log(`🔧 [Cloud Run] 処理完了: ${jobId}`);
    
  } catch (error) {
    console.error(`🔧 [Cloud Run] 処理エラー: ${jobId}`, error);
    
    // エラーコールバック送信
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'error',
      error: error.message,
    });
  } finally {
    // 一時ファイルを削除
    try {
      const inputPath = path.join(TEMP_DIR, `input_${jobId}.audio`);
      const outputPath = path.join(TEMP_DIR, `output_${jobId}.flac`);
      
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (error) {
      console.error('一時ファイル削除エラー:', error);
    }
  }
}

// 新しいアーキテクチャ用のbatchRecognizeエンドポイント
app.post('/batch-transcribe', authenticateApiKey, async (req, res) => {
  try {
    const { gcsFileName, meetingId, nestId, callbackUrl } = req.body;
    
    if (!gcsFileName || !meetingId || !callbackUrl) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: '必要なパラメータが不足しています'
      });
    }
    
    console.log(`🔧 [Cloud Run] batchRecognize開始: ${gcsFileName}`);
    
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 非同期でbatchRecognize処理を開始
    processBatchTranscriptionAsync(gcsFileName, jobId, meetingId, nestId, callbackUrl);
    
    res.json({
      success: true,
      jobId: jobId,
      message: 'batchRecognize処理を開始しました'
    });
    
  } catch (error) {
    console.error('🔧 [Cloud Run] batchRecognizeエラー:', error);
    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: `処理中にエラーが発生しました: ${error.message}`
    });
  }
});

// batchRecognize非同期処理関数
async function processBatchTranscriptionAsync(audioUri, jobId, meetingId, nestId, callbackUrl) {
  try {
    console.log(`🚀 [Cloud Run] 非同期文字起こし処理開始: ${audioUri}`);
    
    // 新しいアーキテクチャ: Cloud Runは直接Speech-to-Textを呼び出さない
    // 代わりにPub/Subメッセージを送信してCloud Functionsに委譲
    
    console.log(`📤 [Cloud Run] 新しいアーキテクチャ: Pub/Sub経由でCloud Functionsに委譲`);
    
    // Cloud Scheduler + Pub/Sub でポーリング開始
    setImmediate(() => {
      startPollingWithScheduler(null, jobId, meetingId, nestId, `gs://poconest-transcription-results/${jobId}/`, callbackUrl);
    });
    
    console.log(`✅ [Cloud Run] 即座レスポンス: ポーリング処理をCloud Functionsに委譲`);
    
  } catch (error) {
    console.error(`❌ [Cloud Run] 非同期文字起こし処理エラー:`, error);
    await sendCallback(callbackUrl, {
      status: 'error',
      message: 'Pub/Sub メッセージ送信失敗',
      error: error.message
    });
  }
}

// Cloud Scheduler + Pub/Sub でポーリング開始
async function startPollingWithScheduler(operationName, jobId, meetingId, nestId, outputUri, callbackUrl) {
  try {
    console.log(`🚀 [Cloud Run] Cloud Scheduler + Pub/Sub でポーリング開始: ${jobId}`);
    
    // 正しいURI形式を構築
    const audioUri = `gs://poconest-audio-files/${jobId}`;
    const correctedOutputUri = `gs://poconest-transcription-results/${jobId}/`;
    
    // Pub/Sub メッセージを送信
    const message = {
      audioUri,
      jobId,
      meetingId,
      nestId,
      outputUri: correctedOutputUri,
      callbackUrl,
      startTime: new Date().toISOString()
    };

    console.log(`🔧 [Cloud Run] Pub/Sub メッセージ内容:`, JSON.stringify(message, null, 2));

    // Pub/Sub トピックにメッセージを送信
    const {PubSub} = require('@google-cloud/pubsub');
    const pubsub = new PubSub();
    const topicName = 'transcription-jobs';
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await pubsub.topic(topicName).publish(messageBuffer);
    
    console.log(`✅ [Cloud Run] Pub/Sub メッセージ送信完了: ${messageId}`);
    console.log(`📤 [Cloud Run] ポーリング処理をCloud Functionsに委譲: ${jobId}`);
    
  } catch (error) {
    console.error(`❌ [Cloud Run] Cloud Scheduler + Pub/Sub 開始エラー:`, error);
    // フォールバック: 直接コールバック送信
    await sendCallback(callbackUrl, {
      status: 'error',
      message: 'Cloud Scheduler + Pub/Sub 開始失敗',
      error: error.message
    });
  }
}

// インライン応答で完了した操作の結果を処理
async function processCompletedOperationInline(operation, jobId, meetingId, nestId, callbackUrl) {
  try {
    console.log(`🔧 [Cloud Run] インライン結果処理開始: ${jobId}`);
    
    // インライン応答から結果を取得
    const response = operation.response;
    console.log(`🔧 [Cloud Run] 操作応答:`, Object.keys(response || {}));
    console.log(`🔧 [Cloud Run] 操作応答の詳細:`, JSON.stringify(response, null, 2));
    
    // Protocol Buffers形式の場合はvalueをデコード
    let batchRecognizeResponse;
    if (response && response.type_url && response.value) {
      console.log(`🔧 [Cloud Run] Protocol Buffers応答をデコード中...`);
      
      // Googleのプロトコルバッファレスポンスをデコード
      try {
        // Buffer形式のvalueをデコード
        const buffer = Buffer.from(response.value, 'base64');
        console.log(`🔧 [Cloud Run] バッファサイズ: ${buffer.length}`);
        
        // とりあえず直接応答として扱う（手動デコードは複雑）
        batchRecognizeResponse = response;
        console.log(`🔧 [Cloud Run] Protocol Buffersのため直接応答として処理`);
      } catch (decodeError) {
        console.error(`🔧 [Cloud Run] デコードエラー:`, decodeError);
        
        // 直接応答として扱う
        batchRecognizeResponse = response;
      }
    } else {
      batchRecognizeResponse = response;
    }
    
    if (!batchRecognizeResponse || !batchRecognizeResponse.results) {
      console.error(`🔧 [Cloud Run] 結果構造エラー:`, batchRecognizeResponse);
      throw new Error('応答に結果が含まれていません');
    }
    
    // 結果を整形
    const transcript = batchRecognizeResponse.results.map(r => 
      r.alternatives?.[0]?.transcript || ''
    ).join(' ') || '';
    
    console.log(`🔧 [Cloud Run] 文字起こし結果: ${transcript.substring(0, 200)}...`);
    
    // 話者情報を抽出
    const speakers = [];
    const utterances = [];
    
    if (batchRecognizeResponse.results) {
      batchRecognizeResponse.results.forEach(speechResult => {
        if (speechResult.alternatives?.[0]?.words) {
          speechResult.alternatives[0].words.forEach(word => {
            utterances.push({
              speakerTag: word.speakerTag || 0,
              word: word.word,
              startTime: word.startTime,
              endTime: word.endTime,
              confidence: word.confidence
            });
          });
        }
      });
    }
    
    // 完了コールバック送信
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'completed',
      transcript: transcript,
      speakers: speakers,
      utterances: utterances,
    });
    
    console.log(`🔧 [Cloud Run] インライン結果処理完了: ${jobId}`);
    
  } catch (error) {
    console.error(`🔧 [Cloud Run] インライン結果処理エラー:`, error);
    
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'error',
      error: `インライン結果処理エラー: ${error.message}`,
    });
  }
}

// 完了した操作の結果を処理
async function processCompletedOperation(outputUri, jobId, meetingId, nestId, callbackUrl) {
  try {
    console.log(`🔧 [Cloud Run] 結果処理開始: ${outputUri}`);
    
    // GCSファイル保存を待機（5秒）
    console.log(`🔧 [Cloud Run] GCSファイル保存を5秒待機...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // GCSから結果を取得
    const transcriptionResult = await getTranscriptionResult(outputUri, jobId);
    
    console.log(`🔧 [Cloud Run] 文字起こし結果取得完了: ${transcriptionResult.transcript.substring(0, 100)}...`);
    
    // 完了コールバック送信
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'completed',
      transcript: transcriptionResult.transcript,
      speakers: transcriptionResult.speakers || [],
      utterances: transcriptionResult.utterances || [],
    });
    
    console.log(`🔧 [Cloud Run] 結果処理完了: ${jobId}`);
    
  } catch (error) {
    console.error(`🔧 [Cloud Run] 結果処理エラー:`, error);
    
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'error',
      error: `結果処理エラー: ${error.message}`,
    });
  }
}

// Speech-to-Text v2結果をGCSから取得
async function getTranscriptionResult(outputUri, jobId) {
  try {
    console.log(`🔧 [Cloud Run] GCS結果取得開始: ${outputUri}`);
    
    // outputUriから直接ファイルを取得
    const uriMatch = outputUri.match(/gs:\/\/([^\/]+)\/(.+)/);
    if (!uriMatch) {
      throw new Error(`無効なoutputUri: ${outputUri}`);
    }
    
    const bucketName = uriMatch[1];
    const fileName = uriMatch[2];
    
    console.log(`🔧 [Cloud Run] バケット: ${bucketName}, ファイル名: ${fileName}`);
    
    const bucket = storage.bucket(bucketName);
    
    // まず直接ファイルを試す
    const directFile = bucket.file(fileName);
    const [directExists] = await directFile.exists();
    
    if (directExists) {
      console.log(`🔧 [Cloud Run] 直接ファイル取得: ${fileName}`);
      const [content] = await directFile.download();
      const result = JSON.parse(content.toString());
      return parseTranscriptionResultV2(result);
    }
    
    // 直接ファイルが存在しない場合、ディレクトリ内を検索
    console.log(`🔧 [Cloud Run] ディレクトリ内検索開始: ${fileName}`);
    const [files] = await bucket.getFiles({ prefix: fileName });
    
    if (files.length === 0) {
      throw new Error(`結果ファイルが見つかりません: ${fileName}`);
    }
    
    // .jsonファイルを検索
    const jsonFile = files.find(file => file.name.endsWith('.json'));
    if (!jsonFile) {
      throw new Error(`JSONファイルが見つかりません in ${fileName}`);
    }
    
    console.log(`🔧 [Cloud Run] 結果ファイル取得: ${jsonFile.name}`);
    
    // ファイルをダウンロード
    const [content] = await jsonFile.download();
    const result = JSON.parse(content.toString());
    
    console.log(`🔧 [Cloud Run] JSON解析完了`);
    console.log('🔧 [Cloud Run] 結果構造:', Object.keys(result));
    
    // Speech-to-Text v2の結果構造に対応
    const transcript = result.results?.map(r => 
      r.alternatives?.[0]?.transcript || ''
    ).join(' ') || '';
    
    console.log(`🔧 [Cloud Run] 文字起こし結果: ${transcript.substring(0, 200)}...`);
    
    // 話者情報を抽出
    const speakers = [];
    const utterances = [];
    
    if (result.results) {
      result.results.forEach(speechResult => {
        if (speechResult.alternatives?.[0]?.words) {
          speechResult.alternatives[0].words.forEach(word => {
            utterances.push({
              speakerTag: word.speakerTag || 0,
              word: word.word,
              startTime: word.startTime,
              endTime: word.endTime,
              confidence: word.confidence
            });
          });
        }
      });
    }
    
    return {
      transcript: transcript,
      speakers: speakers,
      utterances: utterances
    };
    
  } catch (error) {
    console.error('🔧 [Cloud Run] 結果取得エラー:', error);
    throw error;
  }
}

// 署名付きURL生成エンドポイント（認証一時無効化）
app.post('/generate-upload-url', async (req, res) => {
  try {
    const { fileName, fileType, meetingId, gcsFileName: providedGcsFileName } = req.body;
    
    if (!fileName || !fileType || !meetingId) {
      return res.status(400).json({
        error: 'MISSING_PARAMETERS',
        message: '必要なパラメータが不足しています'
      });
    }
    
    console.log('🔧 [Cloud Run] 署名付きURL生成開始:', { fileName, fileType, meetingId, providedGcsFileName });
    
    // GCSバケットとファイル名の設定
    const bucketName = 'poconest-audio-files';
    const gcsFileName = providedGcsFileName || `${meetingId}/${Date.now()}_${fileName}`;
    
    // 署名付きURL生成
    const signedUrl = await generateSignedUrl(bucketName, gcsFileName, fileType);
    
    console.log('🔧 [Cloud Run] 署名付きURL生成完了:', { gcsFileName });
    
    res.json({
      success: true,
      signedUrl,
      gcsFileName,
      bucketName,
      message: '署名付きURLを生成しました'
    });
    
  } catch (error) {
    console.error('🔧 [Cloud Run] 署名付きURL生成エラー:', error);
    res.status(500).json({
      error: 'PROCESSING_ERROR',
      message: `署名付きURL生成中にエラーが発生しました: ${error.message}`
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: 'v2.3.0-simple-test',
    speechV2HasBatchRecognize: typeof speechV2Client.batchRecognize === 'function',
    speechV2Type: typeof speechV2Client
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🔧 [Cloud Run] サーバー起動: ポート ${PORT}`);
  console.log(`🔧 [Cloud Run] 環境: ${process.env.NODE_ENV || 'development'}`);
});
