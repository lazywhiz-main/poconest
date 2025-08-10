// Phase 2 テストスクリプト
// 署名付きURL生成とアップロード機能のテスト

const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWtmY2d0bWFidGZvemZjdmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NjE3MjQsImV4cCI6MjA2MjUzNzcyNH0.1fj7lpHMYyBv1mMGxn8igtE9SFBnmJFh-Zp8Nb-jzdE';

async function testSignedUrlGeneration() {
  console.log('🔧 [Test] 署名付きURL生成テスト開始');
  
  try {
    // 1. 署名付きURL生成リクエスト
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        fileName: 'test-audio.mp3',
        fileType: 'audio/mpeg',
        meetingId: 'test-meeting-id'
      })
    });

    console.log('🔧 [Test] レスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Test] エラーレスポンス:', errorText);
      
      // エラーの詳細を確認
      try {
        const errorJson = JSON.parse(errorText);
        console.error('🔧 [Test] エラー詳細:', errorJson);
      } catch (e) {
        console.error('🔧 [Test] エラーレスポンス（JSON解析失敗）:', errorText);
      }
      return;
    }

    const result = await response.json();
    console.log('🔧 [Test] 署名付きURL生成成功:', {
      success: result.success,
      gcsFileName: result.gcsFileName,
      bucketName: result.bucketName,
      signedUrlLength: result.signedUrl ? result.signedUrl.length : 0
    });

    if (result.success && result.signedUrl) {
      console.log('🔧 [Test] 署名付きURLの先頭部分:', result.signedUrl.substring(0, 100) + '...');
    }

  } catch (error) {
    console.error('🔧 [Test] テストエラー:', error);
  }
}

async function testCloudRunTranscription() {
  console.log('🔧 [Test] Cloud Run文字起こしテスト開始');
  
  try {
    const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app/transcribe';
    const API_KEY = 'eRJn5wte3dPKJp3/MQG/SPtwTnaMcNo/1tg5/08MEeM=';

    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        fileUrl: 'gs://poconest-audio-files/test-meeting-id/1234567890_test-audio.mp3',
        meetingId: 'test-meeting-id',
        useGoogleCloud: true,
        callbackUrl: `${SUPABASE_URL}/functions/v1/transcription-complete`
      })
    });

    console.log('🔧 [Test] Cloud Runレスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Test] Cloud Runエラーレスポンス:', errorText);
      
      // エラーの詳細を確認
      try {
        const errorJson = JSON.parse(errorText);
        console.error('🔧 [Test] Cloud Runエラー詳細:', errorJson);
      } catch (e) {
        console.error('🔧 [Test] Cloud Runエラーレスポンス（JSON解析失敗）:', errorText);
      }
      return;
    }

    const result = await response.json();
    console.log('🔧 [Test] Cloud Run文字起こし成功:', {
      success: result.success,
      jobId: result.jobId,
      message: result.message
    });

  } catch (error) {
    console.error('🔧 [Test] Cloud Runテストエラー:', error);
  }
}

// 認証なしでテスト（Edge Functionの認証チェックを一時的に無効化）
async function testSignedUrlGenerationWithoutAuth() {
  console.log('🔧 [Test] 認証なし署名付きURL生成テスト開始');
  
  try {
    // 1. 署名付きURL生成リクエスト（認証なし）
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'test-audio.mp3',
        fileType: 'audio/mpeg',
        meetingId: 'test-meeting-id'
      })
    });

    console.log('🔧 [Test] 認証なしレスポンスステータス:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Test] 認証なしエラーレスポンス:', errorText);
      return;
    }

    const result = await response.json();
    console.log('🔧 [Test] 認証なし署名付きURL生成成功:', {
      success: result.success,
      gcsFileName: result.gcsFileName,
      bucketName: result.bucketName
    });

  } catch (error) {
    console.error('🔧 [Test] 認証なしテストエラー:', error);
  }
}

// テスト実行
async function runTests() {
  console.log('🧪 Phase 2 テスト開始');
  console.log('=====================================');
  
  console.log('1. 認証ありテスト');
  await testSignedUrlGeneration();
  console.log('-------------------------------------');
  
  console.log('2. 認証なしテスト');
  await testSignedUrlGenerationWithoutAuth();
  console.log('-------------------------------------');
  
  console.log('3. Cloud Runテスト');
  await testCloudRunTranscription();
  
  console.log('=====================================');
  console.log('🧪 Phase 2 テスト完了');
}

// Node.js環境で実行
if (typeof window === 'undefined') {
  runTests().catch(console.error);
} else {
  // ブラウザ環境では手動実行
  window.runPhase2Tests = runTests;
  console.log('🔧 ブラウザ環境です。window.runPhase2Tests() でテストを実行してください。');
}
