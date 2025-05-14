import { AIService } from '../services/AIService';
import { InsightService } from '../services/insightService';

async function runTest() {
  // APIキーの設定
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEYが設定されていません');
    return;
  }

  // サービスのインスタンス化
  const aiService = new AIService(apiKey);
  const insightService = new InsightService(apiKey);

  // モックデータをクリア
  await insightService.clearAllInsights();

  // テスト用の会話データ
  const testConversation = [
    {
      id: 'msg1',
      chatId: 'chat1',
      sender: 'ユーザーA',
      content: 'プロジェクトの進捗について話し合いましょう',
      timestamp: new Date().toISOString()
    },
    {
      id: 'msg2',
      chatId: 'chat1',
      sender: 'ユーザーB',
      content: 'はい、現在の状況を共有します',
      timestamp: new Date(Date.now() + 1000).toISOString()
    },
    {
      id: 'msg3',
      chatId: 'chat1',
      sender: 'ユーザーA',
      content: 'デザインのレビューが完了しました',
      timestamp: new Date(Date.now() + 2000).toISOString()
    },
    {
      id: 'msg4',
      chatId: 'chat1',
      sender: 'ユーザーB',
      content: '開発チームは実装を進めています',
      timestamp: new Date(Date.now() + 3000).toISOString()
    },
    {
      id: 'msg5',
      chatId: 'chat1',
      sender: 'ユーザーA',
      content: '次回のミーティングはいつにしましょうか？',
      timestamp: new Date(Date.now() + 4000).toISOString()
    },
    {
      id: 'msg6',
      chatId: 'chat1',
      sender: 'ユーザーB',
      content: '来週の月曜日はいかがでしょうか？',
      timestamp: new Date(Date.now() + 5000).toISOString()
    },
    {
      id: 'msg7',
      chatId: 'chat1',
      sender: 'ユーザーA',
      content: 'はい、その日で問題ありません',
      timestamp: new Date(Date.now() + 6000).toISOString()
    }
  ];

  console.log('会話の監視を開始します...');
  
  // 会話の監視を開始
  insightService.monitorConversation(testConversation);

  // 15秒待機してから結果を確認（AIの応答時間を考慮）
  setTimeout(async () => {
    console.log('\n生成されたインサイトを確認します...');
    const insights = await insightService.getAllInsights();
    
    console.log('\n=== 生成されたインサイト ===');
    insights.forEach((insight, index) => {
      console.log(`\nインサイト ${index + 1}:`);
      console.log(`タイプ: ${insight.type}`);
      console.log(`内容: ${insight.content}`);
      console.log(`優先度: ${insight.priority}`);
      console.log(`作成日時: ${new Date(insight.createdAt).toLocaleString()}`);
      if (insight.context) {
        console.log(`文脈: ${insight.context}`);
      }
    });

    // プロセスを終了
    process.exit(0);
  }, 15000);
}

// テストの実行
runTest().catch(console.error); 