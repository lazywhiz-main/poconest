// シンプルなテストスクリプト
// Edge Functionの基本的な動作確認

const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';

async function testEdgeFunctionBasic() {
  console.log('🔧 [Simple Test] Edge Function基本テスト開始');
  
  try {
    // 1. 基本的なリクエスト
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'test.mp3',
        fileType: 'audio/mpeg',
        meetingId: 'test-123'
      })
    });

    console.log('🔧 [Simple Test] レスポンスステータス:', response.status);
    console.log('🔧 [Simple Test] レスポンスヘッダー:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('🔧 [Simple Test] レスポンス本文:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('🔧 [Simple Test] 成功:', result);
      } catch (e) {
        console.log('🔧 [Simple Test] JSON解析失敗:', e.message);
      }
    } else {
      console.log('🔧 [Simple Test] エラー:', responseText);
    }

  } catch (error) {
    console.error('🔧 [Simple Test] ネットワークエラー:', error);
  }
}

// テスト実行
testEdgeFunctionBasic().then(() => {
  console.log('🔧 [Simple Test] テスト完了');
}).catch(console.error);
