// 実際の音声ファイルアップロードテスト
// 注意: このスクリプトはブラウザ環境で実行する必要があります

const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjcWtmY2d0bWFidGZvemZjdmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY5NjE3MjQsImV4cCI6MjA2MjUzNzcyNH0.1fj7lpHMYyBv1mMGxn8igtE9SFBnmJFh-Zp8Nb-jzdE';

async function testRealAudioUpload() {
  console.log('🔧 [Real Audio Test] 実際の音声ファイルアップロードテスト開始');
  
  try {
    // 1. テスト用音声ファイルを作成
    console.log('1. テスト用音声ファイル作成');
    const audioBlob = await createTestAudioBlob();
    const file = new File([audioBlob], 'test-audio.wav', { type: 'audio/wav' });
    
    console.log('ファイル作成完了:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // 2. 署名付きURL取得
    console.log('\n2. 署名付きURL取得');
    const signedUrlResult = await getSignedUrl(file.name, file.type, 'test-meeting-real');
    
    if (!signedUrlResult.success) {
      throw new Error(signedUrlResult.error || '署名付きURLの取得に失敗しました');
    }
    
    console.log('署名付きURL取得成功:', {
      gcsFileName: signedUrlResult.gcsFileName,
      bucketName: signedUrlResult.bucketName
    });
    
    // 3. GCSに直接アップロード
    console.log('\n3. GCS直接アップロード');
    const uploadResult = await uploadToSignedUrl(file, signedUrlResult.signedUrl);
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || 'GCSアップロードに失敗しました');
    }
    
    console.log('GCSアップロード成功');
    
    // 4. 文字起こしジョブ開始
    console.log('\n4. 文字起こしジョブ開始');
    const jobResult = await startTranscriptionJob(
      signedUrlResult.gcsFileName,
      'test-meeting-real',
      'test-nest-real'
    );
    
    if (!jobResult.success) {
      throw new Error(jobResult.error || '文字起こしジョブの開始に失敗しました');
    }
    
    console.log('文字起こしジョブ開始成功:', {
      jobId: jobResult.jobId
    });
    
    console.log('\n=====================================');
    console.log('🔧 [Real Audio Test] 実際の音声ファイルテスト完了');
    console.log('ジョブID:', jobResult.jobId);
    console.log('GCSファイル名:', signedUrlResult.gcsFileName);
    
  } catch (error) {
    console.error('🔧 [Real Audio Test] テストエラー:', error);
  }
}

// テスト用音声Blobを作成
async function createTestAudioBlob() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = 16000;
  const duration = 3;
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

// 署名付きURLを取得
async function getSignedUrl(fileName, fileType, meetingId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName,
        fileType,
        meetingId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge Function エラー: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '署名付きURLの生成に失敗しました');
    }

    return {
      success: true,
      signedUrl: result.signedUrl,
      gcsFileName: result.gcsFileName,
      bucketName: result.bucketName
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 署名付きURLにファイルをアップロード
async function uploadToSignedUrl(file, signedUrl) {
  try {
    const response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': file.size.toString()
      },
      body: file
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GCS アップロードエラー: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 文字起こしジョブを開始
async function startTranscriptionJob(gcsFileName, meetingId, nestId) {
  try {
    const CLOUD_RUN_URL = 'https://transcription-service-753651631159.asia-northeast1.run.app/transcribe';
    const API_KEY = 'eRJn5wte3dPKJp3/MQG/SPtwTnaMcNo/1tg5/08MEeM=';
    const SUPABASE_URL = 'https://ecqkfcgtmabtfozfcvfr.supabase.co';

    const response = await fetch(CLOUD_RUN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        fileUrl: `gs://poconest-audio-files/${gcsFileName}`,
        meetingId,
        nestId,
        useGoogleCloud: true,
        callbackUrl: `${SUPABASE_URL}/functions/v1/transcription-complete`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloud Run エラー: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '文字起こしジョブの開始に失敗しました');
    }

    return {
      success: true,
      jobId: result.jobId
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ブラウザ環境でのみ実行
if (typeof window !== 'undefined') {
  window.testRealAudioUpload = testRealAudioUpload;
  console.log('🔧 ブラウザ環境です。testRealAudioUpload() で実際の音声ファイルテストを実行してください。');
} else {
  console.log('🔧 Node.js環境です。ブラウザで実行してください。');
}
