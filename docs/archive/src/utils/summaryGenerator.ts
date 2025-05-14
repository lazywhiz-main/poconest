import { ChatMessage } from '../types/chat';

/**
 * Utility functions for generating summaries of conversations
 */

/**
 * Generates a brief summary of a conversation
 * @param messages Array of chat messages
 * @returns A summary string
 */
export const generateBriefSummary = (messages: ChatMessage[]): string => {
  if (messages.length < 3) {
    return '会話がまだ始まったばかりです。';
  }

  const firstMessage = messages[0].content.substring(0, 30);
  const lastMessage = messages[messages.length - 1].content.substring(0, 30);
  
  return `この会話は「${firstMessage}...」から始まり、最新の話題は「${lastMessage}...」です。合計${messages.length}件のメッセージがあります。`;
};

/**
 * Generates a more detailed summary of a conversation by analyzing content
 * @param messages Array of chat messages
 * @returns A detailed summary string
 */
export const generateDetailedSummary = (messages: ChatMessage[]): string => {
  if (messages.length < 5) {
    return generateBriefSummary(messages);
  }
  
  // Extract participant names
  const participants = [...new Set(messages.map(msg => msg.sender.name))];
  
  // Find the most active participant
  const messageCountByUser: Record<string, number> = {};
  messages.forEach(msg => {
    const senderId = msg.sender.id;
    messageCountByUser[senderId] = (messageCountByUser[senderId] || 0) + 1;
  });
  
  const mostActiveParticipant = Object.entries(messageCountByUser)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const mostActiveName = messages.find(msg => msg.sender.id === mostActiveParticipant)?.sender.name || '参加者';
  
  // Extract potential topics
  const topics = extractTopics(messages);
  
  return `この会話には${participants.length}名が参加し、${messages.length}件のメッセージが交わされました。
最も活発な参加者は${mostActiveName}さんで、主な話題は${topics.join('、')}などです。
会話は「${messages[0].content.substring(0, 20)}...」から始まり、最新の話題は「${messages[messages.length - 1].content.substring(0, 20)}...」です。`;
};

/**
 * Extract potential topics from messages
 * @param messages Array of chat messages
 * @returns Array of topic strings
 */
const extractTopics = (messages: ChatMessage[]): string[] => {
  // Combine all message content
  const allContent = messages.map(msg => msg.content).join(' ');
  
  // Very simple topic extraction based on common phrases and word frequency
  const topicIndicators = [
    'について', 'に関して', 'の件', 'といえば', 'というのは',
    'についての意見', '私は思う', '重要なのは'
  ];
  
  const potentialTopics: string[] = [];
  
  // Extract phrases after topic indicators
  topicIndicators.forEach(indicator => {
    const regex = new RegExp(`([^。、!?！？]+)${indicator}([^。、!?！？]{3,20})`, 'g');
    const matches = allContent.matchAll(regex);
    
    for (const match of matches) {
      if (match[2] && match[2].length > 3) {
        potentialTopics.push(match[2].trim());
      }
    }
  });
  
  // If no topics found with indicators, use most frequent words
  if (potentialTopics.length === 0) {
    const words = allContent.split(/\s+/).filter(word => word.length > 2);
    const wordCount: Record<string, number> = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
    
    return topWords;
  }
  
  // Return unique topics
  return [...new Set(potentialTopics)].slice(0, 3);
};

/**
 * Generates a concise summary focused on key decisions or action items
 * @param messages Array of chat messages
 * @returns A summary of decisions or action items
 */
export const generateActionItemsSummary = (messages: ChatMessage[]): string => {
  if (messages.length < 5) {
    return '十分な会話データがありません。';
  }
  
  const actionIndicators = [
    'すべき', 'やるべき', '必要がある', 'しましょう', 'しよう',
    'お願いします', 'してください', '考えて', '確認して',
    'must', 'should', 'need to', 'let\'s', 'please'
  ];
  
  const actionItems: string[] = [];
  
  messages.forEach(msg => {
    const content = msg.content;
    
    actionIndicators.forEach(indicator => {
      if (content.includes(indicator)) {
        const sentences = content.split(/[。.!?！？]/);
        sentences.forEach(sentence => {
          if (sentence.includes(indicator) && sentence.length > 5) {
            actionItems.push(sentence.trim());
          }
        });
      }
    });
  });
  
  if (actionItems.length === 0) {
    return '明確なアクションアイテムは見つかりませんでした。';
  }
  
  const uniqueActions = [...new Set(actionItems)].slice(0, 3);
  return `この会話から抽出されたアクションアイテム:\n- ${uniqueActions.join('\n- ')}`;
};

/**
 * Generate a comprehensive summary of the conversation
 * @param messages Array of chat messages
 * @returns A comprehensive summary combining multiple summary types
 */
export const generateComprehensiveSummary = (messages: ChatMessage[]): string => {
  if (messages.length < 8) {
    return generateDetailedSummary(messages);
  }
  
  const detailedSummary = generateDetailedSummary(messages);
  const actionItems = generateActionItemsSummary(messages);
  
  return `${detailedSummary}\n\n${actionItems}`;
}; 