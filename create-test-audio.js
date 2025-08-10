// テスト用音声ファイル作成スクリプト
// 注意: このスクリプトはブラウザ環境で実行する必要があります

function createTestAudioFile() {
  console.log('🔧 [Test Audio] テスト用音声ファイル作成開始');
  
  // AudioContextを作成
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = 16000; // 16kHz
  const duration = 3; // 3秒
  const numSamples = sampleRate * duration;
  
  // 音声バッファを作成
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  // 簡単な正弦波を生成（440Hz）
  const frequency = 440;
  for (let i = 0; i < numSamples; i++) {
    channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
  }
  
  // AudioBufferをBlobに変換
  const wavBlob = audioBufferToWav(audioBuffer);
  
  // ファイルとしてダウンロード
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test-audio.wav';
  a.click();
  
  URL.revokeObjectURL(url);
  
  console.log('🔧 [Test Audio] テスト用音声ファイル作成完了');
}

// AudioBufferをWAV形式に変換
function audioBufferToWav(buffer) {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(arrayBuffer);
  
  // WAVヘッダー
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
  
  // 音声データ
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
  window.createTestAudioFile = createTestAudioFile;
  console.log('🔧 ブラウザ環境です。createTestAudioFile() でテスト用音声ファイルを作成してください。');
} else {
  console.log('🔧 Node.js環境です。ブラウザで実行してください。');
}
