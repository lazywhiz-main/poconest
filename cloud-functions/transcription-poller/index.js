const { CloudSchedulerClient } = require('@google-cloud/scheduler');
const { SpeechClient } = require('@google-cloud/speech');
const speechV2 = require('@google-cloud/speech').v2;
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');

// Google Cloud Speech-to-Text クライアント
const speechClient = new SpeechClient(); // v1 for legacy
const speechV2Client = new speechV2.SpeechClient(); // v2 for batchRecognize

// Google Cloud Storage クライアント
const storage = new Storage();

// Cloud Scheduler クライアント
const scheduler = new CloudSchedulerClient();

console.log('✅ [Poller] Google Cloud クライアント初期化成功');
console.log('🔧 [Poller] SpeechClient タイプ:', typeof speechClient);
console.log('🔧 [Poller] SpeechV2Client タイプ:', typeof speechV2Client);
console.log('🔧 [Poller] SpeechV2Client batchRecognize:', typeof speechV2Client.batchRecognize);

/**
 * Cloud Functionsエントリーポイント (Pub/Subトリガー)
 */
exports.pollTranscription = async (message, context) => {
  try {
    console.log('🔧 [Poller] ポーリング開始');
    
    // Pub/Subメッセージからジョブ情報を取得
    console.log('🔧 [Poller] 受信メッセージ:', message);
    console.log('🔧 [Poller] メッセージデータ:', message.data);
    
    const messageData = Buffer.from(message.data, 'base64').toString();
    console.log('🔧 [Poller] デコードされたメッセージ:', messageData);
    
    let jobData;
    try {
      jobData = JSON.parse(messageData);
      console.log('🔧 [Poller] パースされたジョブデータ:', jobData);
    } catch (parseError) {
      console.error('❌ [Poller] JSONパースエラー:', parseError);
      console.error('❌ [Poller] パース失敗したメッセージ:', messageData);
      throw new Error(`JSONパースエラー: ${parseError.message}, メッセージ: ${messageData}`);
    }
    
    // 空のメッセージやポーリングメッセージの場合は早期リターン
    if (!jobData || Object.keys(jobData).length === 0 || jobData.action === 'poll') {
      console.log('🔧 [Poller] ポーリングメッセージまたは空のメッセージ、既存ジョブをチェック');
      return;
    }
    
    // 必須パラメータの検証
    const { audioUri, jobId, meetingId, nestId, outputUri, callbackUrl } = jobData;
    
    if (!audioUri || !jobId || !meetingId || !nestId || !outputUri || !callbackUrl) {
      throw new Error(`必須パラメータが不足: audioUri=${audioUri}, jobId=${jobId}, meetingId=${meetingId}, nestId=${nestId}, outputUri=${outputUri}, callbackUrl=${callbackUrl}`);
    }
    
    console.log(`🔧 [Poller] ジョブ確認: ${jobId}, 音声ファイル: ${audioUri}`);
    
    // 初回実行: Speech-to-Text開始
    console.log(`🚀 [Poller] 初回実行: Speech-to-Text開始: ${jobId}`);
    await startSpeechToText(audioUri, jobId, meetingId, nestId, outputUri, callbackUrl);
    
  } catch (error) {
    console.error('🔧 [Poller] ポーリングエラー:', error);
    // エラー時も継続（Cloud Schedulerが再実行）
  }
};

/**
 * Speech-to-Text処理開始
 */
