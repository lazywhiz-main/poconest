// 新しいアーキテクチャ統合テスト

const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app/transcribe';
const API_KEY = 'eRJn5wte3dPKJp3/MQG/SPtwTnaMcNo/1tg5/08MEeM=';
const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';

async function testIntegration() {
  console.log('🧪 [Integration Test] 新しいアーキテクチャ統合テスト開始');
  console.log('=====================================');
  
  try {
    // 1. 文字起こしジョブ開始
    console.log('1. 文字起こしジョブ開始テスト');
    const jobResponse = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        fileUrl: 'https://example.com/test-audio.mp3',
        meetingId: 'test-meeting-integration',
        nestId: 'test-nest-integration',
        useGoogleCloud: true,
        callbackUrl: `${SUPABASE_URL}/functions/v1/transcription-complete`
      })
    });

    console.log('ジョブ開始レスポンス:', jobResponse.status);
    
    if (!jobResponse.ok) {
      const errorText = await jobResponse.text();
      console.error('ジョブ開始エラー:', errorText);
      return;
    }

    const jobResult = await jobResponse.json();
    console.log('ジョブ開始成功:', jobResult);
    
    const jobId = jobResult.jobId;
    console.log('生成されたジョブID:', jobId);
    
    // 2. コールバックテスト（模擬）
    console.log('\n2. コールバックテスト（模擬）');
    const callbackResponse = await fetch(`${SUPABASE_URL}/functions/v1/transcription-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'apikey': API_KEY
      },
      body: JSON.stringify({
        jobId: jobId,
        meetingId: 'test-meeting-integration',
        nestId: 'test-nest-integration',
        status: 'success',
        transcript: 'これはテスト用の文字起こし結果です。',
        speakers: [],
        utterances: []
      })
    });

    console.log('コールバックレスポンス:', callbackResponse.status);
    
    if (callbackResponse.ok) {
      const callbackResult = await callbackResponse.json();
      console.log('コールバック成功:', callbackResult);
    } else {
      const errorText = await callbackResponse.text();
      console.error('コールバックエラー:', errorText);
    }

    console.log('\n=====================================');
    console.log('🧪 [Integration Test] 統合テスト完了');

  } catch (error) {
    console.error('🧪 [Integration Test] 統合テストエラー:', error);
  }
}

// テスト実行
testIntegration().catch(console.error);
