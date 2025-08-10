// フロントエンド統合テスト
// 注意: このスクリプトはブラウザ環境で実行する必要があります

async function testFrontendIntegration() {
  console.log('🔧 [Frontend Test] フロントエンド統合テスト開始');
  
  try {
    // 1. テスト用音声ファイルを作成
    console.log('1. テスト用音声ファイル作成');
    const audioBlob = await createTestAudioBlob();
    const file = new File([audioBlob], 'test-audio-frontend.wav', { type: 'audio/wav' });
    
    console.log('ファイル作成完了:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // 2. TranscriptionServiceV2を使用して文字起こし
    console.log('\n2. TranscriptionServiceV2を使用した文字起こし');
    
    // モックのTranscriptionServiceV2
    const mockTranscriptionServiceV2 = {
      async transcribeAudio(file, meetingId, nestId) {
        console.log('TranscriptionServiceV2.transcribeAudio 呼び出し:', {
          fileName: file.name,
          fileSize: file.size,
          meetingId,
          nestId
        });
        
        // 実際の処理をシミュレート
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
          success: true,
          jobId: `frontend_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      },
      
      async transcribeWithProgress(file, meetingId, nestId, onProgress) {
        console.log('TranscriptionServiceV2.transcribeWithProgress 呼び出し');
        
        // 進捗をシミュレート
        for (let i = 0; i <= 100; i += 10) {
          if (onProgress) {
            onProgress(i);
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
          success: true,
          jobId: `frontend_progress_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }
    };
    
    // 通常の文字起こしテスト
    const result1 = await mockTranscriptionServiceV2.transcribeAudio(
      file,
      'test-meeting-frontend',
      'test-nest-frontend'
    );
    
    console.log('通常の文字起こし結果:', result1);
    
    // 進捗付き文字起こしテスト
    console.log('\n3. 進捗付き文字起こしテスト');
    const result2 = await mockTranscriptionServiceV2.transcribeWithProgress(
      file,
      'test-meeting-frontend-progress',
      'test-nest-frontend-progress',
      (progress) => {
        console.log(`進捗: ${progress}%`);
      }
    );
    
    console.log('進捗付き文字起こし結果:', result2);
    
    // 4. GCSUploadServiceのテスト
    console.log('\n4. GCSUploadServiceテスト');
    const mockGCSUploadService = {
      async uploadToGCS(file, meetingId) {
        console.log('GCSUploadService.uploadToGCS 呼び出し:', {
          fileName: file.name,
          meetingId
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
          success: true,
          gcsFileName: `gcs_${meetingId}/${Date.now()}_${file.name}`,
          bucketName: 'poconest-audio-files'
        };
      }
    };
    
    const uploadResult = await mockGCSUploadService.uploadToGCS(
      file,
      'test-meeting-gcs'
    );
    
    console.log('GCSアップロード結果:', uploadResult);
    
    console.log('\n=====================================');
    console.log('🔧 [Frontend Test] フロントエンド統合テスト完了');
    console.log('生成されたジョブID:', result1.jobId);
    console.log('進捗付きジョブID:', result2.jobId);
    console.log('GCSファイル名:', uploadResult.gcsFileName);
    
  } catch (error) {
    console.error('🔧 [Frontend Test] テストエラー:', error);
  }
}

// テスト用音声Blobを作成
async function createTestAudioBlob() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = 16000;
  const duration = 2; // 2秒
  const numSamples = sampleRate * duration;
  
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  // 簡単な正弦波を生成
  const frequency = 440;
  for (let i = 0; i < numSamples; i++) {
    channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
  }
  
  return audioBufferToWav(audioBuffer);
}

// AudioBufferをWAV形式に変換
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * numberOfChannels * 2, true);
  
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// ブラウザ環境でのみ実行
if (typeof window !== 'undefined') {
  window.testFrontendIntegration = testFrontendIntegration;
  console.log('🔧 ブラウザ環境です。testFrontendIntegration() でフロントエンド統合テストを実行してください。');
} else {
  console.log('🔧 Node.js環境です。ブラウザで実行してください。');
}