async function startSpeechToText(audioUri, jobId, meetingId, nestId, outputUri, callbackUrl) {
  try {
    console.log(`🚀 [Poller] Speech-to-Text開始: ${audioUri}`);
    
    // Speech-to-Text API v2の正しいリクエスト形式（公式ドキュメント準拠）
    const request = {
      recognizer: `projects/${process.env.GOOGLE_CLOUD_PROJECT || '753651631159'}/locations/global/recognizers/_`,
      config: {
        autoDecodingConfig: {},
        features: {
          enableWordConfidence: true,
          enableWordTimeOffsets: true,
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: 2,
          enableAutomaticPunctuation: true
        },
        model: 'long',
        languageCodes: ['ja-JP']
      },
      files: [{
        uri: audioUri
      }],
      recognitionOutputConfig: {
        gcsOutputConfig: {
          uri: outputUri
        }
      }
    };

    console.log(`🔧 [Poller] Speech-to-Text リクエスト送信:`, JSON.stringify(request, null, 2));
    
    // Google Cloud Speech-to-Text v2 APIの正しい呼び出し
    console.log('🔧 [Poller] Speech-to-Text v2 APIを呼び出し中...');
    
    // v2クライアントの構造をデバッグ出力
    console.log('🔧 [Poller] SpeechV2Client タイプ:', typeof speechV2Client);
    console.log('🔧 [Poller] SpeechV2Client コンストラクタ名:', speechV2Client.constructor.name);
    console.log('🔧 [Poller] SpeechV2Client プロパティ:', Object.getOwnPropertyNames(speechV2Client));
    
    // v2 APIの正しい呼び出し方法
    let operation;
    let operationName;
    
    try {
      // v2 APIのbatchRecognizeを使用
      if (typeof speechV2Client.batchRecognize === 'function') {
        console.log('🔧 [Poller] speechV2Client.batchRecognize を使用（v2）');
        operation = await speechV2Client.batchRecognize(request);
        console.log('🔧 [Poller] batchRecognize 応答:', JSON.stringify(operation, null, 2));
        console.log('🔧 [Poller] operation タイプ:', typeof operation);
        console.log('🔧 [Poller] operation プロパティ:', Object.getOwnPropertyNames(operation));
        
        // batchRecognizeの応答は配列形式で返される
        if (Array.isArray(operation) && operation.length > 0) {
          const firstOperation = operation[0];
          console.log('🔧 [Poller] 配列の最初の要素:', firstOperation);
          
          if (firstOperation && firstOperation.name) {
            operationName = firstOperation.name;
            console.log('🔧 [Poller] operationName 設定:', operationName);
          } else {
            console.error('❌ [Poller] 最初の要素にoperation.nameが含まれていません:', firstOperation);
            throw new Error('Speech-to-Text v2 APIの応答にoperation.nameが含まれていません');
          }
        } else if (operation && operation.name) {
          // 直接オブジェクトとして返される場合
          operationName = operation.name;
          console.log('🔧 [Poller] operationName 設定 (直接):', operationName);
        } else {
          console.error('❌ [Poller] operation.name が見つかりません:', operation);
          throw new Error('Speech-to-Text v2 APIの応答にoperation.nameが含まれていません');
        }
      } else {
        throw new Error(`batchRecognize メソッドが見つかりません。Speech-to-Text v2の正しいクライアント構造を確認してください。`);
      }
    } catch (error) {
      console.error('🔧 [Poller] batchRecognize呼び出しエラー:', error);
      throw error;
    }
    
    console.log(`✅ [Poller] Speech-to-Text 操作開始: ${operationName}`);
    
    // 初回ポーリング実行
    await checkOperationStatus(operationName, jobId, meetingId, nestId, outputUri, callbackUrl);
    
  } catch (error) {
    console.error(`❌ [Poller] Speech-to-Text開始エラー:`, error);
    
    // エラーの詳細情報をログ出力
    if (error.code) {
      console.error(`🔧 [Poller] エラーコード: ${error.code}`);
    }
    if (error.details) {
      console.error(`🔧 [Poller] エラー詳細: ${error.details}`);
    }
    
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'error',
      error: `Speech-to-Text開始失敗: ${error.message}`
    });
  }
}

/**
 * 操作状態確認とポーリング
 */
async function checkOperationStatus(operationName, jobId, meetingId, nestId, outputUri, callbackUrl) {
  try {
    console.log(`🔍 [Poller] 操作状態確認: ${operationName}`);
    
    // Speech-to-Text v2 API操作状態を確認
    if (!speechV2Client) {
      throw new Error(`Speech-to-Text v2 クライアントが初期化されていません`);
    }
    
    const [operation] = await speechV2Client.operationsClient.getOperation({
      name: operationName
    });
    
    console.log(`🔧 [Poller] 操作状態: done=${operation.done}`);
    
    if (operation.done) {
      console.log(`🔧 [Poller] 文字起こし完了検出: ${jobId}`);
      
      // エラーチェック: operation.error または response.results内のエラー
      let hasError = false;
      let errorMessage = '';
      
      if (operation.error) {
        hasError = true;
        errorMessage = operation.error.message;
        console.error(`🔧 [Poller] Speech-to-Text処理エラー (operation.error):`, operation.error);
      } else if (operation.response && operation.response.results) {
        // response.results内のエラーをチェック
        for (const [fileUri, result] of Object.entries(operation.response.results)) {
          if (result.error) {
            hasError = true;
            errorMessage = result.error.message;
            console.error(`🔧 [Poller] Speech-to-Text処理エラー (response.results):`, result.error);
            break;
          }
        }
      }
      
      if (hasError) {
        await sendCallback(callbackUrl, {
          jobId,
          meetingId,
          nestId,
          status: 'error',
          error: `Speech-to-Text処理エラー: ${errorMessage}`
        });
      } else {
        // 成功: 結果を取得してコールバック
        await processCompletedOperation(outputUri, jobId, meetingId, nestId, callbackUrl);
      }
      
    } else {
      console.log(`⏳ [Poller] まだ処理中: ${jobId}, 30秒後に再確認`);
      // 30秒後に再実行（Cloud Schedulerが2分間隔で実行）
    }
    
  } catch (error) {
    console.error(`❌ [Poller] 操作状態確認エラー:`, error);
    // エラー時も継続（Cloud Schedulerが再実行）
  }
}

