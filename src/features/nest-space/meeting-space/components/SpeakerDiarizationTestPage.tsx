import React, { useState, useMemo } from 'react';

interface NameCandidate {
  name: string;
  count: number;
  leadingCount: number;
  leadingRate: number;
  variations: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface Utterance {
  speaker: string;
  startTime: string;
  endTime: string;
  text: string;
  confidence: number;
}

const SpeakerDiarizationTestPage: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [analysisResults, setAnalysisResults] = useState<{
    nameCandidates: NameCandidate[];
    extractedUtterances: Utterance[];
    patterns: string[];
  } | null>(null);

  // テキストをクリーンアップ（時間パターンを除去）
  const cleanText = useMemo(() => {
    if (!inputText) return '';
    return inputText.replace(/\d{1,2}:\d{2}(:\d{2})?/g, '');
  }, [inputText]);

  // 新しいロジック: 完全名パターンを直接抽出
  const extractNameCandidates = (text: string): NameCandidate[] => {
    const verifiedNames: NameCandidate[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // 各行から完全名パターンを直接抽出
    for (const line of lines) {
      // 行の末尾にタイムスタンプがあるかチェック
      const timestampMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const namePart = line.substring(0, line.indexOf(timestamp)).trim();
        
        // 名前部分に数字が含まれていないことを確認
        if (namePart && !/\d/.test(namePart)) {
          // 既存の名前候補かチェック
          const existingIndex = verifiedNames.findIndex(n => n.name === namePart);
          if (existingIndex >= 0) {
            // 既存の場合はカウントを増やす
            verifiedNames[existingIndex].count++;
            verifiedNames[existingIndex].leadingCount++;
          } else {
            // 新規の場合は追加
            verifiedNames.push({
              name: namePart,
              count: 1,
              leadingCount: 1,
              leadingRate: 1.0,
              variations: [namePart],
              confidence: 'high'
            });
          }
        }
      }
    }
    
    // 2回以上出現する名前のみを返す
    return verifiedNames
      .filter(candidate => candidate.count >= 2)
      .sort((a, b) => b.count - a.count);
  };

