// Cloud Runサービスヘルスチェック

const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app';

async function testHealthCheck() {
  console.log('🔧 [Health Check] Cloud Runサービスヘルスチェック開始');
  
  try {
    const response = await fetch(`${CLOUD_RUN_URL}/health`);
    
    console.log('🔧 [Health Check] レスポンスステータス:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('🔧 [Health Check] 成功:', result);
    } else {
      const errorText = await response.text();
      console.error('🔧 [Health Check] エラー:', errorText);
    }

  } catch (error) {
    console.error('🔧 [Health Check] ネットワークエラー:', error);
  }
}

// テスト実行
testHealthCheck().then(() => {
  console.log('🔧 [Health Check] テスト完了');
}).catch(console.error);
