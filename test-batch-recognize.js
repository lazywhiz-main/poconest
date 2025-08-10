// batchRecognize機能テストスクリプト

const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app/batch-transcribe';
const API_KEY = 'eRJn5wte3dPKJp3/MQG/SPtwTnaMcNo/1tg5/08MEeM=';
const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';

async function testBatchRecognize() {
  console.log('🔧 [Batch Test] batchRecognizeテスト開始');
  
  try {
    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        gcsFileName: 'test-meeting-id/1234567890_test-audio.mp3',
        meetingId: 'test-meeting-id',
        nestId: 'test-nest-id',
        callbackUrl: `${SUPABASE_URL}/functions/v1/transcription-complete`
      })
    });

    console.log('🔧 [Batch Test] レスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Batch Test] エラーレスポンス:', errorText);
      return;
    }

    const result = await response.json();
    console.log('🔧 [Batch Test] 成功:', {
      success: result.success,
      jobId: result.jobId,
      message: result.message
    });

  } catch (error) {
    console.error('🔧 [Batch Test] テストエラー:', error);
  }
}

// テスト実行
testBatchRecognize().then(() => {
  console.log('🔧 [Batch Test] テスト完了');
}).catch(console.error);