  // 正規表現の特殊文字をエスケープ
  const escapeRegex = (string: string) => {
    if (!string) return '';
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // 同じ苗字の異なる完全名を検索
  const findSameFamilyNames = (text: string, baseWord: string, currentName: string): string[] => {
    const familyNames: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      // 行の末尾にタイムスタンプがあるかチェック
      const timestampMatch = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)\s*$/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        const namePart = line.substring(0, line.indexOf(timestamp)).trim();
        
        // 同じ苗字で始まるが、現在の名前と異なる名前を検索
        if (namePart && 
            namePart !== currentName && 
            namePart.startsWith(baseWord) && 
            !/\d/.test(namePart)) {
          familyNames.push(namePart);
        }
      }
    }
    
    // 重複を除去して返す
    return [...new Set(familyNames)];
  };

  // 信頼度計算（文頭出現率 × 総出現回数）
  const calculateConfidence = (totalCount: number, leadingCount: number): 'high' | 'medium' | 'low' => {
    const leadingRate = leadingCount / totalCount;
    
    if (totalCount >= 3 && leadingRate >= 0.8) return 'high';      // 3回以上 + 80%以上が文頭
    if (totalCount >= 2 && leadingRate >= 0.6) return 'medium';   // 2回以上 + 60%以上が文頭
    return 'low';
  };

  // 動的パターンの作成
  const createDynamicPatterns = (nameCandidates: NameCandidate[]): string[] => {
    const patterns: string[] = [];
    
    // 高信頼度の名前でパターンを作成
    const highConfidenceNames = nameCandidates
      .filter(c => c.confidence === 'high')
      .map(c => c.name);
      
    highConfidenceNames.forEach(name => {
      // 括弧なしパターン: "名前 時間"
      patterns.push(`${name} \\d{1,2}:\\d{2}`);
      
      // 括弧付きパターン: "[名前] 時間"
      patterns.push(`\\[${name}\\] \\d{1,2}:\\d{2}:\\d{2}`);
      
      // コロンパターン: "名前: 時間"
      patterns.push(`${name}: \\d{1,2}:\\d{2}:\\d{2}`);
    });
    
    return patterns;
  };

  // 発話抽出（テキスト分割ベースのアプローチ）
  const extractUtterances = (text: string, nameCandidates: NameCandidate[]): Utterance[] => {
    const utterances: Utterance[] = [];
    const highConfidenceNames = nameCandidates
      .filter(c => c.confidence === 'high')
      .map(c => c.name);

    console.log('🔍 高信頼度名前:', highConfidenceNames);

    // 全ての名前+タイムスタンプパターンを作成
    const allPatterns: { pattern: RegExp, name: string }[] = [];
    
    for (const name of highConfidenceNames) {
      try {
        const escapedName = escapeRegex(name);
        
        // パターン1: 名前 時間（完全マッチ）
        allPatterns.push({
          pattern: new RegExp(`^${escapedName}\\s+(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*$`, 'gm'),
          name: name
        });
        
        // パターン2: [名前] 時間（完全マッチ）
        allPatterns.push({
          pattern: new RegExp(`^\\[${escapedName}\\]\\s+(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*$`, 'gm'),
          name: name
        });
        
        // パターン3: 名前: 時間（完全マッチ）
        allPatterns.push({
          pattern: new RegExp(`^${escapedName}:\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*$`, 'gm'),
          name: name
        });
      } catch (error) {
        console.error(`正規表現エラー (${name}):`, error);
        continue;
      }
    }

    // テキスト全体から名前+タイムスタンプの位置を特定
    const markers: { position: number, speaker: string, timestamp: string, fullMatch: string }[] = [];
    
    for (const { pattern, name } of allPatterns) {
      let match;
      pattern.lastIndex = 0; // グローバル検索をリセット
      
      while ((match = pattern.exec(text)) !== null) {
        console.log(`📋 マッチ詳細 (${name}):`, {
          fullMatch: match[0],
          group1: match[1],
          group2: match[2],
          position: match.index
        });
        
        // 名前+タイムスタンプの文字列から名前を除去してタイムスタンプを取得
        const fullMatch = match[0];
        const speaker = name; // 既に特定済みの名前
        const timestamp = match[1]; // 1番目のキャプチャグループがタイムスタンプ
        
        console.log(`🔍 名前除去デバッグ:`, {
          fullMatch,
          name,
          timestamp,
          matchGroups: match
        });
        
        const marker = {
          position: match.index,
          speaker: speaker,
          timestamp: timestamp,
          fullMatch: fullMatch
        };
        
        console.log(`📋 マーカー作成:`, marker);
        markers.push(marker);
      }
    }

    // 位置でソート
    markers.sort((a, b) => a.position - b.position);
    
    console.log('📍 検出されたマーカー:', markers);

    // マーカー間でテキストを分割
    for (let i = 0; i < markers.length; i++) {
      const currentMarker = markers[i];
      const nextMarker = markers[i + 1];
      
      console.log(`🔍 マーカー処理 ${i}:`, currentMarker);
      
      // 現在のマーカーから次のマーカー（または終端）までのテキストを抽出
      const startPos = currentMarker.position;
      const endPos = nextMarker ? nextMarker.position : text.length;
      const sectionText = text.substring(startPos, endPos);
      
      console.log(`📝 セクションテキスト:`, sectionText);
      
      // マーカー部分を除去して発話内容を取得
      const speechContent = sectionText.replace(currentMarker.fullMatch, '').trim();
      
      console.log(`🗣️ 発話内容:`, speechContent);
      
      if (speechContent) {
        const utterance = {
          speaker: currentMarker.speaker,
          startTime: currentMarker.timestamp,
          endTime: nextMarker ? nextMarker.timestamp : currentMarker.timestamp,
          text: speechContent,
          confidence: 0.95
        };
        
        console.log(`✅ 発話作成:`, utterance);
        utterances.push(utterance);
      }
    }
    
    console.log('🗣️ 抽出された発話:', utterances);
    return utterances;
  };

  // 分析実行
  const runAnalysis = () => {
    console.log('🔍 分析実行開始');
    console.log('📝 入力テキスト:', inputText);
    
    if (!inputText.trim()) {
      console.log('❌ 入力テキストが空です');
      return;
    }
    
    try {
      console.log('📊 名前候補抽出開始');
      const nameCandidates = extractNameCandidates(inputText);
      console.log('✅ 名前候補抽出完了:', nameCandidates);
      
      console.log('🔧 パターン作成開始');
      const patterns = createDynamicPatterns(nameCandidates);
      console.log('✅ パターン作成完了:', patterns);
      
      console.log('🗣️ 発話抽出開始');
      const utterances = extractUtterances(inputText, nameCandidates);
      console.log('✅ 発話抽出完了:', utterances);
      
      const results = {
        nameCandidates,
        extractedUtterances: utterances,
        patterns
      };
      
      console.log('📋 結果をセット:', results);
      setAnalysisResults(results);
      console.log('✅ 分析完了');
      
    } catch (error) {
      console.error('❌ 分析実行中にエラーが発生:', error);
      alert(`分析実行中にエラーが発生しました: ${error}`);
    }
  };

  // サンプルテキストの設定
  const setSampleText = (sampleType: 'success' | 'failure') => {
    if (sampleType === 'success') {
      setInputText(`齋藤 益弘 00:03 
はいはい。ちょっと先のことを何かそのときのこと結構あれなんですねそのときも何か確か。アンケート不便な感じで。そうですね。お話したような次第はい感じなんですけどすいませんもう1人ちょっと参加させていただくんですよ。

齋藤 益弘 00:27 
下値まして、斎藤と申します。よろしくお願いします。ちょっと現地お伺いできずでとんでもないいけないんですけれども。はい。お話させていただければ嬉しいです。お願いします。ちょっと店舗に今は的な店舗ですね。大野さんと大越さん。

齋藤 益弘 00:53 
はい。よっす。お願いします。よろしくお願いします。すいませんいただきます。そうですね今回、私の方からご説明でよろしいですかね。はい。今回お使いいただいたのは、ですね。今千紗ち市役所の農林水産相にベースアップ3のところではいこれはこれまでもそうですけど`);
    } else {
      setInputText(`[中村耕史] 09:06:28
これまでってそのなんですかね？

[中村耕史] 09:06:32
がんになった人が感じる不自由さとか。

[中村耕史] 09:06:37
あの嫌な感じみたいのはなぜ起きるのか？みたいな感じで。

[中村耕史] 09:06:42
物事を考えていた。ですよね。で、その根底にはその問題を取り、さらうのか。

[中村耕史] 09:06:48
何か社会の物差しを変えるのか。とにかく。

[中村耕史] 09:06:51
そうでない状態を作りに行きたいと思ってた。

[中村耕史] 09:06:53
時にその焦点化されているものがやっぱり人だったっていうことを。

[Mina Baek] 09:06:54
そうですね。

[中村耕史] 09:06:57
だと思ですよ。そうした時に、やっぱりどうしてもなんかその。`);
    }
  };

  // 複雑なパターンのサンプルテキスト（田中太郎と田中次郎を含む）
  const setComplexSampleText = () => {
    setInputText(`田中 太郎 （株式会社ABC） 00:03 
こんにちは、よろしくお願いします。

田中 太郎 （株式会社ABC） 00:15 
今日の議題について説明させていただきます。

佐藤 花子 様 00:30 
はい、お願いします。

田中 太郎 （株式会社ABC） 00:45 
まず、プロジェクトの進捗状況から。

鈴木 一郎 部長 00:55 
了解しました。

田中 太郎 （株式会社ABC） 01:10 
では、次のステップに進みましょう。

田中 次郎 （株式会社XYZ） 01:20 
私も参加させていただきます。

田中 次郎 （株式会社XYZ） 01:35 
よろしくお願いします。`);
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      height: '100%',
      overflowY: 'auto'
    }}>
      <h1 style={{ color: '#e2e8f0', marginBottom: '20px' }}>
        🧪 話者分離ロジック テストページ
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#a6adc8', marginBottom: '10px' }}>サンプルテキスト</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setSampleText('success')}
            style={{
              background: '#00ff88',
              color: '#0f0f23',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            成功パターン（齋藤 益弘）
          </button>
          <button
            onClick={() => setSampleText('failure')}
            style={{
              background: '#ff6b6b',
              color: '#0f0f23',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            失敗パターン（[中村耕史]）
          </button>
          <button
            onClick={setComplexSampleText}
            style={{
              background: '#8b5cf6',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            複雑パターン（会社名・敬称）
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#a6adc8', marginBottom: '10px' }}>文字起こしテキスト</h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="文字起こしテキストをここに貼り付けてください..."
          style={{
            width: '100%',
            height: '200px',
            padding: '12px',
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '4px',
            color: '#e2e8f0',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}
        />
      </div>

      <button
        onClick={runAnalysis}
        disabled={!inputText.trim()}
        style={{
          background: inputText.trim() ? '#00ff88' : '#555',
          color: inputText.trim() ? '#0f0f23' : '#888',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '4px',
          cursor: inputText.trim() ? 'pointer' : 'not-allowed',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '20px'
        }}
      >
        🔍 分析実行
      </button>

      {analysisResults && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* 名前候補 */}
          <div style={{ 
            background: '#1a1a2e', 
            padding: '20px', 
            borderRadius: '8px', 
            border: '1px solid #333366',
            overflowY: 'auto',
            maxHeight: '350px'
          }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '15px' }}>📊 名前候補分析</h3>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#a6adc8', fontSize: '14px', marginBottom: '5px' }}>
                総行数: {inputText.split('\n').filter(line => line.trim()).length}
              </div>
            </div>
            {analysisResults.nameCandidates.map((candidate, index) => (
              <div
                key={index}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: candidate.confidence === 'high' ? '#00ff88' : 
                             candidate.confidence === 'medium' ? '#ffaa00' : '#ff6b6b',
                  color: '#0f0f23',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: '600' }}>{candidate.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px' }}>出現回数: {candidate.count}</div>
                  <div style={{ fontSize: '12px' }}>文頭出現: {candidate.leadingCount}</div>
                  <div style={{ fontSize: '12px' }}>文頭率: {(candidate.leadingRate * 100).toFixed(1)}%</div>
                  <div style={{ fontSize: '12px' }}>信頼度: {candidate.confidence}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 抽出された発話 */}
          <div style={{ 
            background: '#1a1a2e', 
            padding: '20px', 
            borderRadius: '8px', 
            border: '1px solid #333366',
            overflowY: 'auto',
            maxHeight: '350px'
          }}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '15px' }}>🗣️ 抽出された発話</h3>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#a6adc8', fontSize: '14px', marginBottom: '5px' }}>
                抽出数: {analysisResults.extractedUtterances.length}
              </div>
            </div>
            {analysisResults.extractedUtterances.map((utterance, index) => (
              <div
                key={index}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  background: '#333366',
                  borderRadius: '4px',
                  border: '1px solid #444477'
                }}
              >
                <div style={{ color: '#00ff88', fontWeight: '600', marginBottom: '5px' }}>
                  {utterance.speaker}
                </div>
                <div style={{ color: '#a6adc8', fontSize: '12px', marginBottom: '5px' }}>
                  {utterance.startTime} - {utterance.endTime}
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '13px' }}>
                  {utterance.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* パターン情報 */}
      {analysisResults && (
        <div style={{ 
          marginTop: '20px', 
          background: '#1a1a2e', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #333366',
          overflowY: 'auto',
          maxHeight: '200px'
        }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '15px' }}>🔍 検出されたパターン</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {analysisResults.patterns.map((pattern, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  background: '#00ff88',
                  color: '#0f0f23',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}
              >
                {pattern}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* クリーンテキスト表示 */}
      {cleanText && (
        <div style={{ 
          marginTop: '20px', 
          background: '#1a1a2e', 
          padding: '20px', 
          borderRadius: '8px', 
          border: '1px solid #333366',
          overflowY: 'auto',
          maxHeight: '200px'
        }}>
          <h3 style={{ color: '#e2e8f0', marginBottom: '15px' }}>🧹 クリーンテキスト（時間除去後）</h3>
          <textarea
            value={cleanText}
            readOnly
            style={{
              width: '100%',
              height: '150px',
              padding: '12px',
              background: '#0f0f23',
              border: '1px solid #333366',
              borderRadius: '4px',
              color: '#a6adc8',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SpeakerDiarizationTestPage;