/**
 * 完了した操作を処理
 */
async function processCompletedOperation(outputUri, jobId, meetingId, nestId, callbackUrl) {
  try {
    console.log(`🔧 [Poller] 結果取得開始: ${outputUri}`);
    
    // 結果ファイルが作成されるまで待機（最大5分）
    const maxWaitTime = 5 * 60 * 1000; // 5分
    const checkInterval = 10 * 1000; // 10秒間隔
    let waitedTime = 0;
    
    while (waitedTime < maxWaitTime) {
      try {
        const result = await getTranscriptionResult(outputUri, jobId);
        console.log(`🔧 [Poller] 結果取得成功、コールバック送信: ${callbackUrl}`);
        
        await sendCallback(callbackUrl, {
          jobId,
          meetingId,
          nestId,
          status: 'completed',
          transcriptionResult: result
        });
        
        console.log(`🔧 [Poller] 処理完了: ${jobId}`);
        return; // 成功したら終了
        
      } catch (fileError) {
        if (fileError.message.includes('結果ファイルが見つかりません')) {
          console.log(`⏳ [Poller] 結果ファイルまだ作成中: ${jobId}, ${waitedTime/1000}秒経過`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waitedTime += checkInterval;
        } else {
          // ファイル以外のエラーの場合は再スロー
          throw fileError;
        }
      }
    }
    
    // タイムアウト
    throw new Error(`結果ファイルの作成がタイムアウトしました: ${jobId}`);
    
  } catch (error) {
    console.error(`🔧 [Poller] 結果処理エラー:`, error);
    
    await sendCallback(callbackUrl, {
      jobId,
      meetingId,
      nestId,
      status: 'error',
      error: `結果取得エラー: ${error.message}`
    });
  }
}

/**
 * GCSから文字起こし結果を取得
 */
async function getTranscriptionResult(outputUri, jobId) {
  const bucketName = 'poconest-transcription-results';
  const fileName = outputUri.replace(`gs://${bucketName}/`, '');
  
  console.log(`🔧 [Poller] GCSファイル取得: ${fileName}`);
  
  const bucket = storage.bucket(bucketName);
  const directFile = bucket.file(fileName);
  const [directExists] = await directFile.exists();
  
  if (directExists) {
    const [contents] = await directFile.download();
    return JSON.parse(contents.toString());
  } else {
    // ディレクトリ内検索
    const [files] = await bucket.getFiles({ prefix: fileName });
    const jsonFile = files.find(file => file.name.endsWith('.json'));
    
    if (!jsonFile) {
      throw new Error(`結果ファイルが見つかりません: ${fileName}`);
    }
    
    const [contents] = await jsonFile.download();
    return JSON.parse(contents.toString());
  }
}

/**
 * コールバック送信
 */
async function sendCallback(callbackUrl, data) {
  console.log(`🔧 [Poller] コールバック送信: ${callbackUrl}`, data);
  
  // Supabase認証ヘッダーを追加
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWtmY2d0bWFidGZvemZjdmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NjE3MjQsImV4cCI6MjA2MjUzNzcyNH0.1fj7lpHMYyBv1mMGxn8igtE9SFBnmJFh-Zp8Nb-jzdE'}`
  };
  
  await axios.post(callbackUrl, data, {
    headers,
    timeout: 30000
  });
}

/**
 * Schedulerジョブを削除
 */
async function deleteSchedulerJob(jobName) {
  try {
    await scheduler.deleteJob({ name: jobName });
    console.log(`🔧 [Poller] Schedulerジョブ削除完了: ${jobName}`);
  } catch (error) {
    console.warn(`🔧 [Poller] Schedulerジョブ削除失敗: ${error.message}`);
  }
}