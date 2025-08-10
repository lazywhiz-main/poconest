// 既存のtranscribeエンドポイントテスト

const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app/transcribe';
const API_KEY = 'eRJn5wte3dPKJp3/MQG/SPtwTnaMcNo/1tg5/08MEeM=';
const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';

async function testExistingTranscribe() {
  console.log('🔧 [Existing Test] 既存transcribeエンドポイントテスト開始');
  
  try {
    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        fileUrl: 'https://example.com/test-audio.mp3',
        meetingId: 'test-meeting-id',
        nestId: 'test-nest-id',
        useGoogleCloud: true,
        callbackUrl: `${SUPABASE_URL}/functions/v1/transcription-complete`
      })
    });

    console.log('🔧 [Existing Test] レスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Existing Test] エラーレスポンス:', errorText);
      return;
    }

    const result = await response.json();
    console.log('🔧 [Existing Test] 成功:', {
      success: result.success,
      jobId: result.jobId,
      message: result.message
    });

  } catch (error) {
    console.error('🔧 [Existing Test] テストエラー:', error);
  }
}

// テスト実行
testExistingTranscribe().then(() => {
  console.log('🔧 [Existing Test] テスト完了');
}).catch(console.error);
