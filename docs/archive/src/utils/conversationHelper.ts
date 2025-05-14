import { ChatMessage } from '../types/chat';

/**
 * 会話の基本的な分析と応答生成を行うユーティリティ
 */

// 簡易的なキーワード抽出
export const extractKeywords = (text: string): string[] => {
  // 前後の空白を削除し、記号を取り除いてから単語に分割
  const words = text
    .trim()
    .replace(/[、。？！，．「」『』()（）【】［］、]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1) // 1文字の単語は除外
    .filter(word => !commonWords.includes(word)); // 一般的な単語を除外

  // 重複を削除
  return [...new Set(words)];
};

// 会話が停滞しているかどうかを判断（最後のメッセージから一定時間経過）
export const isConversationStalled = (messages: ChatMessage[], timeThresholdMs: number = 60000): boolean => {
  if (messages.length === 0) return false;

  const lastMessageTime = new Date(messages[messages.length - 1].createdAt).getTime();
  const currentTime = new Date().getTime();

  return currentTime - lastMessageTime > timeThresholdMs;
};

// 会話の文脈に応じた基本的な応答を生成
export const generateBasicResponse = (messages: ChatMessage[], userId: string): string => {
  if (messages.length === 0) {
    return 'こんにちは！何かお手伝いできることはありますか？';
  }

  const lastMessage = messages[messages.length - 1];
  
  // 自分の最後のメッセージに対する応答は生成しない
  if (lastMessage.sender.id === 'bot') {
    return '';
  }

  const content = lastMessage.content.toLowerCase();

  // 質問への応答
  if (content.includes('?') || content.includes('？') || 
      content.includes('ですか') || content.includes('何') || 
      content.includes('どう') || content.includes('いつ')) {
    return '興味深い質問ですね。もう少し詳しく聞かせてもらえますか？';
  }

  // 挨拶への応答
  if (content.includes('こんにちは') || content.includes('おはよう') || content.includes('こんばんは')) {
    return `${content}！今日はどのようなことをお手伝いしましょうか？`;
  }

  // 感謝への応答
  if (content.includes('ありがとう') || content.includes('感謝')) {
    return 'どういたしまして！他に何かお手伝いできることがあれば教えてください。';
  }

  // デフォルトの応答
  return 'なるほど、理解しました。何か具体的にお手伝いできることはありますか？';
};

// 会話が途切れたときの介入メッセージを生成
export const generatePromptMessage = (messages: ChatMessage[]): string => {
  if (messages.length < 3) {
    return 'どのようなことについて話し合いたいですか？';
  }

  const recentMessages = messages.slice(-3);
  const topics = recentMessages
    .map(msg => extractKeywords(msg.content))
    .flat();

  if (topics.length > 0) {
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    return `${randomTopic}について、もう少し詳しく教えていただけますか？`;
  }

  return '会話を続けたいですか？何か気になることはありますか？';
};

// 会話を要約する簡易的な関数
export const summarizeConversation = (messages: ChatMessage[]): string => {
  if (messages.length < 3) {
    return '会話がまだ始まったばかりです。';
  }

  // メッセージ内容を連結して文字数を取得
  const totalContent = messages.map(msg => msg.content).join(' ');
  const totalLength = totalContent.length;

  // 全体の文字数から要約の長さを決定（簡易的な実装）
  const summaryLength = Math.min(totalLength * 0.3, 100);
  
  // 最初と最後のメッセージを使って簡易的な要約を作成
  const firstMessage = messages[0].content.substring(0, 30);
  const lastMessage = messages[messages.length - 1].content.substring(0, 30);
  
  return `この会話は「${firstMessage}...」から始まり、現在は「${lastMessage}...」という話題について話し合われています。合計${messages.length}件のメッセージがあります。`;
};

// 一般的な日本語の単語リスト（フィルタリング用）
const commonWords = [
  'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ',
  'こと', 'もの', 'ため', 'よう', 'そう', 'どう', 'ない', 'する', 'ます',
  'です', 'いる', 'ある', 'なる', 'わたし', 'あなた', 'かれ', 'かのじょ',
  'みんな', 'だれ', 'いつ', 'どこ', 'なに', 'なぜ', 'どの', 'どんな', 
  'ので', 'のに', 'から', 'まで', 'より', 'では', 'とも', 'でも'
]; 