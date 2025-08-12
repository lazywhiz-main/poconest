// AI Provider インターフェース
export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateEmbedding(text: string): Promise<number[] | null>;
  generateEmbeddings(texts: string[]): Promise<number[][] | null>;
  generateSummary(content: string): Promise<string>;
  analyzeChat(messages: any[], systemPrompt: string): Promise<string>;
  extractCards(meetingContent: string, meetingId?: string, jobId?: string): Promise<any[]>;
}

// AI Provider の設定型
export interface AIProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  embeddingModel?: string;
  maxTokens?: number;
  temperature?: number;
}

// サポートするAI Provider の種類
export enum AIProviderType {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  MOCK = 'mock'
}

// AI分析結果の共通型
export interface AIAnalysisResponse {
  success: boolean;
  result?: any;
  error?: string;
  provider: string;
  processingTime: number;
}

// 埋め込みベクター生成のレスポンス型
export interface EmbeddingResponse {
  success: boolean;
  embeddings?: number[] | number[][];
  error?: string;
  provider: string;
  model: string;
} 